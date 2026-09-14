import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

export interface CurrentUser {
  id: string;
  email: string;
  profile: Profile;
}

/**
 * Reads the authenticated user + their profile row. Redirects to /login if
 * there is no session -- use in Server Components/pages that require auth
 * (the middleware already blocks anonymous access, this is the belt-and-braces
 * check for the page itself, and the one place that fetches the role).
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  if (!(profile as Profile).active) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return { id: user.id, email: user.email ?? "", profile: profile as Profile };
}

export function requireAdmin(user: CurrentUser) {
  if (user.profile.role !== "admin") {
    redirect("/");
  }
}
