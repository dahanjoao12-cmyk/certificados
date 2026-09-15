/**
 * NOTE: env vars are read via STATIC `process.env.LITERAL_NAME` access on
 * purpose, never `process.env[name]`. Middleware runs in the Vercel Edge
 * Runtime, which only inlines an env var when it can statically see the
 * exact literal reference at build time; a dynamic key lookup bundles to an
 * always-empty object there and every request 500s, even though the same
 * code works fine in `next dev` and in ordinary Node.js server functions.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não configurada. Veja .env.example.`);
  }
  return value;
}

export const supabaseUrl = () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabaseAnonKey = () =>
  required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const supabaseServiceRoleKey = () =>
  required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
