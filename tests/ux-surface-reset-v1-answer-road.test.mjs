import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const count = (text, needle) => (text.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;

test("UX Surface Reset v1 defines the requested shared visual tokens", () => {
  const globals = read("app/globals.css");
  const cards = read("components/ui/card.tsx");

  for (const token of [
    "--bg-canvas: #f7f4ee",
    "--bg-surface: #ffffff",
    "--text-primary: #111827",
    "--text-secondary: #6b7280",
    "--border-subtle: #e7e2d8",
    "--navy: #0b1b34",
    "--softBlue: #eff6ff",
    "--successSoft: #eaf7ef",
    "--warningSoft: #fff7e6",
    "--radius-card: 20px",
    "--radiusButton: 999px",
    "--cardShadow: 0 16px 40px rgba(15, 23, 42, 0.06)",
  ]) {
    assert.ok(globals.includes(token), `missing token: ${token}`);
  }

  assert.ok(cards.includes("rounded-[var(--radius-card,20px)]"));
  assert.ok(cards.includes("shadow-[var(--shadow-soft)]"));
});

test("public brand hierarchy and landing first screen match Answer Road reset", () => {
  const header = read("components/shared/site-header.tsx");
  const landing = read("components/inverge/front-page.tsx");
  const page = read("app/page.tsx");

  assert.ok(page.includes("<FrontPage />"));
  assert.equal(page.includes("ClosedBetaBanner"), false);

  for (const phrase of [
    "답안길",
    "by Inverge",
    "감정평가사 2차 답안 훈련 OS",
    "/login?returnTo=/app/capture?mode=second",
    "/app/capture?mode=second",
    "오늘 쓴 답안에서",
    "가장 먼저 고칠 문단을 찾습니다.",
    "오늘 답안 올리기",
    "데모 먼저 보기",
    "AI가 찾은 가장 큰 약점",
    "쟁점은 잡았지만 기준/법리 문단이 약합니다.",
    "오늘 다시 쓸 문단",
    "민법 제109조의 중요 부분 착오와 중대한 과실 예외를 분리해 쓰기",
    "전체 Skeleton Framework 보기",
  ]) {
    assert.ok(`${header}\n${landing}`.includes(phrase), `missing landing/header phrase: ${phrase}`);
  }

  assert.doesNotMatch(`${header}\n${landing}`, /IV|감정평가사 합격 운영 시스템|2차 합격관제 OS/);
  assert.equal(landing.includes('href="/answer-review?mode=second"'), false);
  assert.equal(header.includes('href="/answer-review?mode=second"'), false);
  assert.equal(header.includes('className="rounded-full bg-[color:var(--primary)] px-4 py-2'), false);
});

test("authenticated Today shell opens with one calm primary task card backed by real Today Plan data", () => {
  const shell = read("components/learner/learner-ui.tsx");
  const home = read("app/app/page.tsx");
  const appShell = read("components/review-os/app-shell.tsx");
  const layout = read("app/app/layout.tsx");
  const selector = read("components/review-os/today-first-subject-selector.tsx");

  for (const phrase of [
    "답안길",
    "by Inverge",
    "감정평가사 2차 답안 훈련 OS",
    "오늘은 이것만 하면 됩니다",
    "todayPlanTasks.slice(0, TODAY_PLAN_MAX_PRIMARY_TASKS)",
    "오늘 한 것 1개를 올리면 첫 계획을 만들 수 있습니다.",
    "예상 시간",
    "계획 생성 후 표시",
    "오늘 공부 시작",
  ]) {
    assert.ok(`${shell}\n${home}`.includes(phrase), `missing Today reset phrase: ${phrase}`);
  }

  assert.doesNotMatch(home, /어제 쓴 법규 문단 1개 다시쓰기|실무 계산형 답안 1개 올리기|민법 착오 취소 쟁점 10초 복습|28분/);
  assert.ok(shell.includes("bg-[color:var(--brand-900)]"));
  assert.equal(shell.includes("mode: AppraisalMode;"), false);
  assert.equal(appShell.includes("mode: AppraisalMode;"), false);
  assert.equal(layout.includes("mode={mode}"), false);
  assert.ok(shell.includes("intentionally exposes only the second-round Answer Road OS"));
  assert.ok(home.includes("data-ux-surface-reset-primary-card"));
  assert.ok(selector.includes("quietPrimary"));
  assert.doesNotMatch(shell, /2차 합격관제 OS|mode=first|1차/);
});

test("capture flow starts as a four-step wizard with one Trust Card", () => {
  const capturePage = read("app/app/capture/page.tsx");
  const capture = read("components/review-os/capture-form.tsx");
  const combined = `${capturePage}\n${capture}`;

  for (const phrase of [
    "입력",
    "OCR/텍스트 확인",
    "가장 큰 약점",
    "오늘 계획 반영",
    "오늘 한 것 올리기",
    "사진, PDF, 텍스트 중 하나로 시작하세요.",
    "감정평가실무",
    "감정평가이론",
    "감정평가 및 보상법규",
    "사진 찍기",
    "PDF 선택",
    "텍스트 붙여넣기",
    "입력 내용 확인하기",
    "AI 초안",
    "OCR 초안",
    "직접 수정 가능",
    "공식 채점 아님",
    "saved-plan",
    "data-capture-plan-reflection-stage",
    "학습 노트 저장 상태",
    "Today Plan candidate",
    "Review Queue candidate",
    "오늘 할 일로 이동",
  ]) {
    assert.ok(combined.includes(phrase), `missing capture phrase: ${phrase}`);
  }

  assert.equal(count(capture, "OCR과 AI 정리는 학습 보조 초안입니다. 저장 전 직접 수정할 수 있습니다."), 1);
  assert.ok(capture.includes('if (stage === "saved-plan") return 4;'));
  assert.ok(capture.includes('setStage("saved-plan")'));
  assert.equal(capture.includes("if (savedConfirmation) {\n    return"), false);
  assert.equal(capturePage.includes("ClosedBetaBanner"), false);
  assert.doesNotMatch(capture, /OCR 결과는 초안입니다|OCR\/AI 정리는 초안입니다|학습 보조 초안입니다\. 저장 전 직접 확인/);
  assert.equal(capture.includes("학습 노트 초안 만들기"), false);
  assert.ok(capture.indexOf("사진 찍기") < capture.indexOf("선택 정보"));
  assert.ok(capture.indexOf("사진 찍기") < capture.indexOf("첨부 상태"));
  assert.ok(capture.indexOf("사진 찍기") < capture.indexOf("저장 전 캡처 품질 체크"));
});

test("login reset is invite-only, balanced, and has no prefilled test credential copy", () => {
  const page = read("app/(auth)/login/page.tsx");
  const form = read("components/shared/auth-form.tsx");

  for (const phrase of [
    "답안길",
    "오늘 쓴 답안을 내일 다시 쓸 문단으로.",
    "초대받은 감정평가사 수험생을 위한 2차 답안 훈련 OS",
    "초대 계정으로 시작하기",
    "이메일",
    "비밀번호",
    "로그인",
  ]) {
    assert.ok(`${page}\n${form}`.includes(phrase), `missing login phrase: ${phrase}`);
  }

  assert.doesNotMatch(`${page}\n${form}`, /test@|demo@|계정 만들기|1차·2차/);
});
