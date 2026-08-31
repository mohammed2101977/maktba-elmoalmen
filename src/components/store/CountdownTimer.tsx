import { useEffect, useState } from 'react';

// Renders a live "ends in Xd Xh Xm Xs" countdown that ticks every second and calls
// onExpire once when the deadline passes. Returns null once expired.
export default function CountdownTimer({
  endsAt,
  onExpire,
  compact = false,
}: {
  endsAt: string;
  onExpire?: () => void;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const target = new Date(endsAt).getTime();
  const remaining = target - now;

  useEffect(() => {
    if (remaining <= 0) onExpire?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining <= 0]);

  if (remaining <= 0) return null;

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <span className={compact ? 'text-xs font-bold tabular-nums' : 'text-sm font-bold tabular-nums'}>
      {days > 0 && `${days} يوم `}
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}
