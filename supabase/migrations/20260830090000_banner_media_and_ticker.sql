/*
# Richer ad banners: video/GIF media, custom size, and scrolling text ticker

1. Changes to `store_banners`
- `content_type` (text, default 'image'): 'image' (static image or GIF, rendered as-is),
  'video' (a YouTube/Vimeo/Facebook link or a direct video file, embedded like product videos),
  or 'text_ticker' (a scrolling text ribbon instead of media).
- `text_content` (text, nullable): the message shown when `content_type` = 'text_ticker'.
- `width` (integer, nullable): optional custom max width in pixels for the banner.
- `height` (integer, nullable): optional custom height in pixels for the banner
  (overrides the default responsive aspect-ratio sizing when set).
- `image_url` becomes nullable (already was) since it isn't used for text_ticker banners, and
  for 'video' banners it holds the video URL instead of an image URL.
*/

ALTER TABLE store_banners ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'image' CHECK (content_type IN ('image', 'video', 'text_ticker'));
ALTER TABLE store_banners ADD COLUMN IF NOT EXISTS text_content text;
ALTER TABLE store_banners ADD COLUMN IF NOT EXISTS width integer;
ALTER TABLE store_banners ADD COLUMN IF NOT EXISTS height integer;
ALTER TABLE store_banners ALTER COLUMN image_url DROP NOT NULL;
