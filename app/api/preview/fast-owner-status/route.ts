import { NextResponse } from "next/server";

import { isFastOwnerPreviewDeployment } from "@/lib/preview/fast-owner-preview";

export const dynamic = "force-dynamic";

const EXPECTED_SUPABASE_HOST = "vajcduseyicjhyhrclax.supabase.co";
const SHA_PATTERN = /^[0-9a-f]{40}$/i;

function isExpectedSupabaseProject() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.hostname === EXPECTED_SUPABASE_HOST &&
      url.pathname === "/"
    );
  } catch {
    return false;
  }
}

function hasExactlyOneOwnerAllowlistEntry() {
  const values = (process.env.ALPHA_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return values.length === 1 && new Set(values).size === 1;
}

export function GET() {
  if (!isFastOwnerPreviewDeployment()) {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }

  const deploymentSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() ?? "";
  const checks = {
    exactPreviewBranch: true,
    deploymentShaBound: SHA_PATTERN.test(deploymentSha),
    supabaseProjectBound: isExpectedSupabaseProject(),
    supabaseAnonConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
    ),
    supabaseAdminConfigured: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    ),
    ownerAllowlistExactlyOne: hasExactlyOneOwnerAllowlistEntry(),
    aiProviderConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    selectedDeploymentIsPreview: process.env.VERCEL_ENV === "preview",
  };

  const ready = Object.values(checks).every((value) => value === true);

  return NextResponse.json(
    {
      ready,
      deploymentSha: checks.deploymentShaBound ? deploymentSha : null,
      checks,
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}
