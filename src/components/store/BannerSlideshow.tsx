import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BannerSlide } from '@/lib/supabase';

// A simple image carousel: left/right arrow buttons (desktop) and touch-swipe (mobile).
// Slides always fit fully (object-contain) inside the given container size.
export default function BannerSlideshow({ slides }: { slides: BannerSlide[] }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (slides.length === 0) return null;

  function goTo(i: number) {
    setIndex(((i % slides.length) + slides.length) % slides.length);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    const SWIPE_THRESHOLD = 40;
    if (delta > SWIPE_THRESHOLD) goTo(index - 1);
    else if (delta < -SWIPE_THRESHOLD) goTo(index + 1);
    touchStartX.current = null;
  }

  const slide = slides[index];

  return (
    <div
      className="relative w-full h-full select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {slide.link_url ? (
        <a href={slide.link_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
          <img src={slide.image_url} alt="" className="w-full h-full object-contain" draggable={false} />
        </a>
      ) : (
        <img src={slide.image_url} alt="" className="w-full h-full object-contain" draggable={false} />
      )}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); goTo(index - 1); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
            aria-label="السابق"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); goTo(index + 1); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
            aria-label="التالي"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={(e) => { e.preventDefault(); goTo(i); }}
                className={`w-1.5 h-1.5 rounded-full transition ${i === index ? 'bg-white w-4' : 'bg-white/50'}`}
                aria-label={`الصورة ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
