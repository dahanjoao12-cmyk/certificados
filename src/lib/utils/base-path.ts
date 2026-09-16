/**
 * Sub-path this app is deployed under (e.g. "/certificados"), or "" at the
 * domain root. `next/link` and `useRouter()` apply this automatically, but
 * neither `redirect()` (next/navigation, inside Server Actions/Route
 * Handlers) nor `NextResponse.redirect()` (Middleware) do -- both need it
 * prepended by hand, which is what `withBasePath` is for. Same env var
 * doubles as `next.config.ts`'s `basePath`, so there is one source of truth.
 */
export function basePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

export function withBasePath(path: string): string {
  return `${basePath()}${path}`;
}
