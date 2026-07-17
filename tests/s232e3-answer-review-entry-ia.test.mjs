import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(relativePath, "utf8");
const source = read("app/answer-review/answer-review-client.tsx");
const compactWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const sliceBetween = (startNeedle, endNeedle) => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(start >= 0, `missing start boundary: ${startNeedle}`);
  assert.ok(end > start, `missing end boundary: ${endNeedle}`);
  return source.slice(start, end);
};

test("S232E.3 gives Answer Review one runtime-labelled learner-first entry per mode", () => {
  assert.match(source, /data-s232e3-answer-review-entry="learner-first"/);
  assert.match(source, /aria-labelledby="s232e3-answer-review-title"/);
  assert.match(source, /data-s232e3-answer-review-primary/);
  assert.match(
    source,
    /<h1\s+id="s232e3-answer-review-title"\s+className="v3-type-screen[^"]*"\s*>[\s\S]*?답안 검토[\s\S]*?<\/h1>/,
  );
  assert.equal((source.match(/<h1\b/g) ?? []).length, 2);
  assert.match(
    source,
    /\{examMode === "second" \? \([\s\S]*?data-v3-layout="route-header"[\s\S]*?: \([\s\S]*?<RefinedBadge>답안 훈련<\/RefinedBadge>/,
  );
  assert.equal(
    (source.match(/id="s232e3-answer-review-title"/g) ?? []).length,
    2,
  );
  for (const role of [
    "v3-type-screen",
    "v3-type-section",
    "v3-type-body",
    "v3-type-compact",
    "v3-type-caption",
  ]) {
    assert.ok(source.includes(role), `missing V3 typography role: ${role}`);
  }
});

test("S232E.3 keeps the skip link hidden off-canvas until keyboard focus with a 48px target", () => {
  const skipLink = sliceBetween('href="#answer-review-main"', "본문 바로가기");

  assert.doesNotMatch(skipLink, /\bsr-only\b/);
  for (const contract of [
    "fixed",
    "inline-flex",
    "min-h-12",
    "min-w-11",
    "-translate-y-[200%]",
    "focus-visible:translate-y-0",
    "focus-visible:ring-2",
  ]) {
    assert.ok(
      skipLink.includes(contract),
      `missing skip-link focus contract: ${contract}`,
    );
  }
  assert.match(
    source,
    /<main\s+[\s\S]*?id="answer-review-main"[\s\S]*?tabIndex=\{-1\}/,
  );
});

test("S232E.3 explains the entry in now, why, result order", () => {
  const context = sliceBetween(
    "data-s232e3-answer-review-context",
    "<TrustProvenanceLayer",
  );
  assert.equal((context.match(/<dt\b/g) ?? []).length, 3);
  assert.equal((context.match(/<dd\b/g) ?? []).length, 3);
  const order = [
    'data-s232e3-stage="now"',
    'data-s232e3-stage="why"',
    'data-s232e3-stage="result"',
  ].map((marker) => context.indexOf(marker));
  assert.ok(
    order.every((index) => index >= 0),
    `missing stage marker: ${order.join(",")}`,
  );
  assert.deepEqual(
    order,
    [...order].sort((left, right) => left - right),
  );
  for (const copy of [
    "지금",
    "왜",
    "결과",
    "내 답안을 스냅하거나 텍스트로 남깁니다.",
    "내 답안의 누락 논점과 약한 구조를 먼저 좁힙니다.",
    "가장 큰 간극 1개와 다시 쓸 문장을 확인합니다.",
  ]) {
    assert.ok(context.includes(copy), `missing entry context copy: ${copy}`);
  }
});

test("S232E.3 keeps only answer snap and text in the default entry actions", () => {
  const actionStart = source.indexOf("data-s232e3-answer-entry-actions");
  const actionEnd = source.indexOf("</div>", actionStart);
  assert.ok(
    actionStart >= 0 && actionEnd > actionStart,
    "missing default answer entry action group",
  );
  const actions = source.slice(actionStart, actionEnd);
  assert.equal((actions.match(/<button\b/g) ?? []).length, 2);
  assert.match(actions, /답안 스냅/);
  assert.match(actions, /텍스트 붙여넣기/);
  assert.doesNotMatch(actions, /사례 스캔|PDF\/사진/);

  const requiredIndex = source.indexOf("data-s232e3-answer-required");
  const startIndex = source.indexOf("data-s232e3-answer-review-start-surface");
  const optionalIndex = source.indexOf("data-s232e3-answer-review-optional");
  assert.ok(
    requiredIndex >= 0 &&
      startIndex > requiredIndex &&
      optionalIndex > startIndex,
  );
  assert.match(
    source,
    /data-s232e3-answer-required[\s\S]*?data-testid="answer-review-my-answer-input"/,
  );
  assert.equal(
    (source.match(/data-testid="answer-review-start"/g) ?? []).length,
    1,
  );
  assert.equal(
    (source.match(/data-s232e3-answer-review-start-surface/g) ?? []).length,
    1,
  );
  assert.equal(
    (source.match(/data-s232e3-answer-review-start(?:\s|>)/g) ?? []).length,
    1,
  );
});

test("S232E.3 keeps accuracy inputs inside one closed optional disclosure", () => {
  const opening = source.match(
    /<details[\s\S]*?data-s232e3-answer-review-optional[\s\S]*?>/,
  );
  assert.ok(opening, "missing optional accuracy details");
  assert.doesNotMatch(opening[0], /\sopen(?:=|\s|>)/);

  const optional = sliceBetween(
    "data-s232e3-answer-review-optional",
    "</motion.div>",
  );
  assert.match(optional, /정확도 높이기 \(선택\)/);
  for (const preserved of [
    "사례 스캔",
    "PDF/사진",
    'id="answer-review-problem-file-upload"',
    'id="answer-review-my-answer-file-upload"',
    'id="answer-review-reference-file-upload"',
    'data-testid="answer-review-problem-input"',
    'data-testid="answer-review-reference-input"',
    'name="explanationLevel"',
    "쉽게 풀이",
    "기본 해설",
    "시험답안식",
  ]) {
    assert.ok(
      optional.includes(preserved),
      `optional input moved or removed: ${preserved}`,
    );
  }
});

test("S232E.3 preserves Problem Snap handoff values and notice", () => {
  const handoffEffect = sliceBetween(
    "const rawHandoff = sessionStorage.getItem(",
    "// eslint-disable-next-line react-hooks/exhaustive-deps",
  );
  const normalizedHandoffEffect = compactWhitespace(handoffEffect);
  for (const mapping of [
    'handoff.source !== "problem-snap"',
    "setExamMode(nextExamMode);",
    "setSubject(nextSubject);",
    'setMyAnswerText((handoff.retryMemo || "").trim());',
    "setMissingPointMemo(handoff.nextPracticeAction.trim());",
    "setProblemSnapRoutineReference({",
    "setHasProblemSnapRoutineHandoff(true);",
    "setProblemSnapNoticeVisible(true);",
    'sessionStorage.removeItem("inverge.problemSnap.answerReviewHandoff");',
  ]) {
    assert.ok(
      normalizedHandoffEffect.includes(compactWhitespace(mapping)),
      `Problem Snap handoff contract missing: ${mapping}`,
    );
  }
  assert.match(
    handoffEffect,
    /setProblemText\(\s*\(handoff\.problemText \|\| handoff\.problemSummary \|\| ""\)\.trim\(\),?\s*\);/,
    "Problem Snap handoff must restore the learner's problem text",
  );

  assert.match(
    source,
    /\{problemSnapNoticeVisible \? \([\s\S]*?Problem Snap에서 다시 푼 답안을 불러왔습니다\.[\s\S]*?setProblemSnapNoticeVisible\(false\)/,
  );
  assert.ok(
    source.indexOf("{problemSnapNoticeVisible ? (") <
      source.indexOf("data-s232e3-answer-review-optional"),
    "Problem Snap notice must remain visible outside the closed optional disclosure",
  );
});

test("S232E.3 preserves Answer Review service, state, trial, and test contracts", () => {
  for (const preserved of [
    'fetch("/api/answer-review/structure"',
    "const hasMyAnswer =",
    "!hasMyAnswer || isStructuring",
    "handleMyAnswerFileChange",
    "handleProblemFileChange",
    "handleReferenceFileChange",
    "handleGeneralFileChange",
    'viewerMode === "anonymous"',
    "structureErrorAction",
    'data-testid="answer-review-start"',
    'data-testid="answer-review-my-answer-input"',
    'data-testid="answer-review-problem-input"',
    'data-testid="answer-review-reference-input"',
  ]) {
    assert.ok(
      source.includes(preserved),
      `preserved contract missing: ${preserved}`,
    );
  }
  assert.doesNotMatch(source, /\/api\/answer-review\/grade-second/);
  assert.doesNotMatch(source, /Figma V3 pixel parity|pixel-parity/i);
});

test("S232E.3 runtime gate is exact-head, same-document, read-only, and scalar-only", () => {
  const spec = read("tests/e2e/s232e3-answer-review-entry-ia.spec.ts");
  const workflow = read(".github/workflows/s232e3-runtime.yml");
  const doc = read("docs/qa/s232e3-answer-review-entry-ia.md");
  const jobEnv = workflow.slice(
    workflow.indexOf("    env:"),
    workflow.indexOf("    steps:"),
  );

  for (const width of ["390", "768", "1440"]) {
    assert.ok(spec.includes(`label: "${width}"`), `missing viewport: ${width}`);
  }
  for (const marker of [
    "data-s232e3-answer-review-entry",
    "data-s232e3-answer-review-primary",
    "data-s232e3-answer-review-context",
    "data-s232e3-answer-entry-actions",
    "data-s232e3-answer-required",
    "data-s232e3-answer-review-start",
    "data-s232e3-answer-review-optional",
  ]) {
    assert.match(spec, new RegExp(marker));
  }

  assert.match(spec, /requireSafeAuthenticatedRuntime\("S232E\.3"/);
  assert.match(spec, /requireTargetSha: true/);
  assert.match(spec, /requireExactHead: true/);
  assert.match(spec, /establishProtectedPreviewSession\(page, "S232E\.3"\)/);
  assert.match(spec, /loginWithDedicatedTestAccount\(page, "second"\)/);
  assert.match(spec, /page\.goto\("\/answer-review\?mode=second"/);
  assert.match(spec, /setViewportSize\(\{ width: viewports\[0\]\.width/);
  assert.match(spec, /request\.isNavigationRequest\(\)/);
  assert.match(spec, /request\.resourceType\(\) === "document"/);
  assert.match(spec, /__s232e3AnswerReviewDocumentIdentity/);
  assert.match(spec, /resizedSameDocumentVerified =/);
  assert.match(spec, /mainFrameDocumentNavigationRequestCount/);
  assert.match(spec, /contextOrder\)\.toEqual\(\["now", "why", "result"\]\)/);
  assert.match(spec, /defaultEntryButtons\)\.toHaveCount\(2\)/);
  assert.match(spec, /primaryStart\)\.toHaveCount\(1\)/);
  assert.match(spec, /primaryStart\)\.toBeDisabled\(\)/);
  assert.match(spec, /optionalAccuracy\)\.not\.toHaveAttribute\("open", ""\)/);
  assert.match(spec, /Optional accuracy inputs must remain hidden/);
  assert.match(spec, /page\.keyboard\.press\("Tab"\)/);
  assert.match(spec, /element === document\.activeElement/);
  assert.match(spec, /page\.context\(\)\.route\("\*\*\/\*"/);
  assert.match(spec, /!readOnlyMethods\.has\(request\.method\(\)\)/);
  assert.match(spec, /route\.abort\("blockedbyclient"\)/);
  assert.match(spec, /readBrowserStorageDigest/);
  assert.match(spec, /readAnalyticsLengths/);
  assert.match(spec, /new AxeBuilder/);
  assert.doesNotMatch(
    spec,
    /requiredAnswer\.(?:fill|type|pressSequentially)\(/,
  );
  assert.doesNotMatch(spec, /page\.keyboard\.(?:type|insertText)\(/);
  assert.match(spec, /learnerTextEntered: false/);

  for (const privacyFlag of [
    "credentialsCaptured",
    "rawLearnerContentCaptured",
    "questionTextCaptured",
    "referenceTextCaptured",
    "subjectCaptured",
    "urlCaptured",
    "emailCaptured",
    "domCaptured",
    "screenshotCaptured",
    "traceCaptured",
    "videoCaptured",
  ]) {
    assert.match(spec, new RegExp(`${privacyFlag}: false`));
  }
  assert.match(spec, /globalDatabaseImmutabilityClaimed: false/);

  assert.match(workflow, /agent\/s232e3-answer-review-entry-ia/);
  assert.match(workflow, /pull_request\.head\.sha/);
  assert.match(workflow, /run-s232e3-auth-e2e/);
  assert.match(workflow, /Discover and verify exact-head Preview/);
  assert.match(workflow, /Recheck exact deployment SHA/);
  assert.match(workflow, /tests\/e2e\/s232e3-answer-review-entry-ia\.spec\.ts/);
  assert.match(workflow, /Validate metadata-only S232E\.3 evidence/);
  assert.match(workflow, /test "\$\{#evidence_paths\[@\]\}" -eq 1/);
  assert.match(
    workflow,
    /path: validated-runtime-evidence\/s232e3-runtime\.json/,
  );
  assert.doesNotMatch(
    jobEnv,
    /E2E_USER_EMAIL|E2E_USER_PASSWORD|VERCEL_AUTOMATION_BYPASS_SECRET|GH_TOKEN/,
  );
  assert.doesNotMatch(workflow, /pull_request\.number == \d+/);
  assert.doesNotMatch(
    workflow,
    /captureSanitizedScreenshot|trace\.zip|video\.webm|\*\*\/\*\.png/,
  );

  assert.match(doc, /no pixel-parity claim/i);
  assert.match(doc, /390px[\s\S]*768px[\s\S]*1440px/i);
  assert.match(doc, /does not claim total database immutability/i);
  assert.match(doc, /flat scalar JSON/i);
});
