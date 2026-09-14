"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

/** Supabase client for use in Client Components. Respects RLS via the user's session. */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
