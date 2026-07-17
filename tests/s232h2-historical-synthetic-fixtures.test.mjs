import assert from "node:assert/strict";
import test from "node:test";

import {
  historicalS232gRewriteFailureFields,
  historicalS232gOriginalParagraph,
  historicalS232gRewriteParagraph,
  historicalS232gSourceFailureFields,
  isHistoricalS232gAggregateRewrite,
  isHistoricalS232gAggregateSource,
  isHistoricalS232gRewriteCandidate,
  isHistoricalS232gSourceCandidate,
} from "./e2e/support/historical-synthetic-fixtures.ts";

const gap = "조문·요건과 사안 포섭 연결 부족";
const rewriteInstruction = "요건 1개와 사안 포섭 문장 1개를 다시 써보기";
const parentId = "11111111-1111-4111-8111-111111111111";
const parentTitle =
  "S232G aggregate synthetic Study Ledger source 12345678-1";

function fixture(overrides = {}) {
  const title =
    overrides.problemTitle ??
    parentTitle;
  const captureText = `${title}\n내 답안: ${historicalS232gOriginalParagraph}`;
  return {
    examName: "감정평가사 2차",
    subjectLabel: "감정평가실무",
    sourceType: "text",
    problemTitle: title,
    problemIdentifier: "답안 작성",
    rawQuestionText: captureText,
    rawAnswerText: captureText,
    correctAnswer: "-",
    userAnswer: captureText,
    userReasonText: gap,
    confidence: "중간",
    rawPayload: {
      created_from_capture: true,
      capture_intent: "save",
      captureMethod: "text",
      mode: "second",
      artifactType: "second_correction",
      noteKind: "교정노트",
      subjectLabel: "감정평가실무",
      raw_ocr_text: captureText,
      raw_extraction_json: {},
      normalized_draft: null,
      production_before_comparison: true,
      produced_answer_before_reference: true,
      reference_answer_added_after_production: false,
      biggest_gap: gap,
      issue_recall: title,
      outline_draft: null,
      rewrite_completed: false,
      rewrite_source_item_id: null,
      rewrite_source_gap: null,
      rewrite_instruction: rewriteInstruction,
      rewrite_paragraph: null,
      user_confirmed_fields: {
        sourceType: "text",
        subject: "감정평가실무",
        examMode: "second",
        biggest_gap: gap,
        issue_recall: title,
        production_before_comparison: true,
        local_beta_confirmation_available: true,
        persistence_operation_id: "12345678-1234-4123-8123-1234567890ab",
        persistence_work_revision_id: "abcdef12-3456-4789-9234-abcdef123456",
      },
    },
    derivedPayload: { created_from_capture: true },
    ...overrides,
  };
}

function rewriteFixture(overrides = {}) {
  return {
    examName: "감정평가사 2차",
    subjectLabel: "감정평가실무",
    sourceType: "text",
    problemTitle: parentTitle,
    problemIdentifier: "답안 작성",
    rawAnswerText: "",
    correctAnswer: "-",
    userAnswer: "-",
    userReasonText: gap,
    confidence: "중간",
    rawPayload: {
      created_from_capture: true,
      capture_intent: "save",
      captureMethod: "text",
      mode: "second",
      artifactType: "second_correction",
      noteKind: "교정노트",
      subjectLabel: "감정평가실무",
      raw_ocr_text: "",
      raw_extraction_json: {},
      normalized_draft: null,
      rewrite_source_item_id: parentId,
      rewrite_source_gap: gap,
      rewrite_instruction: rewriteInstruction,
      rewrite_paragraph: historicalS232gRewriteParagraph,
      rewrite_completed: true,
      issue_recall: null,
      outline_draft: null,
      production_before_comparison: true,
      produced_answer_before_reference: true,
      reference_answer_added_after_production: true,
      biggest_gap: gap,
      user_confirmed_fields: {
        biggest_gap: gap,
        captureQualityIssue: null,
        correctAnswer: "-",
        examMode: "second",
        hasManualCorrection: false,
        issue_recall: null,
        lowConfidenceFlag: false,
        nextReviewDate: "2026-07-18",
        ocrConfirmedByLearner: false,
        outline_draft: null,
        pageCount: 0,
        persistence_operation_id: "12345678-1234-4123-8123-1234567890ab",
        persistence_work_revision_id: "abcdef12-3456-4789-9234-abcdef123456",
        problemTitle: parentTitle,
        produced_answer_before_reference: true,
        production_before_comparison: true,
        reference_answer_added_after_production: true,
        rewrite_completed: true,
        rewrite_instruction: rewriteInstruction,
        rewrite_paragraph: historicalS232gRewriteParagraph,
        rewrite_source_gap: gap,
        rewrite_source_item_id: parentId,
        sourceType: "text",
        subject: "감정평가실무",
        subjectLabel: "감정평가실무",
        timeSpentMinutes: null,
        userAnswer: "",
        userReasonPreset: "",
        userReasonText: gap,
      },
    },
    derivedPayload: { created_from_capture: true },
    ...overrides,
  };
}

function withoutPersistenceIds(confirmed) {
  const {
    persistence_operation_id: ignoredOperationId,
    persistence_work_revision_id: ignoredWorkRevisionId,
    ...legacy
  } = confirmed;
  assert.equal(typeof ignoredOperationId, "string");
  assert.equal(typeof ignoredWorkRevisionId, "string");
  return legacy;
}

function withoutConfirmedKey(confirmed, key) {
  const partial = { ...confirmed };
  delete partial[key];
  return partial;
}

test("S232H.2 recognizes only the exact retired S232G source grammar", () => {
  assert.equal(isHistoricalS232gSourceCandidate(fixture()), true);
  assert.deepEqual(historicalS232gSourceFailureFields(fixture()), []);
  assert.equal(isHistoricalS232gAggregateSource(fixture()), true);
  const currentSource = fixture();
  const legacySource = fixture({
    rawPayload: {
      ...currentSource.rawPayload,
      user_confirmed_fields: withoutPersistenceIds(
        currentSource.rawPayload.user_confirmed_fields,
      ),
    },
  });
  assert.deepEqual(historicalS232gSourceFailureFields(legacySource), []);
  assert.equal(isHistoricalS232gAggregateSource(legacySource), true);
  for (const key of [
    "persistence_operation_id",
    "persistence_work_revision_id",
  ]) {
    const partialSource = fixture({
      rawPayload: {
        ...currentSource.rawPayload,
        user_confirmed_fields: withoutConfirmedKey(
          currentSource.rawPayload.user_confirmed_fields,
          key,
        ),
      },
    });
    assert.equal(isHistoricalS232gAggregateSource(partialSource), false);
  }
  assert.equal(
    isHistoricalS232gAggregateSource(
      fixture({
        problemTitle:
          "S232G aggregate synthetic Study Ledger source local-1",
      }),
    ),
    false,
  );
  assert.equal(
    isHistoricalS232gAggregateSource(
      fixture({
        problemTitle:
          "S232G aggregate synthetic Study Ledger source 01234567-1",
      }),
    ),
    false,
  );
  assert.equal(
    isHistoricalS232gAggregateSource(
      fixture({ rawQuestionText: "PRIVATE_LEARNER_VALUE_DO_NOT_LOG" }),
    ),
    false,
  );
  const privateValueFailures = historicalS232gSourceFailureFields(
    fixture({ rawQuestionText: "PRIVATE_LEARNER_VALUE_DO_NOT_LOG" }),
  );
  assert.deepEqual(privateValueFailures, ["item.rawQuestionText"]);
  assert.equal(privateValueFailures.join(" ").includes("PRIVATE_LEARNER"), false);
  assert.equal(
    isHistoricalS232gAggregateSource(
      fixture({ userAnswer: `${historicalS232gOriginalParagraph} changed` }),
    ),
    false,
  );
  assert.equal(
    isHistoricalS232gAggregateSource(
      fixture({
        rawPayload: {
          ...fixture().rawPayload,
          user_confirmed_fields: {
            ...fixture().rawPayload.user_confirmed_fields,
            local_beta_confirmation_available: false,
          },
        },
      }),
    ),
    false,
  );
  assert.equal(
    isHistoricalS232gAggregateSource(
      fixture({
        rawPayload: {
          ...fixture().rawPayload,
          user_confirmed_fields: {
            ...fixture().rawPayload.user_confirmed_fields,
            persistence_work_revision_id:
              fixture().rawPayload.user_confirmed_fields
                .persistence_operation_id,
          },
        },
      }),
    ),
    false,
  );
  assert.equal(
    isHistoricalS232gAggregateSource(
      fixture({
        rawPayload: {
          ...fixture().rawPayload,
          user_confirmed_fields: {
            ...fixture().rawPayload.user_confirmed_fields,
            unexpected_extra: true,
          },
        },
      }),
    ),
    false,
  );
  assert.equal(historicalS232gRewriteParagraph.includes("비민감"), true);
});

test("S232H.2 recognizes only a rewrite with exact S232G parent binding", () => {
  assert.equal(isHistoricalS232gRewriteCandidate(rewriteFixture()), true);
  assert.deepEqual(
    historicalS232gRewriteFailureFields(
      rewriteFixture(),
      parentId,
      parentTitle,
    ),
    [],
  );
  const currentRewrite = rewriteFixture();
  const legacyRewrite = rewriteFixture({
    rawPayload: {
      ...currentRewrite.rawPayload,
      user_confirmed_fields: withoutPersistenceIds(
        currentRewrite.rawPayload.user_confirmed_fields,
      ),
    },
  });
  assert.deepEqual(
    historicalS232gRewriteFailureFields(
      legacyRewrite,
      parentId,
      parentTitle,
    ),
    [],
  );
  assert.equal(
    isHistoricalS232gAggregateRewrite(
      legacyRewrite,
      parentId,
      parentTitle,
    ),
    true,
  );
  for (const key of [
    "persistence_operation_id",
    "persistence_work_revision_id",
  ]) {
    const partialRewrite = rewriteFixture({
      rawPayload: {
        ...currentRewrite.rawPayload,
        user_confirmed_fields: withoutConfirmedKey(
          currentRewrite.rawPayload.user_confirmed_fields,
          key,
        ),
      },
    });
    assert.equal(
      isHistoricalS232gAggregateRewrite(
        partialRewrite,
        parentId,
        parentTitle,
      ),
      false,
    );
  }
  assert.equal(
    isHistoricalS232gAggregateRewrite(
      rewriteFixture(),
      "22222222-2222-4222-8222-222222222222",
      parentTitle,
    ),
    false,
  );
  assert.equal(
    isHistoricalS232gAggregateRewrite(
      rewriteFixture(),
      parentId,
      parentTitle,
    ),
    true,
  );

  const base = rewriteFixture();
  assert.equal(
    isHistoricalS232gAggregateRewrite(
      rewriteFixture({
        rawPayload: {
          ...base.rawPayload,
          rewrite_paragraph:
            "사업인정은 공익사업 시행을 확정하는 합성 테스트 문단입니다.",
        },
      }),
      parentId,
      parentTitle,
    ),
    false,
  );
  assert.equal(
    isHistoricalS232gAggregateRewrite(
      rewriteFixture({
        rawPayload: {
          ...base.rawPayload,
          user_confirmed_fields: {
            ...base.rawPayload.user_confirmed_fields,
            rewrite_source_item_id:
              "22222222-2222-4222-8222-222222222222",
          },
        },
      }),
      parentId,
      parentTitle,
    ),
    false,
  );
  assert.equal(
    isHistoricalS232gAggregateRewrite(
      rewriteFixture({
        rawPayload: {
          ...base.rawPayload,
          user_confirmed_fields: {
            ...base.rawPayload.user_confirmed_fields,
            unexpected_extra: true,
          },
        },
      }),
      parentId,
      parentTitle,
    ),
    false,
  );
  assert.equal(
    isHistoricalS232gAggregateRewrite(
      rewriteFixture({
        rawPayload: {
          ...base.rawPayload,
          created_from_capture: false,
        },
      }),
      parentId,
      parentTitle,
    ),
    false,
  );
  assert.equal(
    isHistoricalS232gAggregateRewrite(
      rewriteFixture({
        rawPayload: {
          ...base.rawPayload,
          user_confirmed_fields: {
            ...base.rawPayload.user_confirmed_fields,
            userAnswer: "-",
          },
        },
      }),
      parentId,
      parentTitle,
    ),
    false,
  );
  assert.equal(
    isHistoricalS232gAggregateRewrite(
      rewriteFixture({
        rawPayload: {
          ...base.rawPayload,
          user_confirmed_fields: {
            ...base.rawPayload.user_confirmed_fields,
            persistence_work_revision_id:
              base.rawPayload.user_confirmed_fields
                .persistence_operation_id,
          },
        },
      }),
      parentId,
      parentTitle,
    ),
    false,
  );
  const {
    rewrite_paragraph: ignoredRewriteParagraph,
    ...confirmedWithoutParagraph
  } = base.rawPayload.user_confirmed_fields;
  assert.equal(typeof ignoredRewriteParagraph, "string");
  assert.equal(
    isHistoricalS232gAggregateRewrite(
      rewriteFixture({
        rawPayload: {
          ...base.rawPayload,
          user_confirmed_fields: confirmedWithoutParagraph,
        },
      }),
      parentId,
      parentTitle,
    ),
    false,
  );
});
