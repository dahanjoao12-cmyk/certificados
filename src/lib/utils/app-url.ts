/** Public base URL of the app, for links inside emails and OAuth/invite redirects. */
export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
