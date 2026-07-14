import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SHA_PATTERN = /^[0-9a-f]{40}$/i;

export function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }

  const deploymentSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() ?? "";
  if (!SHA_PATTERN.test(deploymentSha)) {
    return NextResponse.json(
      { ready: false },
      {
        status: 503,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      },
    );
  }

  return NextResponse.json(
    { ready: true, deploymentSha },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
