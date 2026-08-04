import assert from "node:assert/strict";
import test from "node:test";

import { compileOwnerAlphaPracticeProblem } from "../lib/review-os/owner-alpha-practice-compiler.ts";
import {
  isOwnerAlphaLawReasoningPath,
  ownerAlphaLawReasoningPathProjection,
  verifyOwnerAlphaLawRepair,
} from "../lib/review-os/owner-alpha-law-reasoning-path.ts";

const compiled = compileOwnerAlphaPracticeProblem({
  problemId: "synthetic-source-bound-law",
  problemText:
    "적용 법령의 유효일은 2026.07.04이다. 공익사업법 제10조 제1항의 절차가 문제된다. 제시된 사실을 요건별로 대응하고 사안 포섭, 법적 효과와 결론을 검토하시오.",
  subject: "appraisal_compensation_law",
});
assert.equal(compiled.subjectAdapter.adapter, "LawAdapter");

function sourceBoundAdapter() {
  const adapter = structuredClone(compiled.subjectAdapter);
  adapter.applicableLawCandidates = [
    {
      label: "공익사업법",
      state: "official_source_grounded",
      officialSourceRefId: "official-law-ref-1",
    },
  ];
  adapter.articleAndParagraphReferences = [
    {
      citation: "공익사업법 제10조 제1항",
      state: "official_source_grounded",
      officialSourceRefId: "official-article-ref-1",
      effectiveAt: "2026.07.04",
    },
  ];
  adapter.effectiveDateRequirement = {
    required: true,
    effectiveAt: "2026.07.04",
    state: "official_source_grounded",
    officialSourceRefId: "official-law-version-ref-1",
  };
  adapter.unresolvedSourceOrVersionIssue = [];
  return adapter;
}

const initialCommitment = {
  issueFraming: "제10조 제1항의 절차상 요건 충족 여부가 쟁점이다.",
  legalBasisPlan: "적용 법령과 조문을 공식 원문·유효일에 묶어 확인한다.",
  requirementEffectPlan: "각 요건과 불충족 시 법적 효과를 나누어 쓴다.",
  factApplicationDirection: "제시 사실을 각 요건에 대응한 뒤 포섭한다.",
  tentativeConclusion: "절차 요건 충족 여부에 따라 결론을 나눈다.",
  confidence: "medium",
  committedAt: "2026-08-04T00:00:00.000Z",
};

function path(adapter = sourceBoundAdapter()) {
  return ownerAlphaLawReasoningPathProjection({
    pathId: "synthetic-law:path",
    problemRevisionChecksum: "problem-revision-sha256",
    adapterBasisChecksum: "adapter-basis-sha256",
    adapter,
    initialCommitment: structuredClone(initialCommitment),
    basisChecksum: "initial-basis-sha256",
  });
}

function repair(overrides = {}) {
  return {
    issue: "제10조 제1항의 절차상 요건 충족 여부",
    authorityBindings: [
      {
        authorityKind: "law",
        label: "공익사업법",
        officialSourceRefId: "official-law-ref-1",
      },
      {
        authorityKind: "article",
        label: "공익사업법 제10조 제1항",
        officialSourceRefId: "official-article-ref-1",
      },
    ],
    effectiveDate: "2026.07.04",
    requirements: [
      {
        requirementId: "req-1",
        requirement: "법정 절차를 순서에 따라 이행할 것",
        legalEffect: "미이행 시 해당 처분의 위법 사유가 될 수 있음",
      },
    ],
    requirementFactMappings: [
      {
        requirementId: "req-1",
        factApplication: "제시 사실의 통지와 신청 순서를 절차 요건에 대응한다.",
      },
    ],
    application: "제시 사실의 통지 시점과 신청 순서를 각 절차 요건에 포섭한다.",
    conclusion: "요건 충족 여부에 따라 절차상 위법 여부를 구분한다.",
    procedure: "통지-신청-결정의 절차 순서를 확인한다.",
    precedentOrAdjudication: null,
    opposingInterpretation: null,
    ...overrides,
  };
}

function verify(options = {}) {
  const adapter = options.adapter ?? sourceBoundAdapter();
  const submission = options.submission ?? repair();
  const revisedCommitment = {
    issueFraming: submission.issue,
    legalBasisPlan: submission.authorityBindings
      .map((item) => `${item.label}:${item.officialSourceRefId}`)
      .join("\n"),
    requirementEffectPlan: submission.requirements
      .map((item) => `${item.requirement}:${item.legalEffect}`)
      .join("\n"),
    factApplicationDirection: submission.application,
    tentativeConclusion: submission.conclusion,
    confidence: "medium",
    committedAt: "2026-08-04T01:00:00.000Z",
  };
  return verifyOwnerAlphaLawRepair({
    path: options.path ?? path(adapter),
    adapter,
    revisedCommitment,
    submission,
    supportedAt: "2026-08-04T01:00:00.000Z",
    problemRevisionChecksum:
      options.problemRevisionChecksum ?? "problem-revision-sha256",
    adapterBasisChecksum:
      options.adapterBasisChecksum ?? "adapter-basis-sha256",
    basisChecksum: "repair-basis-sha256",
  });
}

test("explicit synthetic source-bound LawAdapter reaches only bounded source-version structural support", () => {
  const projected = path();
  assert.equal(projected.repairVerification.status, "not_started");
  assert.equal(projected.postCommitStoredAuthorities.length, 2);
  assert.equal(projected.postCommitEffectiveDate.state, "official_source_grounded");
  assert.equal(isOwnerAlphaLawReasoningPath(projected), true);

  const supported = verify();
  assert.equal(
    supported.repairVerification.status,
    "source_version_structurally_supported",
  );
  assert.equal(
    supported.repairVerification.scope,
    "source_version_and_structure_only",
  );
  assert.deepEqual(supported.initialCommitment, initialCommitment);
  for (const forbidden of ["score", "correct", "verified", "legalCorrectness", "mastery"]) {
    assert.equal(forbidden in supported.repairVerification, false);
  }
  assert.equal(isOwnerAlphaLawReasoningPath(supported), true);
});

test("naturally unresolved compiler sources stay blocked", () => {
  const adapter = structuredClone(compiled.subjectAdapter);
  const blocked = verify({ adapter, path: path(adapter) });
  assert.equal(blocked.repairVerification.status, "blocked");
  assert.ok(
    blocked.repairVerification.blockerCodes.some(
      (code) => code.endsWith(":unresolved") || code.endsWith(":unbound") || code.endsWith(":stale"),
    ),
  );
});

test("missing, invented, duplicate, unbound, stale, or conflicting source bindings block", () => {
  const cases = [
    repair({ authorityBindings: [] }),
    repair({
      authorityBindings: [
        {
          authorityKind: "law",
          label: "꾸며낸 법령",
          officialSourceRefId: "invented-source-ref",
        },
      ],
    }),
    repair({
      authorityBindings: [
        repair().authorityBindings[0],
        structuredClone(repair().authorityBindings[0]),
      ],
    }),
  ];
  for (const submission of cases) {
    const blocked = verify({ submission });
    assert.equal(blocked.repairVerification.status, "blocked");
    assert.equal(blocked.repairVerification.supportedAt, null);
  }

  const staleAdapter = sourceBoundAdapter();
  staleAdapter.unresolvedSourceOrVersionIssue = ["공식 원문 버전 재확인 필요"];
  const stale = verify({ adapter: staleAdapter, path: path(staleAdapter) });
  assert.equal(stale.repairVerification.status, "blocked");

  const conflictingAdapter = sourceBoundAdapter();
  conflictingAdapter.articleAndParagraphReferences.push({
    citation: "공익사업법 제11조",
    state: "official_source_grounded",
    officialSourceRefId: "official-article-ref-2",
    effectiveAt: "2026.07.05",
  });
  const conflicting = verify({
    adapter: conflictingAdapter,
    path: path(conflictingAdapter),
  });
  assert.equal(conflicting.repairVerification.status, "blocked");
  assert.ok(
    conflicting.repairVerification.blockerCodes.includes(
      "law_repair:effective_date:conflicting",
    ),
  );

  const malformedPromotion = sourceBoundAdapter();
  malformedPromotion.applicableLawCandidates[0].officialSourceRefId = null;
  const malformed = verify({
    adapter: malformedPromotion,
    path: path(malformedPromotion),
  });
  assert.equal(malformed.repairVerification.status, "blocked");
  assert.ok(
    malformed.repairVerification.blockerCodes.includes(
      "law_repair:adapter_or_problem_basis_mismatch",
    ),
  );
});

test("an unrelated or mismatched date cannot satisfy the exact legal effective-date gate", () => {
  for (const effectiveDate of ["2026.07.03", "2026.08.01", "거래일 2026.07.04"]) {
    const blocked = verify({ submission: repair({ effectiveDate }) });
    assert.equal(blocked.repairVerification.status, "blocked");
    assert.ok(
      blocked.repairVerification.blockerCodes.includes(
        "law_repair:effective_date:mismatch",
      ),
    );
  }
});

test("requirements, fact mapping, conditional procedure, application, and conclusion all fail closed", () => {
  const cases = [
    repair({ requirements: [] }),
    repair({ requirementFactMappings: [] }),
    repair({
      requirementFactMappings: [
        { requirementId: "unknown", factApplication: "연결할 수 없는 사실" },
      ],
    }),
    repair({ procedure: null }),
    repair({ application: "" }),
    repair({ conclusion: "" }),
  ];
  for (const submission of cases) {
    assert.equal(verify({ submission }).repairVerification.status, "blocked");
  }
});

test("problem or adapter basis drift blocks while preserving the original commitment", () => {
  for (const options of [
    { problemRevisionChecksum: "different-problem" },
    { adapterBasisChecksum: "different-adapter" },
  ]) {
    const blocked = verify(options);
    assert.equal(blocked.repairVerification.status, "blocked");
    assert.deepEqual(blocked.initialCommitment, initialCommitment);
  }
});

test("type guard rejects AI self-promotion and authoritative fields", () => {
  const supported = verify();
  for (const [target, key, value] of [
    ["verification", "verified", true],
    ["verification", "legalCorrectness", true],
    ["verification", "score", 100],
    ["path", "official", true],
  ]) {
    const forged = structuredClone(supported);
    if (target === "verification") forged.repairVerification[key] = value;
    else forged[key] = value;
    assert.equal(isOwnerAlphaLawReasoningPath(forged), false);
  }
});

test("invalid initial law commitments are rejected before path projection", () => {
  for (const invalidCommitment of [
    { ...initialCommitment, issueFraming: "" },
    { ...initialCommitment, legalBasisPlan: "" },
    { ...initialCommitment, requirementEffectPlan: "" },
    { ...initialCommitment, factApplicationDirection: "" },
    { ...initialCommitment, tentativeConclusion: "" },
    { ...initialCommitment, committedAt: "not-a-time" },
  ]) {
    assert.throws(
      () =>
        ownerAlphaLawReasoningPathProjection({
          pathId: "invalid-law:path",
          problemRevisionChecksum: "problem-revision-sha256",
          adapterBasisChecksum: "adapter-basis-sha256",
          adapter: sourceBoundAdapter(),
          initialCommitment: invalidCommitment,
          basisChecksum: "initial-basis-sha256",
        }),
      /invalid_initial_commitment/,
    );
  }
});
