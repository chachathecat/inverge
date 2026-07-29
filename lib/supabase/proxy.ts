import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/server";

type BufferedSupabaseCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function updateSupabaseSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-inverge-current-path", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  const bufferedCookies: BufferedSupabaseCookie[] = [];
  const bufferedHeaders = new Headers();

  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        bufferedCookies.push(...cookiesToSet);

        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        Object.entries(headers).forEach(([name, value]) => {
          bufferedHeaders.set(name, value);
        });
      },
    },
  });

  // Verify and refresh the request session using Supabase's SSR-recommended
  // claims path. With asymmetric signing keys this avoids an Auth user lookup;
  // symmetric projects still fail closed through Supabase's getUser fallback.
  await client.auth.getClaims();

  // Supabase may have refreshed request.cookies above. Clone the headers only
  // after that refresh so Server Components receive the rotated cookie.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-inverge-current-path", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  bufferedCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  bufferedHeaders.forEach((value, name) => {
    response.headers.set(name, value);
  });

  return response;
}
