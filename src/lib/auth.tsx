import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, type Customer, verifyPassword, hashPassword, generateVerificationCode } from '@/lib/supabase';

type AuthContextType = {
  customer: Customer | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<{ error?: string }>;
  signup: (name: string, phone: string, address: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  refreshCustomer: () => Promise<void>;
  activateAccount: (phone: string, code: string) => Promise<{ error?: string }>;
  requestPasswordReset: (phone: string) => Promise<{ error?: string }>;
  confirmPasswordReset: (phone: string, code: string, newPassword: string) => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'customer_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setCustomer(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  async function login(phone: string, password: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (error) return { error: 'حدث خطأ أثناء تسجيل الدخول' };
    if (!data) return { error: 'هذا الرقم غير مسجل' };
    if (!verifyPassword(password, data.password_hash)) return { error: 'كلمة المرور غير صحيحة' };

    setCustomer(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return {};
  }

  async function signup(name: string, phone: string, address: string, password: string) {
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existing) return { error: 'هذا الرقم مسجل بالفعل' };

    const { data, error } = await supabase
      .from('customers')
      .insert({
        name,
        phone,
        address,
        password_hash: hashPassword(password),
        is_active: false,
      })
      .select('*')
      .single();

    if (error) return { error: 'حدث خطأ أثناء التسجيل' };

    // Create the activation request the admin will see in the dashboard and resolve
    // by sending the code to the customer on WhatsApp.
    const code = generateVerificationCode();
    await supabase.from('activation_requests').insert({
      customer_id: data.id,
      customer_name: data.name,
      phone: data.phone,
      code,
      sent: false,
    });

    setCustomer(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return {};
  }

  function logout() {
    setCustomer(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  async function updatePassword(newPassword: string) {
    if (!customer) return { error: 'غير مسجل' };
    const { error } = await supabase
      .from('customers')
      .update({ password_hash: hashPassword(newPassword) })
      .eq('id', customer.id);

    if (error) return { error: 'حدث خطأ' };
    const updated = { ...customer, password_hash: hashPassword(newPassword) };
    setCustomer(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return {};
  }

  async function refreshCustomer() {
    if (!customer) return;
    const { data } = await supabase.from('customers').select('*').eq('id', customer.id).maybeSingle();
    if (data) {
      setCustomer(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }

  // Confirms an account-activation request using the code the admin sent over WhatsApp.
  async function activateAccount(phone: string, code: string) {
    const trimmedPhone = phone.trim();
    const trimmedCode = code.trim();
    const { data, error } = await supabase
      .from('activation_requests')
      .select('id, customer_id, code')
      .eq('phone', trimmedPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return { error: 'لا يوجد طلب تفعيل بهذا الرقم' };
    if (data.code !== trimmedCode) return { error: 'الكود خطأ لم يتم التفعيل' };

    const { error: updateError } = await supabase
      .from('customers')
      .update({ is_active: true })
      .eq('id', data.customer_id);
    if (updateError) return { error: 'حدث خطأ أثناء التفعيل' };

    await supabase.from('activation_requests').delete().eq('id', data.id);

    if (customer && customer.phone === trimmedPhone) {
      const updated = { ...customer, is_active: true };
      setCustomer(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return {};
  }

  // Creates (or replaces) a password-reset request for the given phone number.
  // The admin will see it in the dashboard and send the code over WhatsApp.
  async function requestPasswordReset(phone: string) {
    const trimmedPhone = phone.trim();
    const { data: cust, error: custError } = await supabase
      .from('customers')
      .select('id, name')
      .eq('phone', trimmedPhone)
      .maybeSingle();

    if (custError) return { error: 'حدث خطأ' };
    if (!cust) return { error: 'هذا الرقم غير مسجل' };

    // Replace any previous outstanding request for this phone with a fresh one.
    await supabase.from('password_reset_requests').delete().eq('phone', trimmedPhone);

    const code = generateVerificationCode();
    const { error } = await supabase.from('password_reset_requests').insert({
      customer_id: cust.id,
      customer_name: cust.name,
      phone: trimmedPhone,
      code,
      sent: false,
    });
    if (error) return { error: 'حدث خطأ أثناء إرسال الطلب' };
    return {};
  }

  // Confirms a password-reset request using the code the admin sent over WhatsApp.
  async function confirmPasswordReset(phone: string, code: string, newPassword: string) {
    const trimmedPhone = phone.trim();
    const trimmedCode = code.trim();
    const { data, error } = await supabase
      .from('password_reset_requests')
      .select('id, customer_id, code')
      .eq('phone', trimmedPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return { error: 'لا يوجد طلب تغيير كلمة مرور بهذا الرقم' };
    if (data.code !== trimmedCode) return { error: 'الكود خطأ لم يتم تغيير كلمة المرور' };

    const newHash = hashPassword(newPassword);
    const { error: updateError } = await supabase
      .from('customers')
      .update({ password_hash: newHash })
      .eq('id', data.customer_id);
    if (updateError) return { error: 'حدث خطأ أثناء تغيير كلمة المرور' };

    await supabase.from('password_reset_requests').delete().eq('id', data.id);

    if (customer && customer.phone === trimmedPhone) {
      const updated = { ...customer, password_hash: newHash };
      setCustomer(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return {};
  }

  return (
    <AuthContext.Provider
      value={{
        customer,
        loading,
        login,
        signup,
        logout,
        updatePassword,
        refreshCustomer,
        activateAccount,
        requestPasswordReset,
        confirmPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
