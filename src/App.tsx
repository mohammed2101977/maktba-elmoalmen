import { useEffect, useState } from 'react';
import StoreFront from '@/components/store/StoreFront';
import AdminDashboard from '@/components/admin/AdminDashboard';
import ContactPage from '@/components/store/ContactPage';
import AccountPage from '@/components/store/AccountPage';
import { AuthProvider } from '@/lib/auth';

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const handler = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return hash;
}

function App() {
  const hash = useHashRoute();

  let page;
  if (hash.startsWith('#/admin')) {
    page = <AdminDashboard />;
  } else if (hash.startsWith('#/contact')) {
    page = <ContactPage />;
  } else if (hash.startsWith('#/account')) {
    page = <AccountPage />;
  } else {
    page = <StoreFront />;
  }

  return <AuthProvider>{page}</AuthProvider>;
}

export default App;
