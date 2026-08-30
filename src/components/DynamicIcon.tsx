import * as LucideIcons from 'lucide-react';
// ÇÓÊíÑÇÏ ÇáÃíŞæäÉ ÇáÈÏíáÉ ÈÔßá ÕÑíÍ æãÓÊŞá áãäÚ ÇäåíÇÑ ÇáãæŞÚ
import { HelpCircle } from 'lucide-react'; 

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
    const Icon = (LucideIcons as any)[candidate];
    
    // ÇáÊÚÏíá ÇáÓÍÑí åäÇ: ŞãäÇ ÈÅÒÇáÉ ÔÑØ 'function' 
    // áÃä ÇáÃíŞæäÇÊ ÇáÍÏíËÉ Êßæä ãä äæÚ 'object'
    if (Icon) {
      return <Icon size={size} className={className} />;
    }
  }

  // ßæÏ Âãä ÌÏÇğ: ÅĞÇ ÃÎØÃ ÇáÅÏãä İí ÇÓã ÇáÃíŞæäÉ ÓÊÙåÑ åĞå ÇáÏÇÆÑÉ ÇáÑãÇÏíÉ ÈÏáÇğ ãä ÇäåíÇÑ ÇáãæŞÚ
  if (HelpCircle) {
     return <HelpCircle size={size} className={className} color="gray" />;
  }
  
  return null;
}