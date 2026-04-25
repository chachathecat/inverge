import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function createOptionalSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Server Components can only read request cookies. Session refresh and
        // cookie persistence must happen in Route Handlers, Server Actions, or proxy.ts.
      },
    },
  });
}

export async function createSupabaseServerClient() {
  const client = await createOptionalSupabaseServerClient();
  if (!client) {
    throw new Error("Supabase server environment variables are not configured.");
  }

  return client;
}
