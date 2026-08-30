import { icons } from 'lucide-react';

// œ«·…  ÊÕÌœ ’Ì€… «·«”„
function normalizeIconName(name: string): string {
  return name
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

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

  const candidates = [name.trim(), normalizeIconName(name)];

  for (const candidate of candidates) {
    // «” œ⁄«¡ «·√ÌﬁÊ‰… „‰ ﬂ«∆‰ icons «·—”„Ì
    const Icon = (icons as any)[candidate];
    if (Icon && typeof Icon === 'function') {
      return <Icon size={size} className={className} />;
    }
  }

  return null;
}