import * as LucideIcons from 'lucide-react';

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
  // 1. ÿ»«⁄… «·«”„ «·„” ·„ ›Ì «·ﬂÊ‰”Ê· ·· √ﬂœ „‰ Ê’Ê·Â
  console.log("Received Icon Name:", name);

  if (!name || !name.trim()) return null;

  const candidates = [name.trim(), normalizeIconName(name)];
  console.log("Checking Candidates:", candidates);

  for (const candidate of candidates) {
    const Icon = (LucideIcons as any)[candidate];
    
    if (Icon && typeof Icon === 'function') {
      return <Icon size={size} className={className} />;
    }
  }

  // 2. ≈–« ·„ Ì „ «·⁄ÀÊ— ⁄·Ï «·√ÌﬁÊ‰…° «⁄—÷ ⁄·«„… «” ›Â«„ Õ„—«¡
  const FallbackIcon = LucideIcons.HelpCircle;
  console.error(`Icon "${name}" not found in lucide-react!`);
  return <FallbackIcon size={size} className={className} color="red" />;
}