import React, { useEffect, useState } from 'react';
import {
  Compass,
  FileText,
  UserPlus,
  LayoutDashboard,
} from 'lucide-react';
import {
  MarketplaceDatabase,
  ModerationStatus,
  RewardOperationStatus,
  RewardRuleType,
  RoleCode,
  User,
} from './domain/types';
import { ROLE_DEFINITIONS } from './domain/marketplaceRules';
import { createInitialSeedDatabase } from './domain/seedData';
import { CatalogView } from './components/CatalogView';
import { ServiceRequestsView } from './components/ServiceRequestsView';
import { OnboardingModal } from './components/OnboardingModal';
import { ClientCabinet } from './components/ClientCabinet';
import { ExecutorCabinet } from './components/ExecutorCabinet';
import { CuratorCabinet } from './components/CuratorCabinet';
import { ModeratorPanel } from './components/ModeratorPanel';
import { OwnerAdminPanel } from './components/OwnerAdminPanel';

type MainSection = 'CATALOG' | 'REQUESTS' | 'CABINET';

export default function App() {
  const [db, setDb] = useState<MarketplaceDatabase>(() => createInitialSeedDatabase());
  const [activeSection, setActiveSection] = useState<MainSection>('CATALOG');
  const [activeRole, setActiveRole] = useState<RoleCode>('CLIENT');
  const [currentUserId, setCurrentUserId] = useState<string>('u-client-1');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('reg-kuzbass');
  const [selectedCityId, setSelectedCityId] = useState<string>('city-kemerovo');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [initialRefCode, setInitialRefCode] = useState('KUZ-BEAUTY-01');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');
    if (refParam) {
      setInitialRefCode(refParam.toUpperCase());
      setIsRegisterModalOpen(true);
    }

    fetch('/api/state')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverDb: MarketplaceDatabase | null) => {
        if (serverDb && serverDb.users) {
          setDb(serverDb);
        }
      })
      .catch(() => {});
  }, []);

  const currentUser: User =
    db.users.find((u) => u.id === currentUserId) ||
    db.users.find((u) => u.role === activeRole) ||
    db.users[0];

  const handleSelectRoleMode = (role: RoleCode) => {
    setActiveRole(role);
    const matchingUser = db.users.find((u) => u.role === role);
    if (matchingUser) {
      setCurrentUserId(matchingUser.id);
    }
    setActiveSection('CABINET');
  };

  async function apiPost<T = any>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка запроса к серверу');
    }
    if (data.db) {
      setDb(data.db);
    }
    return data as T;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0914] text-[#F5F3FF] pb-20 md:pb-0">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-4 bg-[#0B0914]/95 backdrop-blur-md border-b border-white/10">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#catalog"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('CATALOG');
          }}
          className="text-xl font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0"
        >
          РЯДОМ
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
          aria-label="Основная навигация"
        >
          <a
            href="#catalog"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('CATALOG');
            }}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'CATALOG' ? 'text-white underline' : ''
            }`}
          >
            Каталог мастеров
          </a>
          <a
            href="#requests"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('REQUESTS');
            }}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'REQUESTS' ? 'text-white underline' : ''
            }`}
          >
            Заявки клиентов
          </a>
          <a
            href="#register"
            onClick={(e) => {
              e.preventDefault();
              setIsRegisterModalOpen(true);
            }}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Подключение исполнителей
          </a>
          <a
            href="#cabinet"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('CABINET');
            }}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'CABINET' ? 'text-white underline' : ''
            }`}
          >
            Личный кабинет
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Регистрация профиля
          </button>
        </div>
      </header>

      {/* Workspace Role Switcher Toolbar below header */}
      <div className="bg-[#130F24] border-b border-white/10 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="text-[#A78BFA] font-semibold whitespace-nowrap shrink-0">
              Активная роль:
            </span>
            <span className="font-semibold text-white whitespace-nowrap shrink-0">
              {ROLE_DEFINITIONS[activeRole].title}
            </span>
            <span aria-hidden="true" className="text-slate-500">
              ·
            </span>
            <span className="text-slate-400 truncate max-w-[260px] sm:max-w-md">
              {currentUser.name}
            </span>
          </div>

          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Переключение рабочего кабинета по ролям"
          >
            {(
              [
                { code: 'CLIENT', shortLabel: 'Клиент' },
                { code: 'MASTER', shortLabel: 'Частный мастер' },
                { code: 'ORGANIZATION', shortLabel: 'Организация' },
                { code: 'ORG_EMPLOYEE', shortLabel: 'Сотрудник' },
                { code: 'CURATOR', shortLabel: 'Куратор' },
                { code: 'CATEGORY_ADMIN', shortLabel: 'Модератор' },
                { code: 'OWNER', shortLabel: 'Владелец' },
              ] as { code: RoleCode; shortLabel: string }[]
            ).map(({ code: roleCode, shortLabel }) => (
              <button
                key={roleCode}
                type="button"
                onClick={() => handleSelectRoleMode(roleCode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeRole === roleCode && activeSection === 'CABINET'
                    ? 'bg-[#7C3AED] text-white font-semibold'
                    : 'bg-[#0B0914] text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                {shortLabel}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeSection === 'CATALOG' && (
          <CatalogView
            currentUser={currentUser}
            regions={db.regions}
            cities={db.cities}
            districts={db.districts}
            categories={db.categories}
            profiles={db.profiles}
            organizations={db.organizations}
            services={db.services}
            schedules={db.schedules}
            reviews={db.reviews}
            favorites={db.favorites}
            bookings={db.bookings}
            selectedRegionId={selectedRegionId}
            selectedCityId={selectedCityId}
            onSelectRegion={(regId) => {
              setSelectedRegionId(regId);
              const firstCity = db.cities.find((c) => c.regionId === regId);
              setSelectedCityId(firstCity ? firstCity.id : 'ALL');
            }}
            onSelectCity={setSelectedCityId}
            onToggleFavorite={async (profileId) => {
              await apiPost('/api/favorites/toggle', {
                userId: currentUser.id,
                profileId,
              });
            }}
            onCreateBooking={async (payload) => {
              await apiPost('/api/bookings/create', {
                ...payload,
                clientId: currentUser.id,
              });
            }}
            onOpenRequestsSection={() => setActiveSection('REQUESTS')}
            onOpenRegisterModal={(refCode) => {
              if (refCode) setInitialRefCode(refCode);
              setIsRegisterModalOpen(true);
            }}
          />
        )}

        {activeSection === 'REQUESTS' && (
          <ServiceRequestsView
            currentUser={currentUser}
            regions={db.regions}
            cities={db.cities}
            categories={db.categories}
            serviceRequests={db.serviceRequests}
            offers={db.offers}
            profiles={db.profiles}
            selectedRegionId={selectedRegionId}
            selectedCityId={selectedCityId}
            onCreateRequest={async (payload) => {
              await apiPost('/api/requests/create', {
                ...payload,
                clientId: currentUser.id,
                clientName: currentUser.name,
              });
            }}
            onSendOffer={async (payload) => {
              await apiPost('/api/requests/offer', payload);
            }}
            onAcceptOffer={async (requestId, offerId) => {
              await apiPost('/api/requests/accept-offer', { requestId, offerId });
            }}
          />
        )}

        {activeSection === 'CABINET' && (
          <>
            {activeRole === 'CLIENT' && (
              <ClientCabinet
                currentUser={currentUser}
                bookings={db.bookings}
                favorites={db.favorites}
                profiles={db.profiles}
                reviews={db.reviews}
                notifications={db.notifications}
                onCancelBooking={async (bookingId) => {
                  await apiPost('/api/bookings/status', {
                    actorUserId: currentUser.id,
                    bookingId,
                    status: 'CANCELLED',
                  });
                }}
                onSubmitReview={async (payload) => {
                  await apiPost('/api/reviews/create', {
                    ...payload,
                    clientId: currentUser.id,
                  });
                }}
                onToggleFavorite={async (profileId) => {
                  await apiPost('/api/favorites/toggle', {
                    userId: currentUser.id,
                    profileId,
                  });
                }}
                onMarkNotificationsRead={async () => {
                  await apiPost('/api/notifications/read', {
                    userId: currentUser.id,
                  });
                }}
              />
            )}

            {(activeRole === 'MASTER' ||
              activeRole === 'ORGANIZATION' ||
              activeRole === 'ORG_EMPLOYEE') && (
              <ExecutorCabinet
                currentUser={currentUser}
                profiles={db.profiles}
                organizations={db.organizations}
                branches={db.branches}
                employees={db.employees}
                services={db.services}
                schedules={db.schedules}
                bookings={db.bookings}
                regions={db.regions}
                cities={db.cities}
                districts={db.districts}
                categories={db.categories}
                onSaveProfile={async (payload) => {
                  await apiPost('/api/profiles/save', {
                    ...payload,
                    actorUserId: currentUser.id,
                  });
                }}
                onAddService={async (payload) => {
                  await apiPost('/api/services/add', payload);
                }}
                onManageSchedule={async (payload) => {
                  await apiPost('/api/schedules/slot', payload);
                }}
                onUpdateBookingStatus={async (bookingId, status) => {
                  await apiPost('/api/bookings/status', {
                    actorUserId: currentUser.id,
                    bookingId,
                    status,
                  });
                }}
                onManageOrganization={async (payload) => {
                  await apiPost('/api/organizations/manage', payload);
                }}
              />
            )}

            {activeRole === 'CURATOR' && (
              <CuratorCabinet
                currentUser={currentUser}
                curators={db.curators}
                assignments={db.curatorAssignments}
                regions={db.regions}
                categories={db.categories}
                profiles={db.profiles}
                services={db.services}
                referralLinks={db.referralLinks}
                referralAttributions={db.referralAttributions}
                rewardAccruals={db.rewardAccruals}
                rewardPayments={db.rewardPayments}
                onOpenInviteRegistration={(refCode) => {
                  setInitialRefCode(refCode);
                  setIsRegisterModalOpen(true);
                }}
                onCuratorResubmitProfile={async (payload) => {
                  await apiPost('/api/curator/resubmit', payload);
                }}
              />
            )}

            {activeRole === 'CATEGORY_ADMIN' && (
              <ModeratorPanel
                currentUser={currentUser}
                profiles={db.profiles}
                services={db.services}
                regions={db.regions}
                cities={db.cities}
                categories={db.categories}
                curators={db.curators}
                moderationHistory={db.moderationHistory}
                complaints={db.complaints}
                onDecideModeration={async (payload: {
                  profileId: string;
                  newStatus: ModerationStatus;
                  reason: string;
                }) => {
                  await apiPost('/api/moderation/decide', {
                    ...payload,
                    actorUserId: currentUser.id,
                  });
                }}
                onResolveComplaint={async (payload) => {
                  await apiPost('/api/complaints/resolve', {
                    ...payload,
                    actorUserId: currentUser.id,
                  });
                }}
              />
            )}

            {activeRole === 'OWNER' && (
              <OwnerAdminPanel
                currentUser={currentUser}
                users={db.users}
                profiles={db.profiles}
                organizations={db.organizations}
                services={db.services}
                bookings={db.bookings}
                serviceRequests={db.serviceRequests}
                regions={db.regions}
                cities={db.cities}
                categories={db.categories}
                curators={db.curators}
                curatorAssignments={db.curatorAssignments}
                rewardRules={db.rewardRules}
                rewardAccruals={db.rewardAccruals}
                rewardPayments={db.rewardPayments}
                auditLogs={db.auditLogs}
                onManageGeographyOrCategory={async (payload) => {
                  await apiPost('/api/admin/geography-category', {
                    ...payload,
                    actorUserId: currentUser.id,
                  });
                }}
                onAssignCurator={async (payload) => {
                  await apiPost('/api/admin/curators/assign', {
                    ...payload,
                    actorUserId: currentUser.id,
                  });
                }}
                onSaveRewardRule={async (payload: {
                  ruleId?: string;
                  name: string;
                  ruleType: RewardRuleType;
                  regionId?: string;
                  fixedMasterAmount: number;
                  fixedOrgAmount: number;
                  revenuePercent: number;
                  regionalPlanThreshold: number;
                  regionalPlanBonus: number;
                }) => {
                  await apiPost('/api/admin/rewards/rule', {
                    ...payload,
                    actorUserId: currentUser.id,
                  });
                }}
                onUpdateAccrualStatus={async (
                  accrualId: string,
                  newStatus: RewardOperationStatus
                ) => {
                  await apiPost('/api/admin/rewards/accrual-status', {
                    actorUserId: currentUser.id,
                    accrualId,
                    newStatus,
                  });
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-white/10 bg-[#0B0914] py-8 px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <p className="font-bold text-white">РЯДОМ — Найди своего мастера</p>
            <p className="mt-0.5">
              Региональный маркетплейс услуг и специалистов · Кемеровская область — Кузбасс и регионы России
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveSection('CATALOG')}
              className="hover:text-white transition-colors"
            >
              Каталог исполнителей
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('REQUESTS')}
              className="hover:text-white transition-colors"
            >
              Заявки без фиксированной записи
            </button>
            <button
              type="button"
              onClick={() => handleSelectRoleMode('CURATOR')}
              className="hover:text-white transition-colors"
            >
              Кабинет куратора
            </button>
            <button
              type="button"
              onClick={() => handleSelectRoleMode('CATEGORY_ADMIN')}
              className="hover:text-white transition-colors"
            >
              Панель модератора
            </button>
            <button
              type="button"
              onClick={() => handleSelectRoleMode('OWNER')}
              className="hover:text-white transition-colors"
            >
              Панель владельца
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation (<=15% sticky height cap) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#130F24]/95 backdrop-blur-md border-t border-white/10 px-4 py-2 flex items-center justify-around"
        aria-label="Мобильная навигация"
      >
        <button
          type="button"
          onClick={() => setActiveSection('CATALOG')}
          className={`flex flex-col items-center gap-0.5 text-[11px] font-medium py-1 px-2 ${
            activeSection === 'CATALOG' ? 'text-[#A78BFA]' : 'text-slate-400'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Каталог</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('REQUESTS')}
          className={`flex flex-col items-center gap-0.5 text-[11px] font-medium py-1 px-2 ${
            activeSection === 'REQUESTS' ? 'text-[#A78BFA]' : 'text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Заявки</span>
        </button>
        <button
          type="button"
          onClick={() => setIsRegisterModalOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[11px] font-medium py-1 px-2 text-slate-400"
        >
          <UserPlus className="w-4 h-4" />
          <span>Регистрация</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('CABINET')}
          className={`flex flex-col items-center gap-0.5 text-[11px] font-medium py-1 px-2 ${
            activeSection === 'CABINET' ? 'text-[#A78BFA]' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Кабинет</span>
        </button>
      </nav>

      {/* Onboarding & Registration Modal */}
      <OnboardingModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        regions={db.regions}
        cities={db.cities}
        districts={db.districts}
        categories={db.categories}
        defaultRegionId={selectedRegionId === 'ALL' ? 'reg-kuzbass' : selectedRegionId}
        defaultCityId={selectedCityId === 'ALL' ? 'city-kemerovo' : selectedCityId}
        initialReferralCode={initialRefCode}
        onRegisterSubmit={async (payload) => {
          const result = await apiPost<{ user: User }>('/api/auth/register', payload);
          if (result.user) {
            setCurrentUserId(result.user.id);
            setActiveRole(result.user.role);
            setActiveSection('CABINET');
          }
        }}
      />
    </div>
  );
}
