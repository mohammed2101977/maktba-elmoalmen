import { useEffect, useState } from 'react';
import { X, ShoppingCart, Star, Check, Gift } from 'lucide-react';
import {
  type Product,
  type SelectedOptions,
  computeUnitPrice,
} from '@/lib/supabase';

export default function ProductModal({
  product,
  onClose,
  onAddToCart,
}: {
  product: Product;
  onClose: () => void;
  onAddToCart: (selected: SelectedOptions) => void;
}) {
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Record<string, string>>({});
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<string[]>([]);

  useEffect(() => {
    // Pre-select the first choice of every option group so pricing is deterministic.
    const defaults: Record<string, string> = {};
    for (const group of product.option_groups ?? []) {
      if (group.choices.length > 0) defaults[group.id] = group.choices[0].id;
    }
    setSelectedGroups(defaults);
    setSelectedCheckboxes([]);
    setActiveImage(0);
  }, [product]);

  const selected: SelectedOptions = { groups: selectedGroups, checkboxes: selectedCheckboxes };
  const price = computeUnitPrice(product, selected);
  const basePrice = product.discount_price != null && product.discount_price < product.price ? product.discount_price : product.price;
  const discount = product.discount_price != null && product.discount_price < product.price
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;

  function handleAdd() {
    onAddToCart(selected);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function toggleCheckbox(id: string) {
    setSelectedCheckboxes((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
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
                <video src={product.video_url} controls className="w-full h-full object-contain" />
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
            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={i < Math.round(product.rating) ? 'fill-brand-400 text-brand-400' : 'text-gray-200'}
                />
              ))}
              <span className="text-sm text-gray-500 mr-1">({product.rating.toFixed(1)})</span>
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
                      {group.choices.map((choice) => (
                        <option key={choice.id} value={choice.id}>
                          {choice.label} {group.mode === 'replace' ? `(${choice.price.toFixed(2)} ج.م)` : choice.price ? `(+${choice.price.toFixed(2)} ج.م)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* Checkbox options */}
            {(product.checkbox_options ?? []).length > 0 && (
              <div className="space-y-2 mb-4">
                {product.checkbox_options.map((cb) => (
                  <label key={cb.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedCheckboxes.includes(cb.id)}
                      onChange={() => toggleCheckbox(cb.id)}
                      className="w-4 h-4 rounded accent-brand-600"
                    />
                    <span className="font-semibold">{cb.label}</span>
                    <span className="text-xs text-gray-400">
                      {cb.mode === 'replace' ? `(السعر يصبح ${cb.price.toFixed(2)} ج.م)` : `(+${cb.price.toFixed(2)} ج.م)`}
                    </span>
                  </label>
                ))}
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
              {product.stock > 0 ? (
                <span className="text-green-600 font-semibold text-sm flex items-center gap-1">
                  <Check size={16} />
                  متوفر ({product.stock} قطعة)
                </span>
              ) : (
                <span className="text-red-500 font-semibold text-sm">غير متوفر</span>
              )}
            </div>

            <button
              onClick={handleAdd}
              disabled={product.stock === 0}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {added ? (
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
