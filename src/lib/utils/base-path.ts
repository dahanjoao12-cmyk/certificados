/**
 * Sub-path this app is deployed under (e.g. "/certificados"), or "" at the
 * domain root. `next/link`, `useRouter()`, and `redirect()` from
 * next/navigation (both in Server Components AND Server Actions, confirmed
 * against the Next.js 16 source: app-render/action-handler.js prepends
 * `basePath` itself for any redirect target starting with "/") all apply
 * this automatically -- do NOT wrap those with this helper, or the prefix
 * gets applied twice and compounds on every action/redirect ("/x/x/login",
 * then "/x/x/x/login", ...).
 *
 * What is NOT auto-prefixed, and does need `withBasePath` by hand:
 * `NextResponse.redirect()`/`NextResponse.rewrite()` in Middleware, and any
 * raw `NextResponse` built in a Route Handler (e.g. src/app/auth/callback) --
 * neither goes through the Server Action/Component render path above. Also
 * needed for client-side `fetch("/api/...")` calls with a literal path,
 * since fetch() is a plain Web API Next.js has no hook into.
 */
export function basePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

export function withBasePath(path: string): string {
  return `${basePath()}${path}`;
}
