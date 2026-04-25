import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createOptionalSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

function parseCredentials(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (typeof record.email !== "string" || typeof record.password !== "string") return null;
  return {
    email: record.email.trim(),
    password: record.password,
  };
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const credentials = parseCredentials(await request.json().catch(() => null));
  if (!credentials) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }

  const supabase = await createOptionalSupabaseRouteHandlerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase-not-configured" }, { status: 503 });
  }

  const { data, error } = await supabase.client.auth.signUp(credentials);
  if (error) {
    return supabase.applyToResponse(NextResponse.json({ ok: false, error: "auth-failed" }, { status: 400 }));
  }

  const user = data.user;
  const adminClient = createSupabaseAdminClient();
  if (adminClient && user?.id) {
    await adminClient.from("profiles").upsert({
      user_id: user.id,
      email: credentials.email,
      updated_at: new Date().toISOString(),
    });
    await adminClient.from("research_participation").upsert({
      user_id: user.id,
      raw_answer_storage_opt_in: false,
      derived_feature_research_opt_in: false,
      model_improvement_opt_in: false,
      updated_at: new Date().toISOString(),
    });
  }

  return supabase.applyToResponse(
    NextResponse.json({
      ok: true,
      requiresEmailConfirmation: !data.session,
    }),
  );
}
