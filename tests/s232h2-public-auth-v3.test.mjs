import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const landing = read("components/inverge/front-page.tsx");
const preview = read("components/inverge/front-page-hero-animation.tsx");
const login = read("app/(auth)/login/page.tsx");
const authForm = read("components/shared/auth-form.tsx");

test("S232H.2 public landing adopts the V3 route grammar without a dashboard grid", () => {
  for (const component of [
    "V3RouteFrame",
    "V3SectionHeader",
    "V3Surface",
    "V3ActionLink",
    "V3QuietDisclosure",
  ]) {
    assert.match(landing, new RegExp(component));
  }

  assert.match(landing, /width="content"/);
  assert.match(landing, /var\(--layout-page-edge\)/);
  assert.match(landing, /var\(--color-text-primary\)/);
  assert.match(landing, /divide-y divide-\[var\(--color-border-default\)\]/);
  assert.doesNotMatch(landing, /md:grid-cols-3|RefinedShell|QuietSection|RefinedBadge|buttonVariants/);
  assert.doesNotMatch(`${landing}\n${preview}`, /shadow-|gradient|rounded-full|--foreground-strong|--muted|--surface-soft|--radius-card/);
});

test("S232H.2 landing keeps one capture-first action and safety truth", () => {
  for (const phrase of [
    "/app/capture?mode=second",
    "/login?returnTo=/app/capture?mode=second",
    "답안 1개 올리기",
    "검토 예시 보기",
    "근거 확인",
    "공식 채점 아님",
    "getServerSessionUser",
    "session.authEnabled ? AUTH_CAPTURE_HREF : DEMO_CAPTURE_HREF",
  ]) {
    assert.ok(landing.includes(phrase), `missing public behavior: ${phrase}`);
  }

  assert.equal((landing.match(/data-s225x-dominant-primary-above-fold/g) ?? []).length, 1);
  assert.ok(landing.indexOf("답안 1개 올리기") < landing.indexOf("검토 예시 보기"));
  assert.match(preview, /useReducedMotion/);
  assert.match(preview, /V3Surface/);
  assert.doesNotMatch(preview, /rounded-\[var\(--radius-md\)\][\s\S]*PREVIEW_ROWS/);
});

test("S232H.2 login uses V3 layout and preserves safe mode-aware return behavior", () => {
  for (const component of ["V3RouteFrame", "V3RouteHeader", "V3Surface", "V3ActionLink"]) {
    assert.match(login, new RegExp(component));
  }

  for (const behavior of [
    "safeReturnTo",
    "value.startsWith(\"//\")",
    "parseAppraisalMode",
    "redirect(returnTo)",
    "isSupabaseConfigured",
    "selectedMode",
    "<AuthForm />",
    'href="/app?mode=second"',
  ]) {
    assert.ok(login.includes(behavior), `missing login behavior: ${behavior}`);
  }

  assert.doesNotMatch(login, /<main|shadow-|--foreground-strong|--muted|--surface|--radius-card/);
});

test("S232H.2 auth form keeps the request and redirect contract with 52px V3 controls", () => {
  for (const behavior of [
    'fetch("/api/auth/sign-in"',
    "JSON.stringify({ email, password, mode: explicitMode })",
    "sanitizeInternalReturnTo",
    "result.redirectTo",
    "window.location.assign(redirectTarget)",
    'data-testid="login-submit"',
  ]) {
    assert.ok(authForm.includes(behavior), `missing auth behavior: ${behavior}`);
  }

  assert.match(authForm, /V3ActionButton/);
  assert.equal((authForm.match(/min-h-\[var\(--control-height\)\]/g) ?? []).length, 2);
  assert.equal((authForm.match(/autoComplete=/g) ?? []).length, 2);
  assert.match(authForm, /focus:ring-2/);
  assert.match(authForm, /role=\{status === "error" \? "alert" : "status"\}/);
  assert.doesNotMatch(authForm, /components\/ui\/button|rounded-xl|--status-red|--muted|--surface/);
  assert.doesNotMatch(authForm, /defaultValue|test@|demo@/);
});
