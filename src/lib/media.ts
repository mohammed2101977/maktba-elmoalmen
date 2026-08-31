// Turns a pasted video link (YouTube, Vimeo, Facebook, or a direct video file) into
// something we can actually render — either an <iframe> embed URL or a direct <video> src.
// Shared between the product video player and video-type ad banners.
export function getVideoEmbed(url: string): { kind: 'iframe' | 'video'; src: string } {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    // YouTube: watch?v=, youtu.be/ID, /shorts/ID, /embed/ID
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
      let videoId = '';
      if (host === 'youtu.be') {
        videoId = u.pathname.slice(1);
      } else if (u.pathname.startsWith('/shorts/')) {
        videoId = u.pathname.split('/shorts/')[1];
      } else if (u.pathname.startsWith('/embed/')) {
        videoId = u.pathname.split('/embed/')[1];
      } else {
        videoId = u.searchParams.get('v') ?? '';
      }
      videoId = videoId.split('/')[0].split('?')[0];
      if (videoId) return { kind: 'iframe', src: `https://www.youtube.com/embed/${videoId}` };
    }

    // Vimeo: vimeo.com/ID
    if (host === 'vimeo.com') {
      const videoId = u.pathname.split('/').filter(Boolean)[0];
      if (videoId) return { kind: 'iframe', src: `https://player.vimeo.com/video/${videoId}` };
    }

    // Facebook video links
    if (host === 'facebook.com' || host === 'fb.watch') {
      return { kind: 'iframe', src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&autoplay=false` };
    }
  } catch {
    // Not a valid absolute URL — fall through to direct video handling.
  }

  // Fallback: treat it as a direct video file URL (mp4, webm, etc.)
  return { kind: 'video', src: url };
}
