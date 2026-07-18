import assert from "node:assert/strict";
import test from "node:test";

import {
  buildScreenshotBoundaryPolicyTable,
  classifyScreenshotBoundaryAttributeChannel,
  classifyScreenshotBoundaryFragmentDescriptor,
  classifyStructuralCollisionSchema,
  decideScreenshotBoundaryPolicy,
  hasSemanticAnswerLabel,
  hasSemanticContentLabel,
  isExactProvenanceBoundMatch,
  isIncidentalOrdinalOrCounter,
  isProvenanceBoundPresentationUtilityToken,
  isValidatedPresentationStyleCollision,
  provenanceBoundaryScalarPath,
  screenshotBoundaryLengthFamily,
  screenshotBoundaryPolicyKey,
  screenshotBoundaryPolicySchema,
  shouldBlockSerializedPolicyDecision,
} from "./e2e/support/screenshot-boundary-policy.ts";

const policyInput = (overrides = {}) => ({
  provenanceState: "valid",
  lengthFamily: "1",
  hardBlockReason: "none",
  positiveEvidence: "none",
  ...overrides,
});

const descriptor = (overrides = {}) => ({
  value: "가",
  sourceItemIds: ["synthetic-item-0001"],
  origins: [
    {
      fieldOrPathFamily: "direct.answer",
      originClass: "direct-field",
      riskClass: "learner-content",
      contentKind: "answer",
    },
  ],
  lengthFamily: "1",
  ...overrides,
});

test("typed descriptors preserve direct, known nested, and unknown nested provenance", () => {
  assert.equal(classifyScreenshotBoundaryFragmentDescriptor(descriptor()), "valid");
  assert.equal(
    classifyScreenshotBoundaryFragmentDescriptor(
      descriptor({
        value: "요건",
        lengthFamily: "2-7",
        origins: [
          {
            fieldOrPathFamily: "raw.known.question",
            originClass: "known-nested-field",
            riskClass: "learner-content",
            contentKind: "question",
          },
        ],
      }),
    ),
    "valid",
  );
  assert.equal(
    classifyScreenshotBoundaryFragmentDescriptor(
      descriptor({
        value: "합성값",
        lengthFamily: "2-7",
        origins: [
          {
            fieldOrPathFamily: "derived.unknown",
            originClass: "unknown-nested-field",
            riskClass: "unknown-content",
            contentKind: "unknown",
          },
        ],
      }),
    ),
    "valid",
  );
  assert.equal(
    classifyScreenshotBoundaryFragmentDescriptor(
      descriptor({ sourceItemIds: [] }),
    ),
    "missing",
  );
  assert.equal(
    classifyScreenshotBoundaryFragmentDescriptor(
      descriptor({ origins: [] }),
    ),
    "missing",
  );
  assert.equal(
    classifyScreenshotBoundaryFragmentDescriptor(
      descriptor({
        origins: [
          {
            fieldOrPathFamily: "raw.secret-current-key",
            originClass: "unknown-nested-field",
            riskClass: "unknown-content",
            contentKind: "unknown",
          },
        ],
      }),
    ),
    "malformed",
  );
  assert.equal(
    classifyScreenshotBoundaryFragmentDescriptor(
      descriptor({ value: "길이불일치", lengthFamily: "1" }),
    ),
    "malformed",
  );
});

test("nested scalar paths preserve unknown string and numeric origins", () => {
  assert.deepEqual(
    provenanceBoundaryScalarPath("합성값", ["rawPayload", "unknown"]),
    ["rawPayload", "unknown"],
  );
  assert.deepEqual(
    provenanceBoundaryScalarPath(3, ["rawPayload", "unknown"]),
    ["rawPayload", "unknown", "<number>"],
  );
  assert.deepEqual(
    provenanceBoundaryScalarPath(3, ["derivedPayload", "unknown", "[]"]),
    ["derivedPayload", "unknown", "[]", "<number>"],
  );
});

test("one-character and 2-7 character proper substrings in public Korean text require positive evidence", () => {
  for (const lengthFamily of ["1", "2-7"]) {
    const allowed = decideScreenshotBoundaryPolicy(
      policyInput({
        lengthFamily,
        positiveEvidence: "public-semantic-substring",
      }),
    );
    assert.deepEqual(allowed, {
      block: false,
      reason: "public-semantic-substring",
    });
    assert.equal(
      decideScreenshotBoundaryPolicy(policyInput({ lengthFamily })).block,
      true,
      "length alone must never permit a collision",
    );
  }
});

test("public answer, requirement, and counter wording remains incidental only as a proper substring", () => {
  for (const example of [
    { surface: "답안을 차분히 다시 씁니다", fragment: "답" },
    { surface: "신뢰보호 요건을 확인합니다", fragment: "요건" },
    { surface: "3개 항목을 확인합니다", fragment: "3" },
  ]) {
    assert.notEqual(example.surface, example.fragment);
    assert.equal(example.surface.includes(example.fragment), true);
    assert.equal(
      decideScreenshotBoundaryPolicy(
        policyInput({
          lengthFamily: screenshotBoundaryLengthFamily(example.fragment),
          positiveEvidence: "public-semantic-substring",
        }),
      ).block,
      false,
    );
  }
});

test("explicit ordinal and counter grammar is positive evidence, never a length bypass", () => {
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
      normalizedValue: "합성 3 회상",
      normalizedFragment: "3",
      orderedListItem: false,
    }),
    false,
  );
  assert.equal(
    decideScreenshotBoundaryPolicy(
      policyInput({ positiveEvidence: "ordinal-counter" }),
    ).block,
    false,
  );
});

test("semantic labels for answer, reason, and question always provide blocking evidence", () => {
  assert.equal(hasSemanticAnswerLabel("내 답: 3번", "3"), true);
  assert.equal(
    hasSemanticContentLabel("판단 이유: 합성근거", "합성근거", ["reason"]),
    true,
  );
  assert.equal(
    hasSemanticContentLabel("문제: 합성쟁점", "합성쟁점", ["question"]),
    true,
  );
  assert.equal(
    hasSemanticContentLabel("질문: 합성값", "합성값", ["unknown"]),
    true,
  );
  assert.equal(
    decideScreenshotBoundaryPolicy(
      policyInput({ hardBlockReason: "semantic-label" }),
    ).block,
    true,
  );
});

test("exact semantic surfaces remain distinct from proper substrings", () => {
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
});

test("validated Tailwind utilities, CSS syntax, progress syntax, IDs, and SVG geometry are structural evidence", () => {
  assert.equal(
    classifyStructuralCollisionSchema({
      attributeName: "data-testid",
      normalizedValue: "synthetic-contract-control",
      normalizedFragment: "contract",
      elementRole: null,
      resolvesIdReference: false,
      decorativeGraphic: false,
      progressbarFillStyle: false,
      elementTagName: "div",
    }),
    "instrumentation-syntax",
  );
  assert.equal(isProvenanceBoundPresentationUtilityToken("text-3"), true);
  assert.equal(
    isProvenanceBoundPresentationUtilityToken("text-balance"),
    true,
  );
  assert.equal(
    isProvenanceBoundPresentationUtilityToken("text-[13px]"),
    true,
  );
  assert.equal(
    classifyStructuralCollisionSchema({
      attributeName: "class",
      normalizedValue: "text-3 leading-6",
      normalizedFragment: "3",
      elementRole: null,
      resolvesIdReference: false,
      decorativeGraphic: false,
      progressbarFillStyle: false,
      elementTagName: "p",
    }),
    "presentation-syntax",
  );
  assert.equal(
    isValidatedPresentationStyleCollision("opacity: 0.3", "3"),
    true,
  );
  assert.equal(
    classifyStructuralCollisionSchema({
      attributeName: "style",
      normalizedValue: "opacity: 0.3",
      normalizedFragment: "3",
      elementRole: null,
      resolvesIdReference: false,
      decorativeGraphic: false,
      progressbarFillStyle: false,
      elementTagName: "div",
    }),
    "presentation-syntax",
  );
  assert.equal(
    classifyStructuralCollisionSchema({
      attributeName: "aria-valuenow",
      normalizedValue: "3",
      normalizedFragment: "3",
      elementRole: "progressbar",
      resolvesIdReference: false,
      decorativeGraphic: false,
      progressbarFillStyle: false,
      elementTagName: "div",
    }),
    "progress-aria-syntax",
  );
  assert.equal(
    classifyStructuralCollisionSchema({
      attributeName: "for",
      normalizedValue: "step-3-control",
      normalizedFragment: "3",
      elementRole: null,
      resolvesIdReference: true,
      decorativeGraphic: false,
      progressbarFillStyle: false,
      elementTagName: "label",
    }),
    "id-reference-syntax",
  );
  assert.equal(
    classifyStructuralCollisionSchema({
      attributeName: "d",
      normalizedValue: "M3 0 L8 8",
      normalizedFragment: "3",
      elementRole: null,
      resolvesIdReference: false,
      decorativeGraphic: true,
      progressbarFillStyle: false,
      elementTagName: "path",
    }),
    "svg-geometry",
  );
});

test("unknown structural attributes stay fail-closed", () => {
  assert.equal(
    classifyStructuralCollisionSchema({
      attributeName: "data-unknown",
      normalizedValue: "3",
      normalizedFragment: "3",
      elementRole: null,
      resolvesIdReference: false,
      decorativeGraphic: false,
      progressbarFillStyle: false,
      elementTagName: "div",
    }),
    "none",
  );
  assert.equal(
    decideScreenshotBoundaryPolicy(
      policyInput({ hardBlockReason: "unknown-surface" }),
    ).block,
    true,
  );
});

test("attribute channels keep semantic content separate from references", () => {
  assert.equal(
    classifyScreenshotBoundaryAttributeChannel("aria-label", null),
    "content-attribute",
  );
  assert.equal(
    classifyScreenshotBoundaryAttributeChannel("aria-valuenow", "progressbar"),
    "structural-reference",
  );
  assert.equal(
    classifyScreenshotBoundaryAttributeChannel("aria-labelledby", null),
    "structural-reference",
  );
});

test("the hostile blocking truth table keeps every sensitive surface closed", () => {
  const cases = [
    ["exact visible short fragment", "exact-surface"],
    ["answer or reason semantic label", "semantic-label"],
    ["exact input or textarea value", "form-value"],
    ["exact select.value", "select-value"],
    ["source-linked ancestor or attribute", "source-reference"],
    ["URL, hash, or query source reference", "source-reference"],
    ["unknown attribute classification", "unknown-surface"],
    ["Shadow DOM or ARIA reference", "shadow-aria-reference"],
    ["generated content", "generated-content"],
    ["background URL", "background-reference"],
  ];
  for (const [label, hardBlockReason] of cases)
    assert.equal(
      decideScreenshotBoundaryPolicy(
        policyInput({ hardBlockReason }),
      ).block,
      true,
      label,
    );
});

test("unknown-key exact content, missing provenance, and malformed descriptors block", () => {
  const unknownDescriptor = descriptor({
    origins: [
      {
        fieldOrPathFamily: "raw.unknown",
        originClass: "unknown-nested-field",
        riskClass: "unknown-content",
        contentKind: "unknown",
      },
    ],
  });
  assert.equal(
    classifyScreenshotBoundaryFragmentDescriptor(unknownDescriptor),
    "valid",
  );
  assert.equal(
    decideScreenshotBoundaryPolicy(
      policyInput({ hardBlockReason: "exact-surface" }),
    ).block,
    true,
  );
  assert.deepEqual(
    decideScreenshotBoundaryPolicy(
      policyInput({ provenanceState: "missing" }),
    ),
    { block: true, reason: "missing-provenance" },
  );
  assert.deepEqual(
    decideScreenshotBoundaryPolicy(
      policyInput({ provenanceState: "malformed" }),
    ),
    { block: true, reason: "malformed-provenance" },
  );
});

test("long account-derived substrings block even with incidental positive evidence", () => {
  for (const lengthFamily of ["8-31", "32+"])
    assert.deepEqual(
      decideScreenshotBoundaryPolicy(
        policyInput({
          lengthFamily,
          positiveEvidence: "public-semantic-substring",
        }),
      ),
      { block: true, reason: "long-unclassified-substring" },
    );
});

test("the calculator textarea fixture is the only form-value exception modeled by policy", () => {
  assert.equal(
    decideScreenshotBoundaryPolicy(
      policyInput({ hardBlockReason: "form-value" }),
    ).block,
    true,
  );
  assert.deepEqual(
    decideScreenshotBoundaryPolicy(
      policyInput({
        lengthFamily: "32+",
        positiveEvidence: "synthetic-form-value",
      }),
    ),
    { block: false, reason: "synthetic-form-value" },
  );
  assert.equal(
    decideScreenshotBoundaryPolicy(
      policyInput({
        hardBlockReason: "semantic-label",
        positiveEvidence: "synthetic-form-value",
      }),
    ).block,
    true,
  );
});

test("missing serialized policy decisions fail closed", () => {
  assert.equal(shouldBlockSerializedPolicyDecision(undefined), true);
  assert.equal(
    shouldBlockSerializedPolicyDecision({ block: true, reason: "test" }),
    true,
  );
  assert.equal(
    shouldBlockSerializedPolicyDecision({
      block: false,
      reason: "presentation-syntax",
    }),
    false,
  );
});

test("the browser truth table exactly serializes the shared pure policy", () => {
  const table = buildScreenshotBoundaryPolicyTable();
  let exercised = 0;
  for (const provenanceState of ["valid", "missing", "malformed"]) {
    for (const lengthFamily of ["1", "2-7", "8-31", "32+"]) {
      for (const hardBlockReason of [
        "none",
        ...screenshotBoundaryPolicySchema.hardBlockPriority,
      ]) {
        for (const positiveEvidence of [
          "none",
          ...screenshotBoundaryPolicySchema.positiveEvidencePriority,
        ]) {
          const input = {
            provenanceState,
            lengthFamily,
            hardBlockReason,
            positiveEvidence,
          };
          assert.deepEqual(
            table[screenshotBoundaryPolicyKey(input)],
            decideScreenshotBoundaryPolicy(input),
          );
          exercised += 1;
        }
      }
    }
  }
  assert.equal(Object.keys(table).length, exercised);
  assert.equal(exercised, 1080);
});
