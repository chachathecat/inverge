import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import {
  buildFirstOxConceptCardPayload,
  buildFirstOxLearningSignalInput,
  buildFirstOxWrongAnswerItemInput,
  extractFirstExamFiveChoicesFromText,
  evaluateFirstOxAttempt,
  normalizeFiveChoiceItemToStatements,
  resolveFirstOxLearningSignalKind,
  shuffleFirstOxStatements,
} from "../lib/review-os/first-ox-engine.ts";
import { buildTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";
import { buildSmartCloze } from "../lib/review-os/smart-cloze.ts";

const choices = [
  "① 할 수 있다와 하여야 한다를 구별한다.",
  "② 원칙과 예외는 항상 같은 효과이다.",
  "③ 전부가 아니라 일부만 무효일 수 있다.",
  "④ 원시취득과 승계취득은 승계 여부로 구별된다.",
  "⑤ 인식, 측정, 평가는 회계학에서 구별된다.",
];

function statements() {
  return normalizeFiveChoiceItemToStatements({
    id: "source-1",
    subject: "민법",
    stem: "옳은 것은?",
    choices,
    expectedOxByChoice: ["O", "X", "O", "O", "O"],
    topicCandidate: "표현 함정",
    conceptCandidate: "원칙·예외",
  });
}

test("5-choice item becomes 5 independent O/X statements with trap words", () => {
  const normalized = statements();
  assert.equal(normalized.length, 5);
  assert.equal(normalized.every((item) => item.statementText.length > 0), true);
  assert.equal(normalized.some((item) => item.statementText.includes("①")), false);
  assert.ok(normalized[0].trapWords.includes("할 수 있다"));
  assert.ok(normalized[0].trapWords.includes("하여야 한다"));
});

test("practice order is not the original answer-position order", () => {
  const normalized = statements();
  const shuffled = shuffleFirstOxStatements(normalized);
  assert.deepEqual(new Set(shuffled.map((item) => item.id)), new Set(normalized.map((item) => item.id)));
  assert.notDeepEqual(shuffled.map((item) => item.id), normalized.map((item) => item.id));
});

test("incorrect/certain creates high-priority retry learning signal", () => {
  const statement = statements()[1];
  const attempt = evaluateFirstOxAttempt(statement, "O", "certain", "2026-05-30T00:00:00.000Z");
  assert.equal(attempt.result, "incorrect");
  assert.equal(resolveFirstOxLearningSignalKind(attempt), "wrong_answer_retry");
  const signal = buildFirstOxLearningSignalInput(statement, attempt);
  assert.ok(signal?.derivedTags.includes("wrong_answer_retry"));
  const item = buildFirstOxWrongAnswerItemInput(statement, attempt);
  assert.equal(item?.userReasonPreset, "선지 오독");
  assert.equal(item?.confidence, "중간");
});

test("confused creates review signal even when answer is correct", () => {
  const statement = statements()[0];
  const attempt = evaluateFirstOxAttempt(statement, "O", "confused", "2026-05-30T00:00:00.000Z");
  assert.equal(attempt.result, "correct");
  assert.equal(resolveFirstOxLearningSignalKind(attempt), "weak_confidence");
  const signal = buildFirstOxLearningSignalInput(statement, attempt);
  assert.ok(signal?.derivedTags.includes("weak_confidence"));
  assert.equal(signal?.nextTaskType, "cloze_review");
});

test("correct/certain does not create unnecessary review item", () => {
  const statement = statements()[0];
  const attempt = evaluateFirstOxAttempt(statement, "O", "certain", "2026-05-30T00:00:00.000Z");
  assert.equal(attempt.result, "correct");
  assert.equal(resolveFirstOxLearningSignalKind(attempt), "none");
  assert.equal(buildFirstOxLearningSignalInput(statement, attempt), null);
  assert.equal(buildFirstOxWrongAnswerItemInput(statement, attempt), null);
});

test("unknown creates needs-concept-review signal", () => {
  const statement = statements()[0];
  const attempt = evaluateFirstOxAttempt(statement, "unknown", "unknown", "2026-05-30T00:00:00.000Z");
  assert.equal(resolveFirstOxLearningSignalKind(attempt), "needs_concept_review");
  const signal = buildFirstOxLearningSignalInput(statement, attempt);
  assert.equal(signal?.nextTaskType, "concept_review");
});

test("Today Plan can surface first_ox_retry and route the primary CTA to O/X practice", () => {
  const statement = statements()[1];
  const attempt = evaluateFirstOxAttempt(statement, "O", "certain", "2026-05-30T00:00:00.000Z");
  const signal = {
    ...buildFirstOxLearningSignalInput(statement, attempt),
    id: "sig-1",
    userId: "u1",
    createdAt: "2026-05-30T00:00:00.000Z",
  };
  const tasks = buildTodayPlanTasks({ mode: "first", queue: [], items: [], learningSignals: [signal], now: new Date("2026-05-30T00:10:00.000Z") });
  assert.equal(tasks[0]?.task_type, "first_ox_retry");
  assert.equal(tasks[0]?.source_label, "1차 O/X 기반");
  assert.deepEqual(tasks[0]?.primary_cta, { label: "5분 O/X 재시도", hrefKind: "first_ox" });
});


test("incapacity and nullity statement prioritizes civil-law rule over principle expression", () => {
  const statement = normalizeFiveChoiceItemToStatements({
    id: "incapacity-nullity",
    subject: "민법",
    stem: "옳은 것은?",
    choices: ["② 원칙적으로 의사무능력자의 법률행위는 무효이다."],
    expectedOxByChoice: ["O"],
    topicCandidate: "법률행위",
    conceptCandidate: "요건·효과·예외",
  })[0];
  const attempt = evaluateFirstOxAttempt(statement, "unknown", "unknown", "2026-05-30T00:00:00.000Z");
  const concept = buildFirstOxConceptCardPayload(statement, attempt);

  assert.equal(concept?.coreRule, "의사능력이 없는 상태의 법률행위는 무효로 판단합니다.");
  assert.equal(concept?.minimalExplanation, "주체가 의사무능력자인지 먼저 보고, 법률행위의 효과가 무효인지 확인합니다.");
  assert.equal(concept?.examTrapExplanation, "원칙적으로 같은 표현보다 먼저 의사능력 유무와 무효 효과를 확인하세요.");
  assert.ok(concept?.trapWords.includes("무효"));
  assert.ok(concept?.trapWords.includes("원칙적으로"));
  assert.equal(concept?.trapWords.includes("원칙"), false);
  assert.equal(JSON.stringify(concept).includes("요건·효과·예외 기준 1개를 확인합니다."), false);
});

test("scope trap beats generic nullity unless incapacity special case is explicit", () => {
  const statement = normalizeFiveChoiceItemToStatements({
    id: "partial-nullity-scope",
    subject: "민법",
    stem: "옳은 것은?",
    choices: ["③ 전부가 아니라 일부만 무효일 수 있다."],
    expectedOxByChoice: ["O"],
    topicCandidate: "법률행위",
    conceptCandidate: "무효 범위",
  })[0];
  const attempt = evaluateFirstOxAttempt(statement, "unknown", "unknown", "2026-05-30T00:00:00.000Z");
  const concept = buildFirstOxConceptCardPayload(statement, attempt);

  assert.deepEqual(concept?.trapWords, ["전부", "일부", "무효"]);
  assert.equal(concept?.coreRule, "효과가 전부에 미치는지 일부에만 미치는지 범위를 먼저 자릅니다.");
  assert.equal(concept?.minimalExplanation, "전부와 일부는 결론의 범위를 바꾸는 표현입니다.");
  assert.equal(concept?.examTrapExplanation, "부분 효력을 전체 효력처럼 읽으면 범위 판단에서 O/X가 흔들립니다.");
  assert.equal(JSON.stringify(concept).includes("처음부터 효력이 없는지"), false);
});

test("principle expression trap remains prioritized over generic nullity", () => {
  const statement = normalizeFiveChoiceItemToStatements({
    id: "principle-generic-nullity",
    subject: "민법",
    stem: "옳은 것은?",
    choices: ["④ 원칙적으로 일부 조항은 무효가 될 수 있다."],
    expectedOxByChoice: ["O"],
    topicCandidate: "법률행위",
    conceptCandidate: "원칙·예외",
  })[0];
  const attempt = evaluateFirstOxAttempt(statement, "unknown", "unknown", "2026-05-30T00:00:00.000Z");
  const concept = buildFirstOxConceptCardPayload(statement, attempt);

  assert.ok(concept?.trapWords.includes("원칙적으로"));
  assert.ok(concept?.trapWords.includes("무효"));
  assert.equal(concept?.coreRule, "절대 표현인지, 예외가 붙은 원칙 표현인지 먼저 확인합니다.");
  assert.equal(JSON.stringify(concept).includes("의사능력이 없는 상태"), false);
});

test("concept popup separates nullity legal concept from principle expression trap and dynamic labels", async () => {
  const source = await readFile("components/review-os/first-ox/first-ox-practice-client.tsx", "utf8");
  ["핵심 법률개념", "표현 함정", "왜 틀렸는지", "왜 흔들렸는지", "판단 기준 확인"].forEach((token) => assert.ok(source.includes(token), token));
  assert.match(source, /if \(trapWords\.includes\("무효"\)\) return "무효"/);
  assert.match(source, /if \(trapWords\.includes\("원칙적으로"\)\) return "원칙적으로"/);
  assert.match(source, /attempt\.result === "incorrect"/);
  assert.match(source, /attempt\.certainty === "confused"/);
  assert.ok(source.includes("의사능력 유무와 무효 효과"));
  assert.equal(source.includes("요건·효과·예외 기준 1개를 확인합니다."), false);
});

test("first-ox concept-review signal still returns to the O/X statement surface", () => {
  const statement = statements()[0];
  const attempt = evaluateFirstOxAttempt(statement, "unknown", "unknown", "2026-05-30T00:00:00.000Z");
  const signal = {
    ...buildFirstOxLearningSignalInput(statement, attempt),
    id: "sig-concept-1",
    userId: "u1",
    createdAt: "2026-05-30T00:00:00.000Z",
  };
  const tasks = buildTodayPlanTasks({ mode: "first", queue: [], items: [], learningSignals: [signal], now: new Date("2026-05-30T00:10:00.000Z") });
  assert.equal(tasks[0]?.task_type, "concept_review");
  assert.equal(tasks[0]?.source_label, "1차 O/X 기반");
  assert.equal(tasks[0]?.primary_cta.hrefKind, "first_ox");
});

test("app resolves first O/X task CTA hrefs to the dedicated route", async () => {
  await access("app/app/first/ox/page.tsx");
  const homeSource = await readFile("app/app/page.tsx", "utf8");
  assert.match(homeSource, /hrefKind === "first_ox"\) return "\/app\/first\/ox"/);
});

test("learner UI hides instructor route and raw internal fields while showing trap highlights after answer", async () => {
  const source = await readFile("components/review-os/first-ox/first-ox-practice-client.tsx", "utf8");
  assert.equal(source.includes("/instructor"), false);
  assert.equal(/rawPayload|derivedPayload|metadataJson|official_answer_authority/.test(source), false);
  assert.match(source, /highlightTrapWords/);
  assert.match(source, /currentAttempt \? highlightTrapWords/);
});

test("mobile surface avoids horizontal overflow and keeps one statement card", async () => {
  const source = await readFile("components/review-os/first-ox/first-ox-practice-client.tsx", "utf8");
  assert.match(source, /overflow-x-hidden/);
  assert.match(source, /w-full/);
  assert.equal((source.match(/현재 선지/g) ?? []).length, 1);
});


test("wrong/confused/unknown attempts build sanitized concept popup payloads and review signals", () => {
  const [statement] = statements();
  const wrongAttempt = evaluateFirstOxAttempt(statement, "X", "certain", "2026-05-30T00:00:00.000Z");
  const confusedAttempt = evaluateFirstOxAttempt(statement, "O", "confused", "2026-05-30T00:00:00.000Z");
  const unknownAttempt = evaluateFirstOxAttempt(statement, "unknown", "unknown", "2026-05-30T00:00:00.000Z");
  const wrong = buildFirstOxConceptCardPayload(statement, wrongAttempt);
  const confused = buildFirstOxConceptCardPayload(statement, confusedAttempt);
  const unknown = buildFirstOxConceptCardPayload(statement, unknownAttempt);
  for (const [concept, attempt] of [[wrong, wrongAttempt], [confused, confusedAttempt], [unknown, unknownAttempt]]) {
    assert.ok(concept);
    assert.equal(concept.sourceType, "first_ox");
    assert.equal(concept.examMode, "감정평가사 1차");
    assert.equal(concept.subject, "민법");
    assert.equal(concept.statement_id, statement.id);
    assert.equal("originalStatement" in concept, false);
    assert.equal("rawQuestionText" in concept, false);
    assert.ok(concept.coreRule.length);
    assert.ok(concept.minimalExplanation.length);
    assert.ok(concept.examTrapExplanation.length);
    assert.ok(concept.nextReviewAction.length);
    assert.equal(concept.topic_candidate, "표현 함정");
    assert.equal(concept.concept_candidate, "원칙·예외");
    assert.equal(concept.official_answer_authority, false);
    assert.equal(concept.dueAt, "2026-05-31T00:00:00.000Z");
    assert.notEqual(buildFirstOxLearningSignalInput(statement, attempt), null);
  }
  assert.equal(confused?.reviewStage, "빈칸");
});

test("first-ox learning signal metadata and derived concept cards omit raw statement text", () => {
  const statement = statements()[1];
  const attempt = evaluateFirstOxAttempt(statement, "O", "certain", "2026-05-30T00:00:00.000Z");
  const signal = buildFirstOxLearningSignalInput(statement, attempt);
  const item = buildFirstOxWrongAnswerItemInput(statement, attempt);
  assert.ok(signal?.metadataJson.concept_card);
  assert.ok(item?.conceptCard);
  assert.equal("originalStatement" in signal.metadataJson.concept_card, false);
  assert.equal("rawQuestionText" in signal.metadataJson.concept_card, false);
  assert.equal(JSON.stringify(signal.metadataJson).includes(statement.statementText), false);
  assert.equal("originalStatement" in item.conceptCard, false);
  assert.equal("rawQuestionText" in item.conceptCard, false);
  assert.equal(JSON.stringify(item?.conceptCard).includes(statement.statementText), false);
  assert.ok(item?.rawQuestionText?.includes(statement.statementText));
});

test("correct and certain attempt has no concept popup payload", () => {
  const [statement] = statements();
  const attempt = evaluateFirstOxAttempt(statement, "O", "certain", "2026-05-30T00:00:00.000Z");
  assert.equal(buildFirstOxConceptCardPayload(statement, attempt), null);
});

test("smart cloze hides one safe trap keyword and falls back to O/X without safe candidate", () => {
  const cloze = buildSmartCloze({ statement: "원칙과 예외는 항상 같은 효과이다.", trapWords: ["항상", "원칙"] });
  assert.equal(cloze.stage, "빈칸");
  assert.equal(cloze.answer, "항상");
  assert.equal(cloze.prompt, "원칙과 예외는 ____ 같은 효과이다.");
  const fallback = buildSmartCloze({ statement: "이미 아는 문장입니다.", trapWords: ["없는키워드"] });
  assert.equal(fallback.stage, "O/X");
  assert.equal(fallback.answer, null);
});

test("confused first-ox signal can become a cloze review task with calm CTA", () => {
  const statement = statements()[0];
  const attempt = evaluateFirstOxAttempt(statement, "O", "confused", "2026-05-30T00:00:00.000Z");
  const signal = {
    ...buildFirstOxLearningSignalInput(statement, attempt),
    id: "sig-cloze-1",
    userId: "u1",
    createdAt: "2026-05-30T00:00:00.000Z",
  };
  const tasks = buildTodayPlanTasks({ mode: "first", queue: [], items: [], learningSignals: [signal], now: new Date("2026-05-30T00:10:00.000Z") });
  assert.equal(tasks[0]?.task_type, "cloze_review");
  assert.deepEqual(tasks[0]?.primary_cta, { label: "빈칸 회상", hrefKind: "session" });
});

test("concept popup copy exists but is gated after attempted answer", async () => {
  const source = await readFile("components/review-os/first-ox/first-ox-practice-client.tsx", "utf8");
  ["왜 틀렸는지", "왜 흔들렸는지", "판단 기준 확인", "핵심 법률개념", "표현 함정", "다음 행동"].forEach((token) => assert.ok(source.includes(token), token));
  assert.match(source, /currentAttempt && resolveFirstOxLearningSignalKind\(currentAttempt\) !== "none" \? <ConceptPopup/);
});

test("review queue renders Smart Cloze from user-owned item raw text without raw internal task type labels", async () => {
  const source = await readFile("components/review-os/review-queue-client.tsx", "utf8");
  assert.ok(source.includes("SmartClozeReview"));
  assert.ok(source.includes("item.rawQuestionText"));
  assert.equal(source.includes("item.conceptCard?.originalStatement"), false);
  assert.equal(/concept_review|cloze_review|nextTaskType/.test(source), false);
});

test("wrong-answer derived payload stores sanitized concept card only", async () => {
  const source = await readFile("lib/review-os/service.ts", "utf8");
  assert.match(source, /concept_card: input\.conceptCard \?\? null/);
  const conceptSource = await readFile("lib/review-os/first-ox-engine.ts", "utf8");
  assert.equal(/originalStatement:\s*statement\.statementText/.test(conceptSource), false);
});

test("O/X detail source keeps original statement prominent with precise states and retry CTA", async () => {
  const source = await readFile("app/app/items/[itemId]/page.tsx", "utf8");
  ["원문 선지", "내 선택", "기대 판단", "상태", "세부 기록 펼쳐보기", "같은 선지 다시 판단하기"].forEach((token) => assert.ok(source.includes(token), token));
  ["근거 확인 필요", "낮은 확신", "오답", "확신 오답"].forEach((token) => assert.ok(source.includes(token), token));
  assert.ok(source.includes("학습 판단 근거를 먼저 확인하는 항목입니다."));
  assert.ok(source.includes("맞혔더라도 다시 볼 가치가 있습니다."));
  assert.ok(source.includes("내 판단과 기대 판단이 달랐습니다."));
  assert.ok(source.includes("맞다고 믿은 기준이 실제 판단과 달랐습니다."));
  assert.match(source, /\/app\/first\/ox\?retryItemId=/);
});

test("first-ox concept card uses trap-specific copy and removes vague fallback", () => {
  const [dutyStatement] = statements();
  const attempt = evaluateFirstOxAttempt(dutyStatement, "X", "certain", "2026-05-30T00:00:00.000Z");
  const concept = buildFirstOxConceptCardPayload(dutyStatement, attempt);
  assert.ok(concept?.coreRule.includes("재량 표현인지 의무 표현인지"));
  assert.ok(concept?.minimalExplanation.includes("가능·재량"));

  const scopeStatement = {
    ...dutyStatement,
    id: "scope-1",
    statementText: "전부가 아니라 일부만 무효일 수 있다.",
    trapWords: ["전부", "일부", "무효"],
    conceptCandidate: undefined,
  };
  const scopeConcept = buildFirstOxConceptCardPayload(scopeStatement, { ...attempt, statementId: "scope-1" });
  assert.ok(scopeConcept?.coreRule.includes("전부에 미치는지 일부에만"));

  const fallbackStatement = { ...dutyStatement, id: "fallback-1", subject: "", topicCandidate: undefined, conceptCandidate: undefined, trapWords: [] };
  const fallback = buildFirstOxConceptCardPayload(fallbackStatement, { ...attempt, statementId: "fallback-1" });
  assert.equal(fallback?.coreRule, "정답 확정 전 임시 개념 힌트입니다. 조건 표현 1개를 먼저 확인하세요.");
  assert.equal(JSON.stringify(fallback).includes("핵심 개념 확인 기준 1개를 먼저 고정합니다."), false);
});


test("first O/X retry route consumes retryItemId and loads user-owned raw statement", async () => {
  const pageSource = await readFile("app/app/first/ox/page.tsx", "utf8");
  assert.match(pageSource, /searchParams\?: Promise<\{ retryItemId\?: string; sourceItemId\?: string \}>/);
  assert.ok(pageSource.includes("reviewOsService.getWrongAnswerDetail(userId, email, retryItemId)"));
  assert.ok(pageSource.includes("detail.item.userId !== userId"));
  assert.ok(pageSource.includes("isFirstOxRetryItem(detail.item)"));
  assert.ok(pageSource.includes("splitFirstOxRawQuestionText(detail.item.rawQuestionText)"));
  assert.equal(/derivedPayload.*statementText|metadata.*statementText|conceptCard\?.*statementText/s.test(pageSource), false);
  assert.ok(pageSource.includes("id: detail.item.problemIdentifier ?? detail.item.id"));
  assert.ok(pageSource.includes("expectedOx = isKnownOx(detail.item.correctAnswer)"));
});

test("FirstOxPracticeClient accepts retry statements while preserving generic practice", async () => {
  const clientSource = await readFile("components/review-os/first-ox/first-ox-practice-client.tsx", "utf8");
  ["initialStatements?: FirstExamStatement[]", "initialSubject?: string", "initialStem?: string", "initialChoiceText?: string", "retrySourceItemId?: string", "retryLoadStatus?: \"loaded\" | \"not_found\" | \"generic\""].forEach((token) => assert.ok(clientSource.includes(token), token));
  assert.ok(clientSource.includes("retryStatements ?? buildSampleStatements()"));
  assert.ok(clientSource.includes("저장된 선지를 다시 판단합니다."));
  assert.ok(clientSource.includes("저장된 선지를 불러오지 못해 기본 O/X 연습으로 시작합니다."));
  assert.equal(clientSource.includes('retryLoadStatus === "fallback"'), false);
  assert.ok(clientSource.includes("<CollapsibleDetails title=\"5지선다 직접 붙여넣기\""));
  assert.ok(clientSource.includes("buildSampleStatements()"));
});

test("first-ox source and derived metadata avoid raw statement copying and final-judgment claims", async () => {
  const statement = statements()[2];
  const attempt = evaluateFirstOxAttempt(statement, "O", "confused", "2026-05-30T00:00:00.000Z");
  const signal = buildFirstOxLearningSignalInput(statement, attempt);
  const item = buildFirstOxWrongAnswerItemInput(statement, attempt);
  assert.equal(JSON.stringify(signal?.metadataJson).includes(statement.statementText), false);
  assert.equal(JSON.stringify(item?.conceptCard).includes(statement.statementText), false);
  assert.ok(item?.rawQuestionText?.includes(statement.statementText));

  const source = await readFile("app/app/items/[itemId]/page.tsx", "utf8");
  ["공식 답안", "공식 점수", "합격 판정", "불합격 판정", "pass/fail", "official score", "official answer"].forEach((phrase) => {
    assert.equal(source.toLowerCase().includes(phrase.toLowerCase()), false, phrase);
  });
});

test("capture-to-OX parser detects circled five choices and preserves a stem", () => {
  const result = extractFirstExamFiveChoicesFromText("민법 옳은 것은? ① 무효이다. ② 취소할 수 있다. ③ 항상 같다. ④ 일부만 가능하다. ⑤ 승계된다.", "민법");
  assert.equal(result.status, "detected");
  assert.equal(result.choices.length, 5);
  assert.equal(result.subject, "민법");
  assert.ok(result.stem?.includes("옳은 것은"));
  assert.equal(result.choices[0], "무효이다.");
});

test("capture-to-OX parser detects dotted five choices", () => {
  const result = extractFirstExamFiveChoicesFromText("경제학 다음 설명\n1. 수요가 증가한다.\n2. 공급이 감소한다.\n3. 균형가격이 오른다.\n4. 거래량은 변한다.\n5. 탄력성을 확인한다.", "경제학");
  assert.equal(result.status, "detected");
  assert.deepEqual(result.choices.map((choice) => choice.slice(0, 2)), ["수요", "공급", "균형", "거래", "탄력"]);
});

test("capture-to-OX parser fails safely when choices are unclear", () => {
  const result = extractFirstExamFiveChoicesFromText("문제 줄기만 있고 선지가 두 개입니다.\n1. 첫 선지\n2. 둘째 선지", "민법");
  assert.equal(result.status, "unclear");
  assert.equal(result.choices.length, 0);
  assert.equal(result.message, "선지 5개를 확실히 찾지 못했습니다. 직접 확인 후 O/X로 나눌 수 있습니다.");
});

test("capture-to-OX bridge copy, source route, and source-specific O/X copy are present", async () => {
  const captureSource = await readFile("components/review-os/capture-form.tsx", "utf8");
  [
    "5개 선지를 O/X로 나눌 수 있습니다.",
    "입력 내용을 먼저 확인한 뒤 선택하면 됩니다.",
    "O/X 연습으로 나누기",
    /선지 5개를 확실히 찾지 못했습니다\.\s*직접 확인 후 O\/X로 나눌 수\s*있습니다\./,
    "/app/first/ox?sourceItemId=",
  ].forEach((phrase) => phrase instanceof RegExp ? assert.match(captureSource, phrase) : assert.ok(captureSource.includes(phrase), phrase));

  const pageSource = await readFile("app/app/first/ox/page.tsx", "utf8");
  assert.ok(pageSource.includes("sourceItemId"));
  assert.ok(pageSource.includes("loadFirstOxCaptureSourceState"));
  assert.ok(pageSource.includes("getConfirmedCaptureText"));
  assert.equal(pageSource.includes("derivedPayload.rawQuestionText"), false);

  const clientSource = await readFile("components/review-os/first-ox/first-ox-practice-client.tsx", "utf8");
  [
    "오늘 올린 문제에서 선지 5개를 나누었습니다.",
    "직접 붙여넣은 선지를 O/X로 판단합니다.",
    "저장된 선지를 다시 판단합니다.",
    "확인하고 O/X 연습 시작",
  ].forEach((phrase) => assert.ok(clientSource.includes(phrase), phrase));
});

test("FirstOxPracticeClient can initialize from capture-derived statements without derived raw text", () => {
  const extracted = extractFirstExamFiveChoicesFromText("① 하나\n② 둘\n③ 셋\n④ 넷\n⑤ 다섯", "민법");
  assert.equal(extracted.status, "detected");
  const initialStatements = normalizeFiveChoiceItemToStatements({ id: "capture-item-1", subject: "민법", stem: extracted.stem, choices: extracted.choices });
  assert.equal(initialStatements.length, 5);
  const attempt = evaluateFirstOxAttempt(initialStatements[0], "unknown", "unknown", "2026-06-01T00:00:00.000Z");
  const signal = buildFirstOxLearningSignalInput(initialStatements[0], attempt);
  assert.ok(signal);
  assert.equal(JSON.stringify(signal.metadataJson).includes("raw_question_text"), false);
  assert.equal(JSON.stringify(signal.metadataJson).includes("하나"), false);
});
