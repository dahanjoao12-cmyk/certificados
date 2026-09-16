"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { withBasePath } from "@/lib/utils/base-path";

/**
 * Landing point for every Supabase auth email link (invite, password
 * recovery, ...). This has to be a Client Component, not a Route Handler:
 * Supabase's admin-generated links (generateLink) deliver the session as
 * `#access_token=...&refresh_token=...` in the URL FRAGMENT, which browsers
 * never send to the server -- only client-side JS can read it. A `?code=`
 * query param (PKCE) is also handled, in case that ever changes.
 *
 * Listed in PUBLIC_PATHS in src/lib/supabase/middleware.ts since there's no
 * session yet when this page first loads.
 */
export default function AuthCallbackPage() {
  const [error, setError] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function run() {
      const supabase = createClient();
      const url = new URL(window.location.href);
      const next = url.searchParams.get("next") || "/";
      const hashParams = new URLSearchParams(url.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const code = url.searchParams.get("code");

      let ok = false;
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        ok = !error;
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        ok = !error;
      }

      if (ok) {
        window.location.replace(withBasePath(next.startsWith("/") ? next : "/"));
      } else {
        setError(true);
      }
    }

    run();
  }, []);

  if (error) {
    if (typeof window !== "undefined") {
      window.location.replace(withBasePath("/login?error=convite_invalido"));
    }
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Entrando...</p>
    </div>
  );
}
