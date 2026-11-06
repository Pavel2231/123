import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Star,
  Heart,
  Calendar,
  Clock,
  CheckCircle2,
  X,
  ArrowUpRight,
} from 'lucide-react';
import {
  Booking,
  Category,
  City,
  District,
  Favorite,
  Organization,
  Profile,
  Region,
  Review,
  ScheduleSlot,
  ServiceItem,
  User,
} from '../domain/types';
import { isProfilePubliclyVisible } from '../domain/marketplaceRules';
import { HERO_IMAGE_PATH } from '../domain/seedData';
import { SmartImage } from './SmartImage';

interface CatalogViewProps {
  currentUser: User;
  regions: Region[];
  cities: City[];
  districts: District[];
  categories: Category[];
  profiles: Profile[];
  organizations: Organization[];
  services: ServiceItem[];
  schedules: ScheduleSlot[];
  reviews: Review[];
  favorites: Favorite[];
  bookings: Booking[];
  selectedRegionId: string;
  selectedCityId: string;
  onSelectRegion: (id: string) => void;
  onSelectCity: (id: string) => void;
  onToggleFavorite: (profileId: string) => Promise<void>;
  onCreateBooking: (payload: {
    profileId: string;
    serviceId: string;
    slotId: string;
    comment: string;
    clientName: string;
    clientPhone: string;
  }) => Promise<void>;
  onOpenRequestsSection: () => void;
  onOpenRegisterModal: (refCode?: string) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  currentUser,
  regions,
  cities,
  districts,
  categories,
  profiles,
  organizations,
  services,
  schedules,
  reviews,
  favorites,
  selectedRegionId,
  selectedCityId,
  onSelectRegion,
  onSelectCity,
  onToggleFavorite,
  onCreateBooking,
  onOpenRequestsSection,
  onOpenRegisterModal,
}) => {
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [executorTypeFilter, setExecutorTypeFilter] = useState<'ALL' | 'MASTER' | 'ORGANIZATION'>('ALL');
  const [onlyHomeVisit, setOnlyHomeVisit] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  // Booking modal state
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [bookingComment, setBookingComment] = useState('');
  const [bookingClientName, setBookingClientName] = useState(currentUser.name);
  const [bookingClientPhone, setBookingClientPhone] = useState(currentUser.phone);
  const [bookingStatusMessage, setBookingStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const activeRegions = regions.filter((r) => r.isActive);
  const regionCities = cities.filter((c) => c.regionId === selectedRegionId && c.isActive);
  const cityDistricts = districts.filter((d) => d.cityId === selectedCityId);

  // Strictly filter only approved public profiles (and non-blocked organizations)
  const publicProfiles = profiles.filter((p) => {
    const org = organizations.find((o) => o.profileId === p.id);
    if (!isProfilePubliclyVisible(p, org)) return false;
    if (selectedRegionId !== 'ALL' && p.regionId !== selectedRegionId) return false;
    if (selectedCityId !== 'ALL' && p.cityId !== selectedCityId) return false;
    if (selectedDistrictId !== 'ALL' && p.districtId !== selectedDistrictId) return false;
    if (selectedCategoryId !== 'ALL' && p.categoryId !== selectedCategoryId) return false;
    if (executorTypeFilter !== 'ALL' && p.type !== executorTypeFilter) return false;
    if (onlyHomeVisit && !p.homeVisit) return false;

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const profileServices = services.filter((s) => s.profileId === p.id);
      const matchesTitle =
        p.displayName.toLowerCase().includes(q) ||
        p.specialtyTitle.toLowerCase().includes(q) ||
        p.bio.toLowerCase().includes(q);
      const matchesService = profileServices.some((s) => s.title.toLowerCase().includes(q));
      if (!matchesTitle && !matchesService) return false;
    }

    return true;
  });

  const openProfileModal = (profile: Profile) => {
    setActiveProfileId(profile.id);
    const profServices = services.filter(
      (s) => s.profileId === profile.id && s.moderationStatus === 'APPROVED'
    );
    const freeSlots = schedules.filter(
      (s) => s.profileId === profile.id && !s.isBooked && !s.isClosedByMaster
    );
    setSelectedServiceId(profServices[0]?.id || '');
    setSelectedSlotId(freeSlots[0]?.id || '');
    setBookingClientName(currentUser.name);
    setBookingClientPhone(currentUser.phone);
    setBookingComment('');
    setBookingStatusMessage(null);
  };

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null;

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    if (!selectedServiceId || !selectedSlotId) {
      setBookingStatusMessage({
        type: 'error',
        text: 'Выберите услугу и свободный интервал времени.',
      });
      return;
    }
    try {
      await onCreateBooking({
        profileId: activeProfile.id,
        serviceId: selectedServiceId,
        slotId: selectedSlotId,
        comment: bookingComment,
        clientName: bookingClientName,
        clientPhone: bookingClientPhone,
      });
      setBookingStatusMessage({
        type: 'success',
        text: 'Запись успешно оформлена! Статус отображается в разделе «Мои записи» личного кабинета.',
      });
    } catch (err: any) {
      setBookingStatusMessage({
        type: 'error',
        text: err?.message || 'Не удалось создать запись на выбранный слот.',
      });
    }
  };

  const currentRegionName =
    regions.find((r) => r.id === selectedRegionId)?.name || 'Кемеровская область — Кузбасс';
  const currentCityName =
    selectedCityId === 'ALL'
      ? 'Все города региона'
      : cities.find((c) => c.id === selectedCityId)?.name || 'Кемерово';

  return (
    <div className="space-y-12">
      {/* SECTION 1: Split Storefront Hero */}
      <section className="pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl bg-[#130F24] border border-white/10 p-6 md:p-10">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#A78BFA]">
                <span>Региональный маркетплейс услуг</span>
                <span aria-hidden="true">·</span>
                <span>{currentRegionName}</span>
                <span aria-hidden="true">·</span>
                <span>Обязательная проверка площадок</span>
              </div>

              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-[1.12]">
                Найди своего мастера в {currentCityName === 'Все города региона' ? 'своём городе' : currentCityName}
              </h1>

              <p className="text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed">
                Частные специалисты, салоны и сервисные компании, прошедшие модерацию. Прозрачный прайс-лист, реальное расписание без двойных записей и отзывы только по завершённым визитам.
              </p>
            </div>

            {/* Geography & Search Bar inside Hero */}
            <div className="mt-8 space-y-4 pt-6 border-t border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="hero-region-select" className="block text-xs text-slate-400 mb-1">
                    Регион России
                  </label>
                  <select
                    id="hero-region-select"
                    value={selectedRegionId}
                    onChange={(e) => {
                      onSelectRegion(e.target.value);
                      setSelectedDistrictId('ALL');
                    }}
                    className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2.5 text-xs font-medium text-white focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="ALL">Все регионы России</option>
                    {activeRegions.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        {reg.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="hero-city-select" className="block text-xs text-slate-400 mb-1">
                    Населённый пункт
                  </label>
                  <select
                    id="hero-city-select"
                    value={selectedCityId}
                    onChange={(e) => {
                      onSelectCity(e.target.value);
                      setSelectedDistrictId('ALL');
                    }}
                    className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2.5 text-xs font-medium text-white focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="ALL">Все города региона</option>
                    {regionCities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="hero-district-select" className="block text-xs text-slate-400 mb-1">
                    Район города
                  </label>
                  <select
                    id="hero-district-select"
                    value={selectedDistrictId}
                    onChange={(e) => setSelectedDistrictId(e.target.value)}
                    className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2.5 text-xs font-medium text-white focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="ALL">Любой район</option>
                    {cityDistricts.map((dist) => (
                      <option key={dist.id} value={dist.id}>
                        {dist.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    aria-label="Поиск услуги, специальности или имени мастера"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Услуга, направление или имя мастера (например: окрашивание, электрощит, детейлинг)..."
                    className="w-full rounded-lg bg-[#0B0914] border border-white/15 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <button
                  type="button"
                  onClick={onOpenRequestsSection}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors whitespace-nowrap shrink-0"
                >
                  Создать заявку без точного времени
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-white/10 min-h-[320px]">
            <SmartImage
              src={HERO_IMAGE_PATH}
              alt="Интерьер современной студии мастеров РЯДОМ в Кузбассе"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0914] via-[#0B0914]/40 to-transparent flex flex-col justify-end p-6">
              <p className="text-xs text-[#C4B5FD] mb-1">
                Развитие регионов и контроль стандартов
              </p>
              <p className="text-base font-semibold text-white">
                Мастера и организации проходят ручную верификацию перед публикацией в каталоге
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenRegisterModal('KUZ-BEAUTY-01')}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors whitespace-nowrap"
                >
                  Подключиться как мастер или салон
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width 4-column regional metric & nearest slot bar below hero split */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 rounded-2xl bg-[#130F24] border border-white/10 p-5">
          <div>
            <p className="text-xs text-slate-400">Одобренных площадок в выборке</p>
            <p className="text-xl font-bold text-white font-mono tabular-nums mt-1">
              {publicProfiles.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Свободных окон для записи</p>
            <p className="text-xl font-bold text-white font-mono tabular-nums mt-1">
              {
                schedules.filter(
                  (s) =>
                    !s.isBooked &&
                    !s.isClosedByMaster &&
                    publicProfiles.some((p) => p.id === s.profileId)
                ).length
              }
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Опубликованных услуг с прайсом</p>
            <p className="text-xl font-bold text-white font-mono tabular-nums mt-1">
              {
                services.filter(
                  (s) =>
                    s.moderationStatus === 'APPROVED' &&
                    publicProfiles.some((p) => p.id === s.profileId)
                ).length
              }
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Региональное покрытие</p>
            <p className="text-sm font-semibold text-[#C4B5FD] mt-1.5 truncate">
              Кузбасс · Новосибирск · Томск
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: Category Filter Bar & Catalog Grid */}
      <section className="space-y-6" id="catalog-section">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">Каталог проверенных исполнителей</h2>
            <p className="text-xs text-slate-400 mt-1">
              Отображаются только профили со статусом «Одобрен» после проверки модератором
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Executor Type Filter */}
            <div className="flex items-center gap-1 p-1 bg-[#130F24] rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setExecutorTypeFilter('ALL')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  executorTypeFilter === 'ALL'
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Все исполнители
              </button>
              <button
                type="button"
                onClick={() => setExecutorTypeFilter('MASTER')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  executorTypeFilter === 'MASTER'
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Частные мастера
              </button>
              <button
                type="button"
                onClick={() => setExecutorTypeFilter('ORGANIZATION')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  executorTypeFilter === 'ORGANIZATION'
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Салоны и компании
              </button>
            </div>

            <button
              type="button"
              onClick={() => setOnlyHomeVisit(!onlyHomeVisit)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                onlyHomeVisit
                  ? 'bg-[#7C3AED]/20 border-[#8B5CF6] text-white'
                  : 'bg-[#130F24] border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              Выезд к клиенту
            </button>
          </div>
        </div>

        {/* Interactive Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('ALL')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              selectedCategoryId === 'ALL'
                ? 'bg-[#7C3AED] text-white'
                : 'bg-[#130F24] text-slate-300 hover:text-white border border-white/10'
            }`}
          >
            Все направления
          </button>
          {categories
            .filter((c) => c.isActive)
            .map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategoryId === cat.id
                    ? 'bg-[#7C3AED] text-white'
                    : 'bg-[#130F24] text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                {cat.name}
              </button>
            ))}
        </div>

        {/* 3-Column Approved Profiles Grid */}
        {publicProfiles.length === 0 ? (
          <div className="rounded-2xl bg-[#130F24] border border-white/10 p-10 text-center space-y-3">
            <p className="text-base font-semibold text-white">
              По выбранным параметрам фильтра пока нет одобренных площадок
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Попробуйте выбрать «Все города региона» или сбросить фильтр направления, либо оставьте открытую заявку для мастеров.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryId('ALL');
                  setSelectedDistrictId('ALL');
                  setExecutorTypeFilter('ALL');
                  setOnlyHomeVisit(false);
                  setSearchQuery('');
                  onSelectCity('ALL');
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors"
              >
                Сбросить все фильтры
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicProfiles.map((prof) => {
              const cityObj = cities.find((c) => c.id === prof.cityId);
              const distObj = districts.find((d) => d.id === prof.districtId);
              const catObj = categories.find((c) => c.id === prof.categoryId);
              const profServices = services.filter(
                (s) => s.profileId === prof.id && s.moderationStatus === 'APPROVED'
              );
              const minPrice =
                profServices.length > 0
                  ? Math.min(...profServices.map((s) => s.price))
                  : 0;
              const freeSlots = schedules.filter(
                (s) => s.profileId === prof.id && !s.isBooked && !s.isClosedByMaster
              );
              const isFav = favorites.some(
                (f) => f.userId === currentUser.id && f.profileId === prof.id
              );

              return (
                <article
                  key={prof.id}
                  className="group flex flex-col justify-between rounded-2xl bg-[#130F24] border border-white/10 overflow-hidden hover:-translate-y-0.5 transition-transform duration-200"
                >
                  <div>
                    {/* 65-75% Card Image Lead */}
                    <div className="relative h-56 w-full overflow-hidden bg-[#0B0914]">
                      <SmartImage
                        src={prof.photos[0] || HERO_IMAGE_PATH}
                        alt={`${prof.displayName} — ${prof.specialtyTitle}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#130F24] via-transparent to-black/30" />

                      <button
                        type="button"
                        onClick={() => onToggleFavorite(prof.id)}
                        aria-label={
                          isFav
                            ? `Убрать ${prof.displayName} из избранного`
                            : `Добавить ${prof.displayName} в избранное`
                        }
                        className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isFav ? 'fill-rose-500 text-rose-500' : 'text-white'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-5 space-y-3">
                      {/* Zero-Pill Unboxed Metadata with · separators */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                        <span>{prof.type === 'ORGANIZATION' ? 'Организация' : 'Частный мастер'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{catObj?.name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#A78BFA]">Профиль проверен</span>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-white leading-snug">
                          {prof.displayName}
                        </h3>
                        <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                          {prof.specialtyTitle}
                        </p>
                      </div>

                      {/* Location & Rating metadata */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#A78BFA]" />
                          {cityObj?.name}
                          {distObj ? `, ${distObj.name}` : ''}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          {prof.rating > 0 ? prof.rating.toFixed(1) : 'Новый'} ({prof.reviewsCount}{' '}
                          отзывов)
                        </span>
                      </div>

                      {/* Top 2 services preview */}
                      <div className="pt-2 border-t border-white/10 space-y-1.5">
                        {profServices.slice(0, 2).map((srv) => (
                          <div
                            key={srv.id}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="text-slate-300 truncate">{srv.title}</span>
                            <span className="text-white font-semibold font-mono tabular-nums shrink-0">
                              {srv.price.toLocaleString('ru-RU')} ₽
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-slate-400">
                        {freeSlots.length > 0
                          ? `Ближайшее окно: ${freeSlots[0].date} в ${freeSlots[0].time}`
                          : 'Запись по согласованию'}
                      </p>
                      <p className="text-sm font-bold text-white font-mono tabular-nums">
                        от {minPrice.toLocaleString('ru-RU')} ₽
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openProfileModal(prof)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors whitespace-nowrap shrink-0"
                    >
                      Записаться
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 3: Open Service Requests Promo Strip */}
      <section className="rounded-2xl bg-[#130F24] border border-white/10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-[#A78BFA]">
            <span>Заявки без фиксированной записи</span>
            <span aria-hidden="true">·</span>
            <span>Ремонт, бытовые задачи, автосервис, выезд на дом</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white">
            Не нашли точное время или нужна оценка нестандартной задачи?
          </h2>
          <p className="text-xs md:text-sm text-slate-300">
            Опишите задачу, укажите город и желаемое время. Проверенные мастера вашего региона предложат стоимость, сроки и условия выезда.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenRequestsSection}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors whitespace-nowrap shrink-0"
        >
          <span>Перейти к заявкам и откликам</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </section>

      {/* Profile Detail & Booking Modal */}
      {activeProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
        >
          <div className="relative w-full max-w-4xl rounded-2xl bg-[#130F24] border border-white/15 p-6 md:p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#A78BFA] mb-1">
                  <span>
                    {activeProfile.type === 'ORGANIZATION'
                      ? 'Проверенная организация'
                      : 'Проверенный частный мастер'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {cities.find((c) => c.id === activeProfile.cityId)?.name},{' '}
                    {activeProfile.address}
                  </span>
                </div>
                <h2 id="profile-modal-title" className="text-2xl font-bold text-white">
                  {activeProfile.displayName}
                </h2>
                <p className="text-sm text-slate-300 mt-0.5">{activeProfile.specialtyTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveProfileId(null)}
                aria-label="Закрыть карточку исполнителя"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
              {/* Left column: About, Services, Reviews */}
              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-xl overflow-hidden h-56 border border-white/10">
                  <SmartImage
                    src={activeProfile.photos[0] || HERO_IMAGE_PATH}
                    alt={activeProfile.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">Об исполнителе</h3>
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                    {activeProfile.bio}
                  </p>
                  {activeProfile.homeVisit && (
                    <p className="text-xs text-[#C4B5FD]">
                      Выезд к клиенту: {activeProfile.serviceAreaDescription || 'по согласованию в пределах города'}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 pt-1">
                    Статус проверки профиля: анкета и контактные данные проверены модератором платформы РЯДОМ (не является государственной лицензией).
                  </p>
                </div>

                {/* Services list */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">Услуги и прайс-лист</h3>
                  <div className="space-y-2">
                    {services
                      .filter(
                        (s) =>
                          s.profileId === activeProfile.id && s.moderationStatus === 'APPROVED'
                      )
                      .map((srv) => (
                        <div
                          key={srv.id}
                          onClick={() => setSelectedServiceId(srv.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                            selectedServiceId === srv.id
                              ? 'bg-[#1F1638] border-[#8B5CF6]'
                              : 'bg-[#0B0914] border-white/10 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs md:text-sm font-semibold text-white">
                              {srv.title}
                            </span>
                            <span className="text-sm font-bold text-white font-mono tabular-nums shrink-0">
                              {srv.price.toLocaleString('ru-RU')} ₽
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{srv.description}</p>
                          <p className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
                            Длительность: {srv.durationMinutes} мин.
                            {srv.homeVisitAvailable ? ' · Возможен выезд' : ''}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Verified Reviews */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <h3 className="text-sm font-semibold text-white">
                    Подтверждённые отзывы клиентов (только по завершённым записям)
                  </h3>
                  {reviews.filter(
                    (r) =>
                      r.profileId === activeProfile.id && r.moderationStatus === 'PUBLISHED'
                  ).length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Пока нет опубликованных отзывов по завершённым записям.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {reviews
                        .filter(
                          (r) =>
                            r.profileId === activeProfile.id &&
                            r.moderationStatus === 'PUBLISHED'
                        )
                        .map((rev) => (
                          <div
                            key={rev.id}
                            className="p-3.5 rounded-xl bg-[#0B0914] border border-white/10 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-white">{rev.clientName}</span>
                              <span className="text-amber-400 font-mono tabular-nums">
                                ★ {rev.rating}.0 · Заказ подтверждён
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{rev.text}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right column: Contiguous Booking Module */}
              <div className="lg:col-span-5">
                <form
                  onSubmit={handleConfirmBooking}
                  className="rounded-2xl bg-[#0B0914] border border-white/15 p-5 space-y-4 sticky top-4"
                >
                  <h3 className="text-base font-bold text-white">Онлайн-запись к специалисту</h3>

                  <div>
                    <label htmlFor="book-service" className="block text-xs text-slate-300 mb-1">
                      Выбранная услуга
                    </label>
                    <select
                      id="book-service"
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="w-full rounded-lg bg-[#130F24] border border-white/15 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                    >
                      {services
                        .filter(
                          (s) =>
                            s.profileId === activeProfile.id &&
                            s.moderationStatus === 'APPROVED'
                        )
                        .map((srv) => (
                          <option key={srv.id} value={srv.id}>
                            {srv.title} — {srv.price.toLocaleString('ru-RU')} ₽
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5">
                      Доступные окна расписания (защита от двойной записи)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {schedules
                        .filter(
                          (s) =>
                            s.profileId === activeProfile.id &&
                            !s.isBooked &&
                            !s.isClosedByMaster
                        )
                        .map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setSelectedSlotId(slot.id)}
                            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-mono tabular-nums border transition-colors ${
                              selectedSlotId === slot.id
                                ? 'bg-[#7C3AED] border-[#8B5CF6] text-white font-semibold'
                                : 'bg-[#130F24] border-white/10 text-slate-300 hover:text-white'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{slot.date.slice(5)}</span>
                            <Clock className="w-3.5 h-3.5 ml-1" />
                            <span>{slot.time}</span>
                          </button>
                        ))}
                    </div>
                    {schedules.filter(
                      (s) =>
                        s.profileId === activeProfile.id && !s.isBooked && !s.isClosedByMaster
                    ).length === 0 && (
                      <p className="text-xs text-amber-400 mt-1">
                        Все открытые слоты уже забронированы. Выберите другого мастера или создайте заявку.
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="book-client-name" className="block text-xs text-slate-300 mb-1">
                      Ваше имя *
                    </label>
                    <input
                      id="book-client-name"
                      type="text"
                      required
                      value={bookingClientName}
                      onChange={(e) => setBookingClientName(e.target.value)}
                      className="w-full rounded-lg bg-[#130F24] border border-white/15 px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="book-client-phone" className="block text-xs text-slate-300 mb-1">
                      Телефон для подтверждения *
                    </label>
                    <input
                      id="book-client-phone"
                      type="tel"
                      required
                      value={bookingClientPhone}
                      onChange={(e) => setBookingClientPhone(e.target.value)}
                      className="w-full rounded-lg bg-[#130F24] border border-white/15 px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="book-comment" className="block text-xs text-slate-300 mb-1">
                      Комментарий или пожелания к записи
                    </label>
                    <textarea
                      id="book-comment"
                      rows={2}
                      value={bookingComment}
                      onChange={(e) => setBookingComment(e.target.value)}
                      placeholder="Уточните детали задачи или пожелания..."
                      className="w-full rounded-lg bg-[#130F24] border border-white/15 px-3 py-2 text-xs text-white"
                    />
                  </div>

                  {bookingStatusMessage && (
                    <div
                      className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                        bookingStatusMessage.type === 'success'
                          ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{bookingStatusMessage.text}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!selectedServiceId || !selectedSlotId}
                    className="w-full py-3 px-4 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white transition-colors"
                  >
                    Подтвердить запись на выбранное время
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
