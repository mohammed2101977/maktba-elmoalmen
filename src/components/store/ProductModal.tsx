import { useEffect, useState } from 'react';
import { X, ShoppingCart, Star, Check, Gift, Minus, Plus, Clock } from 'lucide-react';
import {
  type Product,
  type SelectedOptions,
  computeUnitPrice,
  isOfferLive,
  submitProductRating,
} from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import CountdownTimer from './CountdownTimer';

// Turns a pasted video link (YouTube, Vimeo, Facebook, or a direct video file) into
// something we can actually render — either an <iframe> embed URL or a direct <video> src.
function getVideoEmbed(url: string): { kind: 'iframe' | 'video'; src: string } {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    // YouTube: watch?v=, youtu.be/ID, /shorts/ID, /embed/ID
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
      let videoId = '';
      if (host === 'youtu.be') {
        videoId = u.pathname.slice(1);
      } else if (u.pathname.startsWith('/shorts/')) {
        videoId = u.pathname.split('/shorts/')[1];
      } else if (u.pathname.startsWith('/embed/')) {
        videoId = u.pathname.split('/embed/')[1];
      } else {
        videoId = u.searchParams.get('v') ?? '';
      }
      videoId = videoId.split('/')[0].split('?')[0];
      if (videoId) return { kind: 'iframe', src: `https://www.youtube.com/embed/${videoId}` };
    }

    // Vimeo: vimeo.com/ID
    if (host === 'vimeo.com') {
      const videoId = u.pathname.split('/').filter(Boolean)[0];
      if (videoId) return { kind: 'iframe', src: `https://player.vimeo.com/video/${videoId}` };
    }

    // Facebook video links
    if (host === 'facebook.com' || host === 'fb.watch') {
      return { kind: 'iframe', src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&autoplay=false` };
    }
  } catch {
    // Not a valid absolute URL — fall through to direct video handling.
  }

  // Fallback: treat it as a direct video file URL (mp4, webm, etc.)
  return { kind: 'video', src: url };
}

export default function ProductModal({
  product,
  onClose,
  onAddToCart,
}: {
  product: Product;
  onClose: () => void;
  onAddToCart: (selected: SelectedOptions) => void;
}) {
  const { customer } = useAuth();
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Record<string, string>>({});
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<string[]>([]);
  const [selectedCheckboxGroups, setSelectedCheckboxGroups] = useState<Record<string, string[]>>({});
  const [checkboxQuantities, setCheckboxQuantities] = useState<Record<string, number>>({});
  const [selectedCounters, setSelectedCounters] = useState<Record<string, number>>({});
  // Rating is a purely cosmetic "thank you for your feedback" interaction — it's not
  // persisted anywhere and doesn't change the product's real average rating.
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [rated, setRated] = useState(false);
  const [, setOfferTick] = useState(0);

  useEffect(() => {
    // Pre-select the first choice of every option group so pricing is deterministic.
    const defaults: Record<string, string> = {};
    for (const group of product.option_groups ?? []) {
      if (group.choices.length > 0) defaults[group.id] = group.choices[0].id;
    }
    setSelectedGroups(defaults);
    setSelectedCheckboxes([]);
    setSelectedCheckboxGroups({});
    setCheckboxQuantities({});
    const counterDefaults: Record<string, number> = {};
    for (const counter of product.counter_options ?? []) {
      counterDefaults[counter.id] = counter.min ?? 0;
    }
    setSelectedCounters(counterDefaults);
    setActiveImage(0);
    setMyRating(0);
    setHoverRating(0);
    setRated(false);
  }, [product]);

  const selected: SelectedOptions = {
    groups: selectedGroups,
    checkboxes: selectedCheckboxes,
    checkboxGroups: selectedCheckboxGroups,
    checkboxQuantities,
    counters: selectedCounters,
  };
  const price = computeUnitPrice(product, selected);
  const offerLive = isOfferLive(product);
  const basePrice = offerLive ? (product.discount_price as number) : product.price;
  const discount = offerLive ? Math.round(((product.price - (product.discount_price as number)) / product.price) * 100) : 0;

  function handleAdd() {
    onAddToCart(selected);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function toggleCheckbox(id: string) {
    setSelectedCheckboxes((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function toggleGroupCheckbox(group: Product['checkbox_groups'][number], itemId: string) {
    setSelectedCheckboxGroups((prev) => {
      const current = prev[group.id] ?? [];
      if (current.includes(itemId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== itemId) };
      }
      if (group.max_selections > 0 && current.length >= group.max_selections) {
        return prev; // max reached, ignore further selections
      }
      return { ...prev, [group.id]: [...current, itemId] };
    });
  }

  function setItemQuantity(itemId: string, qty: number) {
    setCheckboxQuantities((prev) => ({ ...prev, [itemId]: Math.min(10, Math.max(1, qty)) }));
  }

  function adjustCounter(counter: Product['counter_options'][number], delta: number) {
    setSelectedCounters((prev) => {
      const current = prev[counter.id] ?? counter.min ?? 0;
      let next = current + delta * counter.step;
      next = Math.max(counter.min ?? 0, next);
      if (counter.max != null) next = Math.min(counter.max, next);
      return { ...prev, [counter.id]: next };
    });
  }

  function handleRate(value: number) {
    setMyRating(value);
    setRated(true);
    // Best-effort: log the rating for the admin dashboard. This doesn't affect the
    // product's displayed average rating, which stays as a cosmetic "thank you" interaction.
    submitProductRating(product, value, customer ? { id: customer.id, name: customer.name } : null).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-gray-100 transition"
        >
          <X size={20} />
        </button>

        <div className="grid md:grid-cols-2 gap-6 p-4 sm:p-6">
          {/* Images / Video */}
          <div>
            {product.video_url && activeImage === -1 ? (
              <div className="aspect-square rounded-xl overflow-hidden bg-black">
                {(() => {
                  const embed = getVideoEmbed(product.video_url);
                  return embed.kind === 'iframe' ? (
                    <iframe
                      src={embed.src}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <video src={embed.src} controls className="w-full h-full object-contain" />
                  );
                })()}
              </div>
            ) : (
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-50">
                {product.images[activeImage] ? (
                  <img
                    src={product.images[activeImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ShoppingCart size={60} />
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              {product.video_url && (
                <button
                  onClick={() => setActiveImage(-1)}
                  className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                    activeImage === -1 ? 'border-brand-500' : 'border-transparent'
                  }`}
                >
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </button>
              )}
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                    activeImage === i ? 'border-brand-500' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col">
            {product.category?.name && (
              <span className="text-sm text-brand-600 font-semibold mb-1">{product.category.name}</span>
            )}
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-800 mb-2">{product.name}</h2>
            <div className="mb-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => {
                  const starValue = i + 1;
                  const filled = (hoverRating || myRating) >= starValue;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleRate(starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-0.5 -m-0.5"
                      title={`قيّم بـ ${starValue} نجوم`}
                    >
                      <Star
                        size={20}
                        className={filled ? 'fill-brand-400 text-brand-400 transition' : 'text-gray-200 transition hover:text-brand-200'}
                      />
                    </button>
                  );
                })}
                <span className="text-sm text-gray-500 mr-1">({product.rating.toFixed(1)})</span>
              </div>
              {rated && (
                <p className="text-brand-600 text-xs font-semibold mt-1.5">شكراً لتقييمك للمنتج، رأيك يهمنا 🌟</p>
              )}
            </div>

            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl font-extrabold text-brand-600">{price.toFixed(2)}</span>
              <span className="text-sm text-gray-500">ج.م</span>
              {discount > 0 && price === basePrice && (
                <>
                  <span className="text-lg text-gray-400 line-through">{product.price.toFixed(2)}</span>
                  <span className="bg-red-100 text-red-600 text-sm font-bold px-2 py-0.5 rounded">
                    وفّر {discount}%
                  </span>
                </>
              )}
            </div>

            {offerLive && product.offer_ends_at && (
              <div className="flex items-center gap-1.5 text-red-500 bg-red-50 rounded-lg px-3 py-1.5 mb-4 w-fit">
                <Clock size={14} />
                <span className="text-xs font-semibold">ينتهي العرض خلال</span>
                <CountdownTimer endsAt={product.offer_ends_at} onExpire={() => setOfferTick((t) => t + 1)} compact />
              </div>
            )}

            {product.description && (
              <p className="text-gray-600 text-sm leading-relaxed mb-4">{product.description}</p>
            )}

            {/* Option groups (select lists) */}
            {(product.option_groups ?? []).length > 0 && (
              <div className="space-y-3 mb-4">
                {product.option_groups.map((group) => (
                  <div key={group.id}>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">{group.name}</label>
                    <select
                      value={selectedGroups[group.id] ?? ''}
                      onChange={(e) => setSelectedGroups((prev) => ({ ...prev, [group.id]: e.target.value }))}
                      className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm bg-white focus:outline-none focus:border-brand-500 transition"
                    >
                      {group.choices.map((choice) => {
                        const priceLabel = group.mode === 'replace'
                          ? (choice.price !== 0 ? `(${choice.price.toFixed(2)} ج.م)` : '')
                          : (choice.price !== 0 ? `(+${choice.price.toFixed(2)} ج.م)` : '');
                        return (
                          <option key={choice.id} value={choice.id}>
                            {choice.label} {priceLabel}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* Checkbox options (standalone) */}
            {(product.checkbox_options ?? []).length > 0 && (
              <div className="space-y-2 mb-4">
                {product.checkbox_options.map((cb) => {
                  const checked = selectedCheckboxes.includes(cb.id);
                  const priceLabel = cb.mode === 'replace'
                    ? (cb.price !== 0 ? `(السعر يصبح ${cb.price.toFixed(2)} ج.م)` : '')
                    : (cb.price !== 0 ? `(+${cb.price.toFixed(2)} ج.م)` : '');
                  return (
                    <div key={cb.id}>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCheckbox(cb.id)}
                          className="w-4 h-4 rounded accent-brand-600"
                        />
                        <span className="font-semibold">{cb.label}</span>
                        {priceLabel && <span className="text-xs text-gray-400">{priceLabel}</span>}
                      </label>
                      {checked && cb.has_quantity && (
                        <QuantityStepper value={checkboxQuantities[cb.id] ?? 1} onChange={(q) => setItemQuantity(cb.id, q)} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Checkbox groups (grouped checkboxes with an optional max-selection cap) */}
            {(product.checkbox_groups ?? []).length > 0 && (
              <div className="space-y-4 mb-4">
                {product.checkbox_groups.map((group) => {
                  const selectedIds = selectedCheckboxGroups[group.id] ?? [];
                  const maxReached = group.max_selections > 0 && selectedIds.length >= group.max_selections;
                  return (
                    <div key={group.id}>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">
                        {group.name}
                        {group.max_selections > 0 && (
                          <span className="text-xs text-gray-400 font-normal mr-1"> (اختر حتى {group.max_selections})</span>
                        )}
                      </label>
                      <div className="space-y-2">
                        {group.items.map((item) => {
                          const checked = selectedIds.includes(item.id);
                          const disabled = !checked && maxReached;
                          const priceLabel = item.mode === 'replace'
                            ? (item.price !== 0 ? `(السعر يصبح ${item.price.toFixed(2)} ج.م)` : '')
                            : (item.price !== 0 ? `(+${item.price.toFixed(2)} ج.م)` : '');
                          return (
                            <div key={item.id}>
                              <label className={`flex items-center gap-2 text-sm text-gray-700 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => toggleGroupCheckbox(group, item.id)}
                                  className="w-4 h-4 rounded accent-brand-600"
                                />
                                <span className="font-semibold">{item.label}</span>
                                {priceLabel && <span className="text-xs text-gray-400">{priceLabel}</span>}
                              </label>
                              {checked && item.has_quantity && (
                                <QuantityStepper value={checkboxQuantities[item.id] ?? 1} onChange={(q) => setItemQuantity(item.id, q)} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Counter options (stepper: quantity-based price add-ons) */}
            {(product.counter_options ?? []).length > 0 && (
              <div className="space-y-3 mb-4">
                {product.counter_options.map((counter) => {
                  const value = selectedCounters[counter.id] ?? counter.min ?? 0;
                  const steps = counter.step > 0 ? value / counter.step : 0;
                  const added = steps * counter.price_per_step;
                  return (
                    <div key={counter.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                      <div className="text-sm">
                        <span className="font-semibold text-gray-700">{counter.name}</span>
                        {added > 0 && <span className="block text-xs text-brand-600 font-bold">+{added.toFixed(2)} ج.م</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => adjustCounter(counter, -1)}
                          disabled={value <= (counter.min ?? 0)}
                          className="w-8 h-8 rounded-lg bg-white border-2 border-gray-200 disabled:opacity-40 flex items-center justify-center hover:border-brand-400 transition"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-bold text-gray-800">{value}</span>
                        <button
                          type="button"
                          onClick={() => adjustCounter(counter, 1)}
                          disabled={counter.max != null && value >= counter.max}
                          className="w-8 h-8 rounded-lg bg-white border-2 border-gray-200 disabled:opacity-40 flex items-center justify-center hover:border-brand-400 transition"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {product.gift_enabled && (
              <div className="flex items-start gap-2 bg-brand-50 border border-brand-100 rounded-xl p-3 mb-4 text-sm">
                <Gift size={18} className="text-brand-600 shrink-0 mt-0.5" />
                <span className="text-brand-700 font-semibold">
                  هدية مفاجئة عند شراء {product.gift_min_qty}{product.gift_min_qty > 1 ? ' قطع أو أكثر' : ' قطعة أو أكثر'} من هذا المنتج! تظهر تفاصيلها بعد إتمام الطلب.
                </span>
              </div>
            )}

            <div className="mb-4">
              {product.availability_note ? (
                <span className="text-green-600 font-semibold text-sm flex items-center gap-1">
                  <Check size={16} />
                  {product.availability_note}
                </span>
              ) : product.stock > 0 ? (
                <span className="text-green-600 font-semibold text-sm flex items-center gap-1">
                  <Check size={16} />
                  {product.stock < 5 ? `متوفر (${product.stock} قطعة)` : 'متوفر'}
                </span>
              ) : (
                <span className="text-red-500 font-semibold text-sm">غير متوفر</span>
              )}
            </div>

            <button
              onClick={handleAdd}
              disabled={product.unavailable || (!product.availability_note && product.stock === 0)}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {product.unavailable ? (
                'المنتج غير موجود الآن'
              ) : added ? (
                <>
                  <Check size={20} />
                  تمت الإضافة
                </>
              ) : (
                <>
                  <ShoppingCart size={20} />
                  أضف إلى السلة
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// A small 1-10 "العدد" stepper shown next to a checkbox item that has a quantity multiplier.
function QuantityStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2 mr-6 mt-1">
      <span className="text-xs text-gray-500">العدد:</span>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        className="w-6 h-6 rounded-md bg-gray-100 border border-gray-200 disabled:opacity-40 flex items-center justify-center hover:border-brand-400 transition"
      >
        <Minus size={12} />
      </button>
      <span className="w-4 text-center text-xs font-bold text-gray-800">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= 10}
        className="w-6 h-6 rounded-md bg-gray-100 border border-gray-200 disabled:opacity-40 flex items-center justify-center hover:border-brand-400 transition"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
