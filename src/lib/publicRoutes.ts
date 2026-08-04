// Single source of truth — pages that use PublicHeader (not the in-app AppNav).
// Listed pages also opt out of the constrained app-shell max-width container.
export const PUBLIC_ROUTES = [
  "/landing",
  "/plans",
  
  "/updates",
  "/login",
  "/signup",
  "/engagement",
  "/support",
  "/docs/share",
];

export function isPublicPath(path: string): boolean {
  // "/" only redirects (to /landing or /app) — never render the app shell there.
  if (path === "/") return true;
  return PUBLIC_ROUTES.some((p) => path === p || path.startsWith(`${p}/`));
}
