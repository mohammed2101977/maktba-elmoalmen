import { useEffect, useState } from 'react';
import StoreFront from '@/components/store/StoreFront';
import AdminDashboard from '@/components/admin/AdminDashboard';

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
  const isAdmin = hash.startsWith('#/admin');

  return isAdmin ? <AdminDashboard /> : <StoreFront />;
}

export default App;
