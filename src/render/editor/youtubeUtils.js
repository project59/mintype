// Accepts a bare video ID or a watch, youtu.be, embed or shorts URL; returns '' for anything else.
export const extractVideoId = (value) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return '';
};

export const youtubeEmbedUrl = (videoId) => `https://www.youtube.com/embed/${videoId}`;
