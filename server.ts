import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  calculateEligibleRewardAccruals,
  calculateProfileCompleteness,
  canAssignRole,
  canCreateBookingForSlot,
  canReassignExecutorCurator,
  canSelfRegisterRole,
  canSubmitReview,
  MODERATION_STATUS_LABELS,
  validateModerationDecision,
} from './src/domain/marketplaceRules';
import { createInitialSeedDatabase, HERO_IMAGE_PATH } from './src/domain/seedData';
import {
  AuditLog,
  MarketplaceDatabase,
  ModerationStatus,
  Profile,
  RewardOperationStatus,
  RewardRuleType,
  RoleCode,
} from './src/domain/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'ryadom-db.json');

function loadDatabase(): MarketplaceDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE_PATH)) {
    const seed = createInitialSeedDatabase();
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    return JSON.parse(raw) as MarketplaceDatabase;
  } catch {
    const seed = createInitialSeedDatabase();
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
}

let db: MarketplaceDatabase = loadDatabase();

function saveDatabase(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_FILE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_FILE_PATH);
}

function appendAuditLog(params: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
}): void {
  const actor = db.users.find((u) => u.id === params.actorUserId);
  const logEntry: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorUserId: params.actorUserId,
    actorName: actor ? actor.name : 'Система',
    actorRole: actor ? actor.role : 'CLIENT',
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    details: params.details,
    createdAt: new Date().toISOString(),
  };
  db.auditLogs.unshift(logEntry);
}

function syncCuratorRewardsForProfile(profile: Profile): void {
  if (!profile.curatorId) return;
  const curator = db.curators.find((c) => c.id === profile.curatorId);
  if (!curator) return;

  const approvedCountForCurator = db.profiles.filter(
    (p) => p.curatorId === curator.id && p.moderationStatus === 'APPROVED'
  ).length;

  const newAccruals = calculateEligibleRewardAccruals({
    curator,
    profile,
    services: db.services,
    completedBookings: db.bookings,
    approvedProfilesForCuratorCount: approvedCountForCurator,
    rules: db.rewardRules,
    existingAccruals: db.rewardAccruals,
    nowIso: new Date().toISOString(),
  });

  if (newAccruals.length > 0) {
    db.rewardAccruals.unshift(...newAccruals);
    for (const acc of newAccruals) {
      db.notifications.unshift({
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: curator.userId,
        roleTarget: 'CURATOR',
        title: 'Начислено вознаграждение (Демонстрационные данные)',
        message: `Начислено ${acc.amount} ₽: ${acc.basisDescription}. Статус: Ожидает подтверждения.`,
        type: 'REWARD',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // 1. Get complete state
  app.get('/api/state', (_req, res) => {
    res.json(db);
  });

  // 2. Register new user (Client, Master, or Organization)
  app.post('/api/auth/register', (req, res) => {
    const {
      name,
      phone,
      email,
      role,
      regionId,
      cityId,
      districtId,
      categoryId,
      specialtyTitle,
      bio,
      address,
      homeVisit,
      referralCode,
      serviceTitle,
      servicePrice,
    } = req.body as {
      name: string;
      phone: string;
      email: string;
      role: RoleCode;
      regionId: string;
      cityId: string;
      districtId?: string;
      categoryId?: string;
      specialtyTitle?: string;
      bio?: string;
      address?: string;
      homeVisit?: boolean;
      referralCode?: string;
      serviceTitle?: string;
      servicePrice?: number;
    };

    if (!name || !phone || !role || !regionId || !cityId) {
      res.status(400).json({ error: 'Заполните обязательные поля: имя, телефон, роль, регион и город.' });
      return;
    }

    if (!canSelfRegisterRole(role)) {
      res.status(403).json({
        error: 'Пользователь не может самостоятельно назначить себе роль куратора или администратора.',
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const cleanCode = referralCode?.trim().toUpperCase();
    const matchedCurator = cleanCode
      ? db.curators.find((c) => c.referralCode.toUpperCase() === cleanCode && c.status === 'ACTIVE')
      : undefined;

    const newUser = {
      id: `u-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: (email || `${Date.now()}@ryadom-demo.ru`).trim(),
      role,
      regionId,
      cityId,
      referredByCode: matchedCurator ? matchedCurator.referralCode : undefined,
      createdAt: nowIso,
      isActive: true,
    };

    db.users.push(newUser);

    let createdProfile: Profile | undefined;

    if (role === 'MASTER' || role === 'ORGANIZATION') {
      const targetCategory = categoryId || 'cat-beauty';
      const targetDistrict =
        districtId ||
        db.districts.find((d) => d.cityId === cityId)?.id ||
        'dist-kem-center';

      const initialStatus: ModerationStatus =
        specialtyTitle && bio && serviceTitle ? 'SUBMITTED' : 'DRAFT';

      createdProfile = {
        id: `prof-${Date.now()}`,
        userId: newUser.id,
        type: role === 'ORGANIZATION' ? 'ORGANIZATION' : 'MASTER',
        displayName: name.trim(),
        specialtyTitle: (specialtyTitle || 'Специалист сферы услуг').trim(),
        bio: (
          bio ||
          'Профессиональное оказание услуг с соблюдением стандартов качества платформы РЯДОМ.'
        ).trim(),
        regionId,
        cityId,
        districtId: targetDistrict,
        address: (address || 'Уточняется при записи').trim(),
        categoryId: targetCategory,
        homeVisit: Boolean(homeVisit),
        phone: phone.trim(),
        photos: [HERO_IMAGE_PATH],
        moderationStatus: initialStatus,
        moderationUpdatedAt: nowIso,
        verifiedBadge: false,
        rating: 0,
        reviewsCount: 0,
        curatorId: matchedCurator?.id,
        referralCodeUsed: matchedCurator?.referralCode,
        createdAt: nowIso,
      };

      db.profiles.unshift(createdProfile);

      if (role === 'ORGANIZATION') {
        db.organizations.unshift({
          id: `org-${Date.now()}`,
          profileId: createdProfile.id,
          ownerUserId: newUser.id,
          legalName: name.trim(),
          inn: '4205000000',
          responsiblePersonName: name.trim(),
          responsiblePersonPhone: phone.trim(),
          moderationStatus: initialStatus,
          interiorPhotos: [HERO_IMAGE_PATH],
          verificationDocsStatus: 'PROVIDED',
          createdAt: nowIso,
        });
      }

      if (serviceTitle && Number(servicePrice) > 0) {
        db.services.push({
          id: `srv-${Date.now()}`,
          profileId: createdProfile.id,
          categoryId: targetCategory,
          title: serviceTitle.trim(),
          description: 'Базовая услуга профиля',
          price: Number(servicePrice),
          durationMinutes: 60,
          homeVisitAvailable: Boolean(homeVisit),
          moderationStatus: initialStatus,
          createdAt: nowIso,
        });
      }

      // Default schedule slot so once approved clients can book immediately
      db.schedules.push({
        id: `slot-${Date.now()}`,
        profileId: createdProfile.id,
        date: '2026-11-08',
        time: '13:00',
        isBooked: false,
        isClosedByMaster: false,
      });

      const completeness = calculateProfileCompleteness(createdProfile, db.services);

      if (initialStatus === 'SUBMITTED') {
        db.moderationApplications.unshift({
          id: `mod-app-${Date.now()}`,
          profileId: createdProfile.id,
          profileType: createdProfile.type,
          applicantUserId: newUser.id,
          regionId,
          categoryId: targetCategory,
          curatorId: matchedCurator?.id,
          submittedAt: nowIso,
          status: 'SUBMITTED',
          completenessScore: completeness.score,
        });
      }

      if (matchedCurator) {
        db.referralAttributions.unshift({
          id: `attr-${Date.now()}`,
          profileId: createdProfile.id,
          invitedUserId: newUser.id,
          curatorId: matchedCurator.id,
          referralCode: matchedCurator.referralCode,
          regionId,
          categoryId: targetCategory,
          invitedAt: nowIso,
          registrationStatus: initialStatus,
          currentExecutorStatus: 'ONBOARDING',
        });

        const refLink = db.referralLinks.find((l) => l.curatorId === matchedCurator.id);
        if (refLink) {
          refLink.registrationsCount += 1;
        }

        db.notifications.unshift({
          id: `notif-${Date.now()}-cur`,
          userId: matchedCurator.userId,
          roleTarget: 'CURATOR',
          title: 'Новый исполнитель по вашей реферальной ссылке',
          message: `${createdProfile.displayName} зарегистрировался по коду ${matchedCurator.referralCode}. Текущий статус: ${MODERATION_STATUS_LABELS[initialStatus]}.`,
          type: 'CURATOR',
          isRead: false,
          createdAt: nowIso,
        });
      }
    }

    appendAuditLog({
      actorUserId: newUser.id,
      action: 'REGISTER_USER',
      entityType: 'User',
      entityId: newUser.id,
      details: `Зарегистрирован пользователь «${newUser.name}» с ролью ${role}${matchedCurator ? ` (приглашён куратором ${matchedCurator.name} по коду ${matchedCurator.referralCode})` : ''}.`,
    });

    saveDatabase();
    res.json({ user: newUser, profile: createdProfile, db });
  });

  // 3. Update profile and submit/resubmit for moderation
  app.post('/api/profiles/save', (req, res) => {
    const {
      actorUserId,
      profileId,
      displayName,
      specialtyTitle,
      bio,
      regionId,
      cityId,
      districtId,
      address,
      categoryId,
      homeVisit,
      serviceAreaDescription,
      phone,
      submitForModeration,
    } = req.body;

    const profile = db.profiles.find((p) => p.id === profileId);
    if (!profile) {
      res.status(404).json({ error: 'Профиль не найден.' });
      return;
    }

    if (displayName !== undefined) profile.displayName = displayName.trim();
    if (specialtyTitle !== undefined) profile.specialtyTitle = specialtyTitle.trim();
    if (bio !== undefined) profile.bio = bio.trim();
    if (regionId !== undefined) profile.regionId = regionId;
    if (cityId !== undefined) profile.cityId = cityId;
    if (districtId !== undefined) profile.districtId = districtId;
    if (address !== undefined) profile.address = address.trim();
    if (categoryId !== undefined) profile.categoryId = categoryId;
    if (homeVisit !== undefined) profile.homeVisit = Boolean(homeVisit);
    if (serviceAreaDescription !== undefined) {
      profile.serviceAreaDescription = serviceAreaDescription.trim();
    }
    if (phone !== undefined) profile.phone = phone.trim();

    const nowIso = new Date().toISOString();

    if (submitForModeration) {
      const prevStatus = profile.moderationStatus;
      const nextStatus: ModerationStatus =
        prevStatus === 'CHANGES_REQUESTED' || prevStatus === 'REJECTED'
          ? 'RESUBMITTED'
          : 'SUBMITTED';

      profile.moderationStatus = nextStatus;
      profile.moderationUpdatedAt = nowIso;
      profile.verifiedBadge = false;

      const org = db.organizations.find((o) => o.profileId === profile.id);
      if (org) {
        org.moderationStatus = nextStatus;
      }

      const completeness = calculateProfileCompleteness(profile, db.services);
      const existingApp = db.moderationApplications.find((a) => a.profileId === profile.id);
      if (existingApp) {
        existingApp.status = nextStatus;
        existingApp.submittedAt = nowIso;
        existingApp.completenessScore = completeness.score;
      } else {
        db.moderationApplications.unshift({
          id: `mod-app-${Date.now()}`,
          profileId: profile.id,
          profileType: profile.type,
          applicantUserId: profile.userId,
          regionId: profile.regionId,
          categoryId: profile.categoryId,
          curatorId: profile.curatorId,
          submittedAt: nowIso,
          status: nextStatus,
          completenessScore: completeness.score,
        });
      }

      const attr = db.referralAttributions.find((a) => a.profileId === profile.id);
      if (attr) {
        attr.registrationStatus = nextStatus;
      }

      appendAuditLog({
        actorUserId: actorUserId || profile.userId,
        action: 'SUBMIT_PROFILE_FOR_MODERATION',
        entityType: 'Profile',
        entityId: profile.id,
        details: `Профиль «${profile.displayName}» отправлен на модерацию (${MODERATION_STATUS_LABELS[nextStatus]}). Заполненность: ${completeness.score}%.`,
      });
    }

    saveDatabase();
    res.json({ profile, db });
  });

  // 4. Add service to profile
  app.post('/api/services/add', (req, res) => {
    const { profileId, title, description, price, durationMinutes, homeVisitAvailable } = req.body;
    const profile = db.profiles.find((p) => p.id === profileId);
    if (!profile) {
      res.status(404).json({ error: 'Профиль исполнителя не найден.' });
      return;
    }
    if (!title || !price || Number(price) <= 0) {
      res.status(400).json({ error: 'Укажите название услуги и корректную стоимость.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const serviceStatus: ModerationStatus =
      profile.moderationStatus === 'APPROVED' ? 'APPROVED' : 'SUBMITTED';

    const newService = {
      id: `srv-${Date.now()}`,
      profileId: profile.id,
      categoryId: profile.categoryId,
      title: title.trim(),
      description: (description || 'Услуга проверенного специалиста').trim(),
      price: Number(price),
      durationMinutes: Number(durationMinutes) || 60,
      homeVisitAvailable: Boolean(homeVisitAvailable),
      moderationStatus: serviceStatus,
      createdAt: nowIso,
    };

    db.services.push(newService);

    if (profile.moderationStatus === 'APPROVED' && !profile.firstServicePublishedAt) {
      profile.firstServicePublishedAt = nowIso;
      const attr = db.referralAttributions.find((a) => a.profileId === profile.id);
      if (attr) attr.firstServicePublishedAt = nowIso;
    }

    syncCuratorRewardsForProfile(profile);
    saveDatabase();
    res.json({ service: newService, db });
  });

  // 5. Add or toggle schedule slot
  app.post('/api/schedules/slot', (req, res) => {
    const { profileId, date, time, toggleSlotId } = req.body;
    if (toggleSlotId) {
      const slot = db.schedules.find((s) => s.id === toggleSlotId);
      if (!slot) {
        res.status(404).json({ error: 'Слот расписания не найден.' });
        return;
      }
      if (slot.isBooked) {
        res.status(400).json({ error: 'Нельзя закрыть слот, на который уже записан клиент.' });
        return;
      }
      slot.isClosedByMaster = !slot.isClosedByMaster;
      saveDatabase();
      res.json({ slot, db });
      return;
    }

    if (!profileId || !date || !time) {
      res.status(400).json({ error: 'Укажите дату и время для добавления окна в расписание.' });
      return;
    }

    const exists = db.schedules.some(
      (s) => s.profileId === profileId && s.date === date && s.time === time
    );
    if (exists) {
      res.status(400).json({ error: 'Такой временной интервал уже существует в расписании.' });
      return;
    }

    const newSlot = {
      id: `slot-${Date.now()}`,
      profileId,
      date,
      time,
      isBooked: false,
      isClosedByMaster: false,
    };
    db.schedules.push(newSlot);
    saveDatabase();
    res.json({ slot: newSlot, db });
  });

  // 6. Create booking (with strict double-booking prevention)
  app.post('/api/bookings/create', (req, res) => {
    const { clientId, clientName, clientPhone, profileId, serviceId, slotId, comment } = req.body;

    const slot = db.schedules.find((s) => s.id === slotId && s.profileId === profileId);
    if (!slot) {
      res.status(404).json({ error: 'Выбранный слот расписания не найден.' });
      return;
    }

    const check = canCreateBookingForSlot(slot, db.bookings);
    if (!check.allowed) {
      res.status(409).json({ error: check.error });
      return;
    }

    const service = db.services.find((s) => s.id === serviceId);
    const profile = db.profiles.find((p) => p.id === profileId);
    if (!service || !profile) {
      res.status(404).json({ error: 'Услуга или профиль исполнителя не найдены.' });
      return;
    }

    slot.isBooked = true;
    const nowIso = new Date().toISOString();

    const booking = {
      id: `bk-${Date.now()}`,
      clientId,
      clientName: (clientName || 'Клиент РЯДОМ').trim(),
      clientPhone: (clientPhone || '+7 (900) 000-00-00').trim(),
      profileId,
      serviceId,
      serviceTitle: service.title,
      price: service.price,
      platformFeeConfirmed: 0,
      slotId: slot.id,
      date: slot.date,
      time: slot.time,
      status: 'PENDING' as const,
      comment: comment?.trim(),
      createdAt: nowIso,
    };

    db.bookings.unshift(booking);

    db.notifications.unshift(
      {
        id: `notif-${Date.now()}-c`,
        userId: clientId,
        roleTarget: 'CLIENT',
        title: 'Запись создана и отправлена мастеру',
        message: `Вы записались к «${profile.displayName}» на услугу «${service.title}» (${slot.date} в ${slot.time}).`,
        type: 'BOOKING',
        isRead: false,
        createdAt: nowIso,
      },
      {
        id: `notif-${Date.now()}-m`,
        userId: profile.userId,
        roleTarget: profile.type === 'ORGANIZATION' ? 'ORGANIZATION' : 'MASTER',
        title: 'Новая заявка на запись',
        message: `Клиент ${booking.clientName} записался на «${service.title}» (${slot.date} в ${slot.time}).`,
        type: 'BOOKING',
        isRead: false,
        createdAt: nowIso,
      }
    );

    saveDatabase();
    res.json({ booking, db });
  });

  // 7. Update booking status (Confirm, Complete, Cancel, Reject)
  app.post('/api/bookings/status', (req, res) => {
    const { actorUserId, bookingId, status } = req.body as {
      actorUserId: string;
      bookingId: string;
      status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
    };

    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      res.status(404).json({ error: 'Запись не найдена.' });
      return;
    }

    booking.status = status;
    const nowIso = new Date().toISOString();

    if (status === 'CANCELLED' || status === 'REJECTED') {
      const slot = db.schedules.find((s) => s.id === booking.slotId);
      if (slot) {
        slot.isBooked = false;
      }
    }

    const profile = db.profiles.find((p) => p.id === booking.profileId);

    if (status === 'COMPLETED') {
      booking.completedAt = nowIso;
      booking.platformFeeConfirmed = Math.round(booking.price * 0.1);
      if (profile) {
        syncCuratorRewardsForProfile(profile);
      }
    }

    const statusTextMap = {
      CONFIRMED: 'подтверждена исполнителем',
      COMPLETED: 'успешно завершена (теперь вы можете оставить отзыв)',
      CANCELLED: 'отменена',
      REJECTED: 'отклонена исполнителем',
    };

    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: booking.clientId,
      roleTarget: 'CLIENT',
      title: `Статус записи обновлён`,
      message: `Ваша запись на «${booking.serviceTitle}» (${booking.date} в ${booking.time}) ${statusTextMap[status]}.`,
      type: 'BOOKING',
      isRead: false,
      createdAt: nowIso,
    });

    appendAuditLog({
      actorUserId: actorUserId || booking.clientId,
      action: `BOOKING_${status}`,
      entityType: 'Booking',
      entityId: booking.id,
      details: `Статус записи #${booking.id} («${booking.serviceTitle}») изменён на ${status}.`,
    });

    saveDatabase();
    res.json({ booking, db });
  });

  // 8. Create open service request (Заявка без фиксированной записи)
  app.post('/api/requests/create', (req, res) => {
    const {
      clientId,
      clientName,
      categoryId,
      regionId,
      cityId,
      districtId,
      title,
      description,
      preferredTime,
      budgetHint,
    } = req.body;

    if (!title || !description || !categoryId || !cityId) {
      res.status(400).json({ error: 'Укажите категорию, город, заголовок и описание задачи.' });
      return;
    }

    const newReq = {
      id: `req-${Date.now()}`,
      clientId: clientId || 'u-client-1',
      clientName: (clientName || 'Клиент РЯДОМ').trim(),
      categoryId,
      regionId: regionId || 'reg-kuzbass',
      cityId,
      districtId,
      title: title.trim(),
      description: description.trim(),
      preferredTime: (preferredTime || 'По договорённости').trim(),
      budgetHint: budgetHint ? Number(budgetHint) : undefined,
      photos: [HERO_IMAGE_PATH],
      status: 'OPEN' as const,
      createdAt: new Date().toISOString(),
    };

    db.serviceRequests.unshift(newReq);
    saveDatabase();
    res.json({ serviceRequest: newReq, db });
  });

  // 9. Master/Organization sends an Offer to an open ServiceRequest
  app.post('/api/requests/offer', (req, res) => {
    const {
      requestId,
      profileId,
      solutionDescription,
      estimatedPrice,
      estimatedDuration,
      homeVisitTerms,
    } = req.body;

    const sReq = db.serviceRequests.find((r) => r.id === requestId);
    const profile = db.profiles.find((p) => p.id === profileId);

    if (!sReq || !profile) {
      res.status(404).json({ error: 'Заявка или профиль мастера не найдены.' });
      return;
    }
    if (!solutionDescription || !estimatedPrice) {
      res.status(400).json({ error: 'Опишите предлагаемое решение и укажите предварительную стоимость.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const offer = {
      id: `off-${Date.now()}`,
      requestId,
      profileId,
      masterName: profile.displayName,
      solutionDescription: solutionDescription.trim(),
      estimatedPrice: Number(estimatedPrice),
      estimatedDuration: (estimatedDuration || 'По согласованию').trim(),
      homeVisitTerms: (homeVisitTerms || 'Выезд по городу включён').trim(),
      status: 'SENT' as const,
      createdAt: nowIso,
    };

    db.offers.unshift(offer);

    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: sReq.clientId,
      roleTarget: 'CLIENT',
      title: 'Новый отклик на вашу заявку',
      message: `Исполнитель «${profile.displayName}» предложил решение по заявке «${sReq.title}» за ${offer.estimatedPrice} ₽.`,
      type: 'BOOKING',
      isRead: false,
      createdAt: nowIso,
    });

    saveDatabase();
    res.json({ offer, db });
  });

  // 10. Client accepts an Offer on a ServiceRequest
  app.post('/api/requests/accept-offer', (req, res) => {
    const { requestId, offerId } = req.body;
    const sReq = db.serviceRequests.find((r) => r.id === requestId);
    const offer = db.offers.find((o) => o.id === offerId && o.requestId === requestId);
    if (!sReq || !offer) {
      res.status(404).json({ error: 'Заявка или отклик не найдены.' });
      return;
    }

    sReq.status = 'IN_PROGRESS';
    sReq.selectedOfferId = offer.id;
    offer.status = 'ACCEPTED';

    for (const other of db.offers.filter((o) => o.requestId === requestId && o.id !== offer.id)) {
      other.status = 'DECLINED';
    }

    saveDatabase();
    res.json({ serviceRequest: sReq, offer, db });
  });

  // 11. Submit verified review (strictly tied to completed booking)
  app.post('/api/reviews/create', (req, res) => {
    const { clientId, bookingId, rating, text } = req.body;
    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      res.status(404).json({ error: 'Запись не найдена.' });
      return;
    }

    const check = canSubmitReview(clientId, booking, db.reviews);
    if (!check.allowed) {
      res.status(400).json({ error: check.error });
      return;
    }

    if (!text || text.trim().length < 5) {
      res.status(400).json({ error: 'Напишите содержательный отзыв (минимум 5 символов).' });
      return;
    }

    const numRating = Math.min(5, Math.max(1, Number(rating) || 5));
    const review = {
      id: `rev-${Date.now()}`,
      bookingId: booking.id,
      clientId,
      clientName: booking.clientName,
      profileId: booking.profileId,
      rating: numRating,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      moderationStatus: 'PUBLISHED' as const,
    };

    db.reviews.unshift(review);

    const profile = db.profiles.find((p) => p.id === booking.profileId);
    if (profile) {
      const pubReviews = db.reviews.filter(
        (r) => r.profileId === profile.id && r.moderationStatus === 'PUBLISHED'
      );
      profile.reviewsCount = pubReviews.length;
      const sum = pubReviews.reduce((acc, r) => acc + r.rating, 0);
      profile.rating = Number((sum / pubReviews.length).toFixed(1));
    }

    saveDatabase();
    res.json({ review, db });
  });

  // 12. Toggle favorite profile
  app.post('/api/favorites/toggle', (req, res) => {
    const { userId, profileId } = req.body;
    const idx = db.favorites.findIndex((f) => f.userId === userId && f.profileId === profileId);
    if (idx >= 0) {
      db.favorites.splice(idx, 1);
    } else {
      db.favorites.push({
        id: `fav-${Date.now()}`,
        userId,
        profileId,
        createdAt: new Date().toISOString(),
      });
    }
    saveDatabase();
    res.json({ db });
  });

  // 13. Moderation decision (Approve, Request Changes, Reject, Suspend, Block)
  app.post('/api/moderation/decide', (req, res) => {
    const { actorUserId, profileId, newStatus, reason } = req.body as {
      actorUserId: string;
      profileId: string;
      newStatus: ModerationStatus;
      reason?: string;
    };

    const actor = db.users.find((u) => u.id === actorUserId);
    const profile = db.profiles.find((p) => p.id === profileId);

    if (!actor || !profile) {
      res.status(404).json({ error: 'Модератор или проверяемый профиль не найдены.' });
      return;
    }

    const actorCuratorRecord = db.curators.find((c) => c.userId === actor.id);
    const validation = validateModerationDecision({
      actor,
      actorCuratorRecord,
      profile,
      newStatus,
      reason,
    });

    if (!validation.valid) {
      res.status(403).json({ error: validation.error });
      return;
    }

    const prevStatus = profile.moderationStatus;
    const nowIso = new Date().toISOString();

    profile.moderationStatus = newStatus;
    profile.moderationComment = reason?.trim() || 'Проверено службой модерации РЯДОМ.';
    profile.moderationUpdatedAt = nowIso;
    profile.moderationUpdatedBy = actor.id;
    profile.verifiedBadge = newStatus === 'APPROVED';

    if (newStatus === 'APPROVED') {
      profile.approvedAt = profile.approvedAt || nowIso;
      for (const srv of db.services.filter((s) => s.profileId === profile.id)) {
        srv.moderationStatus = 'APPROVED';
      }
      if (!profile.firstServicePublishedAt && db.services.some((s) => s.profileId === profile.id)) {
        profile.firstServicePublishedAt = nowIso;
      }
    }

    const org = db.organizations.find((o) => o.profileId === profile.id);
    if (org) {
      org.moderationStatus = newStatus;
      if (newStatus === 'APPROVED') org.verificationDocsStatus = 'VERIFIED';
    }

    const modApp = db.moderationApplications.find((a) => a.profileId === profile.id);
    if (modApp) {
      modApp.status = newStatus;
      modApp.reasonComment = profile.moderationComment;
      modApp.reviewedByUserId = actor.id;
      modApp.reviewedAt = nowIso;
    }

    db.moderationHistory.unshift({
      id: `mod-hist-${Date.now()}`,
      applicationId: modApp?.id || `app-${profile.id}`,
      profileId: profile.id,
      previousStatus: prevStatus,
      newStatus,
      actorUserId: actor.id,
      actorName: actor.name,
      reason: profile.moderationComment,
      createdAt: nowIso,
    });

    const attr = db.referralAttributions.find((a) => a.profileId === profile.id);
    if (attr) {
      attr.registrationStatus = newStatus;
      if (newStatus === 'APPROVED') {
        attr.moderationApprovedAt = attr.moderationApprovedAt || nowIso;
        attr.firstServicePublishedAt =
          attr.firstServicePublishedAt || profile.firstServicePublishedAt;
        attr.currentExecutorStatus = 'ACTIVE';
      } else if (newStatus === 'BLOCKED' || newStatus === 'SUSPENDED') {
        attr.currentExecutorStatus = 'SUSPENDED';
      }
    }

    // Notify executor
    db.notifications.unshift({
      id: `notif-${Date.now()}-exec`,
      userId: profile.userId,
      roleTarget: profile.type === 'ORGANIZATION' ? 'ORGANIZATION' : 'MASTER',
      title: `Решение модерации: ${MODERATION_STATUS_LABELS[newStatus]}`,
      message: `Ваш профиль «${profile.displayName}» получил статус «${MODERATION_STATUS_LABELS[newStatus]}». Комментарий: ${profile.moderationComment}`,
      type: 'MODERATION',
      isRead: false,
      createdAt: nowIso,
    });

    // Notify curator if assigned
    if (profile.curatorId) {
      const curator = db.curators.find((c) => c.id === profile.curatorId);
      if (curator) {
        db.notifications.unshift({
          id: `notif-${Date.now()}-cur`,
          userId: curator.userId,
          roleTarget: 'CURATOR',
          title: `Модерация привлечённого профиля: ${MODERATION_STATUS_LABELS[newStatus]}`,
          message: `Профиль «${profile.displayName}» переведён в статус «${MODERATION_STATUS_LABELS[newStatus]}». Причина/комментарий: ${profile.moderationComment}`,
          type: 'CURATOR',
          isRead: false,
          createdAt: nowIso,
        });
      }
    }

    if (newStatus === 'APPROVED') {
      syncCuratorRewardsForProfile(profile);
    }

    appendAuditLog({
      actorUserId: actor.id,
      action: `MODERATION_${newStatus}`,
      entityType: 'Profile',
      entityId: profile.id,
      details: `Модератор «${actor.name}» изменил статус профиля «${profile.displayName}» (${prevStatus} → ${newStatus}). Причина: ${profile.moderationComment}`,
    });

    saveDatabase();
    res.json({ profile, db });
  });

  // 14. Curator assists and resubmits profile after fixing errors
  app.post('/api/curator/resubmit', (req, res) => {
    const { curatorId, profileId, updatedBio, updatedAddress } = req.body;
    const curator = db.curators.find((c) => c.id === curatorId);
    const profile = db.profiles.find((p) => p.id === profileId);

    if (!curator || !profile) {
      res.status(404).json({ error: 'Куратор или профиль не найдены.' });
      return;
    }

    if (updatedBio) profile.bio = updatedBio.trim();
    if (updatedAddress) profile.address = updatedAddress.trim();

    const prevStatus = profile.moderationStatus;
    profile.moderationStatus = 'RESUBMITTED';
    profile.moderationUpdatedAt = new Date().toISOString();

    const modApp = db.moderationApplications.find((a) => a.profileId === profile.id);
    if (modApp) {
      modApp.status = 'RESUBMITTED';
      modApp.submittedAt = profile.moderationUpdatedAt;
    }

    appendAuditLog({
      actorUserId: curator.userId,
      action: 'CURATOR_RESUBMIT_PROFILE',
      entityType: 'Profile',
      entityId: profile.id,
      details: `Куратор «${curator.name}» помог исправить замечания и повторно отправил профиль «${profile.displayName}» (${prevStatus} → RESUBMITTED).`,
    });

    saveDatabase();
    res.json({ profile, db });
  });

  // 15. Owner Admin: Add Region, City, District, or Category
  app.post('/api/admin/geography-category', (req, res) => {
    const { actorUserId, kind, name, code, regionId, cityId, slug, description, requiresQualificationDocs } =
      req.body;
    const actor = db.users.find((u) => u.id === actorUserId);
    if (!actor || actor.role !== 'OWNER') {
      res.status(403).json({ error: 'Доступно только владельцу платформы.' });
      return;
    }

    if (kind === 'REGION') {
      const region = {
        id: `reg-${Date.now()}`,
        country: 'Россия',
        name: name.trim(),
        code: (code || 'RU-REG').trim().toUpperCase(),
        isActive: true,
      };
      db.regions.push(region);
      appendAuditLog({
        actorUserId: actor.id,
        action: 'CREATE_REGION',
        entityType: 'Region',
        entityId: region.id,
        details: `Добавлен новый регион: «${region.name}» (${region.code}).`,
      });
    } else if (kind === 'CITY') {
      const city = {
        id: `city-${Date.now()}`,
        regionId,
        name: name.trim(),
        isActive: true,
      };
      db.cities.push(city);
      db.districts.push({
        id: `dist-${Date.now()}`,
        cityId: city.id,
        name: 'Центральный район',
      });
      appendAuditLog({
        actorUserId: actor.id,
        action: 'CREATE_CITY',
        entityType: 'City',
        entityId: city.id,
        details: `Добавлен населённый пункт «${city.name}» в регион ${regionId}.`,
      });
    } else if (kind === 'DISTRICT') {
      const dist = {
        id: `dist-${Date.now()}`,
        cityId,
        name: name.trim(),
      };
      db.districts.push(dist);
    } else if (kind === 'CATEGORY') {
      const cat = {
        id: `cat-${Date.now()}`,
        slug: (slug || `cat-${Date.now()}`).trim(),
        name: name.trim(),
        description: (description || 'Направление услуг маркетплейса РЯДОМ').trim(),
        requiresQualificationDocs: Boolean(requiresQualificationDocs),
        isActive: true,
      };
      db.categories.push(cat);
      appendAuditLog({
        actorUserId: actor.id,
        action: 'CREATE_CATEGORY',
        entityType: 'Category',
        entityId: cat.id,
        details: `Создано новое направление услуг «${cat.name}».`,
      });
    }

    saveDatabase();
    res.json({ db });
  });

  // 16. Owner Admin: Assign Curator to (Region + Category) or Reassign Executor's Curator
  app.post('/api/admin/curators/assign', (req, res) => {
    const {
      actorUserId,
      mode,
      curatorId,
      newCuratorName,
      newCuratorPhone,
      newCuratorReferralCode,
      regionId,
      categoryId,
      profileId,
    } = req.body;

    const actor = db.users.find((u) => u.id === actorUserId);
    if (!actor || !canAssignRole(actor.role, 'CURATOR')) {
      res.status(403).json({
        error: 'Назначение кураторов и изменение зон ответственности доступно только владельцу платформы.',
      });
      return;
    }

    const nowIso = new Date().toISOString();

    if (mode === 'CREATE_CURATOR') {
      if (!newCuratorName || !regionId || !categoryId) {
        res.status(400).json({ error: 'Укажите ФИО куратора, закрепляемый регион и направление.' });
        return;
      }
      const refCode = (
        newCuratorReferralCode || `CUR-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
      )
        .trim()
        .toUpperCase();

      const newUser = {
        id: `u-cur-${Date.now()}`,
        name: newCuratorName.trim(),
        phone: (newCuratorPhone || '+7 (900) 000-00-00').trim(),
        email: `${refCode.toLowerCase()}@ryadom-demo.ru`,
        role: 'CURATOR' as const,
        regionId,
        cityId: db.cities.find((c) => c.regionId === regionId)?.id || 'city-kemerovo',
        createdAt: nowIso,
        isActive: true,
      };
      db.users.push(newUser);

      const newCurator = {
        id: `cur-${Date.now()}`,
        userId: newUser.id,
        name: newCuratorName.trim(),
        phone: newUser.phone,
        email: newUser.email,
        status: 'ACTIVE' as const,
        referralCode: refCode,
        regionalPlanTarget: 5,
        joinedAt: nowIso,
      };
      db.curators.push(newCurator);

      const assignment = {
        id: `ca-${Date.now()}`,
        curatorId: newCurator.id,
        regionId,
        categoryId,
        assignedByUserId: actor.id,
        assignedAt: nowIso,
        isActive: true,
      };
      db.curatorAssignments.push(assignment);

      db.referralLinks.push({
        id: `ref-link-${Date.now()}`,
        curatorId: newCurator.id,
        code: refCode,
        regionId,
        categoryId,
        clicksCount: 1,
        registrationsCount: 0,
        createdAt: nowIso,
      });

      appendAuditLog({
        actorUserId: actor.id,
        action: 'APPOINT_NEW_CURATOR',
        entityType: 'Curator',
        entityId: newCurator.id,
        details: `Назначен региональный куратор «${newCurator.name}» (код ${refCode}) на связку Регион ${regionId} + Направление ${categoryId}.`,
      });
    } else if (mode === 'ASSIGN_SCOPE') {
      const exists = db.curatorAssignments.some(
        (a) =>
          a.curatorId === curatorId &&
          a.regionId === regionId &&
          a.categoryId === categoryId &&
          a.isActive
      );
      if (!exists) {
        const assignment = {
          id: `ca-${Date.now()}`,
          curatorId,
          regionId,
          categoryId,
          assignedByUserId: actor.id,
          assignedAt: nowIso,
          isActive: true,
        };
        db.curatorAssignments.push(assignment);
        appendAuditLog({
          actorUserId: actor.id,
          action: 'ADD_CURATOR_ASSIGNMENT',
          entityType: 'CuratorAssignment',
          entityId: assignment.id,
          details: `Куратору ${curatorId} добавлена зона ответственности: Регион ${regionId} + Направление ${categoryId}.`,
        });
      }
    } else if (mode === 'REASSIGN_EXECUTOR') {
      const check = canReassignExecutorCurator(actor.role);
      if (!check.allowed) {
        res.status(403).json({ error: check.error });
        return;
      }
      const profile = db.profiles.find((p) => p.id === profileId);
      const targetCurator = db.curators.find((c) => c.id === curatorId);
      if (!profile || !targetCurator) {
        res.status(404).json({ error: 'Профиль исполнителя или куратор не найдены.' });
        return;
      }
      const prevCuratorId = profile.curatorId || 'не назначен';
      profile.curatorId = targetCurator.id;
      profile.referralCodeUsed = targetCurator.referralCode;

      const attr = db.referralAttributions.find((a) => a.profileId === profile.id);
      if (attr) {
        attr.curatorId = targetCurator.id;
        attr.referralCode = targetCurator.referralCode;
      } else {
        db.referralAttributions.unshift({
          id: `attr-${Date.now()}`,
          profileId: profile.id,
          invitedUserId: profile.userId,
          curatorId: targetCurator.id,
          referralCode: targetCurator.referralCode,
          regionId: profile.regionId,
          categoryId: profile.categoryId,
          invitedAt: nowIso,
          registrationStatus: profile.moderationStatus,
          currentExecutorStatus:
            profile.moderationStatus === 'APPROVED' ? 'ACTIVE' : 'ONBOARDING',
        });
      }

      syncCuratorRewardsForProfile(profile);

      appendAuditLog({
        actorUserId: actor.id,
        action: 'REASSIGN_EXECUTOR_CURATOR',
        entityType: 'Profile',
        entityId: profile.id,
        details: `Исполнитель «${profile.displayName}» перепривязан от куратора (${prevCuratorId}) к куратору «${targetCurator.name}».`,
      });
    }

    saveDatabase();
    res.json({ db });
  });

  // 17. Owner Admin: Create or update RewardRule
  app.post('/api/admin/rewards/rule', (req, res) => {
    const {
      actorUserId,
      ruleId,
      name,
      ruleType,
      regionId,
      categoryId,
      fixedMasterAmount,
      fixedOrgAmount,
      revenuePercent,
      regionalPlanThreshold,
      regionalPlanBonus,
      minActiveServicesRequired,
    } = req.body as {
      actorUserId: string;
      ruleId?: string;
      name: string;
      ruleType: RewardRuleType;
      regionId?: string;
      categoryId?: string;
      fixedMasterAmount: number;
      fixedOrgAmount: number;
      revenuePercent: number;
      regionalPlanThreshold: number;
      regionalPlanBonus: number;
      minActiveServicesRequired?: number;
    };

    const actor = db.users.find((u) => u.id === actorUserId);
    if (!actor || actor.role !== 'OWNER') {
      res.status(403).json({ error: 'Изменение финансовых правил доступно только владельцу платформы.' });
      return;
    }

    if (ruleId) {
      const existing = db.rewardRules.find((r) => r.id === ruleId);
      if (existing) {
        existing.name = name || existing.name;
        existing.ruleType = ruleType || existing.ruleType;
        existing.fixedMasterAmount = Number(fixedMasterAmount);
        existing.fixedOrgAmount = Number(fixedOrgAmount);
        existing.revenuePercent = Number(revenuePercent);
        existing.regionalPlanThreshold = Number(regionalPlanThreshold);
        existing.regionalPlanBonus = Number(regionalPlanBonus);
        appendAuditLog({
          actorUserId: actor.id,
          action: 'UPDATE_REWARD_RULE',
          entityType: 'RewardRule',
          entityId: existing.id,
          details: `Обновлено правило вознаграждения кураторов «${existing.name}» (Мастер: ${existing.fixedMasterAmount} ₽, Орг: ${existing.fixedOrgAmount} ₽, Доход: ${existing.revenuePercent}%).`,
        });
      }
    } else {
      const newRule = {
        id: `rule-${Date.now()}`,
        name: (name || 'Новое правило вознаграждения').trim(),
        ruleType: ruleType || 'COMBINED',
        regionId: regionId || undefined,
        categoryId: categoryId || undefined,
        fixedMasterAmount: Number(fixedMasterAmount) || 0,
        fixedOrgAmount: Number(fixedOrgAmount) || 0,
        revenuePercent: Number(revenuePercent) || 0,
        regionalPlanThreshold: Number(regionalPlanThreshold) || 5,
        regionalPlanBonus: Number(regionalPlanBonus) || 0,
        minActiveServicesRequired: Number(minActiveServicesRequired) || 1,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        periodDays: 30,
        isActive: true,
      };
      db.rewardRules.unshift(newRule);
      appendAuditLog({
        actorUserId: actor.id,
        action: 'CREATE_REWARD_RULE',
        entityType: 'RewardRule',
        entityId: newRule.id,
        details: `Создано правило вознаграждения «${newRule.name}» (${newRule.ruleType}).`,
      });
    }

    for (const prof of db.profiles) {
      syncCuratorRewardsForProfile(prof);
    }

    saveDatabase();
    res.json({ db });
  });

  // 18. Owner Admin: Confirm accrual or Record Demo Payout
  app.post('/api/admin/rewards/accrual-status', (req, res) => {
    const { actorUserId, accrualId, newStatus } = req.body as {
      actorUserId: string;
      accrualId: string;
      newStatus: RewardOperationStatus;
    };

    const actor = db.users.find((u) => u.id === actorUserId);
    if (!actor || actor.role !== 'OWNER') {
      res.status(403).json({ error: 'Управление начислениями и выплатами доступно только владельцу платформы.' });
      return;
    }

    const accrual = db.rewardAccruals.find((a) => a.id === accrualId);
    if (!accrual) {
      res.status(404).json({ error: 'Финансовая операция не найдена.' });
      return;
    }

    const prevStatus = accrual.status;
    accrual.status = newStatus;
    accrual.updatedAt = new Date().toISOString();

    if (newStatus === 'PAID' && prevStatus !== 'PAID') {
      const payment = {
        id: `pay-${Date.now()}`,
        curatorId: accrual.curatorId,
        accrualIds: [accrual.id],
        amount: accrual.amount,
        status: 'PAID' as const,
        comment: `Демонстрационные данные: ручная фиксация выплаты по начислению ${accrual.id}`,
        processedByUserId: actor.id,
        isDemoData: true as const,
        createdAt: accrual.updatedAt,
      };
      db.rewardPayments.unshift(payment);

      const curator = db.curators.find((c) => c.id === accrual.curatorId);
      if (curator) {
        db.notifications.unshift({
          id: `notif-${Date.now()}`,
          userId: curator.userId,
          roleTarget: 'CURATOR',
          title: 'Зафиксирована выплата вознаграждения (Демонстрационные данные)',
          message: `Выплата в размере ${accrual.amount} ₽ по основанию «${accrual.basisDescription}» переведена в статус «Выплачено».`,
          type: 'REWARD',
          isRead: false,
          createdAt: accrual.updatedAt,
        });
      }
    }

    appendAuditLog({
      actorUserId: actor.id,
      action: `REWARD_STATUS_${newStatus}`,
      entityType: 'RewardAccrual',
      entityId: accrual.id,
      details: `Статус финансового начисления #${accrual.id} (${accrual.amount} ₽, Демонстрационные данные) изменён: ${prevStatus} → ${newStatus}.`,
    });

    saveDatabase();
    res.json({ db });
  });

  // 19. Organization Cabinet: Add Branch or Employee
  app.post('/api/organizations/manage', (req, res) => {
    const { organizationId, kind, name, cityId, districtId, address, phone, branchId, position } =
      req.body;

    const org = db.organizations.find((o) => o.id === organizationId);
    if (!org) {
      res.status(404).json({ error: 'Организация не найдена.' });
      return;
    }

    if (kind === 'BRANCH') {
      db.branches.push({
        id: `br-${Date.now()}`,
        organizationId: org.id,
        cityId: cityId || 'city-kemerovo',
        districtId: districtId || 'dist-kem-center',
        name: name.trim(),
        address: address.trim(),
        phone: (phone || org.responsiblePersonPhone).trim(),
        isActive: true,
      });
    } else if (kind === 'EMPLOYEE') {
      db.employees.push({
        id: `emp-${Date.now()}`,
        organizationId: org.id,
        branchId: branchId || db.branches.find((b) => b.organizationId === org.id)?.id || 'br-1',
        name: name.trim(),
        position: (position || 'Специалист').trim(),
        rolePermissions: ['MANAGE_SCHEDULE', 'MANAGE_BOOKINGS'],
        status: 'ACTIVE',
      });
    }

    saveDatabase();
    res.json({ db });
  });

  // 20. Resolve Complaint
  app.post('/api/complaints/resolve', (req, res) => {
    const { actorUserId, complaintId, status, resolutionComment } = req.body;
    const cmp = db.complaints.find((c) => c.id === complaintId);
    if (!cmp) {
      res.status(404).json({ error: 'Обращение не найдено.' });
      return;
    }
    cmp.status = status;
    cmp.resolutionComment = resolutionComment?.trim() || 'Рассмотрено модератором.';
    appendAuditLog({
      actorUserId: actorUserId || 'u-mod-1',
      action: `RESOLVE_COMPLAINT_${status}`,
      entityType: 'Complaint',
      entityId: cmp.id,
      details: `Обращение #${cmp.id} закрыто со статусом ${status}: ${cmp.resolutionComment}`,
    });
    saveDatabase();
    res.json({ db });
  });

  // 21. Mark notifications read
  app.post('/api/notifications/read', (req, res) => {
    const { userId } = req.body;
    for (const n of db.notifications) {
      if (n.userId === userId) {
        n.isRead = true;
      }
    }
    saveDatabase();
    res.json({ db });
  });

  // 22. Reset demo database to initial seed state
  app.post('/api/admin/reset-demo', (_req, res) => {
    db = createInitialSeedDatabase();
    saveDatabase();
    res.json({ db });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RYADOM server listening on http://localhost:${PORT}`);
  });
}

startServer();
