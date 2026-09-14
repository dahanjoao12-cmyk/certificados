import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY.
 *
 * `server-only` guarantees a build error if this is ever imported from
 * client code. Use exclusively for operations that legitimately need to
 * escape RLS -- today that's just admin user management (creating/disabling
 * auth users), which the Supabase Admin API requires the service role for.
 * Never use this as a shortcut around a normal RLS policy.
 */
export function createAdminClient() {
  return createSupabaseClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
