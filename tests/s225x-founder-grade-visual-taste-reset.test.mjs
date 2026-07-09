import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const count = (text, needle) => (text.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;

const renderedSurfaceFiles = [
  "app/page.tsx",
  "components/inverge/front-page.tsx",
  "components/inverge/front-page-hero-animation.tsx",
  "components/shared/site-header.tsx",
  "components/shared/footer.tsx",
  "components/shared/closed-beta-banner.tsx",
  "app/(auth)/login/page.tsx",
  "components/shared/auth-form.tsx",
  "components/learner/learner-ui.tsx",
  "components/review-os/app-shell.tsx",
  "app/app/page.tsx",
  "app/app/layout.tsx",
  "app/app/capture/page.tsx",
  "components/review-os/capture-form.tsx",
  "components/review-os/local-beta-note-reflection.tsx",
  "components/review-os/cognitive-learning-action-card.tsx",
  "components/review-os/trust-status-card.tsx",
  "components/review-os/feedback-button.tsx",
  "app/answer-review/page.tsx",
  "app/answer-review/answer-review-client.tsx",
  "app/app/session/page.tsx",
  "app/app/study-log/page.tsx",
  "app/app/items/[itemId]/page.tsx",
  "app/app/settings/page.tsx",
  "app/exams/archive/exam-archive-list-client.tsx",
  "app/manifest.ts",
];

const generatedLearnerCopyFiles = [
  "lib/review-os/capture-save-persistence.ts",
  "lib/review-os/cognitive-learning-actions.ts",
  "lib/review-os/answer-submission-contract.ts",
];

test("S225X removes stale rendered public and learner copy", () => {
  const rendered = renderedSurfaceFiles.map(read).join("\n");
  const combined = `${rendered}\n${generatedLearnerCopyFiles.map(read).join("\n")}`;

  for (const phrase of [
    "IV Inverge",
    "감정평가사 합격 운영 시스템",
    "감정평가사 1차·2차 학습 운영",
    "2차 합격관제 OS",
    "답안 검토실",
    "답안 검토실 데모",
    "CLOSED BETA",
    "Skeleton Framework",
    "학습 노트 초안 만들기",
    "로그인 계정 만들기",
    "계정 만들기",
    "계정 만들고 기록 저장",
    "chaminiestudio@gmail.com",
    "Today Plan:",
    "Review Queue:",
    "Notes:",
    "Today Plan candidate",
    "Review Queue candidate",
    "오늘 할 일 후보",
    "복습 후보",
    "OCR 결과는 초안입니다. 저장 전 직접 확인해 주세요.",
    "OCR/AI 정리는 초안입니다. 저장 전 직접 확인해 주세요.",
  ]) {
    assert.equal(combined.includes(phrase), false, `stale rendered copy remains: ${phrase}`);
  }
  assert.equal(rendered.includes("metadataOnly"), false, "metadataOnly must not be rendered as UI copy");
});

test("S225X landing and capture keep one dominant action marker", () => {
  const landing = read("components/inverge/front-page.tsx");
  const capture = read("components/review-os/capture-form.tsx");

  assert.equal(count(landing, "data-s225x-dominant-primary-above-fold"), 1);
  assert.equal(count(capture, "data-s225x-dominant-primary-after-input"), 1);
  assert.ok(landing.includes("답안 1개 올리기"));
  assert.ok(landing.includes("검토 예시 보기"));
  assert.ok(capture.includes("사진 찍기"));
  assert.ok(capture.includes("PDF 선택"));
  assert.ok(capture.includes("텍스트 붙여넣기"));
});

test("S225X brand, login, footer, and manifest use the Korean-native product contract", () => {
  const login = `${read("app/(auth)/login/page.tsx")}\n${read("components/shared/auth-form.tsx")}`;
  const footer = read("components/shared/footer.tsx");
  const manifest = read("app/manifest.ts");

  assert.ok(login.includes("답안길"));
  assert.ok(login.includes("초대 계정으로 시작하기"));
  assert.ok(login.includes("returnTo"));
  assert.equal(/defaultValue\s*=/.test(login), false);
  assert.equal(login.includes("chaminiestudio@gmail.com"), false);
  assert.ok(footer.includes("답안길 by Inverge · 학습 보조 초안 · 공식 채점 아님"));
  assert.ok(manifest.includes('start_url: "/app?mode=second"'));
});

test("S225X Korean wrapping utilities are available and applied to major headings", () => {
  const globals = read("app/globals.css");
  const combined = [
    read("components/inverge/front-page.tsx"),
    read("app/(auth)/login/page.tsx"),
    read("components/review-os/capture-form.tsx"),
    read("app/app/page.tsx"),
  ].join("\n");

  for (const utility of [".ko-keep", ".hero-balance", ".text-readable", ".long-token"]) {
    assert.ok(globals.includes(utility), `missing Korean wrapping utility: ${utility}`);
  }
  assert.ok(combined.includes("hero-balance ko-keep"));
  assert.ok(combined.includes("ko-keep"));
});

test("S225X allows negative safety caveats but blocks positive authority claims", () => {
  const combined = renderedSurfaceFiles.map(read).join("\n");

  assert.ok(combined.includes("공식 채점 아님"));
  assert.ok(combined.includes("학습 보조 초안"));

  for (const pattern of [
    /공식\s*채점\s*(결과|완료|확인|입니다|서비스|제공)/,
    /공식\s*모범답안/,
    /확정\s*점수\s*(결과|확인|입니다|제공)/,
    /합격\s*(가능성|확률|보장)/,
    /AI\s*최종\s*판정/,
    /정답\s*보장/,
    /official grader/i,
    /pass\/fail judge/i,
  ]) {
    assert.doesNotMatch(combined, pattern);
  }
});
