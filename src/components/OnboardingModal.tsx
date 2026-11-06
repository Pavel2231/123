import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { Category, City, District, Region, RoleCode } from '../domain/types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  regions: Region[];
  cities: City[];
  districts: District[];
  categories: Category[];
  defaultRegionId: string;
  defaultCityId: string;
  initialReferralCode?: string;
  onRegisterSubmit: (payload: {
    name: string;
    phone: string;
    email: string;
    role: RoleCode;
    regionId: string;
    cityId: string;
    districtId: string;
    categoryId: string;
    specialtyTitle: string;
    bio: string;
    address: string;
    homeVisit: boolean;
    referralCode: string;
    serviceTitle: string;
    servicePrice: number;
  }) => Promise<void>;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  regions,
  cities,
  districts,
  categories,
  defaultRegionId,
  defaultCityId,
  initialReferralCode = '',
  onRegisterSubmit,
}) => {
  const [role, setRole] = useState<'CLIENT' | 'MASTER' | 'ORGANIZATION'>('MASTER');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [regionId, setRegionId] = useState(defaultRegionId || 'reg-kuzbass');
  const [cityId, setCityId] = useState(defaultCityId || 'city-kemerovo');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat-beauty');
  const [specialtyTitle, setSpecialtyTitle] = useState('');
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState('');
  const [homeVisit, setHomeVisit] = useState(false);
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [serviceTitle, setServiceTitle] = useState('');
  const [servicePrice, setServicePrice] = useState('2500');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const availableCities = cities.filter((c) => c.regionId === regionId && c.isActive);
  const activeCityId = availableCities.some((c) => c.id === cityId)
    ? cityId
    : availableCities[0]?.id || '';
  const availableDistricts = districts.filter((d) => d.cityId === activeCityId);
  const activeDistrictId = availableDistricts[0]?.id || 'dist-kem-center';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (name.trim().length < 3 || phone.trim().length < 6) {
      setError('Пожалуйста, укажите корректное имя (или название организации) и контактный телефон.');
      return;
    }

    if (role !== 'CLIENT' && (specialtyTitle.trim().length < 3 || serviceTitle.trim().length < 3)) {
      setError('Для регистрации исполнителя укажите специализацию и хотя бы одну базовую услугу.');
      return;
    }

    setSubmitting(true);
    try {
      await onRegisterSubmit({
        name,
        phone,
        email,
        role,
        regionId,
        cityId: activeCityId,
        districtId: activeDistrictId,
        categoryId,
        specialtyTitle,
        bio:
          bio.trim() ||
          'Профессиональное выполнение услуг с соблюдением стандартов качества и безопасности клиентов.',
        address: address.trim() || 'Центральный район, приём по предварительной записи',
        homeVisit,
        referralCode,
        serviceTitle,
        servicePrice: Number(servicePrice) || 2000,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Ошибка при регистрации профиля.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#130F24] border border-white/10 p-6 md:p-8 shadow-2xl my-8">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <p className="text-xs text-[#A78BFA] mb-1">Регистрация в региональной сети РЯДОМ</p>
            <h2 id="onboarding-modal-title" className="text-xl md:text-2xl font-bold text-white">
              Создание аккаунта и анкеты
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно регистрации"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Выберите тип аккаунта (роли куратора и администратора назначаются только владельцем)
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#0B0914] rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setRole('MASTER')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  role === 'MASTER'
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Частный мастер
              </button>
              <button
                type="button"
                onClick={() => setRole('ORGANIZATION')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  role === 'ORGANIZATION'
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Организация / Салон
              </button>
              <button
                type="button"
                onClick={() => setRole('CLIENT')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  role === 'CLIENT'
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Клиент
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                {role === 'ORGANIZATION' ? 'Название салона / организации *' : 'Имя и фамилия *'}
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'ORGANIZATION' ? 'Например: Студия эстетики Лотос' : 'Например: Светлана Орлова'}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-xs font-medium text-slate-300 mb-1.5">
                Контактный телефон *
              </label>
              <input
                id="reg-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (923) 000-00-00"
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-region" className="block text-xs font-medium text-slate-300 mb-1.5">
                Регион России *
              </label>
              <select
                id="reg-region"
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
              >
                {regions.filter((r) => r.isActive).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="reg-city" className="block text-xs font-medium text-slate-300 mb-1.5">
                Населённый пункт *
              </label>
              <select
                id="reg-city"
                value={activeCityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
              >
                {availableCities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {role !== 'CLIENT' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-category" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Направление деятельности *
                  </label>
                  <select
                    id="reg-category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
                  >
                    {categories.filter((c) => c.isActive).map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="reg-ref" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Код приглашения регионального куратора
                  </label>
                  <input
                    id="reg-ref"
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="Например: KUZ-BEAUTY-01"
                    className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-spec" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Специализация профиля *
                  </label>
                  <input
                    id="reg-spec"
                    type="text"
                    required
                    value={specialtyTitle}
                    onChange={(e) => setSpecialtyTitle(e.target.value)}
                    placeholder="Например: Косметолог-эстетист / Автоэлектрик"
                    className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div>
                  <label htmlFor="reg-address" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Адрес приёма или базы
                  </label>
                  <input
                    id="reg-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ул. Кирова, 25, каб. 12"
                    className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="reg-srv-title" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Первая услуга для прайс-листа *
                  </label>
                  <input
                    id="reg-srv-title"
                    type="text"
                    required
                    value={serviceTitle}
                    onChange={(e) => setServiceTitle(e.target.value)}
                    placeholder="Например: Комбинированная чистка лица"
                    className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label htmlFor="reg-srv-price" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Цена услуги (₽) *
                  </label>
                  <input
                    id="reg-srv-price"
                    type="number"
                    min={100}
                    required
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2.5 text-sm text-white font-mono tabular-nums focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-bio" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Описание опыта, оборудования и гарантий
                </label>
                <textarea
                  id="reg-bio"
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Опишите ваш опыт работы, используемые материалы и стандарты стерильности..."
                  className="w-full rounded-lg bg-[#0B0914] border border-white/15 px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[#0B0914] border border-white/10">
                <label htmlFor="reg-homevisit" className="text-xs text-slate-300 cursor-pointer">
                  Возможен выезд к клиенту по городу и пригороду
                </label>
                <input
                  id="reg-homevisit"
                  type="checkbox"
                  checked={homeVisit}
                  onChange={(e) => setHomeVisit(e.target.checked)}
                  className="w-4 h-4 accent-[#8B5CF6]"
                />
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#1C1433] border border-[#8B5CF6]/30 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-[#A78BFA] shrink-0 mt-0.5" />
                <span>
                  Обязательная модерация: после отправки анкета получит статус «Отправлен на проверку» и появится в публичном каталоге только после проверки модератором.
                </span>
              </div>
            </>
          )}

          {error && (
            <p className="text-xs font-medium text-rose-400 bg-rose-950/50 border border-rose-500/30 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors whitespace-nowrap"
            >
              {submitting
                ? 'Сохранение...'
                : role === 'CLIENT'
                ? 'Зарегистрироваться как клиент'
                : 'Создать профиль и отправить на модерацию'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
