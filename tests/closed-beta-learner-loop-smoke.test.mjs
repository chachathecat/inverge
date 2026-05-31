import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import { calculateFromAccountingParseResult, normalizeAccountingParseResultFromAi } from "../lib/review-os/accounting-template-engine.ts";
import { buildCaptureLearningSignal } from "../lib/review-os/capture-learning-signals.ts";
import { sanitizeLearningSignalMetadata, sanitizeReferenceRequest } from "../lib/review-os/data-boundary.ts";
import {
  buildFirstOxConceptCardPayload,
  buildFirstOxLearningSignalInput,
  evaluateFirstOxAttempt,
  normalizeFiveChoiceItemToStatements,
  resolveFirstOxLearningSignalKind,
} from "../lib/review-os/first-ox-engine.ts";
import { buildFirstToSecondMigrationSnapshot, buildSecondModeMigrationLearningSignal } from "../lib/review-os/mode-migration.ts";
import { findQuestionReferencesForLearningItem } from "../lib/review-os/question-reference.ts";
import { buildSecondAnswerRewriteSignal, getSecondCasioKeystrokeMapping } from "../lib/review-os/second-answer-rewrite.ts";
import { sanitizeCaptureTelemetryMetadata } from "../lib/review-os/telemetry-sanitizer.ts";
import { buildTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";

const read = (file) => readFileSync(file, "utf8");
const serialize = (value) => JSON.stringify(value);
const RAW_TOKENS = ["학습자 OCR 원문", "학습자 답안 원문", "문제 원문 전문", "다시쓴 문단 원문"];
const FORBIDDEN_LEARNER_COPY = ["공식 채점", "합격 판정", "확정 점수", "모범답안 확정", "pass/fail", "paywall", "결제 먼저"];

function assertNoRawLeak(value) {
  const text = serialize(value);
  for (const token of RAW_TOKENS) assert.equal(text.includes(token), false, `raw token leaked: ${token}`);
  ["rawOcrText", "raw_ocr_text", "rawQuestionText", "rawAnswerText", "userAnswerText", "rewriteParagraph", "problemText"].forEach((key) => {
    assert.equal(text.includes(`\"${key}\"`), false, `raw key leaked: ${key}`);
  });
}

async function collectFiles(dir, predicate = () => true) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(full, predicate);
    return entry.isFile() && predicate(full) ? [full] : [];
  }));
  return nested.flat();
}

test("closed beta QA checklist exists and covers critical beta flows", () => {
  assert.equal(existsSync("docs/inverge-closed-beta-qa.md"), true);
  const doc = read("docs/inverge-closed-beta-qa.md");
  [
    "Access / onboarding",
    "Capture-to-Note",
    "Today Plan / Review Queue",
    "1차 O/X",
    "Accounting/Economics Template",
    "2차 Rewrite / CASIO",
    "Reference Context / Question Archive",
    "1차 → 2차 Mode Migration",
    "Data Boundary",
    "npm run check:closed-beta-readiness",
    "Playwright is not required",
    "감정평가사 1차",
    "감정평가사 2차",
  ].forEach((phrase) => assert.ok(doc.includes(phrase), `missing QA phrase: ${phrase}`));
});

test("access/onboarding route sources keep invite-only learner access and admin boundaries", async () => {
  const layout = read("app/app/layout.tsx");
  assert.ok(layout.includes("if (!access?.allowed)"));
  assert.ok(layout.includes("아직 초대 승인 전입니다."));
  assert.ok(layout.includes("감정평가사 closed beta"));
  assert.ok(layout.includes("/app에서 바로 이어서 사용할 수 있습니다."));

  const repository = read("lib/review-os/repository.ts");
  assert.ok(repository.includes('allowed: inviteStatus === "invited" || inviteStatus === "active"'));
  assert.ok(repository.includes('invite_status: isAllowlisted(email) ? "active" : "pending"'));
  assert.ok(repository.includes("Routine access checks must never reset invite/entitlement state"));

  const adminPages = await collectFiles("app/admin", (file) => file.endsWith("page.tsx"));
  for (const file of adminPages) {
    const source = read(file);
    assert.ok(source.includes("hasAdminPageAccess") || source.includes("isAllowedAdminEmail"), `${file} missing page access guard`);
  }

  const adminRoutes = await collectFiles("app/api/admin", (file) => file.endsWith("route.ts"));
  for (const file of adminRoutes) {
    const source = read(file);
    assert.ok(source.includes("requireAdminRouteSession"), `${file} missing admin API guard import/use`);
    for (const match of source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)[^{]+\{([\s\S]*?)(?=\n}\n\nexport|\n}\n?$)/g)) {
      assert.ok(match[2].includes("requireAdminRouteSession"), `${file} ${match[1]} missing admin session check`);
    }
  }

  const learnerSources = ["app/app/page.tsx", "app/app/layout.tsx", "components/review-os/app-shell.tsx"].map(read).join("\n");
  ["/admin", "/instructor/second-grading", "/studio", "/pricing", "/checkout", "/exams/archive"].forEach((href) => {
    assert.equal(learnerSources.includes(href), false, `learner shell exposes ${href}`);
  });
});

test("capture-to-note supports mobile multipage/PDF fallback and saves safe derived metadata", () => {
  const source = read("components/review-os/capture-form.tsx");
  ["capture=\"environment\"", "accept=\"image/*\"", "multiple", "accept=\"application/pdf\"", "PDF 내용은 직접 붙여넣어 주세요.", "OCR 결과 확인 (편집 가능", "lowConfidenceFlag", "pageCount"].forEach((phrase) => {
    assert.ok(source.includes(phrase), `missing capture source phrase: ${phrase}`);
  });
  assert.ok(source.includes("Textarea"), "OCR output should be editable before save");
  assert.ok(source.includes("overflow-x-hidden"), "critical capture page should guard mobile overflow");

  const firstSignal = buildCaptureLearningSignal({
    itemId: "capture-beta-1",
    examName: "감정평가사 1차",
    subject: "회계학",
    sourceType: "image",
    confidence: "낮음",
    biggestGap: "숫자 조건 확인 필요",
    nextAction: "숫자 2개를 다시 대입",
    rawOcrText: "학습자 OCR 원문",
    rawQuestionText: "문제 원문 전문",
    rawAnswerText: "학습자 답안 원문",
    pageCount: 2,
    lowConfidenceFlag: true,
    captureQualityIssue: "low_ocr_confidence",
    createdFromCapture: true,
  });
  assert.equal(firstSignal.examMode, "감정평가사 1차");
  assertNoRawLeak(firstSignal.metadataJson);

  const telemetry = sanitizeCaptureTelemetryMetadata({
    event: "capture_saved",
    raw_ocr_text: "학습자 OCR 원문",
    nested: { rawAnswerText: "학습자 답안 원문", safe: { pageCount: 2 } },
  });
  assert.deepEqual(telemetry.nested, { safe: { pageCount: 2 } });
  assertNoRawLeak(telemetry);
});

test("today plan and review queue are capped, collapsed, action-oriented, and score-claim free", () => {
  const tasks = buildTodayPlanTasks({
    mode: "second",
    now: new Date("2026-05-31T00:00:00.000Z"),
    queue: Array.from({ length: 5 }, (_, index) => ({
      queueId: `q-${index}`,
      itemId: `capture-second-${index}`,
      examName: "감정평가사 2차",
      subjectLabel: "감정평가이론",
      problemTitle: `시장가치 논점 ${index}`,
      topicTag: "시장가치",
      mistakeType: "논점 누락",
      reviewReason: "rewrite 후속",
      priorityScore: 90 - index,
      dueAt: "2026-05-30T00:00:00.000Z",
      recurrenceCount: 1,
      confidence: "중간",
      timeSpentSeconds: 600,
      createdFromCapture: true,
      itemCreatedAt: "2026-05-30T00:00:00.000Z",
    })),
  });
  assert.equal(tasks.length, 3);
  assert.ok(tasks.every((task) => task.source_label === "오늘 기록 기반"));
  assert.ok(tasks.every((task) => task.one_next_action && task.primary_cta?.label));

  const appPage = read("app/app/page.tsx");
  assert.ok(appPage.includes("<QuietDetails"));
  assert.ok(appPage.includes("questionReferenceHintsByTaskId"));
  assert.ok(appPage.includes("slice(0, 3)"));
  FORBIDDEN_LEARNER_COPY.forEach((phrase) => assert.equal(appPage.includes(phrase), false, `forbidden Today Plan copy: ${phrase}`));
});

test("1차 O/X shows one statement, suppresses correct+certain floods, and creates safe friction signals", () => {
  const [statement] = normalizeFiveChoiceItemToStatements({
    id: "civil-law-1",
    subject: "민법",
    stem: "대리권 문제",
    choices: ["① 무권대리 행위는 항상 무효이다."],
    expectedOxByChoice: ["X"],
    topicCandidate: "대리권",
    conceptCandidate: "무권대리",
  });
  const correctCertain = evaluateFirstOxAttempt(statement, "X", "certain", "2026-05-31T00:00:00.000Z");
  assert.equal(resolveFirstOxLearningSignalKind(correctCertain), "none");
  assert.equal(buildFirstOxLearningSignalInput(statement, correctCertain), null);

  const wrong = evaluateFirstOxAttempt(statement, "O", "confused", "2026-05-31T00:00:00.000Z");
  const signal = buildFirstOxLearningSignalInput(statement, wrong);
  assert.equal(resolveFirstOxLearningSignalKind(wrong), "wrong_answer_retry");
  assert.ok(signal);
  assert.ok(["retry", "cloze_review", "concept_review"].includes(signal.nextTaskType));
  assertNoRawLeak(signal.metadataJson);

  const conceptCard = buildFirstOxConceptCardPayload(statement, wrong);
  assert.ok(conceptCard);
  assert.equal(conceptCard.official_answer_authority, false);

  const ui = read("components/review-os/first-ox/first-ox-practice-client.tsx");
  ["선지 하나씩만 판단합니다", "해설은 답한 뒤에만 열립니다", "알고 맞힌 선지는 복습 큐를 늘리지 않았습니다", "O", "X", "모름"].forEach((phrase) => assert.ok(ui.includes(phrase), `missing O/X UI phrase: ${phrase}`));
  assert.ok(ui.includes("current = statements[index]"));
  assert.ok(read("components/review-os/smart-cloze-review.tsx").includes("빈칸 회상"));
});

test("accounting/economics templates calculate deterministically and degrade safely", () => {
  const supported = calculateFromAccountingParseResult({
    subject: "회계학",
    templateId: "accounting_ppe_depreciation",
    confidence: 0.95,
    extractedInputs: { cost: 600000, salvageValue: 100000, usefulLifeYears: 5 },
    extractedLabels: ["유형자산", "취득원가", "잔존가치", "내용연수"],
    needsHumanConfirmation: false,
  }, true);
  assert.equal(supported.validation.ok, true);
  assert.equal(supported.calculation?.resultValue, 100000);
  assert.equal(supported.calculation?.source, "deterministic_template");

  const unsupported = normalizeAccountingParseResultFromAi({ subject: "경제학", templateId: "unknown_template", confidence: 0.9, extractedInputs: {}, extractedLabels: [] });
  const unsupportedResult = calculateFromAccountingParseResult(unsupported, true);
  assert.equal(unsupportedResult.validation.ok, false);
  assert.equal(unsupportedResult.validation.calculationRisk, "unsupported_template");
  assert.equal(unsupportedResult.calculation, null);

  const invalid = calculateFromAccountingParseResult({
    subject: "경제학",
    templateId: "economics_elasticity_basic",
    confidence: 0.9,
    extractedInputs: { quantityBefore: 100, quantityAfter: 120, priceBefore: 10, priceAfter: 10 },
    extractedLabels: ["수요량", "가격", "가격탄력성"],
    needsHumanConfirmation: false,
  }, true);
  assert.equal(invalid.validation.calculationRisk, "invalid_input");
  assert.equal(invalid.calculation, null);

  const aiFinal = normalizeAccountingParseResultFromAi({
    subject: "회계학",
    templateId: "accounting_ppe_depreciation",
    confidence: 0.95,
    extractedInputs: { cost: 600000, salvageValue: 100000, usefulLifeYears: 5 },
    extractedLabels: ["유형자산", "취득원가", "잔존가치", "내용연수"],
    finalAnswerText: "정답은 999,999원입니다.",
  });
  assert.equal("finalAnswerText" in aiFinal, false);
  assert.equal(calculateFromAccountingParseResult(aiFinal, true).calculation?.resultValue, 100000);
});

test("2차 rewrite/CASIO keeps answer separation, one gap/action, and no grading claims", () => {
  const signal = buildSecondAnswerRewriteSignal({
    caseSummary: "수익환원법 사례",
    myAnswerSummary: "환원이율 검토가 약함",
    missingIssue: "환원이율 근거 누락",
    weakStructurePoint: "계산 근거와 결론 연결 부족",
    rewriteInstruction: "환원이율 근거를 첫 문단에 보강",
    supportedCalculatorTemplateId: "appraisal_income_capitalization",
  });
  assert.equal(signal.missingIssueCandidate, "환원이율 근거 누락");
  assert.equal(signal.nextRewriteAction, "10분 다시 쓰기");
  assert.deepEqual(signal.casioKeystrokes, ["MENU", "1:RUN-MAT", "AC/ON", "순영업소득", "÷", "환원이율", "EXE"]);
  assert.notEqual(signal.userAnswerSummary, signal.rewriteInstruction);

  const fallback = getSecondCasioKeystrokeMapping("unsupported-template");
  assert.equal(fallback.supportedCalculatorTemplateId, null);
  assert.equal(fallback.casioKeystrokes, null);
  assert.ok(fallback.casioUnsupportedMessage.includes("지원되는 계산 템플릿"));

  const source = read("components/review-os/today-session-runner.tsx") + read("lib/review-os/second-answer-rewrite.ts") + read("components/review-os/capture-form.tsx");
  ["가장 큰 간극", "문단 1개 다시쓰기", "내 답안 요약", "지원되는 계산 템플릿"].forEach((phrase) => assert.ok(source.includes(phrase), `missing rewrite phrase: ${phrase}`));
  ["공식 채점", "모범답안 확정", "확정 점수", "합격 판정"].forEach((phrase) => assert.equal(source.toLowerCase().includes(phrase.toLowerCase()), false));
});

test("reference context and question archive are optional metadata-only hints", async () => {
  const hints = await findQuestionReferencesForLearningItem({
    examMode: "second",
    subject: "감정평가실무",
    topicCandidate: "수익방식",
    conceptCandidate: "직접환원",
    mistakeType: "단위 실수",
    rawOcrText: "학습자 OCR 원문",
    rawProblemText: "문제 원문 전문",
    userAnswerText: "학습자 답안 원문",
    safeSkeletonIds: ["appraisal_income_capitalization"],
  });
  assert.ok(hints.length > 0);
  assert.ok(hints.every((hint) => hint.rawTextAvailable === false));
  assert.ok(hints.every((hint) => !("rawText" in hint)));
  assertNoRawLeak(hints);

  const request = sanitizeReferenceRequest({ examMode: "second", subject: "감정평가이론", taskType: "second_answer_rewrite", rawOcrText: "학습자 OCR 원문", rewriteParagraph: "다시쓴 문단 원문", safeSkeletonIds: ["safe-1"] });
  assertNoRawLeak(request);

  const appPage = read("app/app/page.tsx");
  assert.ok(appPage.includes("<QuietDetails"));
  assert.equal(appPage.includes("/exams/archive"), false);
  const references = await collectFiles("reference_corpus/question_archive", (file) => file.endsWith(".json"));
  for (const file of references) {
    const json = read(file);
    ["rawText", "problemText", "rawProblemText", "userAnswerText", "rawOcrText"].forEach((field) => assert.equal(json.includes(`\"${field}\"`), false, `${file} contains ${field}`));
  }
});

test("manual 1차 to 2차 migration archives first history and makes second rewrite the next action", () => {
  const snapshot = buildFirstToSecondMigrationSnapshot({
    firstItems: [{
      id: "first-item", userId: "u1", examName: "감정평가사 1차", subjectLabel: "민법", sourceType: "manual", correctAnswer: "X", userAnswer: "O", confidence: "낮음", dedupeKey: "d", processingStatus: "completed", rawPayload: {}, derivedPayload: { conceptCandidate: "대리권 요건", rawQuestionText: "문제 원문 전문" }, tags: [], recurrence: null, reviewQueue: null, conceptCard: { concept_candidate: "대리권 요건", reviewStage: "빈칸" }, createdAt: "2026-05-31T00:00:00.000Z", updatedAt: "2026-05-31T00:00:00.000Z",
    }],
    firstQueue: [{ queueId: "q1", itemId: "first-item", examName: "감정평가사 1차", subjectLabel: "민법", problemTitle: "대리권", topicTag: "대리권", mistakeType: "요건 누락", reviewReason: "복습", priorityScore: 90, dueAt: "2026-05-30T00:00:00.000Z", recurrenceCount: 1, confidence: "낮음", timeSpentSeconds: null, createdFromCapture: false, itemCreatedAt: "2026-05-30T00:00:00.000Z" }],
    firstLearningSignals: [],
    migratedAt: "2026-05-31T00:00:00.000Z",
  });
  assert.equal(snapshot.archivedMode, "first");
  assert.equal(snapshot.activeMode, "second");
  assert.equal(snapshot.preservedHistory.firstOxAttempts, "preserved_in_first_mode");
  assertNoRawLeak(snapshot);

  const migrationSignal = { ...buildSecondModeMigrationLearningSignal(snapshot), id: "migration", userId: "u1", createdAt: "2026-05-31T00:00:00.000Z" };
  assert.equal(migrationSignal.nextTaskType, "second_answer_rewrite");
  const [task] = buildTodayPlanTasks({ mode: "second", queue: [], items: [], learningSignals: [migrationSignal], now: new Date("2026-05-31T01:00:00.000Z") });
  assert.equal(task.task_type, "second_answer_rewrite");
  assert.equal(task.source_label, "2차 전환 기반");

  const ui = read("components/review-os/mode-migration-confirmation.tsx") + read("app/app/mode-migration/page.tsx");
  ["직접 전환", "보관", "2차 review queue 중심"].forEach((phrase) => assert.ok(ui.includes(phrase), `missing migration copy: ${phrase}`));
  ["합격 판정", "공식 결과", "pass/fail"].forEach((phrase) => assert.equal(ui.includes(phrase), false));
});

test("data-boundary sanitizers remove raw keys recursively while preserving safe learning metadata", () => {
  const telemetry = sanitizeCaptureTelemetryMetadata({ rawQuestionText: "문제 원문 전문", nested: { raw_ocr_text: "학습자 OCR 원문", safe: { taskType: "retry" } } });
  assert.deepEqual(telemetry, { nested: { safe: { taskType: "retry" } } });

  const metadata = sanitizeLearningSignalMetadata({ examMode: "감정평가사 2차", subject: "감정평가실무", rawAnswerText: "학습자 답안 원문", rewriteParagraph: "다시쓴 문단 원문", missingIssueCandidate: "논점 누락", nextTaskType: "rewrite" });
  assert.equal(metadata.examMode, "감정평가사 2차");
  assert.equal(metadata.missingIssueCandidate, "논점 누락");
  assertNoRawLeak(metadata);
});
