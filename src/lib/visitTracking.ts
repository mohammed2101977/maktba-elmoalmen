import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const SESSION_KEY = 'store_visitor_session_id';
const LAST_VISIT_DAY_KEY = 'store_visitor_last_visit_day';
const HEARTBEAT_MS = 25000;

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Records at most one "visit" row per browser session per day (for the "visitors today"
// count), and keeps a presence heartbeat alive while the store tab is open (for the
// "online now" count). Mount this once at the top of the storefront.
export function useStoreVisitTracking() {
  useEffect(() => {
    const sessionId = getSessionId();

    // Record a daily visit once per session per day.
    const lastVisitDay = localStorage.getItem(LAST_VISIT_DAY_KEY);
    if (lastVisitDay !== todayKey()) {
      supabase.from('store_visits').insert({ session_id: sessionId }).then(() => {
        localStorage.setItem(LAST_VISIT_DAY_KEY, todayKey());
      });
    }

    // Presence heartbeat: mark this session as "online" and keep refreshing it.
    function beat() {
      supabase.from('store_presence').upsert({ id: sessionId, last_seen: new Date().toISOString() });
    }
    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, []);
}
