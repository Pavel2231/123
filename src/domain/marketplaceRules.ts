import {
  Booking,
  Curator,
  CuratorAssignment,
  ModerationStatus,
  Organization,
  Profile,
  ReferralAttribution,
  Review,
  RewardAccrual,
  RewardRule,
  RoleCode,
  RoleDefinition,
  ScheduleSlot,
  ServiceItem,
  User,
} from './types';

export const ROLE_DEFINITIONS: Record<RoleCode, RoleDefinition> = {
  CLIENT: {
    code: 'CLIENT',
    title: 'Клиент',
    description: 'Поиск мастеров, запись на услуги, создание заявок и публикация отзывов по завершённым заказам.',
    isPrivileged: false,
    permissions: ['VIEW_CATALOG', 'CREATE_BOOKING', 'CREATE_REQUEST', 'WRITE_REVIEW', 'MANAGE_FAVORITES'],
  },
  MASTER: {
    code: 'MASTER',
    title: 'Частный мастер',
    description: 'Управление анкетой, услугами, расписанием, приём записей и отклики на заявки клиентов.',
    isPrivileged: false,
    permissions: ['MANAGE_OWN_PROFILE', 'MANAGE_OWN_SERVICES', 'MANAGE_OWN_SCHEDULE', 'HANDLE_BOOKINGS', 'SEND_OFFERS'],
  },
  ORGANIZATION: {
    code: 'ORGANIZATION',
    title: 'Организация / Салон',
    description: 'Управление профилем организации, филиалами, сотрудниками, общим расписанием и услугами.',
    isPrivileged: false,
    permissions: ['MANAGE_ORG_PROFILE', 'MANAGE_BRANCHES', 'MANAGE_EMPLOYEES', 'MANAGE_OWN_SERVICES', 'HANDLE_BOOKINGS'],
  },
  ORG_EMPLOYEE: {
    code: 'ORG_EMPLOYEE',
    title: 'Сотрудник организации',
    description: 'Работа с индивидуальным расписанием и записями в рамках выданных организацией прав.',
    isPrivileged: false,
    permissions: ['VIEW_ASSIGNED_SCHEDULE', 'HANDLE_ASSIGNED_BOOKINGS'],
  },
  CURATOR: {
    code: 'CURATOR',
    title: 'Региональный куратор',
    description: 'Развитие закреплённых регионов и направлений, привлечение исполнителей, контроль анкет и учёт вознаграждений.',
    isPrivileged: true,
    permissions: [
      'VIEW_ASSIGNED_REGIONS_CATEGORIES',
      'INVITE_EXECUTORS',
      'ASSIST_EXECUTOR_ONBOARDING',
      'RESUBMIT_ASSIGNED_PROFILES',
      'VIEW_OWN_REWARDS',
    ],
  },
  CATEGORY_ADMIN: {
    code: 'CATEGORY_ADMIN',
    title: 'Администратор направления / Модератор',
    description: 'Модерация профилей мастеров, салонов и услуг, обработка жалоб и контроль качества.',
    isPrivileged: true,
    permissions: ['MODERATE_PROFILES', 'MODERATE_SERVICES', 'HANDLE_COMPLAINTS', 'VIEW_MODERATION_ANALYTICS'],
  },
  OWNER: {
    code: 'OWNER',
    title: 'Главный администратор (Владелец)',
    description: 'Полное управление платформой, регионами, назначениями кураторов, правилами вознаграждений и выплатами.',
    isPrivileged: true,
    permissions: [
      'ALL_ACCESS',
      'ASSIGN_PRIVILEGED_ROLES',
      'MANAGE_REGIONS_AND_CATEGORIES',
      'MANAGE_CURATORS_AND_RULES',
      'CONFIRM_AND_PAY_REWARDS',
      'MODERATE_PROFILES',
      'VIEW_AUDIT_LOGS',
    ],
  },
};

export const MODERATION_STATUS_LABELS: Record<ModerationStatus, string> = {
  DRAFT: 'Черновик',
  SUBMITTED: 'Отправлен на проверку',
  UNDER_REVIEW: 'На модерации',
  CHANGES_REQUESTED: 'Требуются исправления',
  RESUBMITTED: 'Повторно отправлен',
  APPROVED: 'Одобрен',
  REJECTED: 'Отклонён',
  SUSPENDED: 'Приостановлен',
  BLOCKED: 'Заблокирован',
};

/**
 * Checks whether a user can self-register into a target role.
 * Section 3: Пользователь не может самостоятельно назначить себе роль куратора или администратора.
 */
export function canSelfRegisterRole(role: RoleCode): boolean {
  return role === 'CLIENT' || role === 'MASTER' || role === 'ORGANIZATION';
}

/**
 * Checks whether an actor can assign a privileged role to another user.
 * Only OWNER can assign CURATOR, CATEGORY_ADMIN, or OWNER.
 */
export function canAssignRole(actorRole: RoleCode, targetRole: RoleCode): boolean {
  if (actorRole === 'OWNER') return true;
  return false;
}

/**
 * Checks if a profile is eligible to appear in the public catalog.
 * Section 5: Ни один салон, организация или профиль исполнителя не должен автоматически становиться публичным.
 * Если организация заблокирована, её услуги и публичные профили должны быть скрыты.
 */
export function isProfilePubliclyVisible(
  profile: Profile,
  organization?: Organization
): boolean {
  if (profile.moderationStatus !== 'APPROVED') {
    return false;
  }
  if (profile.type === 'ORGANIZATION' && organization) {
    if (organization.moderationStatus !== 'APPROVED') {
      return false;
    }
  }
  return true;
}

/**
 * Evaluates profile completeness (0 - 100) for moderation readiness.
 */
export function calculateProfileCompleteness(
  profile: Profile,
  services: ServiceItem[]
): { score: number; missingFields: string[] } {
  const missing: string[] = [];
  let points = 0;

  if (profile.displayName.trim().length >= 3) points += 15;
  else missing.push('Название / ФИО');

  if (profile.specialtyTitle.trim().length >= 3) points += 10;
  else missing.push('Специализация');

  if (profile.bio.trim().length >= 20) points += 15;
  else missing.push('Подробное описание (от 20 символов)');

  if (profile.regionId && profile.cityId && profile.districtId) points += 15;
  else missing.push('Регион, город и район');

  if (profile.phone.trim().length >= 10) points += 15;
  else missing.push('Контактный телефон');

  if (profile.photos.length >= 1) points += 15;
  else missing.push('Фотографии работ или студии');

  const profileServices = services.filter((s) => s.profileId === profile.id);
  if (profileServices.length >= 1) points += 15;
  else missing.push('Минимум 1 услуга с ценой');

  return { score: points, missingFields: missing };
}

/**
 * Checks if a curator has access to a given (regionId, categoryId) pair.
 * Section 4.1: Система должна поддерживать гибкую комбинацию РЕГИОН + НАПРАВЛЕНИЕ + КУРАТОР.
 * Один куратор не должен автоматически получать доступ к другим регионам или направлениям.
 */
export function isWithinCuratorScope(
  curatorId: string,
  regionId: string,
  categoryId: string,
  assignments: CuratorAssignment[]
): boolean {
  return assignments.some(
    (a) =>
      a.curatorId === curatorId &&
      a.regionId === regionId &&
      a.categoryId === categoryId &&
      a.isActive
  );
}

/**
 * Filters profiles that belong to a curator's assigned scope OR direct referral attribution.
 */
export function getCuratorVisibleProfiles(
  curatorId: string,
  profiles: Profile[],
  assignments: CuratorAssignment[]
): Profile[] {
  return profiles.filter(
    (p) =>
      p.curatorId === curatorId ||
      isWithinCuratorScope(curatorId, p.regionId, p.categoryId, assignments)
  );
}

/**
 * Validates moderation action and enforces conflict-of-interest & mandatory reason rules.
 * Section 5.6 & 5.7:
 * - При отказе или запросе исправлений модератор обязан указать причину.
 * - Куратор не может самостоятельно одобрять своих привлечённых исполнителей (конфликт интересов).
 */
export function validateModerationDecision(params: {
  actor: User;
  actorCuratorRecord?: Curator;
  profile: Profile;
  newStatus: ModerationStatus;
  reason?: string;
}): { valid: boolean; error?: string } {
  const { actor, actorCuratorRecord, profile, newStatus, reason } = params;

  if (actor.role !== 'CATEGORY_ADMIN' && actor.role !== 'OWNER') {
    return {
      valid: false,
      error: 'Только модератор направления или владелец платформы может принимать решения по модерации.',
    };
  }

  // Conflict of interest check: if actor is also a curator who referred this profile, block approval
  if (
    actorCuratorRecord &&
    profile.curatorId === actorCuratorRecord.id &&
    actor.role !== 'OWNER'
  ) {
    return {
      valid: false,
      error:
        'Конфликт интересов: куратор не может модерировать профиль исполнителя, за привлечение которого получает вознаграждение.',
    };
  }

  if (
    (newStatus === 'REJECTED' ||
      newStatus === 'CHANGES_REQUESTED' ||
      newStatus === 'SUSPENDED' ||
      newStatus === 'BLOCKED') &&
    (!reason || reason.trim().length < 5)
  ) {
    return {
      valid: false,
      error: 'При отклонении, возврате на доработку или блокировке необходимо указать подробную причину (минимум 5 символов).',
    };
  }

  return { valid: true };
}

/**
 * Prevents curator from reassigning an already-attributed executor.
 * Section 4.3: Куратор не должен иметь возможности самостоятельно перепривязать уже закреплённого за другим куратором исполнителя.
 */
export function canReassignExecutorCurator(
  actorRole: RoleCode,
  existingAttribution?: ReferralAttribution
): { allowed: boolean; error?: string } {
  if (actorRole !== 'OWNER') {
    return {
      allowed: false,
      error: 'Переназначение куратора для закреплённого исполнителя доступно только главному администратору с записью в журнал действий.',
    };
  }
  return { allowed: true };
}

/**
 * Calculates curator reward accruals based on active configurable RewardRules.
 * Section 4.4 & 16:
 * - Не начислять вознаграждение просто за создание аккаунта (требуется одобрение модерации и опубликованные услуги).
 * - Для процентных вознаграждений использовать только фактически подтверждённый доход платформы.
 * - Все финансовые операции связаны с конкретным основанием (eventKey). Нельзя допускать повторного начисления за одно событие.
 */
export function calculateEligibleRewardAccruals(params: {
  curator: Curator;
  profile: Profile;
  services: ServiceItem[];
  completedBookings: Booking[];
  approvedProfilesForCuratorCount: number;
  rules: RewardRule[];
  existingAccruals: RewardAccrual[];
  nowIso: string;
}): RewardAccrual[] {
  const {
    curator,
    profile,
    services,
    completedBookings,
    approvedProfilesForCuratorCount,
    rules,
    existingAccruals,
    nowIso,
  } = params;

  if (curator.status !== 'ACTIVE') return [];
  if (profile.curatorId !== curator.id) return [];
  // Must be approved by moderation first! Never accrue just for account creation.
  if (profile.moderationStatus !== 'APPROVED') return [];

  const publishedServices = services.filter(
    (s) => s.profileId === profile.id && s.moderationStatus === 'APPROVED'
  );

  const newAccruals: RewardAccrual[] = [];
  const existingKeys = new Set(existingAccruals.map((a) => a.eventKey));

  const applicableRules = rules.filter((rule) => {
    if (!rule.isActive) return false;
    if (rule.regionId && rule.regionId !== profile.regionId) return false;
    if (rule.categoryId && rule.categoryId !== profile.categoryId) return false;
    if (publishedServices.length < rule.minActiveServicesRequired) return false;
    return true;
  });

  for (const rule of applicableRules) {
    // 1. Onboarding Fixed Master / Organization reward
    if (
      (rule.ruleType === 'FIXED_MASTER' || rule.ruleType === 'COMBINED') &&
      profile.type === 'MASTER' &&
      rule.fixedMasterAmount > 0
    ) {
      const eventKey = `ONBOARD_MASTER:${rule.id}:${profile.id}`;
      if (!existingKeys.has(eventKey)) {
        existingKeys.add(eventKey);
        newAccruals.push({
          id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          eventKey,
          curatorId: curator.id,
          profileId: profile.id,
          executorName: profile.displayName,
          ruleId: rule.id,
          basisDescription: `Подключение и модерация частного мастера (${rule.name})`,
          amount: rule.fixedMasterAmount,
          status: 'PENDING_CONFIRMATION',
          sourceOperationId: profile.id,
          comment: 'Демонстрационные данные: начислено после успешной модерации и публикации услуг',
          isDemoData: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }

    if (
      (rule.ruleType === 'FIXED_ORG' || rule.ruleType === 'COMBINED') &&
      profile.type === 'ORGANIZATION' &&
      rule.fixedOrgAmount > 0
    ) {
      const eventKey = `ONBOARD_ORG:${rule.id}:${profile.id}`;
      if (!existingKeys.has(eventKey)) {
        existingKeys.add(eventKey);
        newAccruals.push({
          id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          eventKey,
          curatorId: curator.id,
          profileId: profile.id,
          executorName: profile.displayName,
          ruleId: rule.id,
          basisDescription: `Подключение и верификация организации (${rule.name})`,
          amount: rule.fixedOrgAmount,
          status: 'PENDING_CONFIRMATION',
          sourceOperationId: profile.id,
          comment: 'Демонстрационные данные: фиксированное вознаграждение за организацию',
          isDemoData: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }

    // 2. Percentage of confirmed platform revenue from completed bookings
    if (
      (rule.ruleType === 'PERCENT_REVENUE' || rule.ruleType === 'COMBINED') &&
      rule.revenuePercent > 0
    ) {
      const profileCompletedBookings = completedBookings.filter(
        (b) =>
          b.profileId === profile.id &&
          b.status === 'COMPLETED' &&
          b.platformFeeConfirmed > 0
      );

      for (const booking of profileCompletedBookings) {
        const eventKey = `BOOKING_REV:${rule.id}:${booking.id}`;
        if (!existingKeys.has(eventKey)) {
          const rewardAmount = Math.round(
            (booking.platformFeeConfirmed * rule.revenuePercent) / 100
          );
          if (rewardAmount > 0) {
            existingKeys.add(eventKey);
            newAccruals.push({
              id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              eventKey,
              curatorId: curator.id,
              profileId: profile.id,
              executorName: profile.displayName,
              ruleId: rule.id,
              basisDescription: `${rule.revenuePercent}% от подтверждённого дохода платформы (${booking.platformFeeConfirmed} ₽) по заказу #${booking.id}`,
              amount: rewardAmount,
              status: 'PENDING_CONFIRMATION',
              sourceOperationId: booking.id,
              comment: 'Демонстрационные данные: расчёт строго от фактической комиссии платформы',
              isDemoData: true,
              createdAt: nowIso,
              updatedAt: nowIso,
            });
          }
        }
      }
    }

    // 3. Regional plan fulfillment bonus
    if (
      (rule.ruleType === 'REGIONAL_PLAN' || rule.ruleType === 'COMBINED') &&
      rule.regionalPlanThreshold > 0 &&
      rule.regionalPlanBonus > 0 &&
      approvedProfilesForCuratorCount >= rule.regionalPlanThreshold
    ) {
      const eventKey = `REGIONAL_PLAN:${rule.id}:${curator.id}:T${rule.regionalPlanThreshold}`;
      if (!existingKeys.has(eventKey)) {
        existingKeys.add(eventKey);
        newAccruals.push({
          id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          eventKey,
          curatorId: curator.id,
          profileId: profile.id,
          executorName: profile.displayName,
          ruleId: rule.id,
          basisDescription: `Выполнение регионального плана (${approvedProfilesForCuratorCount}/${rule.regionalPlanThreshold} одобренных площадок)`,
          amount: rule.regionalPlanBonus,
          status: 'PENDING_CONFIRMATION',
          sourceOperationId: curator.id,
          comment: 'Демонстрационные данные: бонус за достижение целевого показателя региона',
          isDemoData: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }
  }

  return newAccruals;
}

/**
 * Validates booking creation and prevents double-booking of the same schedule slot.
 * Section 19 Criterion 12: Двойная запись исключена.
 */
export function canCreateBookingForSlot(
  slot: ScheduleSlot,
  existingBookings: Booking[]
): { allowed: boolean; error?: string } {
  if (slot.isClosedByMaster) {
    return { allowed: false, error: 'Выбранный интервал закрыт мастером.' };
  }
  if (slot.isBooked) {
    return { allowed: false, error: 'Это время уже занято другим клиентом.' };
  }
  const activeBookingOnSlot = existingBookings.some(
    (b) =>
      b.slotId === slot.id &&
      (b.status === 'PENDING' || b.status === 'CONFIRMED' || b.status === 'COMPLETED')
  );
  if (activeBookingOnSlot) {
    return { allowed: false, error: 'Двойная запись исключена: слот уже забронирован.' };
  }
  return { allowed: true };
}

/**
 * Validates review creation: must be tied to a COMPLETED booking by that client, and no duplicate review.
 * Section 11: Отзывы должны быть привязаны к реально завершённой записи или подтверждённому заказу.
 * Защита от повторных отзывов.
 */
export function canSubmitReview(
  clientId: string,
  booking: Booking,
  existingReviews: Review[]
): { allowed: boolean; error?: string } {
  if (booking.clientId !== clientId) {
    return { allowed: false, error: 'Вы можете оставить отзыв только по своей записи.' };
  }
  if (booking.status !== 'COMPLETED') {
    return {
      allowed: false,
      error: 'Отзыв можно оставить только после фактического завершения визита.',
    };
  }
  const alreadyReviewed = existingReviews.some((r) => r.bookingId === booking.id);
  if (alreadyReviewed) {
    return {
      allowed: false,
      error: 'По данной записи отзыв уже был опубликован (защита от повторных отзывов).',
    };
  }
  return { allowed: true };
}
