import { createBrowserClient } from "@supabase/ssr";

import { isSupabaseConfigured } from "@/lib/supabase/server";

export function createOptionalSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export function createSupabaseBrowserClient() {
  const client = createOptionalSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase browser environment variables are not configured.");
  }

  return client;
}
