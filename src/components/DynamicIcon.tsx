import * as Icons from 'lucide-react';

// Category icons are stored as a plain string (e.g. "BookOpen") typed by the admin.
// This renders the matching lucide-react icon component dynamically, tolerating
// common casing/spacing variants like "book open" or "book-open".
function normalizeIconName(name: string): string {
  return name
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

type IconComponent = React.ComponentType<{ size?: number | string; className?: string }>;

export default function DynamicIcon({
  name,
  size = 18,
  className,
}: {
  name?: string | null;
  size?: number | string;
  className?: string;
}) {
  if (!name || !name.trim()) return null;

  const registry = Icons as unknown as Record<string, IconComponent>;
  const candidates = [name.trim(), normalizeIconName(name)];

  for (const candidate of candidates) {
    const Icon = registry[candidate];
    if (Icon && typeof Icon === 'function') {
      return <Icon size={size} className={className} />;
    }
  }

  return null;
}
