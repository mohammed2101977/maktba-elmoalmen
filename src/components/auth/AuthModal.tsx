import { useState } from 'react';
import { X, Phone, Lock, User, MapPin, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase, hashPassword } from '@/lib/supabase';

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const { login, signup, updatePassword, customer } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState(false);

  async function callEdgeFn(fn: string, body: Record<string, unknown>) {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'حدث خطأ');
    return json;
  }

  async function handleSendOtp(purpose: 'signup' | 'reset') {
    setError('');
    setInfo('');
    if (!phone.trim()) {
      setError('أدخل رقم الهاتف');
      return;
    }
    setLoading(true);
    try {
      const res = await callEdgeFn('send-otp', { phone: phone.trim(), purpose });
      setOtpSent(true);
      if (res.channel === 'whatsapp') {
        setInfo(`تم إرسال كود التحقق عبر واتساب إلى ${phone.trim()}`);
      } else if (res.code) {
        setInfo(`كود التحقق (وضع تجريبي): ${res.code}`);
      } else {
        setInfo(`تم إرسال كود التحقق إلى ${phone.trim()}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(purpose: 'signup' | 'reset') {
    setError('');
    if (!otp.trim()) {
      setError('أدخل كود التحقق');
      return;
    }
    setLoading(true);
    try {
      await callEdgeFn('verify-otp', { phone: phone.trim(), code: otp.trim(), purpose });
      setVerifiedPhone(true);
      setInfo('تم التحقق من الرقم بنجاح');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !phone.trim() || !address.trim() || !password.trim()) {
      setError('جميع الحقول مطلوبة');
      return;
    }
    if (!verifiedPhone) {
      setError('يجب التحقق من رقم الهاتف أولاً');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setLoading(true);
    const res = await signup(name.trim(), phone.trim(), address.trim(), password);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onSuccess?.();
    onClose();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!phone.trim() || !password.trim()) {
      setError('أدخل الرقم وكلمة المرور');
      return;
    }
    setLoading(true);
    const res = await login(phone.trim(), password);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onSuccess?.();
    onClose();
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!verifiedPhone) {
      setError('يجب التحقق من رقم الهاتف أولاً');
      return;
    }
    if (newPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setLoading(true);
    // If logged in, use auth context; otherwise update by phone
    if (customer) {
      const res = await updatePassword(newPassword);
      setLoading(false);
      if (res.error) {
        setError(res.error);
        return;
      }
    } else {
      const { error } = await supabase
        .from('customers')
        .update({ password_hash: hashPassword(newPassword) })
        .eq('phone', phone.trim());
      setLoading(false);
      if (error) {
        setError('حدث خطأ أثناء تحديث كلمة المرور');
        return;
      }
    }
    setInfo('تم تغيير كلمة المرور بنجاح');
    setMode('login');
    setVerifiedPhone(false);
    setOtpSent(false);
    setOtp('');
    setNewPassword('');
  }

  const titles: Record<Mode, string> = {
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب جديد',
    forgot: 'نسيت كلمة المرور؟',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-extrabold text-gray-800">{titles[mode]}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm font-semibold p-3 rounded-xl text-center">{error}</div>
          )}
          {info && (
            <div className="bg-green-50 text-green-700 text-sm font-semibold p-3 rounded-xl text-center">{info}</div>
          )}

          {/* LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <InputField icon={<Phone size={18} />} placeholder="رقم الهاتف" value={phone} onChange={setPhone} />
              <InputField icon={<Lock size={18} />} placeholder="كلمة المرور" value={password} onChange={setPassword} type="password" />
              <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
                {loading ? 'جارٍ...' : 'دخول'}
              </button>
              <div className="flex flex-col gap-2 text-sm text-center">
                <button type="button" onClick={() => { setMode('signup'); setError(''); setInfo(''); setOtpSent(false); setVerifiedPhone(false); }} className="text-brand-600 font-semibold hover:underline">
                  ليس لديك حساب؟ أنشئ حساباً
                </button>
                <button type="button" onClick={() => { setMode('forgot'); setError(''); setInfo(''); setOtpSent(false); setVerifiedPhone(false); }} className="text-gray-500 hover:text-brand-600">
                  نسيت كلمة المرور؟
                </button>
              </div>
            </form>
          )}

          {/* SIGNUP */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <InputField icon={<User size={18} />} placeholder="الاسم بالكامل" value={name} onChange={setName} />
              <InputField icon={<MapPin size={18} />} placeholder="العنوان بالتفصيل" value={address} onChange={setAddress} />
              <div className="flex gap-2">
                <InputField icon={<Phone size={18} />} placeholder="رقم الهاتف" value={phone} onChange={setPhone} />
                <button type="button" onClick={() => handleSendOtp('signup')} disabled={loading || otpSent} className="shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 rounded-xl transition text-sm whitespace-nowrap">
                  {otpSent ? 'أُرسل' : 'إرسال كود'}
                </button>
              </div>
              {otpSent && !verifiedPhone && (
                <div className="flex gap-2">
                  <InputField icon={<KeyRound size={18} />} placeholder="كود التحقق" value={otp} onChange={setOtp} />
                  <button type="button" onClick={() => handleVerifyOtp('signup')} disabled={loading} className="shrink-0 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold px-4 rounded-xl transition text-sm whitespace-nowrap">
                    تأكيد
                  </button>
                </div>
              )}
              <InputField icon={<Lock size={18} />} placeholder="كلمة المرور" value={password} onChange={setPassword} type="password" />
              <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
                {loading ? 'جارٍ...' : 'إنشاء الحساب'}
              </button>
              <button type="button" onClick={() => { setMode('login'); setError(''); setInfo(''); setOtpSent(false); setVerifiedPhone(false); }} className="w-full text-sm text-gray-500 hover:text-brand-600 font-semibold">
                لديك حساب؟ تسجيل الدخول
              </button>
            </form>
          )}

          {/* FORGOT */}
          {mode === 'forgot' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-gray-600 text-center">أدخل رقم هاتفك لإرسال كود التحقق</p>
              <div className="flex gap-2">
                <InputField icon={<Phone size={18} />} placeholder="رقم الهاتف" value={phone} onChange={setPhone} />
                <button type="button" onClick={() => handleSendOtp('reset')} disabled={loading || otpSent} className="shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 rounded-xl transition text-sm whitespace-nowrap">
                  {otpSent ? 'أُرسل' : 'إرسال'}
                </button>
              </div>
              {otpSent && !verifiedPhone && (
                <div className="flex gap-2">
                  <InputField icon={<KeyRound size={18} />} placeholder="كود التحقق" value={otp} onChange={setOtp} />
                  <button type="button" onClick={() => handleVerifyOtp('reset')} disabled={loading} className="shrink-0 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold px-4 rounded-xl transition text-sm whitespace-nowrap">
                    تأكيد
                  </button>
                </div>
              )}
              {verifiedPhone && (
                <>
                  <InputField icon={<Lock size={18} />} placeholder="كلمة المرور الجديدة" value={newPassword} onChange={setNewPassword} type="password" />
                  <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
                    {loading ? 'جارٍ...' : 'تغيير كلمة المرور'}
                  </button>
                </>
              )}
              <button type="button" onClick={() => { setMode('login'); setError(''); setInfo(''); setOtpSent(false); setVerifiedPhone(false); }} className="w-full text-sm text-gray-500 hover:text-brand-600 font-semibold">
                العودة لتسجيل الدخول
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function InputField({ icon, placeholder, value, onChange, type = 'text' }: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="relative flex-1">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 pr-11 text-sm focus:outline-none focus:border-brand-500 transition"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
    </div>
  );
}
