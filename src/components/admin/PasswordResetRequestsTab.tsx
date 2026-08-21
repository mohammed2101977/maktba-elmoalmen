import { useEffect, useState } from 'react';
import { KeyRound, Phone, Send, CheckCircle2, ShieldQuestion } from 'lucide-react';
import { supabase, type PasswordResetRequest } from '@/lib/supabase';

export default function PasswordResetRequestsTab() {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    const { data } = await supabase
      .from('password_reset_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setRequests(data as PasswordResetRequest[]);
    setLoading(false);
  }

  async function markSent(id: string) {
    setUpdatingId(id);
    await supabase.from('password_reset_requests').update({ sent: true }).eq('id', id);
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, sent: true } : r)));
    setUpdatingId(null);
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-gray-800 mb-2">طلبات تغيير كلمة السر</h1>
      <p className="text-sm text-gray-500 mb-6">
        أرسل كود تغيير كلمة السر لكل عميل عبر واتساب على الرقم الموضح، ثم اضغط "تم إرسال الكود". يختفي الطلب تلقائياً بمجرد أن يغيّر العميل كلمة مروره بالكود الصحيح.
      </p>

      {loading ? (
        <div className="p-8 text-center text-gray-400">جارٍ التحميل...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
          <ShieldQuestion size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold">لا توجد طلبات تغيير كلمة سر حالياً</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {requests.map((req) => (
            <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <KeyRound size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-gray-800">{req.customer_name}</h4>
                <p className="text-xs text-gray-500 flex items-center gap-1" dir="ltr">
                  <Phone size={12} /> {req.phone}
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
