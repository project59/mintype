// Share-button links (maps.app.goo.gl/…, goo.gl/maps/…) only redirect to the full Maps URL, and
// Google sends no CORS headers, so the browser cannot follow them; the backend resolves them.
export const isShortMapsLink = (input) => {
  try {
    const url = new URL(input.trim());
    const hostname = url.hostname.toLowerCase();
    return hostname === 'maps.app.goo.gl' || (hostname === 'goo.gl' && url.pathname.startsWith('/maps'));
  } catch {
    return false;
  }
};

// Returns the full Google Maps URL a short link points to, or '' if it cannot be resolved.
export const resolveShortMapsLink = async (input) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/resolve-maps-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: input.trim() }),
    });
    if (!response.ok) return '';
    const { url } = await response.json();
    return typeof url === 'string' && getGoogleMapsEmbedUrl(url) ? url : '';
  } catch {
    return '';
  }
};

export const getGoogleMapsEmbedUrl = (input) => {
  if (!input) return '';

  let url;
  try {
    url = new URL(input.trim());
  } catch {
    return '';
  }

  const hostname = url.hostname.toLowerCase();
  const isGoogleMapsHost = hostname === 'google.com' || hostname.endsWith('.google.com');
  if (!isGoogleMapsHost || !['http:', 'https:'].includes(url.protocol)) return '';

  if (url.pathname.startsWith('/maps/embed')) {
    url.protocol = 'https:';
    return url.toString();
  }

  const pathParts = url.pathname.split('/').filter(Boolean);
  const mapIndex = pathParts.indexOf('maps');
  let location = url.searchParams.get('query')
    || url.searchParams.get('q')
    || url.searchParams.get('destination')
    || url.searchParams.get('ll');

  if (!location && mapIndex >= 0 && ['place', 'search'].includes(pathParts[mapIndex + 1])) {
    location = pathParts[mapIndex + 2] || '';
    try {
      location = decodeURIComponent(location.replaceAll('+', ' '));
    } catch {
      return '';
    }
  }

  if (!location && mapIndex >= 0 && pathParts[mapIndex + 1] === 'dir') {
    location = pathParts.slice(mapIndex + 2).join(' to ').replaceAll('+', ' ');
  }

  if (!location && mapIndex >= 0) {
    const coordinates = url.pathname.match(/@(-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?)/);
    location = coordinates?.[1] || (hostname.endsWith('.google.com') || hostname === 'google.com'
      ? url.toString()
      : '');
  }

  if (!location) return '';

  const embedUrl = new URL('https://www.google.com/maps');
  embedUrl.searchParams.set('q', location);
  embedUrl.searchParams.set('output', 'embed');
  return embedUrl.toString();
};
