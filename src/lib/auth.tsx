import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, type Customer, verifyPassword, hashPassword } from '@/lib/supabase';

type AuthContextType = {
  customer: Customer | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<{ error?: string }>;
  signup: (name: string, phone: string, address: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  refreshCustomer: () => Promise<void>;
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
      })
      .select('*')
      .single();

    if (error) return { error: 'حدث خطأ أثناء التسجيل' };

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

  return (
    <AuthContext.Provider value={{ customer, loading, login, signup, logout, updatePassword, refreshCustomer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
