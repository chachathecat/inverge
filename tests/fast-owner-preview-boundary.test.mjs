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
      ...["request.json()", "request.json().catch", "requireRequestUserId(request)"]
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
