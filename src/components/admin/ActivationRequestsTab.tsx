import { useEffect, useState } from 'react';
import { UserCheck, Phone, KeyRound, Send, CheckCircle2, Clock } from 'lucide-react';
import { supabase, timeAgoAr, formatDateTimeAr, type ActivationRequest } from '@/lib/supabase';

export default function ActivationRequestsTab() {
  const [requests, setRequests] = useState<ActivationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    fetchRequests();
  }, []);

  // Re-render every 30s so the "منذ ..." labels stay up to date without a page refresh.
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchRequests() {
    setLoading(true);
    const { data } = await supabase
      .from('activation_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setRequests(data as ActivationRequest[]);
    setLoading(false);
  }

  async function markSent(id: string) {
    setUpdatingId(id);
    await supabase.from('activation_requests').update({ sent: true }).eq('id', id);
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, sent: true } : r)));
    setUpdatingId(null);
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-gray-800 mb-2">طلبات تفعيل الحساب</h1>
      <p className="text-sm text-gray-500 mb-6">
        أرسل كود التفعيل لكل عميل عبر واتساب على الرقم الموضح، ثم اضغط "تم إرسال الكود". يختفي الطلب تلقائياً بمجرد أن يُفعّل العميل حسابه بالكود الصحيح.
      </p>

      {loading ? (
        <div className="p-8 text-center text-gray-400">جارٍ التحميل...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
          <UserCheck size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold">لا توجد طلبات تفعيل حالياً</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {requests.map((req) => (
            <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <UserCheck size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-gray-800">{req.customer_name}</h4>
                <p className="text-xs text-gray-500 flex items-center gap-1" dir="ltr">
                  <Phone size={12} /> {req.phone}
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Clock size={12} />
                  {formatDateTimeAr(req.created_at)}
                  <span className="text-brand-600 font-semibold">· {timeAgoAr(req.created_at)}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <KeyRound size={16} className="text-gray-400" />
                <span className="font-mono font-extrabold text-gray-800 tracking-widest text-sm" dir="ltr">{req.code}</span>
              </div>
              {req.sent ? (
                <span className="flex items-center gap-1 text-green-700 bg-green-50 font-bold text-xs px-3 py-2 rounded-lg shrink-0">
                  <CheckCircle2 size={16} /> تم إرسال الكود
                </span>
              ) : (
                <button
                  onClick={() => markSent(req.id)}
                  disabled={updatingId === req.id}
                  className="flex items-center gap-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs px-3 py-2 rounded-lg transition shrink-0"
                >
                  <Send size={14} /> تم إرسال الكود
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
