import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const globals = readFileSync("app/globals.css", "utf8");

const learnerPublicFiles = [
  "app/globals.css",
  "components/inverge/front-page.tsx",
  "components/inverge/front-page-hero-animation.tsx",
  "components/review-os/capture-form.tsx",
  "app/answer-review/answer-review-client.tsx",
].map((file) => readFileSync(file, "utf8"));

test("globals.css contains the refined focus color tokens", () => {
  [
    "--bg-canvas: #faf8f3",
    "--bg-subtle: #f3f6f8",
    "--bg-elevated: #fffdf8",
    "--border-subtle: #e3e8ef",
    "--border-strong: #cfd8e3",
    "--text-primary: #101828",
    "--brand-900: #10233f",
  ].forEach((token) => {
    assert.ok(globals.includes(token), `Missing token: ${token}`);
  });
});

test("globals.css does not contain newly introduced bright colors", () => {
  ["pink", "salmon", "fuchsia", "lime", "neon"].forEach((token) => {
    assert.equal(globals.toLowerCase().includes(token), false, `Unexpected bright color token found: ${token}`);
  });
});

test("globals.css preserves dark mode and focus token hooks", () => {
  ["[data-theme=\"dark\"]", "--primary", "--primary-hover", "--primary-soft", "--shadow-focus", "focus-visible"].forEach((token) => {
    assert.ok(globals.includes(token), `Missing required token/hook: ${token}`);
  });
});

test("guardrails: no official grading/pass-fail claims in learner/public files", () => {
  const joined = learnerPublicFiles.join("\n").toLowerCase();
  ["공식 채점", "합격 판정", "확정 점수", "모범답안 확정", "official grader", "pass/fail judge"].forEach((phrase) => {
    assert.equal(joined.includes(phrase.toLowerCase()), false, `Forbidden phrase found: ${phrase}`);
  });
});
