import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Briefcase,
  Calendar,
  Building2,
  Users,
  Send,
} from 'lucide-react';
import {
  Booking,
  Branch,
  Category,
  City,
  District,
  Employee,
  Organization,
  Profile,
  Region,
  ScheduleSlot,
  ServiceItem,
  User,
} from '../domain/types';
import {
  calculateProfileCompleteness,
  MODERATION_STATUS_LABELS,
} from '../domain/marketplaceRules';

interface ExecutorCabinetProps {
  currentUser: User;
  profiles: Profile[];
  organizations: Organization[];
  branches: Branch[];
  employees: Employee[];
  services: ServiceItem[];
  schedules: ScheduleSlot[];
  bookings: Booking[];
  regions: Region[];
  cities: City[];
  districts: District[];
  categories: Category[];
  onSaveProfile: (payload: {
    profileId: string;
    displayName: string;
    specialtyTitle: string;
    bio: string;
    address: string;
    phone: string;
    homeVisit: boolean;
    serviceAreaDescription: string;
    submitForModeration: boolean;
  }) => Promise<void>;
  onAddService: (payload: {
    profileId: string;
    title: string;
    description: string;
    price: number;
    durationMinutes: number;
    homeVisitAvailable: boolean;
  }) => Promise<void>;
  onManageSchedule: (payload: {
    profileId: string;
    date?: string;
    time?: string;
    toggleSlotId?: string;
  }) => Promise<void>;
  onUpdateBookingStatus: (
    bookingId: string,
    status: 'CONFIRMED' | 'COMPLETED' | 'REJECTED'
  ) => Promise<void>;
  onManageOrganization: (payload: {
    organizationId: string;
    kind: 'BRANCH' | 'EMPLOYEE';
    name: string;
    address?: string;
    position?: string;
  }) => Promise<void>;
}

export const ExecutorCabinet: React.FC<ExecutorCabinetProps> = ({
  currentUser,
  profiles,
  organizations,
  branches,
  employees,
  services,
  schedules,
  bookings,
  onSaveProfile,
  onAddService,
  onManageSchedule,
  onUpdateBookingStatus,
  onManageOrganization,
}) => {
  // Determine which profile to show for the current role
  const fallbackProfile =
    currentUser.role === 'ORGANIZATION' || currentUser.role === 'ORG_EMPLOYEE'
      ? profiles.find((p) => p.type === 'ORGANIZATION') || profiles[0]
      : profiles.find((p) => p.userId === currentUser.id) || profiles[0];

  const [selectedProfileId, setSelectedProfileId] = useState<string>(fallbackProfile.id);
  const activeProfile =
    profiles.find((p) => p.id === selectedProfileId) || fallbackProfile;

  const [activeTab, setActiveTab] = useState<
    'PROFILE' | 'SERVICES' | 'SCHEDULE' | 'BOOKINGS' | 'ORG_STRUCTURE'
  >('PROFILE');

  // Profile edit state
  const [displayName, setDisplayName] = useState(activeProfile.displayName);
  const [specialtyTitle, setSpecialtyTitle] = useState(activeProfile.specialtyTitle);
  const [bio, setBio] = useState(activeProfile.bio);
  const [address, setAddress] = useState(activeProfile.address);
  const [phone, setPhone] = useState(activeProfile.phone);
  const [homeVisit, setHomeVisit] = useState(activeProfile.homeVisit);
  const [serviceAreaDescription, setServiceAreaDescription] = useState(
    activeProfile.serviceAreaDescription || ''
  );

  // Add service form
  const [srvTitle, setSrvTitle] = useState('');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvPrice, setSrvPrice] = useState('3000');
  const [srvDuration, setSrvDuration] = useState('60');

  // Schedule form
  const [slotDate, setSlotDate] = useState('2026-11-09');
  const [slotTime, setSlotTime] = useState('13:00');

  // Org form
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddr, setNewBranchAddr] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPos, setNewEmpPos] = useState('');

  const [notice, setNotice] = useState('');

  const handleSwitchProfile = (profId: string) => {
    setSelectedProfileId(profId);
    const p = profiles.find((item) => item.id === profId);
    if (p) {
      setDisplayName(p.displayName);
      setSpecialtyTitle(p.specialtyTitle);
      setBio(p.bio);
      setAddress(p.address);
      setPhone(p.phone);
      setHomeVisit(p.homeVisit);
      setServiceAreaDescription(p.serviceAreaDescription || '');
    }
  };

  const completeness = calculateProfileCompleteness(activeProfile, services);
  const profServices = services.filter((s) => s.profileId === activeProfile.id);
  const profSlots = schedules.filter((s) => s.profileId === activeProfile.id);
  const profBookings = bookings.filter((b) => b.profileId === activeProfile.id);
  const orgRecord = organizations.find((o) => o.profileId === activeProfile.id);

  return (
    <div className="space-y-6">
      {/* Top Status & Profile Switcher Banner */}
      <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#A78BFA]">
            <span>
              {activeProfile.type === 'ORGANIZATION'
                ? 'Кабинет организации / салона'
                : 'Кабинет частного мастера'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Статус модерации: {MODERATION_STATUS_LABELS[activeProfile.moderationStatus]}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Заполненность анкеты: {completeness.score}%
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">{activeProfile.displayName}</h1>
          {activeProfile.moderationComment && (
            <p className="text-xs text-amber-300 mt-1">
              Комментарий модератора: {activeProfile.moderationComment}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="exec-profile-select" className="text-xs text-slate-400">
            Профиль для управления:
          </label>
          <select
            id="exec-profile-select"
            value={activeProfile.id}
            onChange={(e) => handleSwitchProfile(e.target.value)}
            className="rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName} ({MODERATION_STATUS_LABELS[p.moderationStatus]})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Warning if not approved */}
      {activeProfile.moderationStatus !== 'APPROVED' && (
        <div className="rounded-2xl bg-amber-950/40 border border-amber-500/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-200">
                Профиль скрыт из публичного поиска до одобрения модератором
              </p>
              <p className="text-xs text-amber-300/90 mt-0.5">
                Текущий статус: «{MODERATION_STATUS_LABELS[activeProfile.moderationStatus]}». Заполните данные, услуги и отправьте анкету на модерацию.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await onSaveProfile({
                profileId: activeProfile.id,
                displayName,
                specialtyTitle,
                bio,
                address,
                phone,
                homeVisit,
                serviceAreaDescription,
                submitForModeration: true,
              });
              setNotice('Анкета успешно отправлена в очередь модерации!');
            }}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black transition-colors whitespace-nowrap shrink-0"
          >
            Отправить профиль на модерацию
          </button>
        </div>
      )}

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="underline">
            Закрыть
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('PROFILE')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'PROFILE'
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#130F24] text-slate-300 hover:text-white border border-white/10'
          }`}
        >
          Анкета и статус модерации
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SERVICES')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'SERVICES'
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#130F24] text-slate-300 hover:text-white border border-white/10'
          }`}
        >
          Мои услуги и цены ({profServices.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SCHEDULE')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'SCHEDULE'
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#130F24] text-slate-300 hover:text-white border border-white/10'
          }`}
        >
          Расписание и слоты ({profSlots.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('BOOKINGS')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'BOOKINGS'
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#130F24] text-slate-300 hover:text-white border border-white/10'
          }`}
        >
          Записи клиентов ({profBookings.length})
        </button>
        {activeProfile.type === 'ORGANIZATION' && (
          <button
            type="button"
            onClick={() => setActiveTab('ORG_STRUCTURE')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'ORG_STRUCTURE'
                ? 'bg-[#7C3AED] text-white'
                : 'bg-[#130F24] text-slate-300 hover:text-white border border-white/10'
            }`}
          >
            Филиалы и сотрудники организации
          </button>
        )}
      </div>

      {/* TAB 1: Profile & Moderation */}
      {activeTab === 'PROFILE' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSaveProfile({
              profileId: activeProfile.id,
              displayName,
              specialtyTitle,
              bio,
              address,
              phone,
              homeVisit,
              serviceAreaDescription,
              submitForModeration: false,
            });
            setNotice('Изменения профиля сохранены.');
          }}
          className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-white">Редактирование данных площадки</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Название / Имя мастера</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Специализация</label>
              <input
                type="text"
                value={specialtyTitle}
                onChange={(e) => setSpecialtyTitle(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Адрес кабинета / студии</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Контактный телефон</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Описание и квалификация</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2 text-sm text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors"
            >
              Сохранить черновик изменений
            </button>
            <button
              type="button"
              onClick={async () => {
                await onSaveProfile({
                  profileId: activeProfile.id,
                  displayName,
                  specialtyTitle,
                  bio,
                  address,
                  phone,
                  homeVisit,
                  serviceAreaDescription,
                  submitForModeration: true,
                });
                setNotice('Профиль отправлен на проверку модератору.');
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Отправить профиль на модерацию</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Services & Prices */}
      {activeTab === 'SERVICES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Опубликованные услуги и цены</h2>
            <div className="space-y-3">
              {profServices.map((srv) => (
                <div
                  key={srv.id}
                  className="p-4 rounded-xl bg-[#0B0914] border border-white/10 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-bold text-white">{srv.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{srv.description}</p>
                    <p className="text-[11px] text-[#A78BFA] mt-1 font-mono tabular-nums">
                      Длительность: {srv.durationMinutes} мин. · Статус:{' '}
                      {MODERATION_STATUS_LABELS[srv.moderationStatus]}
                    </p>
                  </div>
                  <span className="text-base font-bold text-white font-mono tabular-nums shrink-0">
                    {srv.price.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!srvTitle.trim()) return;
              await onAddService({
                profileId: activeProfile.id,
                title: srvTitle,
                description: srvDesc,
                price: Number(srvPrice) || 2000,
                durationMinutes: Number(srvDuration) || 60,
                homeVisitAvailable: activeProfile.homeVisit,
              });
              setSrvTitle('');
              setSrvDesc('');
              setNotice('Новая услуга успешно добавлена в прайс-лист.');
            }}
            className="lg:col-span-5 rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4 h-fit"
          >
            <h3 className="text-base font-bold text-white">Добавить новую услугу</h3>
            <div>
              <label htmlFor="new-srv-title" className="block text-xs text-slate-300 mb-1">
                Название услуги *
              </label>
              <input
                id="new-srv-title"
                type="text"
                required
                value={srvTitle}
                onChange={(e) => setSrvTitle(e.target.value)}
                placeholder="Например: SPA-уход и реконструкция"
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label htmlFor="new-srv-desc" className="block text-xs text-slate-300 mb-1">
                Описание этапов
              </label>
              <textarea
                id="new-srv-desc"
                rows={2}
                value={srvDesc}
                onChange={(e) => setSrvDesc(e.target.value)}
                placeholder="Что входит в стоимость услуги..."
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="new-srv-price" className="block text-xs text-slate-300 mb-1">
                  Цена (₽) *
                </label>
                <input
                  id="new-srv-price"
                  type="number"
                  required
                  value={srvPrice}
                  onChange={(e) => setSrvPrice(e.target.value)}
                  className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white font-mono tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="new-srv-dur" className="block text-xs text-slate-300 mb-1">
                  Длительность (мин.)
                </label>
                <input
                  id="new-srv-dur"
                  type="number"
                  value={srvDuration}
                  onChange={(e) => setSrvDuration(e.target.value)}
                  className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white font-mono tabular-nums"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors"
            >
              Добавить услугу в прайс
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Schedule */}
      {activeTab === 'SCHEDULE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Временные интервалы для записи</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="p-3.5 rounded-xl bg-[#0B0914] border border-white/10 flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-xs font-bold text-white font-mono tabular-nums">
                      {slot.date} · {slot.time}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {slot.isBooked
                        ? 'Забронировано клиентом'
                        : slot.isClosedByMaster
                        ? 'Закрыто мастером'
                        : 'Свободно для онлайн-записи'}
                    </p>
                  </div>
                  {!slot.isBooked && (
                    <button
                      type="button"
                      onClick={() =>
                        onManageSchedule({
                          profileId: activeProfile.id,
                          toggleSlotId: slot.id,
                        })
                      }
                      className="px-2.5 py-1 rounded text-xs bg-white/10 hover:bg-white/15 text-slate-200"
                    >
                      {slot.isClosedByMaster ? 'Открыть' : 'Закрыть'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onManageSchedule({
                profileId: activeProfile.id,
                date: slotDate,
                time: slotTime,
              });
              setNotice(`Добавлено свободное окно ${slotDate} в ${slotTime}.`);
            }}
            className="lg:col-span-5 rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4 h-fit"
          >
            <h3 className="text-base font-bold text-white">Открыть новое окно записи</h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Дата (ГГГГ-ММ-ДД)</label>
              <input
                type="date"
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Время (ЧЧ:ММ)</label>
              <input
                type="time"
                value={slotTime}
                onChange={(e) => setSlotTime(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
            >
              Добавить слот в расписание
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: Incoming Bookings */}
      {activeTab === 'BOOKINGS' && (
        <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Управление записями клиентов</h2>
          {profBookings.length === 0 ? (
            <p className="text-xs text-slate-400">По данному профилю пока нет записей.</p>
          ) : (
            <div className="space-y-3">
              {profBookings.map((bk) => (
                <div
                  key={bk.id}
                  className="p-4 rounded-xl bg-[#0B0914] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="text-[#A78BFA] font-semibold">Статус: {bk.status}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {bk.date} в {bk.time}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Клиент: {bk.clientName} ({bk.clientPhone})
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">{bk.serviceTitle}</p>
                    {bk.comment && <p className="text-xs text-slate-400">Пожелание: {bk.comment}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-white font-mono tabular-nums mr-2">
                      {bk.price.toLocaleString('ru-RU')} ₽
                    </span>

                    {bk.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onUpdateBookingStatus(bk.id, 'CONFIRMED')}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          Подтвердить запись
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateBookingStatus(bk.id, 'REJECTED')}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/60 text-rose-300 border border-rose-500/30"
                        >
                          Отклонить
                        </button>
                      </>
                    )}

                    {bk.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        onClick={() => onUpdateBookingStatus(bk.id, 'COMPLETED')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                      >
                        Отметить заказ выполненным
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Organization Branches & Employees */}
      {activeTab === 'ORG_STRUCTURE' && orgRecord && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#A78BFA]" />
              <h3 className="text-base font-bold text-white">Филиалы организации</h3>
            </div>
            <div className="space-y-2.5">
              {branches
                .filter((b) => b.organizationId === orgRecord.id)
                .map((br) => (
                  <div
                    key={br.id}
                    className="p-3.5 rounded-xl bg-[#0B0914] border border-white/10"
                  >
                    <p className="text-xs font-bold text-white">{br.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {br.address} · {br.phone}
                    </p>
                  </div>
                ))}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newBranchName.trim()) return;
                await onManageOrganization({
                  organizationId: orgRecord.id,
                  kind: 'BRANCH',
                  name: newBranchName,
                  address: newBranchAddr || 'г. Кемерово, пр. Ленина, 10',
                });
                setNewBranchName('');
                setNewBranchAddr('');
              }}
              className="pt-3 border-t border-white/10 space-y-2.5"
            >
              <input
                type="text"
                placeholder="Название нового филиала"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Адрес филиала"
                value={newBranchAddr}
                onChange={(e) => setNewBranchAddr(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#7C3AED] text-white"
              >
                Добавить филиал
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#A78BFA]" />
              <h3 className="text-base font-bold text-white">Сотрудники и права доступа</h3>
            </div>
            <div className="space-y-2.5">
              {employees
                .filter((e) => e.organizationId === orgRecord.id)
                .map((emp) => (
                  <div
                    key={emp.id}
                    className="p-3.5 rounded-xl bg-[#0B0914] border border-white/10 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{emp.name}</p>
                      <p className="text-xs text-slate-400">{emp.position}</p>
                    </div>
                    <span className="text-[11px] text-[#A78BFA]">
                      Расписание · Записи
                    </span>
                  </div>
                ))}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newEmpName.trim()) return;
                await onManageOrganization({
                  organizationId: orgRecord.id,
                  kind: 'EMPLOYEE',
                  name: newEmpName,
                  position: newEmpPos || 'Специалист салона',
                });
                setNewEmpName('');
                setNewEmpPos('');
              }}
              className="pt-3 border-t border-white/10 space-y-2.5"
            >
              <input
                type="text"
                placeholder="Имя и фамилия сотрудника"
                value={newEmpName}
                onChange={(e) => setNewEmpName(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Должность / специализация"
                value={newEmpPos}
                onChange={(e) => setNewEmpPos(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#7C3AED] text-white"
              >
                Добавить сотрудника
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
