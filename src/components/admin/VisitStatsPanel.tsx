import { useEffect, useState } from 'react';
import { Users, Eye, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ONLINE_WINDOW_MS = 90 * 1000; // a session counts as "online" if it pinged in the last 90s
const POLL_MS = 15000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export default function VisitStatsPanel() {
  const [onlineNow, setOnlineNow] = useState<number | null>(null);
  const [visitorsToday, setVisitorsToday] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedDayCount, setSelectedDayCount] = useState<number | null>(null);
  const [dayLoading, setDayLoading] = useState(false);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  async function fetchOnlineNow() {
    const threshold = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
    const { count } = await supabase
      .from('store_presence')
      .select('id', { count: 'exact', head: true })
      .gte('last_seen', threshold);
    setOnlineNow(count ?? 0);
  }

  async function fetchVisitorsToday() {
    const { count } = await supabase
      .from('store_visits')
      .select('id', { count: 'exact', head: true })
      .gte('visited_at', startOfDay(now).toISOString())
      .lte('visited_at', endOfDay(now).toISOString());
    setVisitorsToday(count ?? 0);
  }

  async function fetchDayCount(day: number) {
    setDayLoading(true);
    const target = new Date(now.getFullYear(), now.getMonth(), day);
    const { count } = await supabase
      .from('store_visits')
      .select('id', { count: 'exact', head: true })
      .gte('visited_at', startOfDay(target).toISOString())
      .lte('visited_at', endOfDay(target).toISOString());
    setSelectedDayCount(count ?? 0);
    setDayLoading(false);
  }

  useEffect(() => {
    fetchOnlineNow();
    fetchVisitorsToday();
    const interval = setInterval(() => {
      fetchOnlineNow();
      fetchVisitorsToday();
    }, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDayCount(selectedDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  const selectedDate = new Date(now.getFullYear(), now.getMonth(), selectedDay);
  const selectedLabel = selectedDate.toLocaleDateString('ar-EG', { weekday: 'long' });
  const dateNumeric = `${selectedDay}-${now.getMonth() + 1}-${now.getFullYear()}`;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <h2 className="font-bold text-lg text-gray-800 mb-4">إحصائيات الزوار</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="flex items-center gap-3 bg-green-50 rounded-xl p-4">
          <div className="w-11 h-11 rounded-full bg-green-500 text-white flex items-center justify-center relative shrink-0">
            <Users size={22} />
            <span className="absolute -top-1 -left-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-800">{onlineNow ?? '...'}</p>
            <p className="text-xs text-gray-500">متواجدون على المتجر الآن</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4">
          <div className="w-11 h-11 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
            <Eye size={22} />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-800">{visitorsToday ?? '...'}</p>
            <p className="text-xs text-gray-500">زوار المتجر اليوم حتى الآن</p>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
          <Calendar size={16} className="text-brand-500" />
          عدد الزوار ليوم معيّن هذا الشهر
        </label>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(parseInt(e.target.value))}
            className="h-11 rounded-xl border-2 border-gray-200 px-4 text-sm bg-white focus:outline-none focus:border-brand-500 transition w-full sm:w-auto"
          >
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const d = new Date(now.getFullYear(), now.getMonth(), day);
              const label = d.toLocaleDateString('ar-EG', { weekday: 'long' });
              return (
                <option key={day} value={day}>
                  {label} {day}-{now.getMonth() + 1}-{now.getFullYear()}
                </option>
              );
            })}
          </select>
          <div className="bg-gray-50 rounded-xl px-4 py-2.5 text-sm flex-1">
            <span className="text-gray-600">{selectedLabel} {dateNumeric}: </span>
            <span className="font-extrabold text-brand-600">{dayLoading ? '...' : selectedDayCount ?? 0}</span>
            <span className="text-gray-500"> زائر</span>
          </div>
        </div>
      </div>
    </div>
  );
}
