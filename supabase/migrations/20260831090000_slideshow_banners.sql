/*
# Slideshow ad banners (multiple images, arrows + swipe)

1. Changes to `store_banners`
- `content_type` now also accepts 'slideshow': a carousel of several images shown one at a
  time, with left/right arrow navigation and touch-swipe support on mobile.
- `slides` (jsonb, default '[]'): the list of slides for a 'slideshow' banner. Each slide is
  `{ id, image_url, link_url }`. Unused for the other content types.
*/

ALTER TABLE store_banners DROP CONSTRAINT IF EXISTS store_banners_content_type_check;
ALTER TABLE store_banners ADD CONSTRAINT store_banners_content_type_check
  CHECK (content_type IN ('image', 'video', 'text_ticker', 'slideshow'));

ALTER TABLE store_banners ADD COLUMN IF NOT EXISTS slides jsonb DEFAULT '[]'::jsonb;
