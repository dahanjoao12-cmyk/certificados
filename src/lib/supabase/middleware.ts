import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./env";
import { withBasePath } from "@/lib/utils/base-path";

// /api/cron/notify has no user session (called by the server's system cron,
// not a browser) -- it authenticates itself via the CRON_SECRET bearer
// token inside the route handler, so it must not be redirected to /login here.
const PUBLIC_PATHS = ["/login", "/auth/callback", "/api/cron/notify"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

/**
 * Refreshes the Supabase session cookie on every request and redirects
 * unauthenticated users away from protected pages. This is the app's route
 * protection layer -- RLS in Postgres is the actual data-access guard.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = new URL(withBasePath("/login"), request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL(withBasePath("/"), request.url));
  }

  return response;
}
