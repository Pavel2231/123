export type RoleCode =
  | 'CLIENT'
  | 'MASTER'
  | 'ORGANIZATION'
  | 'ORG_EMPLOYEE'
  | 'CURATOR'
  | 'CATEGORY_ADMIN'
  | 'OWNER';

export type ModerationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'RESUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'BLOCKED';

export type ProfileType = 'MASTER' | 'ORGANIZATION';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export type ServiceRequestStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type RewardRuleType =
  | 'FIXED_MASTER'
  | 'FIXED_ORG'
  | 'PERCENT_REVENUE'
  | 'REGIONAL_PLAN'
  | 'COMBINED';

export type RewardOperationStatus =
  | 'PENDING_CONFIRMATION'
  | 'ACCRUED'
  | 'AVAILABLE_FOR_PAYOUT'
  | 'PAID'
  | 'CANCELLED'
  | 'REJECTED';

export interface RoleDefinition {
  code: RoleCode;
  title: string;
  description: string;
  isPrivileged: boolean;
  permissions: string[];
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: RoleCode;
  regionId: string;
  cityId: string;
  avatarUrl?: string;
  createdAt: string;
  isActive: boolean;
  referredByCode?: string;
}

export interface Region {
  id: string;
  country: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface City {
  id: string;
  regionId: string;
  name: string;
  isActive: boolean;
}

export interface District {
  id: string;
  cityId: string;
  name: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  requiresQualificationDocs: boolean;
  isActive: boolean;
}

export interface ServiceItem {
  id: string;
  profileId: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  durationMinutes: number;
  homeVisitAvailable: boolean;
  moderationStatus: ModerationStatus;
  createdAt: string;
}

export interface ScheduleSlot {
  id: string;
  profileId: string;
  employeeId?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  isBooked: boolean;
  isClosedByMaster: boolean;
}

export interface Profile {
  id: string;
  userId: string;
  type: ProfileType;
  displayName: string;
  specialtyTitle: string;
  bio: string;
  regionId: string;
  cityId: string;
  districtId: string;
  address: string;
  categoryId: string;
  homeVisit: boolean;
  serviceAreaDescription?: string;
  phone: string;
  photos: string[];
  qualificationDocsNote?: string; // Never exposed publicly
  moderationStatus: ModerationStatus;
  moderationComment?: string;
  moderationUpdatedAt: string;
  moderationUpdatedBy?: string;
  verifiedBadge: boolean;
  rating: number;
  reviewsCount: number;
  curatorId?: string;
  referralCodeUsed?: string;
  createdAt: string;
  approvedAt?: string;
  firstServicePublishedAt?: string;
}

export interface Organization {
  id: string;
  profileId: string;
  ownerUserId: string;
  legalName: string;
  inn: string;
  responsiblePersonName: string;
  responsiblePersonPhone: string;
  moderationStatus: ModerationStatus;
  interiorPhotos: string[];
  verificationDocsStatus: 'NOT_PROVIDED' | 'PROVIDED' | 'VERIFIED';
  createdAt: string;
}

export interface Branch {
  id: string;
  organizationId: string;
  cityId: string;
  districtId: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
}

export interface Employee {
  id: string;
  organizationId: string;
  branchId: string;
  userId?: string;
  name: string;
  position: string;
  rolePermissions: ('MANAGE_SCHEDULE' | 'MANAGE_BOOKINGS' | 'MANAGE_SERVICES')[];
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  profileId: string;
  serviceId: string;
  serviceTitle: string;
  price: number;
  platformFeeConfirmed: number; // Confirmed platform revenue for reward calc
  slotId: string;
  date: string;
  time: string;
  status: BookingStatus;
  comment?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ServiceRequest {
  id: string;
  clientId: string;
  clientName: string;
  categoryId: string;
  regionId: string;
  cityId: string;
  districtId?: string;
  title: string;
  description: string;
  preferredTime: string;
  budgetHint?: number;
  photos: string[];
  status: ServiceRequestStatus;
  selectedOfferId?: string;
  createdAt: string;
}

export interface Offer {
  id: string;
  requestId: string;
  profileId: string;
  masterName: string;
  solutionDescription: string;
  estimatedPrice: number;
  estimatedDuration: string;
  homeVisitTerms: string;
  status: 'SENT' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  clientId: string;
  clientName: string;
  profileId: string;
  rating: number;
  text: string;
  createdAt: string;
  moderationStatus: 'PUBLISHED' | 'HIDDEN' | 'FLAGGED';
}

export interface Complaint {
  id: string;
  authorUserId: string;
  targetType: 'PROFILE' | 'REVIEW' | 'BOOKING';
  targetId: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED' | 'REJECTED';
  resolutionComment?: string;
  createdAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  profileId: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  roleTarget?: RoleCode;
  title: string;
  message: string;
  type: 'BOOKING' | 'MODERATION' | 'CURATOR' | 'REWARD' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
}

export interface ModerationApplication {
  id: string;
  profileId: string;
  profileType: ProfileType;
  applicantUserId: string;
  regionId: string;
  categoryId: string;
  curatorId?: string;
  submittedAt: string;
  status: ModerationStatus;
  completenessScore: number;
  reasonComment?: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
}

export interface ModerationHistoryItem {
  id: string;
  applicationId: string;
  profileId: string;
  previousStatus: ModerationStatus;
  newStatus: ModerationStatus;
  actorUserId: string;
  actorName: string;
  reason?: string;
  createdAt: string;
}

export interface Curator {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  status: 'ACTIVE' | 'SUSPENDED';
  referralCode: string;
  regionalPlanTarget: number;
  joinedAt: string;
}

export interface CuratorAssignment {
  id: string;
  curatorId: string;
  regionId: string;
  categoryId: string;
  assignedByUserId: string;
  assignedAt: string;
  isActive: boolean;
}

export interface ReferralLink {
  id: string;
  curatorId: string;
  code: string;
  regionId: string;
  categoryId: string;
  clicksCount: number;
  registrationsCount: number;
  createdAt: string;
}

export interface ReferralAttribution {
  id: string;
  profileId: string;
  invitedUserId: string;
  curatorId: string;
  referralCode: string;
  regionId: string;
  categoryId: string;
  invitedAt: string;
  registrationStatus: ModerationStatus;
  moderationApprovedAt?: string;
  firstServicePublishedAt?: string;
  currentExecutorStatus: 'ONBOARDING' | 'ACTIVE' | 'SUSPENDED';
}

export interface RewardRule {
  id: string;
  name: string;
  ruleType: RewardRuleType;
  regionId?: string; // Optional scope restriction
  categoryId?: string; // Optional scope restriction
  fixedMasterAmount: number;
  fixedOrgAmount: number;
  revenuePercent: number;
  regionalPlanThreshold: number;
  regionalPlanBonus: number;
  minActiveServicesRequired: number;
  effectiveFrom: string;
  periodDays: number;
  isActive: boolean;
}

export interface RewardAccrual {
  id: string;
  eventKey: string; // Unique key preventing duplicate accrual for the same event
  curatorId: string;
  profileId: string;
  executorName: string;
  ruleId: string;
  basisDescription: string;
  amount: number;
  status: RewardOperationStatus;
  sourceOperationId?: string;
  comment: string;
  isDemoData: true;
  createdAt: string;
  updatedAt: string;
}

export interface RewardPayment {
  id: string;
  curatorId: string;
  accrualIds: string[];
  amount: number;
  status: RewardOperationStatus;
  comment: string;
  processedByUserId: string;
  isDemoData: true;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  actorName: string;
  actorRole: RoleCode;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface MarketplaceDatabase {
  users: User[];
  regions: Region[];
  cities: City[];
  districts: District[];
  categories: Category[];
  profiles: Profile[];
  organizations: Organization[];
  branches: Branch[];
  employees: Employee[];
  services: ServiceItem[];
  schedules: ScheduleSlot[];
  bookings: Booking[];
  serviceRequests: ServiceRequest[];
  offers: Offer[];
  reviews: Review[];
  complaints: Complaint[];
  favorites: Favorite[];
  notifications: NotificationItem[];
  moderationApplications: ModerationApplication[];
  moderationHistory: ModerationHistoryItem[];
  curators: Curator[];
  curatorAssignments: CuratorAssignment[];
  referralLinks: ReferralLink[];
  referralAttributions: ReferralAttribution[];
  rewardRules: RewardRule[];
  rewardAccruals: RewardAccrual[];
  rewardPayments: RewardPayment[];
  auditLogs: AuditLog[];
}
