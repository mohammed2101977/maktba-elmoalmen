/*
# Configurable speeds for the text ticker and the image slideshow

1. Changes to `store_banners`
- `ticker_speed_seconds` (integer, default 20): for `content_type` = 'text_ticker',
  how many seconds the text takes to scroll fully across the screen once.
  Lower = faster movement. Only relevant to ticker banners.
- `slideshow_interval_seconds` (integer, default 3): for `content_type` = 'slideshow',
  how many seconds each slide stays on screen before automatically advancing to the
  next one. Only relevant to slideshow banners.
*/

ALTER TABLE store_banners ADD COLUMN IF NOT EXISTS ticker_speed_seconds integer NOT NULL DEFAULT 20;
ALTER TABLE store_banners ADD COLUMN IF NOT EXISTS slideshow_interval_seconds integer NOT NULL DEFAULT 3;
