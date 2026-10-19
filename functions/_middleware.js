// Cloudflare Pages middleware
// Redirect the custom domain root (simsreality.app) to the
// 3D Warehouse Lab section of the Davies studio page.
const REDIRECT_HOSTS = new Set(["simsreality.app", "www.simsreality.app"]);
const TARGET_URL =
  "https://world-labs-260907.pages.dev/davies#spatialLabSection";

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (
    REDIRECT_HOSTS.has(url.hostname) &&
    (url.pathname === "/" || url.pathname === "/index.html")
  ) {
    return Response.redirect(TARGET_URL, 302);
  }

  return context.next();
}
