import { useEffect, useState } from 'react';
import { X, Phone, Lock, User, MapPin, KeyRound, RefreshCw, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Mode = 'login' | 'signup' | 'forgot' | 'activate';

export default function AuthModal({
  onClose,
  onSuccess,
  initialMode = 'login',
}: {
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: Mode;
}) {
  const { login, signup, customer, activateAccount, requestPasswordReset, confirmPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Whether an activation/reset request exists for the current phone, and whether the
  // admin has marked it as "sent" over WhatsApp — controls which banner text we show.
  const [requestSent, setRequestSent] = useState(false);
  const [requestExists, setRequestExists] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (mode === 'activate' && phone) checkActivationStatus(phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function checkActivationStatus(p: string) {
    const { data } = await supabase
      .from('activation_requests')
      .select('sent')
      .eq('phone', p.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setRequestExists(!!data);
    setRequestSent(!!data?.sent);
  }

  async function checkResetStatus(p: string) {
    const { data } = await supabase
      .from('password_reset_requests')
      .select('sent')
      .eq('phone', p.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setRequestExists(!!data);
    setRequestSent(!!data?.sent);
  }

  function resetFormState() {
    setError('');
    setInfo('');
    setCode('');
    setNewPassword('');
    setRequestSent(false);
    setRequestExists(false);
    setResetRequested(false);
    setDone(false);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !phone.trim() || !address.trim() || !password.trim()) {
      setError('جميع الحقول مطلوبة');
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
    // Account created but inactive — move straight to the activation screen.
    resetFormState();
    setMode('activate');
    checkActivationStatus(phone.trim());
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

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!phone.trim()) {
      setError('أدخل رقم الهاتف');
      return;
    }
    if (!code.trim()) {
      setError('أدخل كود التفعيل');
      return;
    }
    setLoading(true);
    const res = await activateAccount(phone.trim(), code.trim());
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setInfo('تم تفعيل حسابك بنجاح، يمكنك الآن الشراء من المتجر');
    setDone(true);
    onSuccess?.();
  }

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!phone.trim()) {
      setError('أدخل رقم الهاتف');
      return;
    }
    setLoading(true);
    const res = await requestPasswordReset(phone.trim());
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setResetRequested(true);
    checkResetStatus(phone.trim());
  }

  async function handleConfirmReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!code.trim()) {
      setError('أدخل كود التغيير');
      return;
    }
    if (newPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setLoading(true);
    const res = await confirmPasswordReset(phone.trim(), code.trim(), newPassword);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setInfo('تم تغيير كلمة المرور بنجاح، يمكنك تسجيل الدخول الآن');
    setDone(true);
  }

  const titles: Record<Mode, string> = {
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب جديد',
    forgot: 'تغيير كلمة المرور',
    activate: 'تفعيل الحساب',
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
              <InputField icon={<Phone size={18} />} placeholder="رقم الهاتف" value={phone} onChange={setPhone} name="login-phone" autoComplete="tel" />
              <InputField icon={<Lock size={18} />} placeholder="كلمة المرور" value={password} onChange={setPassword} type="password" name="login-password" autoComplete="current-password" />
              <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
                {loading ? 'جارٍ...' : 'دخول'}
              </button>
              <div className="flex flex-col gap-2 text-sm text-center">
                <button type="button" onClick={() => { setMode('signup'); resetFormState(); }} className="text-brand-600 font-semibold hover:underline">
                  ليس لديك حساب؟ أنشئ حساباً
                </button>
                <button type="button" onClick={() => { setMode('forgot'); resetFormState(); }} className="text-gray-500 hover:text-brand-600">
                  نسيت كلمة المرور؟
                </button>
                <button type="button" onClick={() => { setMode('activate'); resetFormState(); }} className="text-gray-400 hover:text-brand-600 text-xs">
                  لديك كود تفعيل؟ فعّل حسابك
                </button>
              </div>
            </form>
          )}

          {/* SIGNUP */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 flex items-start gap-2">
                <MessageCircle size={16} className="text-brand-600 shrink-0 mt-0.5" />
                بعد إنشاء الحساب ستصلك رسالة واتساب على رقم هاتفك بكود التفعيل، ولا يمكنك الشراء من المتجر قبل تفعيل الحساب.
              </p>
              <InputField icon={<User size={18} />} placeholder="الاسم بالكامل" value={name} onChange={setName} name="signup-name" autoComplete="name" />
              <InputField icon={<MapPin size={18} />} placeholder="العنوان بالتفصيل" value={address} onChange={setAddress} name="signup-address" autoComplete="street-address" />
              <InputField icon={<Phone size={18} />} placeholder="رقم الهاتف" value={phone} onChange={setPhone} name="signup-phone" autoComplete="tel" />
              <InputField icon={<Lock size={18} />} placeholder="كلمة المرور" value={password} onChange={setPassword} type="password" name="signup-password" autoComplete="new-password" />
              <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
                {loading ? 'جارٍ...' : 'إنشاء الحساب'}
              </button>
              <button type="button" onClick={() => { setMode('login'); resetFormState(); }} className="w-full text-sm text-gray-500 hover:text-brand-600 font-semibold">
                لديك حساب؟ تسجيل الدخول
              </button>
            </form>
          )}

          {/* ACTIVATE ACCOUNT */}
          {mode === 'activate' && (
            <div className="space-y-4">
              {!done && (
                <>
                  <div className={`text-sm font-semibold p-3 rounded-xl text-center ${requestSent ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {requestSent
                      ? `تم إرسال كود التفعيل عبر واتساب إلى ${phone || 'رقمك'}. أدخله بالأسفل لتفعيل حسابك.`
                      : requestExists
                        ? `سيصلك كود تفعيل حسابك عبر رسالة واتساب على رقم ${phone || 'هاتفك'} خلال أيام.`
                        : 'أدخل رقم هاتفك المسجل للتحقق من حالة طلب التفعيل.'}
                  </div>
                  <form onSubmit={handleActivate} className="space-y-4">
                    <div className="flex gap-2">
                      <InputField icon={<Phone size={18} />} placeholder="رقم الهاتف" value={phone} onChange={setPhone} label="رقم الهاتف المسجل" name="activate-phone" autoComplete="tel" />
                      <button
                        type="button"
                        onClick={() => checkActivationStatus(phone.trim())}
                        disabled={!phone.trim()}
                        title="تحديث الحالة"
                        className="shrink-0 w-11 h-11 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl transition flex items-center justify-center"
                      >
                        <RefreshCw size={18} />
                      </button>
                    </div>
                    <InputField icon={<KeyRound size={18} />} placeholder="اكتب الكود هنا" value={code} onChange={setCode} label="أدخل كود التفعيل المرسل على واتساب" name="activate-code" autoComplete="one-time-code" />
                    <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
                      {loading ? 'جارٍ...' : 'تفعيل الحساب'}
                    </button>
                  </form>
                </>
              )}
              <button type="button" onClick={onClose} className="w-full text-sm text-gray-500 hover:text-brand-600 font-semibold">
                {done ? 'إغلاق' : 'إغلاق والتفعيل لاحقاً'}
              </button>
            </div>
          )}

          {/* FORGOT / CHANGE PASSWORD */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              {!done && !resetRequested && (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <p className="text-sm text-gray-600 text-center">أدخل رقم هاتفك لطلب تغيير كلمة المرور</p>
                  <InputField icon={<Phone size={18} />} placeholder="رقم الهاتف" value={phone} onChange={setPhone} disabled={!!customer} label="رقم الهاتف المسجل" name="reset-request-phone" autoComplete="tel" />
                  <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
                    {loading ? 'جارٍ...' : 'طلب تغيير كلمة المرور'}
                  </button>
                </form>
              )}

              {!done && resetRequested && (
                <>
                  <div className={`text-sm font-semibold p-3 rounded-xl text-center ${requestSent ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {requestSent
                      ? `لقد طلبت تغيير كلمة السر، وتم إرسال كود التغيير عبر واتساب إلى ${phone}. أدخله بالأسفل مع كلمة المرور الجديدة.`
                      : `لقد طلبت تغيير كلمة السر، ستصلك رسالة واتساب على رقم ${phone} بكود التغيير خلال أيام.`}
                  </div>
                  <form onSubmit={handleConfirmReset} className="space-y-4">
                    <div className="flex gap-2">
                      <InputField icon={<KeyRound size={18} />} placeholder="اكتب الكود هنا" value={code} onChange={setCode} label="أدخل كود التغيير المرسل على واتساب" name="reset-confirm-code" autoComplete="one-time-code" />
                      <button
                        type="button"
                        onClick={() => checkResetStatus(phone.trim())}
                        title="تحديث الحالة"
                        className="shrink-0 w-11 h-11 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition flex items-center justify-center"
                      >
                        <RefreshCw size={18} />
                      </button>
                    </div>
                    <InputField icon={<Lock size={18} />} placeholder="كلمة المرور الجديدة" value={newPassword} onChange={setNewPassword} type="password" label="أدخل كلمة المرور الجديدة" name="reset-new-password" autoComplete="new-password" />
                    <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
                      {loading ? 'جارٍ...' : 'تغيير كلمة المرور'}
                    </button>
                  </form>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  if (done) { setMode('login'); resetFormState(); return; }
                  if (!customer) { setMode('login'); resetFormState(); return; }
                  onClose();
                }}
                className="w-full text-sm text-gray-500 hover:text-brand-600 font-semibold"
              >
                {done ? 'العودة لتسجيل الدخول' : customer ? 'إلغاء' : 'العودة لتسجيل الدخول'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InputField({ icon, placeholder, value, onChange, type = 'text', disabled = false, label, name, autoComplete }: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  label?: string;
  name?: string;
  autoComplete?: string;
}) {
  return (
    <div className="relative flex-1">
      {label && <label className="block text-xs font-bold text-gray-600 mb-1.5">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        name={name}
        autoComplete={autoComplete ?? 'off'}
        className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 pr-11 text-sm focus:outline-none focus:border-brand-500 transition disabled:bg-gray-50 disabled:text-gray-500"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
    </div>
  );
}
