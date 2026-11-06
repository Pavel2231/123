import React, { useState } from 'react';
import { Calendar, Heart, Bell, MessageSquare, Star } from 'lucide-react';
import {
  Booking,
  Favorite,
  NotificationItem,
  Profile,
  Review,
  User,
} from '../domain/types';
import { canSubmitReview } from '../domain/marketplaceRules';

interface ClientCabinetProps {
  currentUser: User;
  bookings: Booking[];
  favorites: Favorite[];
  profiles: Profile[];
  reviews: Review[];
  notifications: NotificationItem[];
  onCancelBooking: (bookingId: string) => Promise<void>;
  onSubmitReview: (payload: {
    bookingId: string;
    rating: number;
    text: string;
  }) => Promise<void>;
  onToggleFavorite: (profileId: string) => Promise<void>;
  onMarkNotificationsRead: () => Promise<void>;
}

export const ClientCabinet: React.FC<ClientCabinetProps> = ({
  currentUser,
  bookings,
  favorites,
  profiles,
  reviews,
  notifications,
  onCancelBooking,
  onSubmitReview,
  onToggleFavorite,
  onMarkNotificationsRead,
}) => {
  const [activeTab, setActiveTab] = useState<'BOOKINGS' | 'FAVORITES' | 'REVIEWS' | 'NOTIFICATIONS'>(
    'BOOKINGS'
  );
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [message, setMessage] = useState('');

  const myBookings = bookings.filter((b) => b.clientId === currentUser.id);
  const myFavorites = favorites.filter((f) => f.userId === currentUser.id);
  const myReviews = reviews.filter((r) => r.clientId === currentUser.id);
  const myNotifications = notifications.filter(
    (n) => n.userId === currentUser.id || n.roleTarget === 'CLIENT'
  );

  const handleReviewSubmit = async (e: React.FormEvent, bookingId: string) => {
    e.preventDefault();
    try {
      await onSubmitReview({ bookingId, rating, text: reviewText });
      setReviewBookingId(null);
      setReviewText('');
      setMessage('Отзыв успешно опубликован и привязан к завершённому визиту.');
    } catch (err: any) {
      setMessage(err?.message || 'Ошибка при отправке отзыва.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar */}
      <aside className="lg:col-span-3 space-y-4">
        <div className="rounded-2xl bg-[#130F24] border border-white/10 p-5 space-y-3">
          <div>
            <p className="text-xs text-[#A78BFA]">Личный кабинет клиента</p>
            <h2 className="text-lg font-bold text-white mt-0.5">{currentUser.name}</h2>
            <p className="text-xs text-slate-400 font-mono">{currentUser.phone}</p>
          </div>

          <nav className="space-y-1 pt-3 border-t border-white/10" aria-label="Разделы кабинета клиента">
            <button
              type="button"
              onClick={() => setActiveTab('BOOKINGS')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'BOOKINGS'
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Мои записи и история
              </span>
              <span className="font-mono tabular-nums">{myBookings.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('FAVORITES')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'FAVORITES'
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Избранные мастера
              </span>
              <span className="font-mono tabular-nums">{myFavorites.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('REVIEWS')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'REVIEWS'
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Мои отзывы
              </span>
              <span className="font-mono tabular-nums">{myReviews.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'NOTIFICATIONS'
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Уведомления
              </span>
              <span className="font-mono tabular-nums">
                {myNotifications.filter((n) => !n.isRead).length}
              </span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:col-span-9 space-y-6">
        {message && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-300">
            {message}
          </div>
        )}

        {activeTab === 'BOOKINGS' && (
          <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
            <div>
              <h3 className="text-xl font-bold text-white">Мои записи к специалистам</h3>
              <p className="text-xs text-slate-400 mt-1">
                Отзыв можно оставить только после фактического завершения визита (не более одного отзыва на запись).
              </p>
            </div>

            {myBookings.length === 0 ? (
              <p className="text-xs text-slate-400 py-6">У вас пока нет записей.</p>
            ) : (
              <div className="space-y-3">
                {myBookings.map((bk) => {
                  const prof = profiles.find((p) => p.id === bk.profileId);
                  const reviewCheck = canSubmitReview(currentUser.id, bk, reviews);

                  const statusMap = {
                    PENDING: 'Ожидает подтверждения мастера',
                    CONFIRMED: 'Подтверждена',
                    COMPLETED: 'Завершена',
                    CANCELLED: 'Отменена',
                    REJECTED: 'Отклонена',
                  };

                  return (
                    <div
                      key={bk.id}
                      className="p-4 rounded-xl bg-[#0B0914] border border-white/10 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span className="text-[#A78BFA]">{statusMap[bk.status]}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {bk.date} в {bk.time}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>Исполнитель: {prof?.displayName || 'Специалист'}</span>
                          </div>
                          <h4 className="text-sm font-bold text-white mt-1">{bk.serviceTitle}</h4>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-white font-mono tabular-nums">
                            {bk.price.toLocaleString('ru-RU')} ₽
                          </span>

                          {(bk.status === 'PENDING' || bk.status === 'CONFIRMED') && (
                            <button
                              type="button"
                              onClick={() => onCancelBooking(bk.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 transition-colors"
                            >
                              Отменить запись
                            </button>
                          )}

                          {reviewCheck.allowed && (
                            <button
                              type="button"
                              onClick={() =>
                                setReviewBookingId(reviewBookingId === bk.id ? null : bk.id)
                              }
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors"
                            >
                              Оставить отзыв
                            </button>
                          )}
                        </div>
                      </div>

                      {reviewBookingId === bk.id && (
                        <form
                          onSubmit={(e) => handleReviewSubmit(e, bk.id)}
                          className="pt-3 border-t border-white/10 space-y-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-300">Оценка визита:</span>
                            {[5, 4, 3, 2, 1].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setRating(val)}
                                className={`px-2.5 py-1 rounded text-xs font-mono ${
                                  rating === val
                                    ? 'bg-amber-500 text-black font-bold'
                                    : 'bg-[#130F24] text-slate-300'
                                }`}
                              >
                                ★ {val}
                              </button>
                            ))}
                          </div>
                          <textarea
                            rows={2}
                            required
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Поделитесь впечатлениями о качестве услуги и точности расписания..."
                            className="w-full rounded-lg bg-[#130F24] border border-white/15 px-3 py-2 text-xs text-white"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="submit"
                              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#7C3AED] text-white"
                            >
                              Опубликовать отзыв
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'FAVORITES' && (
          <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
            <h3 className="text-xl font-bold text-white">Избранные мастера и салоны</h3>
            {myFavorites.length === 0 ? (
              <p className="text-xs text-slate-400">Список избранного пуст.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myFavorites.map((fav) => {
                  const prof = profiles.find((p) => p.id === fav.profileId);
                  if (!prof) return null;
                  return (
                    <div
                      key={fav.id}
                      className="p-4 rounded-xl bg-[#0B0914] border border-white/10 flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{prof.displayName}</p>
                        <p className="text-xs text-slate-400">{prof.specialtyTitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(prof.id)}
                        className="px-3 py-1.5 rounded-lg text-xs text-rose-300 hover:bg-rose-950/50 border border-rose-500/30"
                      >
                        Удалить
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'REVIEWS' && (
          <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
            <h3 className="text-xl font-bold text-white">Мои опубликованные отзывы</h3>
            {myReviews.map((rev) => {
              const prof = profiles.find((p) => p.id === rev.profileId);
              return (
                <div
                  key={rev.id}
                  className="p-4 rounded-xl bg-[#0B0914] border border-white/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">
                      Исполнитель: {prof?.displayName}
                    </span>
                    <span className="text-amber-400 font-mono tabular-nums">
                      <Star className="w-3.5 h-3.5 inline mr-1 fill-amber-400" />
                      {rev.rating}.0 · Заказ #{rev.bookingId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{rev.text}</p>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'NOTIFICATIONS' && (
          <div className="rounded-2xl bg-[#130F24] border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Уведомления клиента</h3>
              <button
                type="button"
                onClick={onMarkNotificationsRead}
                className="text-xs text-[#A78BFA] hover:underline"
              >
                Отметить все как прочитанные
              </button>
            </div>
            <div className="space-y-2.5">
              {myNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-xl border ${
                    n.isRead
                      ? 'bg-[#0B0914] border-white/10'
                      : 'bg-[#1B1333] border-[#8B5CF6]/40'
                  }`}
                >
                  <p className="text-xs font-bold text-white">{n.title}</p>
                  <p className="text-xs text-slate-300 mt-1">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
