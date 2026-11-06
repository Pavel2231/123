import React, { useState } from 'react';
import {
  Link2,
  Copy,
  Check,
  UserPlus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  Category,
  Curator,
  CuratorAssignment,
  Profile,
  ReferralAttribution,
  ReferralLink,
  Region,
  RewardAccrual,
  RewardPayment,
  ServiceItem,
  User,
} from '../domain/types';
import {
  calculateProfileCompleteness,
  getCuratorVisibleProfiles,
  MODERATION_STATUS_LABELS,
} from '../domain/marketplaceRules';

interface CuratorCabinetProps {
  currentUser: User;
  curators: Curator[];
  assignments: CuratorAssignment[];
  regions: Region[];
  categories: Category[];
  profiles: Profile[];
  services: ServiceItem[];
  referralLinks: ReferralLink[];
  referralAttributions: ReferralAttribution[];
  rewardAccruals: RewardAccrual[];
  rewardPayments: RewardPayment[];
  onOpenInviteRegistration: (referralCode: string) => void;
  onCuratorResubmitProfile: (payload: {
    curatorId: string;
    profileId: string;
    updatedBio?: string;
  }) => Promise<void>;
}

export const CuratorCabinet: React.FC<CuratorCabinetProps> = ({
  currentUser,
  curators,
  assignments,
  regions,
  categories,
  profiles,
  services,
  referralLinks,
  referralAttributions,
  rewardAccruals,
  rewardPayments,
  onOpenInviteRegistration,
  onCuratorResubmitProfile,
}) => {
  const defaultCurator =
    curators.find((c) => c.userId === currentUser.id) || curators[0];
  const [selectedCuratorId, setSelectedCuratorId] = useState(defaultCurator.id);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EXECUTORS' | 'REWARDS'>('OVERVIEW');

  const activeCurator =
    curators.find((c) => c.id === selectedCuratorId) || defaultCurator;

  const myAssignments = assignments.filter(
    (a) => a.curatorId === activeCurator.id && a.isActive
  );
  const myVisibleProfiles = getCuratorVisibleProfiles(
    activeCurator.id,
    profiles,
    assignments
  );
  const myDirectlyReferred = profiles.filter((p) => p.curatorId === activeCurator.id);
  const myApprovedProfiles = myDirectlyReferred.filter(
    (p) => p.moderationStatus === 'APPROVED'
  );
  const myOrgsCount = myDirectlyReferred.filter(
    (p) => p.type === 'ORGANIZATION'
  ).length;
  const myPublishedServicesCount = services.filter((s) =>
    myDirectlyReferred.some((p) => p.id === s.profileId && s.moderationStatus === 'APPROVED')
  ).length;

  // Curator sees ONLY their own accruals and payouts (Section 4.4)
  const myAccruals = rewardAccruals.filter((a) => a.curatorId === activeCurator.id);
  const myPayments = rewardPayments.filter((p) => p.curatorId === activeCurator.id);

  const totalAccrued = myAccruals
    .filter((a) => a.status !== 'CANCELLED' && a.status !== 'REJECTED')
    .reduce((sum, a) => sum + a.amount, 0);
  const totalAvailable = myAccruals
    .filter((a) => a.status === 'AVAILABLE_FOR_PAYOUT')
    .reduce((sum, a) => sum + a.amount, 0);
  const totalPaid = myPayments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);

  const inviteUrl = `${window.location.origin}/?ref=${activeCurator.referralCode}`;

  const handleCopyInvite = () => {
    navigator.clipboard?.writeText(inviteUrl).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header & Curator Selector */}
      <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#A78BFA]">
            <span>Раздел 4 · Региональная система кураторов</span>
            <span aria-hidden="true">·</span>
            <span>Доступ строго к закреплённым РЕГИОН + НАПРАВЛЕНИЕ</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Личный кабинет куратора: {activeCurator.name}
          </h1>
          <p className="text-xs text-slate-400">
            Персональный код привлечения:{' '}
            <span className="text-white font-mono font-semibold">
              {activeCurator.referralCode}
            </span>{' '}
            · Куратор не может самостоятельно одобрять свои площадки (исключён конфликт интересов)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="curator-switch" className="text-xs text-slate-400">
            Профиль куратора:
          </label>
          <select
            id="curator-switch"
            value={activeCurator.id}
            onChange={(e) => setSelectedCuratorId(e.target.value)}
            className="rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
          >
            {curators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.referralCode})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onOpenInviteRegistration(activeCurator.referralCode)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Зарегистрировать мастера по моей ссылке</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl bg-[#130F24] border border-white/10 p-4">
          <p className="text-xs text-slate-400">Закреплено связок (Регион+Категория)</p>
          <p className="text-2xl font-bold text-white font-mono tabular-nums mt-1">
            {myAssignments.length}
          </p>
        </div>
        <div className="rounded-2xl bg-[#130F24] border border-white/10 p-4">
          <p className="text-xs text-slate-400">Привлечено исполнителей / орг.</p>
          <p className="text-2xl font-bold text-white font-mono tabular-nums mt-1">
            {myDirectlyReferred.length} ({myOrgsCount} орг.)
          </p>
        </div>
        <div className="rounded-2xl bg-[#130F24] border border-white/10 p-4">
          <p className="text-xs text-slate-400">Активных одобренных площадок</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono tabular-nums mt-1">
            {myApprovedProfiles.length} / план {activeCurator.regionalPlanTarget}
          </p>
        </div>
        <div className="rounded-2xl bg-[#130F24] border border-white/10 p-4">
          <p className="text-xs text-slate-400">Опубликовано услуг</p>
          <p className="text-2xl font-bold text-white font-mono tabular-nums mt-1">
            {myPublishedServicesCount}
          </p>
        </div>
        <div className="rounded-2xl bg-[#130F24] border border-white/10 p-4">
          <p className="text-xs text-slate-400">Начислено (Демонстрационные данные)</p>
          <p className="text-2xl font-bold text-[#C4B5FD] font-mono tabular-nums mt-1">
            {totalAccrued.toLocaleString('ru-RU')} ₽
          </p>
        </div>
      </div>

      {/* Referral Link Box */}
      <div className="rounded-2xl bg-[#130F24] border border-[#8B5CF6]/30 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#C4B5FD] font-semibold">
            <Link2 className="w-4 h-4" />
            <span>Персональная реферальная ссылка и код куратора</span>
          </div>
          <p className="text-xs text-slate-300">
            При регистрации мастера или салона по вашей ссылке система автоматически фиксирует источник привлечения в таблице <code className="font-mono text-[#A78BFA]">ReferralAttributions</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <code className="px-3.5 py-2 rounded-lg bg-[#0B0914] border border-white/15 text-xs font-mono text-white">
            {inviteUrl}
          </code>
          <button
            type="button"
            onClick={handleCopyInvite}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Скопировано' : 'Скопировать ссылку'}</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'OVERVIEW'
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#130F24] text-slate-300 hover:text-white border border-white/10'
          }`}
        >
          Закреплённые регионы и направления
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('EXECUTORS')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'EXECUTORS'
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#130F24] text-slate-300 hover:text-white border border-white/10'
          }`}
        >
          Привлечённые мастера и статус модерации ({myVisibleProfiles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('REWARDS')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'REWARDS'
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#130F24] text-slate-300 hover:text-white border border-white/10'
          }`}
        >
          Начисления и выплаты ({myAccruals.length})
        </button>
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">
            Матрица полномочий куратора (РЕГИОН + НАПРАВЛЕНИЕ)
          </h2>
          <p className="text-xs text-slate-400">
            Куратор видит только те регионы и категории услуг, которые явно закреплены за ним главным администратором.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myAssignments.map((asgn) => {
              const reg = regions.find((r) => r.id === asgn.regionId);
              const cat = categories.find((c) => c.id === asgn.categoryId);
              const scopeProfiles = profiles.filter(
                (p) => p.regionId === asgn.regionId && p.categoryId === asgn.categoryId
              );
              return (
                <div
                  key={asgn.id}
                  className="p-4 rounded-xl bg-[#0B0914] border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-[#A78BFA]">
                    <span>Активное назначение</span>
                    <span className="font-mono tabular-nums">
                      Площадок в секторе: {scopeProfiles.length}
                    </span>
                  </div>
                  <p className="text-base font-bold text-white">{reg?.name}</p>
                  <p className="text-xs text-slate-300">
                    Направление: <span className="font-semibold text-white">{cat?.name}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'EXECUTORS' && (
        <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">
            Привлечённые исполнители и контроль прохождения модерации
          </h2>
          <div className="space-y-3">
            {myVisibleProfiles.map((prof) => {
              const comp = calculateProfileCompleteness(prof, services);
              const attr = referralAttributions.find((a) => a.profileId === prof.id);
              const cat = categories.find((c) => c.id === prof.categoryId);
              return (
                <div
                  key={prof.id}
                  className="p-4 rounded-xl bg-[#0B0914] border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="text-[#A78BFA] font-semibold">
                        {MODERATION_STATUS_LABELS[prof.moderationStatus]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{prof.type === 'ORGANIZATION' ? 'Организация' : 'Частный мастер'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{cat?.name}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Заполненность: {comp.score}%
                      </span>
                      {attr && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">Код: {attr.referralCode}</span>
                        </>
                      )}
                    </div>
                    <p className="text-base font-bold text-white">{prof.displayName}</p>
                    <p className="text-xs text-slate-300">{prof.specialtyTitle}</p>
                    {prof.moderationComment && (
                      <p className="text-xs text-amber-300 mt-1">
                        Причина / комментарий модерации: {prof.moderationComment}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {(prof.moderationStatus === 'CHANGES_REQUESTED' ||
                      prof.moderationStatus === 'DRAFT' ||
                      prof.moderationStatus === 'REJECTED') && (
                      <button
                        type="button"
                        onClick={() =>
                          onCuratorResubmitProfile({
                            curatorId: activeCurator.id,
                            profileId: prof.id,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Повторно отправить на проверку</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'REWARDS' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Мои начисления вознаграждения (Демонстрационные данные)
                </h2>
                <p className="text-xs text-slate-400">
                  Доступно к выплате:{' '}
                  <span className="text-white font-mono tabular-nums font-semibold">
                    {totalAvailable.toLocaleString('ru-RU')} ₽
                  </span>{' '}
                  · Выплачено всего:{' '}
                  <span className="text-emerald-400 font-mono tabular-nums font-semibold">
                    {totalPaid.toLocaleString('ru-RU')} ₽
                  </span>
                </p>
              </div>
              <span className="text-xs text-[#C4B5FD] inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Защита от повторных начислений по eventKey активна
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2.5 pr-4">ID операции</th>
                    <th className="py-2.5 pr-4">Исполнитель</th>
                    <th className="py-2.5 pr-4">Основание начисления</th>
                    <th className="py-2.5 pr-4">Статус</th>
                    <th className="py-2.5 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {myAccruals.map((acc) => (
                    <tr key={acc.id} className="hover:bg-white/5">
                      <td className="py-3 pr-4 font-mono text-slate-400">{acc.id}</td>
                      <td className="py-3 pr-4 font-semibold text-white">{acc.executorName}</td>
                      <td className="py-3 pr-4 text-slate-300">
                        {acc.basisDescription}
                        <span className="block text-[11px] text-slate-500">{acc.comment}</span>
                      </td>
                      <td className="py-3 pr-4 text-[#A78BFA]">{acc.status}</td>
                      <td className="py-3 text-right font-mono tabular-nums font-bold text-white">
                        {acc.amount.toLocaleString('ru-RU')} ₽
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
