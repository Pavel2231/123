import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Ban,
  History,
  Flag,
} from 'lucide-react';
import {
  Category,
  City,
  Complaint,
  Curator,
  ModerationHistoryItem,
  ModerationStatus,
  Profile,
  Region,
  ServiceItem,
  User,
} from '../domain/types';
import {
  calculateProfileCompleteness,
  MODERATION_STATUS_LABELS,
} from '../domain/marketplaceRules';
import { HERO_IMAGE_PATH } from '../domain/seedData';
import { SmartImage } from './SmartImage';

interface ModeratorPanelProps {
  currentUser: User;
  profiles: Profile[];
  services: ServiceItem[];
  regions: Region[];
  cities: City[];
  categories: Category[];
  curators: Curator[];
  moderationHistory: ModerationHistoryItem[];
  complaints: Complaint[];
  onDecideModeration: (payload: {
    profileId: string;
    newStatus: ModerationStatus;
    reason: string;
  }) => Promise<void>;
  onResolveComplaint: (payload: {
    complaintId: string;
    status: 'RESOLVED' | 'REJECTED';
    resolutionComment: string;
  }) => Promise<void>;
}

export const ModeratorPanel: React.FC<ModeratorPanelProps> = ({
  profiles,
  services,
  regions,
  cities,
  categories,
  curators,
  moderationHistory,
  complaints,
  onDecideModeration,
  onResolveComplaint,
}) => {
  const [statusFilter, setStatusFilter] = useState<'QUEUE' | 'ALL'>('QUEUE');
  const [reasonsByProfile, setReasonsByProfile] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  const queueProfiles = profiles.filter((p) => {
    if (statusFilter === 'QUEUE') {
      return (
        p.moderationStatus === 'SUBMITTED' ||
        p.moderationStatus === 'RESUBMITTED' ||
        p.moderationStatus === 'UNDER_REVIEW' ||
        p.moderationStatus === 'CHANGES_REQUESTED'
      );
    }
    return true;
  });

  const handleAction = async (profileId: string, newStatus: ModerationStatus) => {
    setFeedback(null);
    const reason = (reasonsByProfile[profileId] || '').trim();
    try {
      await onDecideModeration({
        profileId,
        newStatus,
        reason:
          reason ||
          (newStatus === 'APPROVED'
            ? 'Анкета, фотографии и прайс-лист соответствуют требованиям платформы РЯДОМ.'
            : ''),
      });
      setFeedback({
        type: 'ok',
        text: `Решение «${MODERATION_STATUS_LABELS[newStatus]}» сохранено и записано в журнал действий.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'err',
        text: err?.message || 'Ошибка при сохранении решения модерации.',
      });
    }
  };

  const pendingCount = profiles.filter(
    (p) => p.moderationStatus === 'SUBMITTED' || p.moderationStatus === 'RESUBMITTED'
  ).length;
  const approvedCount = profiles.filter((p) => p.moderationStatus === 'APPROVED').length;
  const changesCount = profiles.filter(
    (p) => p.moderationStatus === 'CHANGES_REQUESTED'
  ).length;

  return (
    <div className="space-y-8">
      {/* Header & Moderation Analytics */}
      <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-[#A78BFA] mb-1">
            Раздел 5 · Обязательная модерация площадок и защита от конфликта интересов
          </p>
          <h1 className="text-2xl font-bold text-white">
            Панель модератора: очередь проверки мастеров и организаций
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Ни один профиль не публикуется автоматически. При возврате на доработку или отказе указание причины обязательно.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('QUEUE')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'QUEUE'
                ? 'bg-[#7C3AED] text-white'
                : 'bg-[#0B0914] text-slate-300 border border-white/10'
            }`}
          >
            Очередь проверки ({pendingCount + changesCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-[#7C3AED] text-white'
                : 'bg-[#0B0914] text-slate-300 border border-white/10'
            }`}
          >
            Все площадки ({profiles.length})
          </button>
        </div>
      </div>

      {/* Analytics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#130F24] border border-white/10 p-4">
          <p className="text-xs text-slate-400">Ожидают проверки</p>
          <p className="text-2xl font-bold text-amber-400 font-mono tabular-nums mt-1">
            {pendingCount}
          </p>
        </div>
        <div className="rounded-2xl bg-[#130F24] border border-white/10 p-4">
          <p className="text-xs text-slate-400">Одобрено и опубликовано</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono tabular-nums mt-1">
            {approvedCount}
          </p>
        </div>
        <div className="rounded-2xl bg-[#130F24] border border-white/10 p-4">
          <p className="text-xs text-slate-400">Требуют исправлений</p>
          <p className="text-2xl font-bold text-white font-mono tabular-nums mt-1">
            {changesCount}
          </p>
        </div>
        <div className="rounded-2xl bg-[#130F24] border border-white/10 p-4">
          <p className="text-xs text-slate-400">Среднее время проверки</p>
          <p className="text-2xl font-bold text-[#C4B5FD] font-mono tabular-nums mt-1">
            18 мин.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border ${
            feedback.type === 'ok'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Moderation Queue Cards */}
      <div className="space-y-5">
        {queueProfiles.map((prof) => {
          const reg = regions.find((r) => r.id === prof.regionId);
          const city = cities.find((c) => c.id === prof.cityId);
          const cat = categories.find((c) => c.id === prof.categoryId);
          const cur = curators.find((c) => c.id === prof.curatorId);
          const profServices = services.filter((s) => s.profileId === prof.id);
          const comp = calculateProfileCompleteness(prof, services);

          return (
            <div
              key={prof.id}
              className="rounded-2xl bg-[#130F24] border border-white/15 p-6 space-y-5"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-white/10">
                    <SmartImage
                      src={prof.photos[0] || HERO_IMAGE_PATH}
                      alt={prof.displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="text-[#A78BFA] font-semibold">
                        Статус: {MODERATION_STATUS_LABELS[prof.moderationStatus]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {prof.type === 'ORGANIZATION' ? 'Организация' : 'Частный мастер'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {reg?.name} ({city?.name})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Направление: {cat?.name}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">{prof.displayName}</h3>
                    <p className="text-xs text-slate-300">{prof.specialtyTitle}</p>
                    <p className="text-xs text-slate-400">
                      Контакты: <span className="text-white font-mono">{prof.phone}</span> · Адрес:{' '}
                      {prof.address}
                    </p>
                    <p className="text-xs text-[#C4B5FD]">
                      Привлёкший куратор:{' '}
                      {cur ? `${cur.name} (${cur.referralCode})` : 'Прямая регистрация'} ·
                      Заполненность анкеты:{' '}
                      <span className="font-mono tabular-nums font-bold">{comp.score}%</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#0B0914] border border-white/10 space-y-1.5">
                  <p className="font-semibold text-slate-300">Описание и закрытые документы проверки:</p>
                  <p className="text-slate-300 leading-relaxed">{prof.bio}</p>
                  {prof.qualificationDocsNote && (
                    <p className="text-emerald-300/90 pt-1">
                      Служебная отметка (скрыто из публичного профиля): {prof.qualificationDocsNote}
                    </p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0914] border border-white/10 space-y-1.5">
                  <p className="font-semibold text-slate-300">
                    Заявленные услуги ({profServices.length}):
                  </p>
                  {profServices.map((srv) => (
                    <div key={srv.id} className="flex items-center justify-between text-slate-300">
                      <span>{srv.title}</span>
                      <span className="font-mono tabular-nums text-white font-semibold">
                        {srv.price.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label
                    htmlFor={`mod-reason-${prof.id}`}
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Причина решения / замечания для исполнителя и куратора (обязательно при возврате на доработку, отказе или блокировке):
                  </label>
                  <input
                    id={`mod-reason-${prof.id}`}
                    type="text"
                    value={reasonsByProfile[prof.id] || ''}
                    onChange={(e) =>
                      setReasonsByProfile((prev) => ({
                        ...prev,
                        [prof.id]: e.target.value,
                      }))
                    }
                    placeholder="Например: Проверено, замечаний нет / Или: Загрузите фото рабочего кабинета и уточните адрес..."
                    className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2 text-xs text-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleAction(prof.id, 'APPROVED')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Одобрить и опубликовать</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction(prof.id, 'CHANGES_REQUESTED')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Запросить исправления</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction(prof.id, 'REJECTED')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-500/30 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Отклонить</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction(prof.id, 'SUSPENDED')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/15 text-slate-200 transition-colors"
                  >
                    <span>Приостановить</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction(prof.id, 'BLOCKED')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-rose-950/90 text-rose-300 border border-rose-500/40 transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Заблокировать</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Complaints & Moderation History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-[#A78BFA]" />
            <h2 className="text-base font-bold text-white">Жалобы и сигналы ({complaints.length})</h2>
          </div>
          <div className="space-y-3">
            {complaints.map((cmp) => (
              <div
                key={cmp.id}
                className="p-3.5 rounded-xl bg-[#0B0914] border border-white/10 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span>Объект: {cmp.targetType} #{cmp.targetId}</span>
                  <span className="text-[#A78BFA]">{cmp.status}</span>
                </div>
                <p className="text-white">{cmp.reason}</p>
                {cmp.status === 'OPEN' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        onResolveComplaint({
                          complaintId: cmp.id,
                          status: 'RESOLVED',
                          resolutionComment: 'Проверено модератором, меры приняты.',
                        })
                      }
                      className="px-3 py-1 rounded bg-emerald-600 text-white font-semibold"
                    >
                      Отметить решённой
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#A78BFA]" />
            <h2 className="text-base font-bold text-white">История решений модерации</h2>
          </div>
          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {moderationHistory.map((h) => (
              <div
                key={h.id}
                className="p-3 rounded-xl bg-[#0B0914] border border-white/10 text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-semibold text-white">{h.actorName}</span>
                  <span className="font-mono">
                    {MODERATION_STATUS_LABELS[h.previousStatus]} →{' '}
                    {MODERATION_STATUS_LABELS[h.newStatus]}
                  </span>
                </div>
                <p className="text-slate-300">Профиль #{h.profileId}: {h.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
