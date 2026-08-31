import * as LucideIcons from 'lucide-react';
// استيراد الأيقونة البديلة بشكل صريح ومستقل لمنع انهيار الموقع
import { HelpCircle } from 'lucide-react';

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

    // التعديل السحري هنا: قمنا بإزالة شرط 'function'
    // لأن الأيقونات الحديثة تكون من نوع 'object'
    if (Icon) {
      return <Icon size={size} className={className} />;
    }
  }

  // كود آمن جداً: إذا أخطأ الإدمن في اسم الأيقونة ستظهر هذه الدائرة الرمادية بدلاً من انهيار الموقع
  if (HelpCircle) {
    return <HelpCircle size={size} className={className} color="gray" />;
  }

  return null;
}
