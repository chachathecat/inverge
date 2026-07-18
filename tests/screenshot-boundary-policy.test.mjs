import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProvenanceBoundPolicyTable,
  classifyProvenanceBoundDirectAnswer,
  classifyScreenshotBoundaryAttributeChannel,
  classifyStructuralCollisionSchema,
  hasCompleteExactMirroredDirectAnswerPaths,
  hasSemanticAnswerLabel,
  isExactAnswerReviewMotionStyleCollision,
  isIncidentalOrdinalOrCounter,
  isExactProvenanceBoundMatch,
  isExactMirroredDirectAnswerPath,
  isProvenanceBoundPresentationUtilityToken,
  provenanceBoundaryScalarPath,
  provenanceBoundPolicyKey,
  shouldBlockProvenanceBoundMatch,
  shouldBlockSerializedPolicyDecision,
} from "./e2e/support/screenshot-boundary-policy.ts";

const policyInput = (overrides = {}) => ({
  channel: "semantic-text",
  exact: false,
  sourceReferenced: false,
  semanticAnswerLabel: false,
  structuralSchema: "none",
  incidentalTextSchema: false,
  exactSyntheticFixtureFormValue: false,
  ...overrides,
});

test("the provenance-bound family is exact and does not become an account-wide unknown-key rule", () => {
  assert.equal(classifyProvenanceBoundDirectAnswer("correctAnswer", "3"), "correctAnswer");
  assert.equal(classifyProvenanceBoundDirectAnswer("userAnswer", "3"), "userAnswer");
  assert.equal(classifyProvenanceBoundDirectAnswer("problemTitle", "3"), null);
  assert.equal(classifyProvenanceBoundDirectAnswer("correctAnswer", "33"), null);
  assert.equal(classifyProvenanceBoundDirectAnswer("correctAnswer", "8"), null);
  assert.equal(classifyProvenanceBoundDirectAnswer("correctAnswer", "가"), null);
});

test("only the two exact same-item payload mirrors share direct-answer provenance", () => {
  assert.deepEqual(
    provenanceBoundaryScalarPath("3", ["rawPayload", "unknown"]),
    ["rawPayload", "unknown"],
  );
  assert.deepEqual(
    provenanceBoundaryScalarPath(3, ["rawPayload", "unknown"]),
    ["rawPayload", "unknown", "<number>"],
  );
  assert.deepEqual(
    provenanceBoundaryScalarPath(3, ["rawPayload", "unknown", "[]"]),
    ["rawPayload", "unknown", "[]", "<number>"],
  );
  assert.equal(
    isExactMirroredDirectAnswerPath(
      "correctAnswer",
      ["rawPayload", "user_confirmed_fields", "correct_answer"],
    ),
    true,
  );
  assert.equal(
    isExactMirroredDirectAnswerPath(
      "userAnswer",
      ["rawPayload", "user_confirmed_fields", "user_answer"],
    ),
    true,
  );
  assert.equal(
    isExactMirroredDirectAnswerPath(
      "correctAnswer",
      ["derivedPayload", "correct_answer"],
    ),
    false,
  );
  assert.equal(
    isExactMirroredDirectAnswerPath(
      "userAnswer",
      ["rawPayload", "<unknown-key>", "user_answer"],
    ),
    false,
  );
  assert.equal(
    isExactMirroredDirectAnswerPath(
      "correctAnswer",
      ["rawPayload", "user_confirmed_fields", "correct_answer", "[]"],
    ),
    false,
  );
  assert.equal(
    isExactMirroredDirectAnswerPath(
      "correctAnswer",
      [
        "rawPayload",
        "user_confirmed_fields",
        "correct_answer",
        "<number>",
      ],
    ),
    false,
  );
  assert.equal(
    isExactMirroredDirectAnswerPath(
      "correctAnswer",
      ["rawPayload", "user_confirmed_fields.correct_answer"],
    ),
    false,
  );
  assert.equal(
    hasCompleteExactMirroredDirectAnswerPaths(
      ["correctAnswer", "userAnswer"],
      [
        ["rawPayload", "user_confirmed_fields", "correct_answer"],
        ["rawPayload", "user_confirmed_fields", "user_answer"],
      ],
    ),
    true,
  );
  assert.equal(
    hasCompleteExactMirroredDirectAnswerPaths(
      ["correctAnswer", "userAnswer"],
      [["rawPayload", "user_confirmed_fields", "correct_answer"]],
    ),
    false,
  );
  assert.equal(
    hasCompleteExactMirroredDirectAnswerPaths(
      ["correctAnswer"],
      [
        ["rawPayload", "user_confirmed_fields", "correct_answer"],
        ["rawPayload", "unknown", "<number>"],
      ],
    ),
    false,
  );
  assert.equal(
    hasCompleteExactMirroredDirectAnswerPaths(
      ["correctAnswer"],
      [
        ["rawPayload", "user_confirmed_fields", "correct_answer"],
        ["rawPayload", "unknown", "[]", "<number>"],
      ],
    ),
    false,
  );
  assert.equal(
    hasCompleteExactMirroredDirectAnswerPaths(
      ["correctAnswer"],
      [
        ["rawPayload", "user_confirmed_fields", "correct_answer"],
        ["rawPayload", "<unknown-key>", "correct_answer"],
      ],
    ),
    false,
  );
});

test("semantic matching distinguishes answer-labelled content from ordinals and counters", () => {
  assert.equal(hasSemanticAnswerLabel("내 답: 3번", "3"), true);
  assert.equal(hasSemanticAnswerLabel("답: 3", "3"), true);
  assert.equal(hasSemanticAnswerLabel("choice 3", "3"), true);
  assert.equal(hasSemanticAnswerLabel("user_answer=3", "3"), true);
  assert.equal(hasSemanticAnswerLabel("correct-answer:3", "3"), true);
  assert.equal(hasSemanticAnswerLabel("내 답 3번", "3"), true);
  assert.equal(hasSemanticAnswerLabel("3번 내 답", "3"), true);
  assert.equal(hasSemanticAnswerLabel("답안은 3", "3"), true);
  assert.equal(hasSemanticAnswerLabel("고른 번호 3", "3"), true);
  assert.equal(hasSemanticAnswerLabel("선택지: 3", "3"), true);
  assert.equal(hasSemanticAnswerLabel("3개 선택", "3"), false);
  assert.equal(hasSemanticAnswerLabel("답안 3개", "3"), false);
  assert.equal(hasSemanticAnswerLabel("03 답안 올리기", "3"), false);
  assert.equal(
    isExactProvenanceBoundMatch("semantic-text", "3", "3. 합성 작업", "3"),
    false,
  );
  assert.equal(
    isExactProvenanceBoundMatch("semantic-text", "3", "3", "3"),
    true,
  );
  assert.equal(
    isExactProvenanceBoundMatch(
      "content-attribute",
      "3",
      "3. 합성 작업",
      "3",
    ),
    true,
  );
  assert.equal(
    shouldBlockProvenanceBoundMatch({
      ...policyInput(),
      semanticAnswerLabel: hasSemanticAnswerLabel("내 답 3번", "3"),
    }),
    true,
  );
  assert.equal(
    shouldBlockProvenanceBoundMatch({
      ...policyInput(),
      semanticAnswerLabel: hasSemanticAnswerLabel("3번 내 답", "3"),
    }),
    true,
  );
  assert.equal(
    shouldBlockProvenanceBoundMatch({
      ...policyInput(),
      semanticAnswerLabel: hasSemanticAnswerLabel("3. 합성 작업", "3"),
      incidentalTextSchema: isIncidentalOrdinalOrCounter({
        normalizedValue: "3. 합성 작업",
        normalizedFragment: "3",
        orderedListItem: false,
      }),
    }),
    false,
  );
});

test("only explicit ordinal and counter grammar is incidental text", () => {
  for (const normalizedValue of [
    "3. 합성 작업",
    "단계 3/6",
    "3단계",
    "03",
    "Step 3",
    "문항 3번",
  ])
    assert.equal(
      isIncidentalOrdinalOrCounter({
        normalizedValue,
        normalizedFragment: "3",
        orderedListItem: false,
      }),
      true,
    );
  assert.equal(
    isIncidentalOrdinalOrCounter({
      normalizedValue: "3 합성 작업",
      normalizedFragment: "3",
      orderedListItem: true,
    }),
    true,
  );
  for (const normalizedValue of [
    "3번",
    "합성 3 작업",
    "선택 3",
    "abc3xyz",
  ])
    assert.equal(
      isIncidentalOrdinalOrCounter({
        normalizedValue,
        normalizedFragment: "3",
        orderedListItem: false,
      }),
      false,
    );
});

test("only the fixed progress semantic treats aria-valuenow as structural", () => {
  assert.equal(
    classifyScreenshotBoundaryAttributeChannel("aria-valuenow", "progressbar"),
    "structural-reference",
  );
  assert.equal(
    classifyScreenshotBoundaryAttributeChannel("aria-valuenow", "slider"),
    "content-attribute",
  );
  assert.equal(
    classifyScreenshotBoundaryAttributeChannel("aria-valuetext", "progressbar"),
    "content-attribute",
  );
  assert.equal(
    classifyScreenshotBoundaryAttributeChannel("class", "progressbar"),
    "structural-reference",
  );
  assert.equal(
    classifyScreenshotBoundaryAttributeChannel("data-answer-label", null),
    "structural-reference",
  );
  assert.equal(
    classifyScreenshotBoundaryAttributeChannel("aria-label", null),
    "content-attribute",
  );
  assert.equal(
    classifyScreenshotBoundaryAttributeChannel("data-controller-label", null),
    "structural-reference",
  );
});

test("structural filtering requires an exact positive schema", () => {
  for (const publicRouteToken of [
    "min-h-[calc(100vh-168px)]",
    "lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]",
    "md:h-[72px]",
    "max-w-[180px]",
    "border-[color:rgba(46,110,88,0.24)]",
    "min-h-[52px]",
    "py-[15px]",
    "leading-[22px]",
  ])
    assert.equal(
      isProvenanceBoundPresentationUtilityToken(publicRouteToken),
      true,
    );
  const classify = (overrides) =>
    classifyStructuralCollisionSchema({
      attributeName: "data-unknown",
      normalizedValue: "state-3",
      normalizedFragment: "3",
      elementRole: null,
      resolvesIdReference: false,
      decorativeGraphic: false,
      progressbarFillStyle: false,
      answerReviewMotionStyle: false,
      elementTagName: "div",
      ...overrides,
    });
  assert.equal(classify({}), "none");
  assert.equal(
    classify({ attributeName: "class", normalizedValue: "gap-3" }),
    "presentation",
  );
  assert.equal(
    classify({
      attributeName: "class",
      normalizedValue: "flex-1",
      normalizedFragment: "1",
    }),
    "presentation",
  );
  assert.equal(
    classify({ attributeName: "class", normalizedValue: "v3-type-body" }),
    "presentation",
  );
  assert.equal(
    classify({
      attributeName: "class",
      normalizedValue: "[animation-delay:120ms]",
      normalizedFragment: "1",
    }),
    "presentation",
  );
  assert.equal(
    classify({
      attributeName: "class",
      normalizedValue: "[animation-delay:130ms]",
    }),
    "none",
  );
  assert.equal(
    classify({
      attributeName: "class",
      normalizedValue: "text-[answer-3]",
    }),
    "none",
  );
  assert.equal(
    classify({ attributeName: "class", normalizedValue: "3" }),
    "none",
  );
  assert.equal(
    classify({ attributeName: "class", normalizedValue: "state-3" }),
    "none",
  );
  assert.equal(
    classify({ attributeName: "class", normalizedValue: "selected-3" }),
    "none",
  );
  assert.equal(
    classify({ attributeName: "class", normalizedValue: "text-answer-3" }),
    "none",
  );
  assert.equal(
    classify({
      attributeName: "data-s232e-second-write-panel",
      normalizedValue: "3",
    }),
    "instrumentation",
  );
  assert.equal(
    classify({
      attributeName: "data-s224v-visible-primary-work-items-max",
      normalizedValue: "3",
    }),
    "instrumentation",
  );
  assert.equal(
    classify({
      attributeName: "data-s224v-visible-primary-work-items-max",
      normalizedValue: "2",
      normalizedFragment: "2",
    }),
    "none",
  );
  assert.equal(
    classify({
      attributeName: "data-s232e-second-write-panel",
      normalizedValue: "step-3",
    }),
    "none",
  );
  assert.equal(
    classify({
      attributeName: "data-testid",
      normalizedValue: "calculator-step-runner-v3",
    }),
    "instrumentation",
  );
  assert.equal(
    classify({ attributeName: "data-testid", normalizedValue: "account-3" }),
    "none",
  );
  assert.equal(
    classify({
      attributeName: "data-controller-label",
      normalizedValue: "Step 3. 내 답안 작성",
    }),
    "instrumentation",
  );
  assert.equal(
    classify({
      attributeName: "data-controller-label",
      normalizedValue: "Step 3. unknown",
    }),
    "none",
  );
  assert.equal(
    classify({
      attributeName: "data-s226-trust-evidence",
      normalizedValue: "s226",
      normalizedFragment: "2",
    }),
    "instrumentation",
  );
  assert.equal(
    classify({ attributeName: "data-s232h2-unknown", normalizedValue: "3" }),
    "none",
  );
  assert.equal(
    classify({ attributeName: "aria-valuenow", elementRole: "progressbar" }),
    "presentation",
  );
  assert.equal(
    classify({ attributeName: "aria-valuenow", elementRole: "slider" }),
    "none",
  );
  assert.equal(
    classify({ attributeName: "tabindex", normalizedValue: "-1" }),
    "presentation",
  );
  assert.equal(
    classify({ attributeName: "tabindex", normalizedValue: "1" }),
    "none",
  );
  assert.equal(
    classify({
      attributeName: "rows",
      normalizedValue: "3",
      elementTagName: "textarea",
    }),
    "presentation",
  );
  assert.equal(
    classify({ attributeName: "rows", normalizedValue: "3" }),
    "none",
  );
  assert.equal(
    classify({
      attributeName: "rows",
      normalizedValue: "4",
      normalizedFragment: "4",
      elementTagName: "textarea",
    }),
    "none",
  );
  assert.equal(
    classify({
      attributeName: "aria-labelledby",
      normalizedValue: "step-3-label",
      resolvesIdReference: true,
    }),
    "presentation",
  );
  assert.equal(
    classify({
      attributeName: "d",
      normalizedValue: "M3 4",
      decorativeGraphic: true,
    }),
    "presentation",
  );
  assert.equal(
    classify({
      attributeName: "style",
      normalizedValue: "width: 30%;",
      progressbarFillStyle: true,
    }),
    "presentation",
  );
  assert.equal(
    classify({
      attributeName: "style",
      normalizedValue: "--answer: 3",
      progressbarFillStyle: true,
    }),
    "none",
  );
  assert.equal(
    classify({ attributeName: "style", normalizedValue: "width: 30%;" }),
    "none",
  );
  assert.equal(
    isExactAnswerReviewMotionStyleCollision(
      "opacity: 1; transform: translateY(0px)",
      "1",
    ),
    true,
  );
  assert.equal(
    isExactAnswerReviewMotionStyleCollision("--answer: 3", "3"),
    false,
  );
  assert.equal(
    isExactAnswerReviewMotionStyleCollision("left: 3px", "3"),
    false,
  );
  assert.equal(
    classify({
      attributeName: "style",
      normalizedValue: "opacity: 1; transform: translateY(0px)",
      normalizedFragment: "1",
      answerReviewMotionStyle: true,
    }),
    "presentation",
  );
});

test("the tested truth table filters only classified incidental collisions", () => {
  const structuralCollision = policyInput({
    channel: "structural-reference",
    structuralSchema: "presentation",
  });
  assert.equal(shouldBlockProvenanceBoundMatch(structuralCollision), false);
  assert.equal(
    shouldBlockProvenanceBoundMatch({
      ...structuralCollision,
      structuralSchema: "none",
    }),
    true,
  );
  assert.equal(
    shouldBlockProvenanceBoundMatch({
      ...structuralCollision,
      structuralSchema: "instrumentation",
      semanticAnswerLabel: true,
    }),
    true,
  );
  assert.equal(
    shouldBlockProvenanceBoundMatch({
      ...structuralCollision,
      sourceReferenced: true,
    }),
    true,
  );
  assert.equal(
    shouldBlockProvenanceBoundMatch({
      ...structuralCollision,
      exact: true,
    }),
    false,
  );
  assert.equal(
    shouldBlockProvenanceBoundMatch({
      ...structuralCollision,
      semanticAnswerLabel: true,
    }),
    true,
  );
  assert.equal(
    shouldBlockProvenanceBoundMatch({
      ...structuralCollision,
      channel: "semantic-text",
      exact: true,
      structuralSchema: "none",
    }),
    true,
  );
  assert.equal(
    shouldBlockProvenanceBoundMatch({
      ...structuralCollision,
      channel: "content-attribute",
      exact: true,
      structuralSchema: "none",
    }),
    true,
  );
  assert.equal(
    shouldBlockProvenanceBoundMatch({
      ...structuralCollision,
      channel: "semantic-text",
      exact: true,
      structuralSchema: "none",
    }),
    true,
  );
  assert.equal(
    shouldBlockProvenanceBoundMatch({
      ...structuralCollision,
      channel: "semantic-text",
      semanticAnswerLabel: true,
      structuralSchema: "none",
    }),
    true,
  );
  assert.equal(
    shouldBlockProvenanceBoundMatch({
      ...structuralCollision,
      channel: "form-value",
      structuralSchema: "none",
    }),
    true,
  );
  assert.equal(
    shouldBlockProvenanceBoundMatch({
      ...structuralCollision,
      channel: "form-value",
      structuralSchema: "none",
      exactSyntheticFixtureFormValue: true,
    }),
    false,
  );
  assert.equal(
    shouldBlockProvenanceBoundMatch({
      ...structuralCollision,
      channel: "form-value",
      structuralSchema: "none",
      semanticAnswerLabel: true,
      exactSyntheticFixtureFormValue: true,
    }),
    true,
  );
  assert.equal(
    shouldBlockProvenanceBoundMatch({
      ...structuralCollision,
      channel: "generated-content",
      structuralSchema: "none",
    }),
    true,
  );
  assert.equal(shouldBlockSerializedPolicyDecision(undefined), true);
  assert.equal(shouldBlockSerializedPolicyDecision(true), true);
  assert.equal(shouldBlockSerializedPolicyDecision(false), false);
});

test("the browser receives the same executable policy decisions exercised by the unit test", () => {
  const table = buildProvenanceBoundPolicyTable();
  for (const channel of [
    "semantic-text",
    "content-attribute",
    "structural-reference",
    "form-value",
    "generated-content",
    "background-reference",
  ]) {
    for (const exact of [false, true]) {
      for (const sourceReferenced of [false, true]) {
        for (const semanticAnswerLabel of [false, true]) {
          for (const structuralSchema of [
            "none",
            "presentation",
            "instrumentation",
          ]) {
            for (const incidentalTextSchema of [false, true]) {
              for (const exactSyntheticFixtureFormValue of [false, true]) {
                const input = {
                  channel,
                  exact,
                  sourceReferenced,
                  semanticAnswerLabel,
                  structuralSchema,
                  incidentalTextSchema,
                  exactSyntheticFixtureFormValue,
                };
                assert.equal(
                  table[provenanceBoundPolicyKey(input)],
                  shouldBlockProvenanceBoundMatch(input),
                );
              }
            }
          }
        }
      }
    }
  }
  assert.equal(Object.keys(table).length, 576);
});
