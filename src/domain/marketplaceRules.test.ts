import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEligibleRewardAccruals,
  calculateProfileCompleteness,
  canAssignRole,
  canCreateBookingForSlot,
  canReassignExecutorCurator,
  canSelfRegisterRole,
  canSubmitReview,
  isProfilePubliclyVisible,
  isWithinCuratorScope,
  validateModerationDecision,
} from './marketplaceRules';
import {
  Booking,
  Curator,
  CuratorAssignment,
  Profile,
  RewardRule,
  ScheduleSlot,
  ServiceItem,
  User,
} from './types';

test('RBAC: self-registration is restricted to CLIENT, MASTER, ORGANIZATION only', () => {
  assert.equal(canSelfRegisterRole('CLIENT'), true);
  assert.equal(canSelfRegisterRole('MASTER'), true);
  assert.equal(canSelfRegisterRole('ORGANIZATION'), true);
  assert.equal(canSelfRegisterRole('CURATOR'), false);
  assert.equal(canSelfRegisterRole('CATEGORY_ADMIN'), false);
  assert.equal(canSelfRegisterRole('OWNER'), false);
});

test('RBAC: only OWNER can assign privileged roles or reassign executor curator', () => {
  assert.equal(canAssignRole('OWNER', 'CURATOR'), true);
  assert.equal(canAssignRole('CURATOR', 'CURATOR'), false);
  assert.equal(canAssignRole('CATEGORY_ADMIN', 'CURATOR'), false);

  assert.equal(canReassignExecutorCurator('CURATOR').allowed, false);
  assert.equal(canReassignExecutorCurator('OWNER').allowed, true);
});

test('Moderation: profile is never public until APPROVED and organization is not blocked', () => {
  const baseProfile: Profile = {
    id: 'p1',
    userId: 'u1',
    type: 'MASTER',
    displayName: 'Елена Соколова',
    specialtyTitle: 'Косметолог-эстетист',
    bio: 'Профессиональный уход и эстетическая косметология в Кемерово.',
    regionId: 'reg-kuzbass',
    cityId: 'city-kemerovo',
    districtId: 'dist-kem-center',
    address: 'пр. Советский, 42',
    categoryId: 'cat-beauty',
    homeVisit: false,
    phone: '+79001112233',
    photos: ['/photo1.jpg'],
    moderationStatus: 'SUBMITTED',
    moderationUpdatedAt: '2026-11-05T10:00:00Z',
    verifiedBadge: false,
    rating: 0,
    reviewsCount: 0,
    createdAt: '2026-11-05T09:00:00Z',
  };

  assert.equal(isProfilePubliclyVisible(baseProfile), false);
  assert.equal(
    isProfilePubliclyVisible({ ...baseProfile, moderationStatus: 'APPROVED' }),
    true
  );
});

test('Moderation: enforces mandatory reason on rejection and prevents curator conflict of interest', () => {
  const curatorUser: User = {
    id: 'u-cur',
    name: 'Игорь Кураторов',
    phone: '+79000000001',
    email: 'cur@ryadom.ru',
    role: 'CATEGORY_ADMIN',
    regionId: 'reg-kuzbass',
    cityId: 'city-kemerovo',
    createdAt: '2026-11-01T00:00:00Z',
    isActive: true,
  };

  const curatorRecord: Curator = {
    id: 'cur-1',
    userId: 'u-cur',
    name: 'Игорь Кураторов',
    phone: '+79000000001',
    email: 'cur@ryadom.ru',
    status: 'ACTIVE',
    referralCode: 'KUZ-BEAUTY',
    regionalPlanTarget: 5,
    joinedAt: '2026-11-01T00:00:00Z',
  };

  const profile: Profile = {
    id: 'p1',
    userId: 'u2',
    type: 'MASTER',
    displayName: 'Анна Мастер',
    specialtyTitle: 'Визажист',
    bio: 'Вечерний и свадебный макияж в центре Кемерово.',
    regionId: 'reg-kuzbass',
    cityId: 'city-kemerovo',
    districtId: 'dist-kem-center',
    address: 'ул. Весенняя, 12',
    categoryId: 'cat-beauty',
    homeVisit: true,
    phone: '+79002223344',
    photos: ['/img.jpg'],
    moderationStatus: 'SUBMITTED',
    moderationUpdatedAt: '2026-11-05T10:00:00Z',
    verifiedBadge: false,
    rating: 0,
    reviewsCount: 0,
    curatorId: 'cur-1',
    createdAt: '2026-11-05T10:00:00Z',
  };

  // Conflict of interest: curator trying to approve their own referred profile
  const conflictCheck = validateModerationDecision({
    actor: curatorUser,
    actorCuratorRecord: curatorRecord,
    profile,
    newStatus: 'APPROVED',
  });
  assert.equal(conflictCheck.valid, false);

  // Independent moderator rejecting without a reason
  const independentMod: User = { ...curatorUser, id: 'u-mod-2' };
  const missingReasonCheck = validateModerationDecision({
    actor: independentMod,
    profile,
    newStatus: 'CHANGES_REQUESTED',
    reason: '',
  });
  assert.equal(missingReasonCheck.valid, false);

  // Independent moderator requesting changes with valid reason
  const validReturnCheck = validateModerationDecision({
    actor: independentMod,
    profile,
    newStatus: 'CHANGES_REQUESTED',
    reason: 'Пожалуйста, добавьте реальные фотографии рабочего места и уточните прайс.',
  });
  assert.equal(validReturnCheck.valid, true);
});

test('Curator Scope: strictly checks REGION + CATEGORY assignment', () => {
  const assignments: CuratorAssignment[] = [
    {
      id: 'ca-1',
      curatorId: 'cur-1',
      regionId: 'reg-kuzbass',
      categoryId: 'cat-beauty',
      assignedByUserId: 'u-owner',
      assignedAt: '2026-11-01T00:00:00Z',
      isActive: true,
    },
  ];

  assert.equal(
    isWithinCuratorScope('cur-1', 'reg-kuzbass', 'cat-beauty', assignments),
    true
  );
  assert.equal(
    isWithinCuratorScope('cur-1', 'reg-kuzbass', 'cat-auto', assignments),
    false
  );
  assert.equal(
    isWithinCuratorScope('cur-1', 'reg-nsk', 'cat-beauty', assignments),
    false
  );
});

test('Reward Engine: calculates accruals only for APPROVED profiles, uses confirmed platform fee, and blocks duplicates', () => {
  const curator: Curator = {
    id: 'cur-1',
    userId: 'u-cur',
    name: 'Дмитрий Кузбасс',
    phone: '+79001234567',
    email: 'dmitry@ryadom.ru',
    status: 'ACTIVE',
    referralCode: 'CUR-KUZ-01',
    regionalPlanTarget: 2,
    joinedAt: '2026-10-01T00:00:00Z',
  };

  const profile: Profile = {
    id: 'prof-1',
    userId: 'u-master',
    type: 'MASTER',
    displayName: 'Алексей Громов',
    specialtyTitle: 'Инженер-электрик',
    bio: 'Электромонтаж и сборка щитов в Кемерово и Новокузнецке.',
    regionId: 'reg-kuzbass',
    cityId: 'city-kemerovo',
    districtId: 'dist-kem-center',
    address: 'пр. Ленина, 55',
    categoryId: 'cat-repair',
    homeVisit: true,
    phone: '+79005556677',
    photos: ['/photo.jpg'],
    moderationStatus: 'APPROVED',
    moderationUpdatedAt: '2026-11-02T00:00:00Z',
    verifiedBadge: true,
    rating: 5.0,
    reviewsCount: 1,
    curatorId: 'cur-1',
    createdAt: '2026-11-01T00:00:00Z',
  };

  const services: ServiceItem[] = [
    {
      id: 'srv-1',
      profileId: 'prof-1',
      categoryId: 'cat-repair',
      title: 'Монтаж электрощита',
      description: 'Сборка и подключение с автоматикой',
      price: 8500,
      durationMinutes: 180,
      homeVisitAvailable: true,
      moderationStatus: 'APPROVED',
      createdAt: '2026-11-01T00:00:00Z',
    },
  ];

  const completedBookings: Booking[] = [
    {
      id: 'bk-1',
      clientId: 'u-client',
      clientName: 'Сергей К.',
      clientPhone: '+79009998877',
      profileId: 'prof-1',
      serviceId: 'srv-1',
      serviceTitle: 'Монтаж электрощита',
      price: 8500,
      platformFeeConfirmed: 850,
      slotId: 'slot-1',
      date: '2026-11-04',
      time: '14:00',
      status: 'COMPLETED',
      createdAt: '2026-11-03T00:00:00Z',
      completedAt: '2026-11-04T17:00:00Z',
    },
  ];

  const rules: RewardRule[] = [
    {
      id: 'rule-comb-1',
      name: 'Кузбасс: Комбинированный (Старт + % от дохода платформы)',
      ruleType: 'COMBINED',
      regionId: 'reg-kuzbass',
      fixedMasterAmount: 1500,
      fixedOrgAmount: 3500,
      revenuePercent: 20, // 20% of 850 = 170 RUB
      regionalPlanThreshold: 5,
      regionalPlanBonus: 10000,
      minActiveServicesRequired: 1,
      effectiveFrom: '2026-01-01',
      periodDays: 30,
      isActive: true,
    },
  ];

  const firstRun = calculateEligibleRewardAccruals({
    curator,
    profile,
    services,
    completedBookings,
    approvedProfilesForCuratorCount: 1,
    rules,
    existingAccruals: [],
    nowIso: '2026-11-05T12:00:00Z',
  });

  assert.equal(firstRun.length, 2);
  assert.equal(firstRun[0].amount, 1500);
  assert.equal(firstRun[1].amount, 170);

  // Second run with existing accruals must return 0 new accruals (idempotency / anti-duplicate)
  const secondRun = calculateEligibleRewardAccruals({
    curator,
    profile,
    services,
    completedBookings,
    approvedProfilesForCuratorCount: 1,
    rules,
    existingAccruals: firstRun,
    nowIso: '2026-11-05T12:05:00Z',
  });
  assert.equal(secondRun.length, 0);
});

test('Booking & Reviews: prevents double booking and prevents duplicate or premature reviews', () => {
  const slot: ScheduleSlot = {
    id: 'slot-100',
    profileId: 'prof-1',
    date: '2026-11-07',
    time: '11:00',
    isBooked: false,
    isClosedByMaster: false,
  };

  assert.equal(canCreateBookingForSlot(slot, []).allowed, true);

  const existingBooking: Booking = {
    id: 'bk-100',
    clientId: 'u-client-1',
    clientName: 'Мария П.',
    clientPhone: '+79001112233',
    profileId: 'prof-1',
    serviceId: 'srv-1',
    serviceTitle: 'Консультация',
    price: 2500,
    platformFeeConfirmed: 250,
    slotId: 'slot-100',
    date: '2026-11-07',
    time: '11:00',
    status: 'CONFIRMED',
    createdAt: '2026-11-05T10:00:00Z',
  };

  // Double booking on same slot must be blocked
  assert.equal(
    canCreateBookingForSlot(slot, [existingBooking]).allowed,
    false
  );

  // Cannot review until status is COMPLETED
  assert.equal(
    canSubmitReview('u-client-1', existingBooking, []).allowed,
    false
  );

  const completedBooking: Booking = { ...existingBooking, status: 'COMPLETED' };
  assert.equal(
    canSubmitReview('u-client-1', completedBooking, []).allowed,
    true
  );

  // Duplicate review for same booking blocked
  const completeness = calculateProfileCompleteness(
    {
      id: 'p1',
      userId: 'u1',
      type: 'MASTER',
      displayName: 'Мастер',
      specialtyTitle: 'Профи',
      bio: 'Очень подробное описание услуг мастера для проверки анкеты.',
      regionId: 'r1',
      cityId: 'c1',
      districtId: 'd1',
      address: 'ул. Мира 1',
      categoryId: 'cat1',
      homeVisit: false,
      phone: '+79990001122',
      photos: ['/a.jpg'],
      moderationStatus: 'APPROVED',
      moderationUpdatedAt: '',
      verifiedBadge: true,
      rating: 5,
      reviewsCount: 1,
      createdAt: '',
    },
    [
      {
        id: 's1',
        profileId: 'p1',
        categoryId: 'cat1',
        title: 'Услуга',
        description: 'Описание',
        price: 1000,
        durationMinutes: 60,
        homeVisitAvailable: false,
        moderationStatus: 'APPROVED',
        createdAt: '',
      },
    ]
  );
  assert.equal(completeness.score, 100);
});
