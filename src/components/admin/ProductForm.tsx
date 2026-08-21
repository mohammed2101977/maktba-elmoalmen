import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Star, Image as ImageIcon, Video, Save, Gift, ListPlus, CheckSquare } from 'lucide-react';
import { supabase, type Product, type Category, type OptionGroup, type CheckboxOption } from '@/lib/supabase';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ProductForm({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [stock, setStock] = useState('');
  const [rating, setRating] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [featured, setFeatured] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [checkboxOptions, setCheckboxOptions] = useState<CheckboxOption[]>([]);
  const [giftEnabled, setGiftEnabled] = useState(false);
  const [giftMinQty, setGiftMinQty] = useState('1');
  const [giftDescription, setGiftDescription] = useState('');
  const [giftImage, setGiftImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description ?? '');
      setPrice(String(product.price));
      setDiscountPrice(product.discount_price ? String(product.discount_price) : '');
      setCategoryId(product.category_id ?? '');
      setStock(String(product.stock));
      setRating(String(product.rating));
      setSortOrder(String(product.sort_order ?? 0));
      setFeatured(product.featured);
      setImages(product.images ?? []);
      setVideoUrl(product.video_url ?? '');
      setOptionGroups(product.option_groups ?? []);
      setCheckboxOptions(product.checkbox_options ?? []);
      setGiftEnabled(product.gift_enabled ?? false);
      setGiftMinQty(String(product.gift_min_qty ?? 1));
      setGiftDescription(product.gift_description ?? '');
      setGiftImage(product.gift_image ?? '');
    }
  }, [product]);

  // ----- Option groups (select list: add to price OR replace price) -----
  function addOptionGroup() {
    setOptionGroups((prev) => [...prev, { id: uid(), name: '', mode: 'add', choices: [] }]);
  }
  function updateOptionGroup(id: string, patch: Partial<OptionGroup>) {
    setOptionGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }
  function removeOptionGroup(id: string) {
    setOptionGroups((prev) => prev.filter((g) => g.id !== id));
  }
  function addChoice(groupId: string) {
    setOptionGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, choices: [...g.choices, { id: uid(), label: '', price: 0 }] } : g))
    );
  }
  function updateChoice(groupId: string, choiceId: string, patch: Partial<{ label: string; price: number }>) {
    setOptionGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, choices: g.choices.map((c) => (c.id === choiceId ? { ...c, ...patch } : c)) }
          : g
      )
    );
  }
  function removeChoice(groupId: string, choiceId: string) {
    setOptionGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, choices: g.choices.filter((c) => c.id !== choiceId) } : g))
    );
  }

  // ----- Checkbox options (checkbox text: add to price OR replace price) -----
  function addCheckboxOption() {
    setCheckboxOptions((prev) => [...prev, { id: uid(), label: '', mode: 'add', price: 0 }]);
  }
  function updateCheckboxOption(id: string, patch: Partial<CheckboxOption>) {
    setCheckboxOptions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function removeCheckboxOption(id: string) {
    setCheckboxOptions((prev) => prev.filter((c) => c.id !== id));
  }

  function addImage() {
    if (newImageUrl.trim()) {
      setImages((prev) => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('اسم المنتج مطلوب');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('السعر غير صحيح');
      return;
    }

    setSaving(true);
    const discountNum = discountPrice ? parseFloat(discountPrice) : null;

    const cleanedGroups: OptionGroup[] = optionGroups
      .filter((g) => g.name.trim())
      .map((g) => ({
        ...g,
        name: g.name.trim(),
        choices: g.choices.filter((c) => c.label.trim()).map((c) => ({ ...c, label: c.label.trim(), price: Number(c.price) || 0 })),
      }))
      .filter((g) => g.choices.length > 0);

    const cleanedCheckboxes: CheckboxOption[] = checkboxOptions
      .filter((c) => c.label.trim())
      .map((c) => ({ ...c, label: c.label.trim(), price: Number(c.price) || 0 }));

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: priceNum,
      discount_price: discountNum != null && !isNaN(discountNum) ? discountNum : null,
      category_id: categoryId || null,
      stock: parseInt(stock) || 0,
      rating: parseFloat(rating) || 0,
      sort_order: parseInt(sortOrder) || 0,
      featured,
      images,
      video_url: videoUrl.trim() || null,
      option_groups: cleanedGroups,
      checkbox_options: cleanedCheckboxes,
      gift_enabled: giftEnabled,
      gift_min_qty: Math.max(1, parseInt(giftMinQty) || 1),
      gift_description: giftEnabled ? (giftDescription.trim() || null) : null,
      gift_image: giftEnabled ? (giftImage.trim() || null) : null,
    };

    let result;
    if (product) {
      result = await supabase.from('products').update(payload).eq('id', product.id);
    } else {
      result = await supabase.from('products').insert(payload);
    }

    setSaving(false);
    if (result.error) {
      setError('حدث خطأ أثناء الحفظ');
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-extrabold text-gray-800">
            {product ? 'تعديل المنتج' : 'إضافة منتج جديد'}
          </h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">اسم المنتج *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
              placeholder="مثال: كتاب الرياضيات للصف السادس"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">القسم</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition bg-white"
            >
              <option value="">بدون قسم</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">الوصف</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition resize-none"
              placeholder="وصف المنتج..."
            />
          </div>

          {/* Price + Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">السعر (ج.م) *</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">سعر التخفيض (ج.م)</label>
              <input
                type="number"
                step="0.01"
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value)}
                className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
                placeholder="اتركه فارغاً إن لم يوجد"
              />
            </div>
          </div>

          {/* Stock + Rating */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">المخزون</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">التقييم (0-5)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
                placeholder="0.0"
              />
            </div>
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">ترتيب الظهور</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
              placeholder="0"
            />
            <p className="text-xs text-gray-400 mt-1">المنتجات تُرتَّب تصاعدياً حسب هذا الرقم (الأصغر يظهر أولاً) داخل قسمه وفي صفحة كل المنتجات. اترك 0 للترتيب الافتراضي.</p>
          </div>

          {/* Featured */}
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setFeatured(!featured)}
              className={`w-12 h-6 rounded-full transition relative ${featured ? 'bg-brand-500' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                  featured ? 'right-0.5' : 'right-6'
                }`}
              />
            </button>
            <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
              <Star size={16} className="text-brand-500" />
              منتج مميز (يظهر في العروض الخاصة)
            </span>
          </label>

          {/* Option groups: dropdown choices that add to or replace the price */}
          <div className="border-2 border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                <ListPlus size={16} className="text-brand-500" />
                قوائم اختيار (مثل المقاس أو اللون)
              </label>
              <button type="button" onClick={addOptionGroup} className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-1.5 rounded-lg transition text-xs">
                <Plus size={14} /> إضافة قائمة
              </button>
            </div>
            {optionGroups.length === 0 && <p className="text-xs text-gray-400">لا توجد قوائم اختيار. يمكنك إضافة قائمة مثل "المقاس" يختار منها العميل خيارًا يزيد السعر أو يغيّره بالكامل.</p>}
            <div className="space-y-4">
              {optionGroups.map((group) => (
                <div key={group.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => updateOptionGroup(group.id, { name: e.target.value })}
                      placeholder="اسم القائمة (مثال: المقاس)"
                      className="flex-1 h-10 rounded-lg border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-brand-500 transition"
                    />
                    <select
                      value={group.mode}
                      onChange={(e) => updateOptionGroup(group.id, { mode: e.target.value as 'add' | 'replace' })}
                      className="h-10 rounded-lg border-2 border-gray-200 px-2 text-sm bg-white focus:outline-none focus:border-brand-500 transition"
                    >
                      <option value="add">إضافة للسعر</option>
                      <option value="replace">تغيير السعر بالكامل</option>
                    </select>
                    <button type="button" onClick={() => removeOptionGroup(group.id)} className="w-9 h-9 shrink-0 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {group.choices.map((choice) => (
                      <div key={choice.id} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={choice.label}
                          onChange={(e) => updateChoice(group.id, choice.id, { label: e.target.value })}
                          placeholder="اسم الخيار (مثال: كبير)"
                          className="flex-1 h-9 rounded-lg border-2 border-gray-200 px-3 text-xs focus:outline-none focus:border-brand-500 transition"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={choice.price}
                          onChange={(e) => updateChoice(group.id, choice.id, { price: parseFloat(e.target.value) || 0 })}
                          placeholder={group.mode === 'replace' ? 'السعر الجديد' : 'قيمة الزيادة'}
                          className="w-32 h-9 rounded-lg border-2 border-gray-200 px-3 text-xs focus:outline-none focus:border-brand-500 transition"
                        />
                        <button type="button" onClick={() => removeChoice(group.id, choice.id)} className="w-8 h-8 shrink-0 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addChoice(group.id)} className="flex items-center gap-1 text-brand-600 hover:underline text-xs font-bold">
                      <Plus size={13} /> إضافة خيار
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Checkbox options: a single checkbox that adds to or replaces the price */}
          <div className="border-2 border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                <CheckSquare size={16} className="text-brand-500" />
                خيارات شيك (نعم/لا)
              </label>
              <button type="button" onClick={addCheckboxOption} className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-1.5 rounded-lg transition text-xs">
                <Plus size={14} /> إضافة خيار
              </button>
            </div>
            {checkboxOptions.length === 0 && <p className="text-xs text-gray-400">مثال: "تغليف هدية" — عند تفعيل العميل لها يزيد السعر أو يتغير بالكامل.</p>}
            <div className="space-y-2">
              {checkboxOptions.map((cb) => (
                <div key={cb.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={cb.label}
                    onChange={(e) => updateCheckboxOption(cb.id, { label: e.target.value })}
                    placeholder="نص الخيار (مثال: تغليف هدية)"
                    className="flex-1 h-10 rounded-lg border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-brand-500 transition"
                  />
                  <select
                    value={cb.mode}
                    onChange={(e) => updateCheckboxOption(cb.id, { mode: e.target.value as 'add' | 'replace' })}
                    className="h-10 rounded-lg border-2 border-gray-200 px-2 text-sm bg-white focus:outline-none focus:border-brand-500 transition"
                  >
                    <option value="add">إضافة للسعر</option>
                    <option value="replace">تغيير السعر بالكامل</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={cb.price}
                    onChange={(e) => updateCheckboxOption(cb.id, { price: parseFloat(e.target.value) || 0 })}
                    placeholder="القيمة"
                    className="w-28 h-10 rounded-lg border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-brand-500 transition"
                  />
                  <button type="button" onClick={() => removeCheckboxOption(cb.id)} className="w-9 h-9 shrink-0 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Gift tied to purchase quantity */}
          <div className="border-2 border-gray-100 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <button
                type="button"
                onClick={() => setGiftEnabled(!giftEnabled)}
                className={`w-12 h-6 rounded-full transition relative ${giftEnabled ? 'bg-brand-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${giftEnabled ? 'right-0.5' : 'right-6'}`} />
              </button>
              <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                <Gift size={16} className="text-brand-500" />
                هدية عند شراء كمية معينة
              </span>
            </label>
            {giftEnabled && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400">الهدية لا تظهر للعميل إلا بعد إتمام عملية الشراء بنجاح.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">الحد الأدنى للكمية</label>
                    <input
                      type="number"
                      min="1"
                      value={giftMinQty}
                      onChange={(e) => setGiftMinQty(e.target.value)}
                      className="w-full h-10 rounded-lg border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-brand-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">صورة الهدية (اختياري)</label>
                    <input
                      type="url"
                      value={giftImage}
                      onChange={(e) => setGiftImage(e.target.value)}
                      className="w-full h-10 rounded-lg border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-brand-500 transition"
                      placeholder="رابط صورة"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">وصف الهدية</label>
                  <input
                    type="text"
                    value={giftDescription}
                    onChange={(e) => setGiftDescription(e.target.value)}
                    className="w-full h-10 rounded-lg border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-brand-500 transition"
                    placeholder="مثال: قلم هدية مجاني"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">صور المنتج</label>
            <div className="flex gap-2 mb-3">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addImage();
                  }
                }}
                className="flex-1 h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
                placeholder="رابط الصورة..."
              />
              <button
                type="button"
                onClick={addImage}
                className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 rounded-xl transition text-sm"
              >
                <Plus size={18} />
                إضافة
              </button>
            </div>
            {images.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 left-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <ImageIcon size={18} />
                <span>لا توجد صور بعد</span>
              </div>
            )}
          </div>

          {/* Video */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">رابط الفيديو</label>
            <div className="relative">
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 pr-11 text-sm focus:outline-none focus:border-brand-500 transition"
                placeholder="رابط يوتيوب / فيسبوك / فيميو أو رابط ملف فيديو مباشر (.mp4)"
              />
              <Video size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <p className="text-xs text-gray-400 mt-1">يدعم روابط يوتيوب وفيميو وفيسبوك، أو رابط ملف فيديو مباشر ينتهي بامتداد مثل mp4.</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm font-semibold p-3 rounded-xl text-center">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
            >
              <Save size={18} />
              {saving ? 'جارٍ الحفظ...' : 'حفظ المنتج'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
