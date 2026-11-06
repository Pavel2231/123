import React, { useState } from 'react';
import {
  BarChart3,
  Users,
  Wallet,
  Globe2,
  ScrollText,
  Plus,
} from 'lucide-react';
import {
  AuditLog,
  Booking,
  Category,
  City,
  Curator,
  CuratorAssignment,
  Organization,
  Profile,
  Region,
  RewardAccrual,
  RewardOperationStatus,
  RewardPayment,
  RewardRule,
  RewardRuleType,
  ServiceItem,
  ServiceRequest,
  User,
} from '../domain/types';
import { MODERATION_STATUS_LABELS } from '../domain/marketplaceRules';

interface OwnerAdminPanelProps {
  currentUser: User;
  users: User[];
  profiles: Profile[];
  organizations: Organization[];
  services: ServiceItem[];
  bookings: Booking[];
  serviceRequests: ServiceRequest[];
  regions: Region[];
  cities: City[];
  categories: Category[];
  curators: Curator[];
  curatorAssignments: CuratorAssignment[];
  rewardRules: RewardRule[];
  rewardAccruals: RewardAccrual[];
  rewardPayments: RewardPayment[];
  auditLogs: AuditLog[];
  onManageGeographyOrCategory: (payload: {
    kind: 'REGION' | 'CITY' | 'CATEGORY';
    name: string;
    code?: string;
    regionId?: string;
    description?: string;
  }) => Promise<void>;
  onAssignCurator: (payload: {
    mode: 'CREATE_CURATOR' | 'ASSIGN_SCOPE' | 'REASSIGN_EXECUTOR';
    curatorId?: string;
    newCuratorName?: string;
    newCuratorPhone?: string;
    newCuratorReferralCode?: string;
    regionId?: string;
    categoryId?: string;
    profileId?: string;
  }) => Promise<void>;
  onSaveRewardRule: (payload: {
    ruleId?: string;
    name: string;
    ruleType: RewardRuleType;
    regionId?: string;
    fixedMasterAmount: number;
    fixedOrgAmount: number;
    revenuePercent: number;
    regionalPlanThreshold: number;
    regionalPlanBonus: number;
  }) => Promise<void>;
  onUpdateAccrualStatus: (
    accrualId: string,
    newStatus: RewardOperationStatus
  ) => Promise<void>;
}

export const OwnerAdminPanel: React.FC<OwnerAdminPanelProps> = ({
  users,
  profiles,
  organizations,
  services,
  bookings,
  serviceRequests,
  regions,
  cities,
  categories,
  curators,
  curatorAssignments,
  rewardRules,
  rewardAccruals,
  rewardPayments,
  auditLogs,
  onManageGeographyOrCategory,
  onAssignCurator,
  onSaveRewardRule,
  onUpdateAccrualStatus,
}) => {
  const [activeTab, setActiveTab] = useState<
    'ANALYTICS' | 'CURATORS' | 'FINANCE' | 'GEOGRAPHY' | 'AUDIT'
  >('ANALYTICS');

  // Curator creation & assignment state
  const [newCurName, setNewCurName] = useState('');
  const [newCurPhone, setNewCurPhone] = useState('+7 (923) 500-77-88');
  const [newCurCode, setNewCurCode] = useState('NSK-BEAUTY-01');
  const [newCurRegionId, setNewCurRegionId] = useState(regions[0]?.id || 'reg-kuzbass');
  const [newCurCategoryId, setNewCurCategoryId] = useState(categories[0]?.id || 'cat-beauty');

  // Reassign executor state
  const [reassignProfileId, setReassignProfileId] = useState(profiles[0]?.id || '');
  const [reassignCuratorId, setReassignCuratorId] = useState(curators[0]?.id || '');

  // Reward rule configurator state
  const primaryRule = rewardRules[0];
  const [ruleName, setRuleName] = useState(
    primaryRule?.name || 'Кузбасс: Комбинированная модель'
  );
  const [ruleType, setRuleType] = useState<RewardRuleType>(
    primaryRule?.ruleType || 'COMBINED'
  );
  const [fixedMasterAmount, setFixedMasterAmount] = useState(
    String(primaryRule?.fixedMasterAmount ?? 1500)
  );
  const [fixedOrgAmount, setFixedOrgAmount] = useState(
    String(primaryRule?.fixedOrgAmount ?? 3500)
  );
  const [revenuePercent, setRevenuePercent] = useState(
    String(primaryRule?.revenuePercent ?? 20)
  );
  const [regionalPlanThreshold, setRegionalPlanThreshold] = useState(
    String(primaryRule?.regionalPlanThreshold ?? 3)
  );
  const [regionalPlanBonus, setRegionalPlanBonus] = useState(
    String(primaryRule?.regionalPlanBonus ?? 7500)
  );

  // Filters for Finance table
  const [filterCuratorId, setFilterCuratorId] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Geography creation state
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionCode, setNewRegionCode] = useState('RU-KRK');
  const [newCityName, setNewCityName] = useState('');
  const [newCityRegionId, setNewCityRegionId] = useState('reg-kuzbass');
  const [newCategoryName, setNewCategoryName] = useState('');

  const [bannerMsg, setBannerMsg] = useState('');

  const filteredAccruals = rewardAccruals.filter((acc) => {
    if (filterCuratorId !== 'ALL' && acc.curatorId !== filterCuratorId) return false;
    if (filterStatus !== 'ALL' && acc.status !== filterStatus) return false;
    return true;
  });

  const totalAccruedSum = rewardAccruals
    .filter((a) => a.status !== 'CANCELLED' && a.status !== 'REJECTED')
    .reduce((sum, a) => sum + a.amount, 0);
  const totalAvailableSum = rewardAccruals
    .filter((a) => a.status === 'AVAILABLE_FOR_PAYOUT')
    .reduce((sum, a) => sum + a.amount, 0);
  const totalPaidSum = rewardPayments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-[#A78BFA] mb-1">
            Раздел 13, 14 и 4.5 · Главный административный и финансовый центр владельца
          </p>
          <h1 className="text-2xl font-bold text-white">
            Управление федеральной и региональной сетью РЯДОМ
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Назначение региональных кураторов, настройка правил вознаграждений, управление географией и неизменяемый журнал действий.
          </p>
        </div>
      </div>

      {bannerMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between">
          <span>{bannerMsg}</span>
          <button type="button" onClick={() => setBannerMsg('')} className="underline">
            Закрыть
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('ANALYTICS')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'ANALYTICS'
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#130F24] text-slate-300 hover:text-white border border-white/10'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>1. Общая аналитика и сводка</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CURATORS')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'CURATORS'
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#130F24] text-slate-300 hover:text-white border border-white/10'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>2. Кураторы и назначения ({curators.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('FINANCE')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'FINANCE'
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#130F24] text-slate-300 hover:text-white border border-white/10'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>3. Правила вознаграждений и выплаты</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GEOGRAPHY')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'GEOGRAPHY'
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#130F24] text-slate-300 hover:text-white border border-white/10'
          }`}
        >
          <Globe2 className="w-4 h-4" />
          <span>4. Регионы, города и направления</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AUDIT')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'AUDIT'
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#130F24] text-slate-300 hover:text-white border border-white/10'
          }`}
        >
          <ScrollText className="w-4 h-4" />
          <span>5. Журнал действий ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: ANALYTICS */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-[#130F24] border border-white/10 p-5">
              <p className="text-xs text-slate-400">Пользователи / Клиенты</p>
              <p className="text-2xl font-bold text-white font-mono tabular-nums mt-1">
                {users.length} / {users.filter((u) => u.role === 'CLIENT').length}
              </p>
            </div>
            <div className="rounded-2xl bg-[#130F24] border border-white/10 p-5">
              <p className="text-xs text-slate-400">Мастера и Организации</p>
              <p className="text-2xl font-bold text-white font-mono tabular-nums mt-1">
                {profiles.filter((p) => p.type === 'MASTER').length} маст. ·{' '}
                {organizations.length} орг.
              </p>
            </div>
            <div className="rounded-2xl bg-[#130F24] border border-white/10 p-5">
              <p className="text-xs text-slate-400">Записи / Завершённые заказы</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono tabular-nums mt-1">
                {bookings.length} / {bookings.filter((b) => b.status === 'COMPLETED').length}
              </p>
            </div>
            <div className="rounded-2xl bg-[#130F24] border border-white/10 p-5">
              <p className="text-xs text-slate-400">Открытые заявки / Услуги</p>
              <p className="text-2xl font-bold text-[#C4B5FD] font-mono tabular-nums mt-1">
                {serviceRequests.length} заявок · {services.length} услуг
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">
              Эффективность региональных кураторов за период
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2.5 pr-4">Куратор</th>
                    <th className="py-2.5 pr-4">Код приглашения</th>
                    <th className="py-2.5 pr-4">Зоны (Регион + Направление)</th>
                    <th className="py-2.5 pr-4 text-right">Привлечено</th>
                    <th className="py-2.5 pr-4 text-right">Одобрено</th>
                    <th className="py-2.5 text-right">Начислено (Демо)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {curators.map((cur) => {
                    const curAsg = curatorAssignments.filter(
                      (a) => a.curatorId === cur.id && a.isActive
                    );
                    const attracted = profiles.filter((p) => p.curatorId === cur.id);
                    const approved = attracted.filter((p) => p.moderationStatus === 'APPROVED');
                    const accrued = rewardAccruals
                      .filter(
                        (a) =>
                          a.curatorId === cur.id &&
                          a.status !== 'CANCELLED' &&
                          a.status !== 'REJECTED'
                      )
                      .reduce((s, a) => s + a.amount, 0);

                    return (
                      <tr key={cur.id} className="hover:bg-white/5">
                        <td className="py-3 pr-4 font-bold text-white">{cur.name}</td>
                        <td className="py-3 pr-4 font-mono text-[#A78BFA]">
                          {cur.referralCode}
                        </td>
                        <td className="py-3 pr-4 text-slate-300">
                          {curAsg
                            .map((a) => {
                              const r = regions.find((reg) => reg.id === a.regionId)?.name;
                              const c = categories.find((cat) => cat.id === a.categoryId)?.name;
                              return `${r} (${c})`;
                            })
                            .join(' · ')}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono tabular-nums text-white">
                          {attracted.length}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono tabular-nums text-emerald-400">
                          {approved.length}
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums font-bold text-white">
                          {accrued.toLocaleString('ru-RU')} ₽
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CURATORS & ASSIGNMENTS */}
      {activeTab === 'CURATORS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newCurName.trim()) return;
              await onAssignCurator({
                mode: 'CREATE_CURATOR',
                newCuratorName: newCurName,
                newCuratorPhone: newCurPhone,
                newCuratorReferralCode: newCurCode,
                regionId: newCurRegionId,
                categoryId: newCurCategoryId,
              });
              setNewCurName('');
              setBannerMsg(
                'Новый региональный куратор назначен и получил закреплённую зону РЕГИОН + НАПРАВЛЕНИЕ.'
              );
            }}
            className="lg:col-span-6 rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-white">
              Назначить нового регионального куратора
            </h2>
            <div>
              <label htmlFor="admin-cur-name" className="block text-xs text-slate-300 mb-1">
                Имя и фамилия куратора *
              </label>
              <input
                id="admin-cur-name"
                type="text"
                required
                value={newCurName}
                onChange={(e) => setNewCurName(e.target.value)}
                placeholder="Например: Андрей Соболев"
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="admin-cur-phone" className="block text-xs text-slate-300 mb-1">
                  Телефон
                </label>
                <input
                  id="admin-cur-phone"
                  type="text"
                  value={newCurPhone}
                  onChange={(e) => setNewCurPhone(e.target.value)}
                  className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="admin-cur-code" className="block text-xs text-slate-300 mb-1">
                  Реферальный код *
                </label>
                <input
                  id="admin-cur-code"
                  type="text"
                  required
                  value={newCurCode}
                  onChange={(e) => setNewCurCode(e.target.value)}
                  className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="admin-cur-reg" className="block text-xs text-slate-300 mb-1">
                  Закрепляемый регион
                </label>
                <select
                  id="admin-cur-reg"
                  value={newCurRegionId}
                  onChange={(e) => setNewCurRegionId(e.target.value)}
                  className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="admin-cur-cat" className="block text-xs text-slate-300 mb-1">
                  Закрепляемое направление
                </label>
                <select
                  id="admin-cur-cat"
                  value={newCurCategoryId}
                  onChange={(e) => setNewCurCategoryId(e.target.value)}
                  className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors"
            >
              Назначить куратора и создать связку РЕГИОН + НАПРАВЛЕНИЕ
            </button>
          </form>

          {/* Reassign Executor Curator (Owner only) */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onAssignCurator({
                mode: 'REASSIGN_EXECUTOR',
                profileId: reassignProfileId,
                curatorId: reassignCuratorId,
              });
              setBannerMsg(
                'Исполнитель перепривязан к выбранному куратору с фиксацией в журнале действий.'
              );
            }}
            className="lg:col-span-6 rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-white">
              Административное переназначение куратора исполнителю
            </h2>
            <p className="text-xs text-slate-400">
              Раздел 4.3: Куратор не может самостоятельно перепривязать чужого исполнителя. Операция доступна только владельцу с записью в AuditLogs.
            </p>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Выберите профиль исполнителя</label>
              <select
                value={reassignProfileId}
                onChange={(e) => setReassignProfileId(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName} ({MODERATION_STATUS_LABELS[p.moderationStatus]})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Новый закреплённый куратор</label>
              <select
                value={reassignCuratorId}
                onChange={(e) => setReassignCuratorId(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
              >
                {curators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.referralCode})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors"
            >
              Переназначить куратора с записью в журнал
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: FINANCE & REWARD RULES */}
      {activeTab === 'FINANCE' && (
        <div className="space-y-6">
          {/* Configurable RewardRule Form */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onSaveRewardRule({
                ruleId: primaryRule?.id,
                name: ruleName,
                ruleType,
                fixedMasterAmount: Number(fixedMasterAmount) || 0,
                fixedOrgAmount: Number(fixedOrgAmount) || 0,
                revenuePercent: Number(revenuePercent) || 0,
                regionalPlanThreshold: Number(regionalPlanThreshold) || 3,
                regionalPlanBonus: Number(regionalPlanBonus) || 0,
              });
              setBannerMsg(
                'Правила расчёта вознаграждения кураторов сохранены и пересчитаны (без повторного начисления за уже учтённые события).'
              );
            }}
            className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Настройка правил вознаграждения кураторов (RewardRules)
                </h2>
                <p className="text-xs text-slate-400">
                  Поддерживаются модели: Фикс за мастера, Фикс за организацию, % от подтверждённого дохода платформы, Региональный план и Комбинированная.
                </p>
              </div>
              <span className="text-xs text-[#C4B5FD]">Демонстрационные данные</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="rule-name" className="block text-xs text-slate-300 mb-1">
                  Название правила
                </label>
                <input
                  id="rule-name"
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="rule-type" className="block text-xs text-slate-300 mb-1">
                  Модель расчёта
                </label>
                <select
                  id="rule-type"
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value as RewardRuleType)}
                  className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
                >
                  <option value="COMBINED">Д. Комбинированная модель</option>
                  <option value="FIXED_MASTER">А. Фикс за подключённого мастера</option>
                  <option value="FIXED_ORG">Б. Фикс за подключённую организацию</option>
                  <option value="PERCENT_REVENUE">В. % от дохода платформы</option>
                  <option value="REGIONAL_PLAN">Г. Бонус за региональный план</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label htmlFor="rule-master-fix" className="block text-xs text-slate-300 mb-1">
                  За мастера (₽)
                </label>
                <input
                  id="rule-master-fix"
                  type="number"
                  value={fixedMasterAmount}
                  onChange={(e) => setFixedMasterAmount(e.target.value)}
                  className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white font-mono tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="rule-org-fix" className="block text-xs text-slate-300 mb-1">
                  За организацию (₽)
                </label>
                <input
                  id="rule-org-fix"
                  type="number"
                  value={fixedOrgAmount}
                  onChange={(e) => setFixedOrgAmount(e.target.value)}
                  className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white font-mono tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="rule-rev-pct" className="block text-xs text-slate-300 mb-1">
                  % от дохода платформы
                </label>
                <input
                  id="rule-rev-pct"
                  type="number"
                  value={revenuePercent}
                  onChange={(e) => setRevenuePercent(e.target.value)}
                  className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white font-mono tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="rule-plan-cnt" className="block text-xs text-slate-300 mb-1">
                  Порог плана (площадок)
                </label>
                <input
                  id="rule-plan-cnt"
                  type="number"
                  value={regionalPlanThreshold}
                  onChange={(e) => setRegionalPlanThreshold(e.target.value)}
                  className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white font-mono tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="rule-plan-bonus" className="block text-xs text-slate-300 mb-1">
                  Бонус за план (₽)
                </label>
                <input
                  id="rule-plan-bonus"
                  type="number"
                  value={regionalPlanBonus}
                  onChange={(e) => setRegionalPlanBonus(e.target.value)}
                  className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white font-mono tabular-nums"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors"
            >
              Сохранить правила вознаграждения и пересчитать
            </button>
          </form>

          {/* Accruals & Payouts Table */}
          <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Ведомость начислений и фиксация выплат (Демонстрационные данные)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Всего начислено:{' '}
                  <span className="text-white font-mono font-bold">
                    {totalAccruedSum.toLocaleString('ru-RU')} ₽
                  </span>{' '}
                  · Доступно к выплате:{' '}
                  <span className="text-[#C4B5FD] font-mono font-bold">
                    {totalAvailableSum.toLocaleString('ru-RU')} ₽
                  </span>{' '}
                  · Выплачено:{' '}
                  <span className="text-emerald-400 font-mono font-bold">
                    {totalPaidSum.toLocaleString('ru-RU')} ₽
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Фильтр по куратору"
                  value={filterCuratorId}
                  onChange={(e) => setFilterCuratorId(e.target.value)}
                  className="rounded-lg bg-[#0B0914] border border-white/15 px-3 py-1.5 text-xs text-white"
                >
                  <option value="ALL">Все кураторы</option>
                  {curators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Фильтр по статусу выплаты"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-lg bg-[#0B0914] border border-white/15 px-3 py-1.5 text-xs text-white"
                >
                  <option value="ALL">Все статусы</option>
                  <option value="PENDING_CONFIRMATION">Ожидает подтверждения</option>
                  <option value="AVAILABLE_FOR_PAYOUT">Доступно к выплате</option>
                  <option value="PAID">Выплачено</option>
                  <option value="REJECTED">Отклонено</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2.5 pr-3">Куратор</th>
                    <th className="py-2.5 pr-3">Исполнитель</th>
                    <th className="py-2.5 pr-3">Основание</th>
                    <th className="py-2.5 pr-3">Статус</th>
                    <th className="py-2.5 pr-3 text-right">Сумма</th>
                    <th className="py-2.5 text-right">Управление</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredAccruals.map((acc) => {
                    const cur = curators.find((c) => c.id === acc.curatorId);
                    return (
                      <tr key={acc.id} className="hover:bg-white/5">
                        <td className="py-3 pr-3 font-semibold text-white">{cur?.name}</td>
                        <td className="py-3 pr-3 text-slate-200">{acc.executorName}</td>
                        <td className="py-3 pr-3 text-slate-300">
                          {acc.basisDescription}
                          <span className="block text-[11px] text-slate-500 font-mono">
                            Ключ идемпотентности: {acc.eventKey}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-[#A78BFA] font-mono">{acc.status}</td>
                        <td className="py-3 pr-3 text-right font-mono tabular-nums font-bold text-white">
                          {acc.amount.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="py-3 text-right space-x-1.5 whitespace-nowrap">
                          {acc.status === 'PENDING_CONFIRMATION' && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateAccrualStatus(acc.id, 'AVAILABLE_FOR_PAYOUT')
                              }
                              className="px-2.5 py-1 rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold"
                            >
                              Подтвердить к выплате
                            </button>
                          )}
                          {acc.status === 'AVAILABLE_FOR_PAYOUT' && (
                            <button
                              type="button"
                              onClick={() => onUpdateAccrualStatus(acc.id, 'PAID')}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                            >
                              Зафиксировать выплату
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GEOGRAPHY & CATEGORIES */}
      {activeTab === 'GEOGRAPHY' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Regions */}
          <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Регионы России ({regions.length})</h2>
            <div className="space-y-2">
              {regions.map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-xl bg-[#0B0914] border border-white/10 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-white">{r.name}</span>
                  <span className="font-mono text-slate-400">{r.code}</span>
                </div>
              ))}
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newRegionName.trim()) return;
                await onManageGeographyOrCategory({
                  kind: 'REGION',
                  name: newRegionName,
                  code: newRegionCode,
                });
                setNewRegionName('');
                setBannerMsg('Новый регион России добавлен в платформу.');
              }}
              className="pt-3 border-t border-white/10 space-y-2"
            >
              <input
                type="text"
                placeholder="Название нового региона (напр. Красноярский край)"
                value={newRegionName}
                onChange={(e) => setNewRegionName(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold bg-[#7C3AED] text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить регион</span>
              </button>
            </form>
          </div>

          {/* Cities */}
          <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Населённые пункты ({cities.length})</h2>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {cities.map((c) => {
                const r = regions.find((reg) => reg.id === c.regionId);
                return (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-[#0B0914] border border-white/10 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-white">{c.name}</span>
                    <span className="text-slate-400 truncate max-w-[140px]">{r?.name}</span>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCityName.trim()) return;
                await onManageGeographyOrCategory({
                  kind: 'CITY',
                  name: newCityName,
                  regionId: newCityRegionId,
                });
                setNewCityName('');
                setBannerMsg('Населённый пункт успешно добавлен.');
              }}
              className="pt-3 border-t border-white/10 space-y-2"
            >
              <select
                value={newCityRegionId}
                onChange={(e) => setNewCityRegionId(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Название города (напр. Белово)"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold bg-[#7C3AED] text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить город</span>
              </button>
            </form>
          </div>

          {/* Categories */}
          <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
            <h2 className="text-base font-bold text-white">
              Категории и направления ({categories.length})
            </h2>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3 rounded-xl bg-[#0B0914] border border-white/10 text-xs space-y-0.5"
                >
                  <p className="font-semibold text-white">{cat.name}</p>
                  <p className="text-slate-400 line-clamp-1">{cat.description}</p>
                </div>
              ))}
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCategoryName.trim()) return;
                await onManageGeographyOrCategory({
                  kind: 'CATEGORY',
                  name: newCategoryName,
                });
                setNewCategoryName('');
                setBannerMsg('Новое направление услуг добавлено.');
              }}
              className="pt-3 border-t border-white/10 space-y-2"
            >
              <input
                type="text"
                placeholder="Новое направление (напр. Ветеринария)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold bg-[#7C3AED] text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить направление</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'AUDIT' && (
        <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              Неизменяемый журнал действий платформы (AuditLogs)
            </h2>
            <p className="text-xs text-slate-400">
              Фиксируются все решения модерации, назначения кураторов, перепривязки исполнителей и изменения финансовых статусов.
            </p>
          </div>

          <div className="space-y-2.5">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-[#0B0914] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-slate-400">
                    <span className="font-mono text-[#A78BFA] font-semibold">{log.action}</span>
                    <span aria-hidden="true">·</span>
                    <span>Исполнитель действия: {log.actorName}</span>
                    <span aria-hidden="true">·</span>
                    <span>Роль: {log.actorRole}</span>
                  </div>
                  <p className="text-white">{log.details}</p>
                </div>
                <span className="text-[11px] font-mono text-slate-500 shrink-0">
                  {log.createdAt.slice(0, 19).replace('T', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
