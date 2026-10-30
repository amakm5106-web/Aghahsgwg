import type { NextRequest } from 'next/server';

export function isSameOriginRequest(request: NextRequest): boolean {
  const fetchSite = request.headers.get('sec-fetch-site')?.trim().toLowerCase();
  if (fetchSite === 'cross-site') return false;
  if (fetchSite === 'same-origin') return true;

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const expectedHost = (
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    || request.headers.get('host')
    || new URL(request.url).host
  )?.toLowerCase();

  if (!origin && !referer) return fetchSite !== 'same-site';

  if (origin) {
    try {
      const parsedOrigin = new URL(origin);
      if (parsedOrigin.host.toLowerCase() === expectedHost) return true;
    } catch {
      // Ignore malformed Origin and try Referer.
    }
  }

  if (referer) {
    try {
      const parsedReferer = new URL(referer);
      if (parsedReferer.host.toLowerCase() === expectedHost) return true;
    } catch {
      // Ignore malformed Referer.
    }
  }

  return false;
}
