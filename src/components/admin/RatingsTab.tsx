import { useEffect, useState } from 'react';
import { Star, User, UserX } from 'lucide-react';
import { supabase, type ProductRating } from '@/lib/supabase';

export default function RatingsTab() {
  const [ratings, setRatings] = useState<ProductRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('product_ratings')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setRatings(data as ProductRating[]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-gray-800 mb-2">التقييمات</h1>
      <p className="text-sm text-gray-500 mb-6">كل تقييم بالنجوم قام به عميل على أي منتج، مع اسمه إن كان مسجلاً دخوله وقتها.</p>

      {loading ? (
        <div className="p-8 text-center text-gray-400">جارٍ التحميل...</div>
      ) : ratings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
          <Star size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold">لا توجد تقييمات حتى الآن</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {ratings.map((r) => (
            <div key={r.id} className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${r.customer_name ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-gray-400'}`}>
                {r.customer_name ? <User size={20} /> : <UserX size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-gray-800">{r.customer_name || 'مجهول'}</h4>
                <p className="text-xs text-gray-500 truncate">{r.product_name}</p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} className={i < r.stars ? 'fill-brand-400 text-brand-400' : 'text-gray-200'} />
                ))}
              </div>
              <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
                {new Date(r.created_at).toLocaleDateString('ar-EG')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
