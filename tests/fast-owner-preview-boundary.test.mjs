import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  FAST_OWNER_PREVIEW_BRANCH,
  isFastOwnerPreviewDeployment,
} from "../lib/preview/fast-owner-preview.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("fast Owner Preview matches only the dedicated Vercel Preview branch", () => {
  assert.equal(FAST_OWNER_PREVIEW_BRANCH, "agent/fast-owner-preview");
  assert.equal(
    isFastOwnerPreviewDeployment({
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_REF: FAST_OWNER_PREVIEW_BRANCH,
    }),
    true,
  );

  for (const environment of [
    {},
    {
      VERCEL_ENV: "production",
      VERCEL_GIT_COMMIT_REF: FAST_OWNER_PREVIEW_BRANCH,
    },
    {
      VERCEL_ENV: "development",
      VERCEL_GIT_COMMIT_REF: FAST_OWNER_PREVIEW_BRANCH,
    },
    {
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_REF: "main",
    },
    {
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_REF: "agent/fast-owner-preview-copy",
    },
  ]) {
    assert.equal(isFastOwnerPreviewDeployment(environment), false);
  }
});

test("Owner Alpha keeps the existing explicit flag and adds only the exact Preview path", async () => {
  const access = await read("lib/review-os/owner-alpha-practice-access.ts");

  assert.match(access, /process\.env\[OWNER_ALPHA_PRACTICE_FLAG\] === "true"/);
  assert.match(access, /isFastOwnerPreviewDeployment\(\)/);
  assert.match(access, /isAllowedAdminEmail\(session\.email\)/);
  assert.match(access, /!session\.isAuthenticated \|\| !session\.userId/);
});

test("fast Owner Preview rejects signup and billing mutations before request parsing", async () => {
  const [signup, checkout, subscription] = await Promise.all([
    read("app/api/auth/sign-up/route.ts"),
    read("app/api/inverge/checkout/route.ts"),
    read("app/api/inverge/subscription/route.ts"),
  ]);

  for (const source of [signup, checkout, subscription]) {
    const guardIndex = source.indexOf("isFastOwnerPreviewDeployment()");
    const parseIndex = Math.min(
      ...[
        "request.json()",
        "request.json().catch",
        "requireRequestUserId(request)",
      ]
        .map((needle) => source.indexOf(needle))
        .filter((index) => index >= 0),
    );

    assert.ok(guardIndex >= 0);
    assert.ok(parseIndex >= 0);
    assert.ok(guardIndex < parseIndex);
    assert.match(
      source.slice(guardIndex, parseIndex),
      /error: "not_found"[\s\S]*status: 404/,
    );
  }
});

test("fast Owner Preview boundary is wired into the default node suite", async () => {
  const runner = await read("scripts/run-node-tests.mjs");

  assert.match(runner, /tests\/fast-owner-preview-boundary\.test\.mjs/);
});

test("readiness endpoint discloses environment booleans only", async () => {
  const source = await read("app/api/preview/fast-owner-status/route.ts");

  assert.match(source, /isFastOwnerPreviewDeployment\(\)/);
  assert.match(source, /vajcduseyicjhyhrclax\.supabase\.co/);
  assert.match(source, /ownerAllowlistExactlyOne/);
  assert.match(source, /selectedDeploymentIsPreview/);
  assert.match(source, /status: ready \? 200 : 503/);
  assert.doesNotMatch(
    source,
    /listUsers|from\("profiles"\)|isAllowedAdminEmail/,
  );
  assert.doesNotMatch(
    source,
    /NextResponse\.json\([\s\S]*?(?:ALPHA_ADMIN_EMAILS|GEMINI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY)[\s\S]*?\)/,
  );
});

test("dedicated Preview runtime acceptance is exact-head, protected, and mutation-denying", async () => {
  const workflow = await read(
    ".github/workflows/fast-owner-preview-runtime.yml",
  );

  for (const token of [
    "agent/fast-owner-preview",
    "production_environment === false",
    "x-vercel-protection-bypass",
    "/api/runtime/version",
    "/api/preview/fast-owner-status",
    "/api/auth/sign-up",
    "/api/inverge/checkout",
    "/api/inverge/subscription",
    'OWNER_ALPHA_UNIVERSAL_PRACTICE_ENABLED: "false"',
    "VERCEL_GIT_COMMIT_REF: agent/fast-owner-preview",
    "verify-owner-alpha-practice-runtime.mjs",
    "fast_owner_preview_runtime.v1",
    "owner.assertions.length !== expectedAssertions.size",
    'E2E_BASE_URL: ""',
    "actions: read",
    "git diff --quiet",
    "centralRuntimeGateFailClosed: true",
    "EXPECTED_GATE_RUN_ID",
  ]) {
    assert.match(
      workflow,
      new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }

  assert.match(workflow, /deploymentEnvironment: "Preview"/);
  assert.match(workflow, /productionEnvironment: false/);
  assert.match(workflow, /production_environment === true/);
  assert.match(workflow, /value\.draft !== true/);
  assert.match(workflow, /value\.auto_merge !== null/);
  assert.match(workflow, /--data '\{'/);
  assert.match(workflow, /credentialsCaptured: false/);
  assert.match(workflow, /rawLearnerContentCaptured: false/);
  assert.doesNotMatch(
    workflow,
    /workflow_dispatch|target=production|--prod|\bpromote\b|enable_auto_merge|merge_pull_request|gh pr merge/,
  );
});
