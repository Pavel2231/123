import React, { useState } from 'react';
import { PlusCircle, CheckCircle2, Send } from 'lucide-react';
import {
  Category,
  City,
  Offer,
  Profile,
  Region,
  ServiceRequest,
  User,
} from '../domain/types';

interface ServiceRequestsViewProps {
  currentUser: User;
  regions: Region[];
  cities: City[];
  categories: Category[];
  serviceRequests: ServiceRequest[];
  offers: Offer[];
  profiles: Profile[];
  selectedRegionId: string;
  selectedCityId: string;
  onCreateRequest: (payload: {
    categoryId: string;
    regionId: string;
    cityId: string;
    title: string;
    description: string;
    preferredTime: string;
    budgetHint?: number;
  }) => Promise<void>;
  onSendOffer: (payload: {
    requestId: string;
    profileId: string;
    solutionDescription: string;
    estimatedPrice: number;
    estimatedDuration: string;
    homeVisitTerms: string;
  }) => Promise<void>;
  onAcceptOffer: (requestId: string, offerId: string) => Promise<void>;
}

export const ServiceRequestsView: React.FC<ServiceRequestsViewProps> = ({
  currentUser,
  regions,
  cities,
  categories,
  serviceRequests,
  offers,
  profiles,
  selectedRegionId,
  selectedCityId,
  onCreateRequest,
  onSendOffer,
  onAcceptOffer,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[1]?.id || 'cat-repair');
  const [regionId, setRegionId] = useState(
    selectedRegionId === 'ALL' ? 'reg-kuzbass' : selectedRegionId
  );
  const [cityId, setCityId] = useState(
    selectedCityId === 'ALL' ? 'city-kemerovo' : selectedCityId
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preferredTime, setPreferredTime] = useState('В ближайшие 2–3 дня');
  const [budgetHint, setBudgetHint] = useState('5000');

  // Offer form state for masters/organizations
  const [activeOfferRequestId, setActiveOfferRequestId] = useState<string | null>(null);
  const [solutionDescription, setSolutionDescription] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('4500');
  const [estimatedDuration, setEstimatedDuration] = useState('2–3 часа');
  const [homeVisitTerms, setHomeVisitTerms] = useState('Бесплатный выезд по городу');
  const [feedback, setFeedback] = useState('');

  const availableCities = cities.filter((c) => c.regionId === regionId && c.isActive);
  const effectiveCityId = availableCities.some((c) => c.id === cityId)
    ? cityId
    : availableCities[0]?.id || 'city-kemerovo';

  const approvedExecutorProfiles = profiles.filter((p) => p.moderationStatus === 'APPROVED');
  const currentUserExecutorProfile =
    profiles.find((p) => p.userId === currentUser.id && p.moderationStatus === 'APPROVED') ||
    approvedExecutorProfiles[0];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    await onCreateRequest({
      categoryId,
      regionId,
      cityId: effectiveCityId,
      title,
      description,
      preferredTime,
      budgetHint: Number(budgetHint) || undefined,
    });
    setTitle('');
    setDescription('');
    setShowCreateForm(false);
    setFeedback('Ваша заявка опубликована! Исполнители региона уже могут оставлять отклики.');
  };

  const handleOfferSubmit = async (e: React.FormEvent, requestId: string) => {
    e.preventDefault();
    if (!currentUserExecutorProfile || !solutionDescription.trim()) return;
    await onSendOffer({
      requestId,
      profileId: currentUserExecutorProfile.id,
      solutionDescription,
      estimatedPrice: Number(estimatedPrice) || 3000,
      estimatedDuration,
      homeVisitTerms,
    });
    setSolutionDescription('');
    setActiveOfferRequestId(null);
    setFeedback('Отклик успешно отправлен клиенту.');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <p className="text-xs text-[#A78BFA] mb-1">
            Раздел 10 · Заявки на услуги без фиксированной записи
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Открытые заказы клиентов и отклики мастеров
          </h1>
          <p className="text-xs md:text-sm text-slate-300 mt-1">
            Клиент описывает задачу и удобное время, а проверенные мастера предлагают решение, стоимость и условия выезда.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors whitespace-nowrap shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showCreateForm ? 'Скрыть форму заявки' : 'Разместить новую заявку'}</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback('')}
            className="text-emerald-200 underline ml-4"
          >
            Закрыть
          </button>
        </div>
      )}

      {showCreateForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="rounded-2xl bg-[#130F24] border border-white/15 p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-white">Создание заявки для исполнителей</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="req-cat" className="block text-xs text-slate-300 mb-1">
                Категория услуги *
              </label>
              <select
                id="req-cat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2.5 text-xs text-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="req-reg" className="block text-xs text-slate-300 mb-1">
                Регион *
              </label>
              <select
                id="req-reg"
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2.5 text-xs text-white"
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="req-city" className="block text-xs text-slate-300 mb-1">
                Населённый пункт *
              </label>
              <select
                id="req-city"
                value={effectiveCityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2.5 text-xs text-white"
              >
                {availableCities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="req-title" className="block text-xs text-slate-300 mb-1">
                Краткая суть задачи *
              </label>
              <input
                id="req-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Установка и подключение водонагревателя в ванной"
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label htmlFor="req-budget" className="block text-xs text-slate-300 mb-1">
                Ориентир бюджета (₽)
              </label>
              <input
                id="req-budget"
                type="number"
                value={budgetHint}
                onChange={(e) => setBudgetHint(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2.5 text-sm text-white font-mono tabular-nums"
              />
            </div>
          </div>

          <div>
            <label htmlFor="req-desc" className="block text-xs text-slate-300 mb-1">
              Подробное описание задачи и условий *
            </label>
            <textarea
              id="req-desc"
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Укажите объём работ, наличие материалов и удобный район..."
              className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2.5 text-sm text-white"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <label htmlFor="req-time" className="block text-xs text-slate-300 mb-1">
                Удобное время выполнения
              </label>
              <input
                id="req-time"
                type="text"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors self-end"
            >
              Опубликовать заявку
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {serviceRequests.map((req) => {
          const reqCity = cities.find((c) => c.id === req.cityId)?.name || 'Кемерово';
          const reqCat = categories.find((c) => c.id === req.categoryId)?.name || 'Услуги';
          const reqOffers = offers.filter((o) => o.requestId === req.id);

          return (
            <div
              key={req.id}
              className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="text-[#A78BFA] font-medium">{reqCat}</span>
                    <span aria-hidden="true">·</span>
                    <span>{reqCity}</span>
                    <span aria-hidden="true">·</span>
                    <span>Заказчик: {req.clientName}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Статус:{' '}
                      {req.status === 'OPEN'
                        ? 'Сбор откликов'
                        : req.status === 'IN_PROGRESS'
                        ? 'Исполнитель выбран'
                        : 'Завершена'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{req.title}</h3>
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-3xl">
                    {req.description}
                  </p>
                  <p className="text-xs text-slate-400">
                    Желаемое время: <span className="text-slate-200">{req.preferredTime}</span>
                  </p>
                </div>

                <div className="flex flex-col items-start md:items-end justify-between gap-3 shrink-0">
                  {req.budgetHint && (
                    <div className="text-left md:text-right">
                      <p className="text-[11px] text-slate-400">Ориентир бюджета</p>
                      <p className="text-lg font-bold text-white font-mono tabular-nums">
                        до {req.budgetHint.toLocaleString('ru-RU')} ₽
                      </p>
                    </div>
                  )}

                  {req.status === 'OPEN' && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveOfferRequestId(
                          activeOfferRequestId === req.id ? null : req.id
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Откликнуться как исполнитель</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Form to submit an offer */}
              {activeOfferRequestId === req.id && (
                <form
                  onSubmit={(e) => handleOfferSubmit(e, req.id)}
                  className="rounded-xl bg-[#0B0914] border border-[#8B5CF6]/40 p-4 space-y-3"
                >
                  <p className="text-xs font-semibold text-[#C4B5FD]">
                    Отклик от проверенного исполнителя: {currentUserExecutorProfile?.displayName}
                  </p>
                  <textarea
                    rows={2}
                    required
                    value={solutionDescription}
                    onChange={(e) => setSolutionDescription(e.target.value)}
                    placeholder="Опишите предлагаемое решение, этапы работ и гарантию..."
                    className="w-full rounded-lg bg-[#130F24] border border-white/15 px-3 py-2 text-xs text-white"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Предварительная стоимость (₽)
                      </label>
                      <input
                        type="number"
                        required
                        value={estimatedPrice}
                        onChange={(e) => setEstimatedPrice(e.target.value)}
                        className="w-full rounded-lg bg-[#130F24] border border-white/15 px-3 py-1.5 text-xs text-white font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Предполагаемые сроки
                      </label>
                      <input
                        type="text"
                        value={estimatedDuration}
                        onChange={(e) => setEstimatedDuration(e.target.value)}
                        className="w-full rounded-lg bg-[#130F24] border border-white/15 px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Условия выезда
                      </label>
                      <input
                        type="text"
                        value={homeVisitTerms}
                        onChange={(e) => setHomeVisitTerms(e.target.value)}
                        className="w-full rounded-lg bg-[#130F24] border border-white/15 px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveOfferRequestId(null)}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                    >
                      Отправить предложение клиенту
                    </button>
                  </div>
                </form>
              )}

              {/* Offers list */}
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <p className="text-xs font-semibold text-slate-300">
                  Отклики исполнителей ({reqOffers.length})
                </p>
                {reqOffers.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Пока нет откликов. Мастера направления уведомлены о заявке.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {reqOffers.map((off) => (
                      <div
                        key={off.id}
                        className={`p-4 rounded-xl border space-y-2 ${
                          off.status === 'ACCEPTED'
                            ? 'bg-emerald-950/30 border-emerald-500/40'
                            : 'bg-[#0B0914] border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white">{off.masterName}</span>
                          <span className="text-sm font-bold text-[#C4B5FD] font-mono tabular-nums">
                            {off.estimatedPrice.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {off.solutionDescription}
                        </p>
                        <div className="text-[11px] text-slate-400 space-y-0.5">
                          <p>Сроки: {off.estimatedDuration}</p>
                          <p>Условия выезда: {off.homeVisitTerms}</p>
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            {off.status === 'ACCEPTED'
                              ? 'Выбран исполнителем заказа'
                              : off.status === 'DECLINED'
                              ? 'Отклонён'
                              : 'Ожидает решения клиента'}
                          </span>
                          {req.status === 'OPEN' && off.status === 'SENT' && (
                            <button
                              type="button"
                              onClick={() => onAcceptOffer(req.id, off.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Выбрать исполнителя</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
