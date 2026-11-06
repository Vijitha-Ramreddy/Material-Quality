import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { canAccessRoute } from "@/lib/auth/permissions";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const config = getSupabasePublicConfig();
  if (!config) {
    return response;
  }

  const supabase = createServerClient(
    config.url,
    config.key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const publicPaths = ["/login", "/signup", "/forgot-password", "/unauthorized"];
    const publicApiPaths = ["/api/health/supabase"];
    if (
      !publicPaths.includes(request.nextUrl.pathname) &&
      !publicApiPaths.includes(request.nextUrl.pathname) &&
      request.nextUrl.pathname !== "/"
    ) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.active) {
    await supabase.auth.signOut();
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("error", "inactive");
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessRoute(profile.role, request.nextUrl.pathname) && request.nextUrl.pathname !== "/") {
    const unauthorizedUrl = request.nextUrl.clone();
    unauthorizedUrl.pathname = "/unauthorized";
    unauthorizedUrl.search = "";
    return NextResponse.redirect(unauthorizedUrl);
  }
  return response;
}
