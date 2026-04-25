import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/server";

type BufferedSupabaseCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

function applyBufferedCookies(response: NextResponse, bufferedCookies: BufferedSupabaseCookie[], bufferedHeaders: Headers) {
  bufferedCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  bufferedHeaders.forEach((value, name) => {
    response.headers.set(name, value);
  });

  return response;
}

export async function createOptionalSupabaseRouteHandlerClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const bufferedCookies: BufferedSupabaseCookie[] = [];
  const bufferedHeaders = new Headers();

  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        bufferedCookies.push(...cookiesToSet);

        Object.entries(headers).forEach(([name, value]) => {
          bufferedHeaders.set(name, value);
        });
      },
    },
  });

  return {
    client,
    applyToResponse(response: NextResponse) {
      return applyBufferedCookies(response, bufferedCookies, bufferedHeaders);
    },
  };
}
