import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BannerSlide } from '@/lib/supabase';

const AUTOPLAY_INTERVAL_MS = 4000;
// After the customer manually changes the slide, wait this long with no further
// interaction before the automatic rotation resumes on its own.
const RESUME_AFTER_MS = 5000;

// A simple image carousel: left/right arrow buttons (desktop) and touch-swipe (mobile).
// Auto-advances on its own; pauses when the customer manually navigates, then resumes
// automatically after a short period of inactivity. Slides always fit fully (object-contain).
export default function BannerSlideshow({ slides }: { slides: BannerSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const resumeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function goTo(i: number, manual = false) {
    setIndex(((i % slides.length) + slides.length) % slides.length);
    if (manual) {
      setPaused(true);
      if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
      resumeTimeout.current = setTimeout(() => setPaused(false), RESUME_AFTER_MS);
    }
  }

  // Automatic rotation — active whenever the customer hasn't recently intervened.
  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [paused, slides.length]);

  useEffect(() => {
    return () => {
      if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    };
  }, []);

  if (slides.length === 0) return null;

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    const SWIPE_THRESHOLD = 40;
    if (delta > SWIPE_THRESHOLD) goTo(index - 1, true);
    else if (delta < -SWIPE_THRESHOLD) goTo(index + 1, true);
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
            onClick={(e) => { e.preventDefault(); goTo(index + 1, true); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
            aria-label="التالي"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); goTo(index - 1, true); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
            aria-label="السابق"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={(e) => { e.preventDefault(); goTo(i, true); }}
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
