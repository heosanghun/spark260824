// Cloudflare Pages middleware
// - simsreality.app root  -> simsreality.app/davies#spatialLabSection
// - world-labs-260907.pages.dev/* -> simsreality.app/* (canonical domain)
const BRAND_HOST = "simsreality.app";
const BRAND_HOSTS = new Set([BRAND_HOST, `www.${BRAND_HOST}`]);
const LEGACY_HOST = "world-labs-260907.pages.dev";
const LANDING_PATH = "/davies#spatialLabSection";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const isRoot = url.pathname === "/" || url.pathname === "/index.html";

  // API endpoints (e.g. /api/live-token) are served as-is on every host.
  if (url.pathname.startsWith("/api/")) return context.next();

  // Old pages.dev production address: move to the brand domain.
  if (url.hostname === LEGACY_HOST) {
    const target = isRoot
      ? `https://${BRAND_HOST}${LANDING_PATH}`
      : `https://${BRAND_HOST}${url.pathname}${url.search}`;
    return Response.redirect(target, 301);
  }

  // Brand domain root: open the 3D Warehouse Lab section.
  if (BRAND_HOSTS.has(url.hostname) && isRoot) {
    return Response.redirect(`https://${BRAND_HOST}${LANDING_PATH}`, 302);
  }

  return context.next();
}
