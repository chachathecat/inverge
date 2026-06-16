import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  buildCaptureLegalGroundingHint,
  normalizeCaptureGroundingQuery,
} from "../lib/capture/legal-grounding-hook.ts";

const hookPath = "lib/capture/legal-grounding-hook.ts";
const docsPath = "docs/inverge-capture-legal-grounding-hook.md";

function makeRpcClient(rowsByConcept) {
  const normalized = new Map(Object.entries(rowsByConcept).map(([key, value]) => [key, value]));
  return {
    async rpc(name, params) {
      if (name !== "get_legal_concept_source_anchors") {
        throw new Error(`unexpected rpc: ${String(name)}`);
      }

      const conceptKey = params?.concept_key_filter ?? null;
      const rows = normalized.get(conceptKey) ?? [];

      return {
        data: rows,
        error: null,
      };
    },
  };
}

function anchorRow(values = {}) {
  return {
    concept_key: values.conceptKey ?? "civil_defect",
    concept_label: values.conceptLabel ?? "civil defect",
    exam_subject: values.examSubject ?? "민법",
    unit: values.unit ?? "단원",
    concept_metadata: values.conceptMetadata ?? {},
    anchor_type: values.anchorType ?? "primary_source",
    anchor_confidence: values.anchorConfidence ?? 0.9,
    anchor_metadata: values.anchorMetadata ?? {},
    law_title: values.lawTitle ?? "민법",
    article_no: values.articleNo ?? "제1조",
    article_key: values.articleKey ?? "civil-article-1",
    article_title: values.articleTitle ?? "제1조",
    body_text: values.bodyText ?? "법령 조문 본문",
    chunk_metadata: values.chunkMetadata ?? {},
    source_status: values.sourceStatus ?? "draft",
    needs_official_verification: Object.hasOwn(values, "needsOfficialVerification") ? values.needsOfficialVerification : true,
  };
}

test("capture legal grounding hook file exists", () => {
  assert.equal(existsSync(hookPath), true);
});

test("capture grounding hook normalizes malformed concept and subject inputs", () => {
  assert.equal(normalizeCaptureGroundingQuery("  \n민법  \t "), "민법");
  assert.equal(normalizeCaptureGroundingQuery(""), null);
  assert.equal(normalizeCaptureGroundingQuery("   "), null);
});

test("capture grounding hook supports grounded_draft and blocks explanation", async () => {
  const client = makeRpcClient({
    civil_draft: [
      anchorRow({
        conceptKey: "civil_draft",
        sourceStatus: "draft",
        needsOfficialVerification: true,
      }),
    ],
  });

  const result = await buildCaptureLegalGroundingHint({
    conceptKeyCandidates: ["civil_draft"],
    examSubject: "민법",
    sourceMode: "learner_capture",
    client,
  });

  assert.equal(result.status, "grounded_draft");
  assert.equal(result.canDraftLegalExplanation, false);
  assert.equal(result.needsReview, true);
  assert.equal(result.unsupported, false);
  assert.equal(result.learnerSafeMessage.includes("검수 전"), true);
  assert.equal(result.sourceAnchors.verifiedAnchorCount, 0);
  assert.equal(result.sourceAnchors.summary.length, 1);
});

test("capture grounding hook blocks unsupported concepts and blocks legal explanation", async () => {
  const result = await buildCaptureLegalGroundingHint({
    conceptKeyCandidates: ["civil_unsupported"],
    examSubject: "민법",
    sourceMode: "learner_capture",
    client: makeRpcClient({
      civil_unsupported: [],
    }),
  });

  assert.equal(result.status, "unsupported");
  assert.equal(result.canDraftLegalExplanation, false);
  assert.equal(result.needsReview, true);
  assert.equal(result.unsupported, true);
  assert.equal(result.learnerSafeMessage, "아직 연결된 법령 근거가 없습니다.");
});

test("capture grounding hook returns source_candidates_only when keyword candidates exist but no concept anchors", async () => {
  const result = await buildCaptureLegalGroundingHint({
    conceptKeyCandidates: ["civil_needs_review"],
    examSubject: "민법",
    sourceMode: "learner_capture",
    client: makeRpcClient({
      civil_needs_review: [],
    }),
    keywordCandidates: [{ articleKey: "0001" }],
  });

  assert.equal(result.status, "source_candidates_only");
  assert.equal(result.canDraftLegalExplanation, false);
  assert.equal(result.needsReview, true);
  assert.equal(result.unsupported, false);
});

test("capture grounding hook supports verified anchors and allows draft legal explanation path", async () => {
  const client = makeRpcClient({
    civil_verified: [
      anchorRow({
        conceptKey: "civil_verified",
        sourceStatus: "verified",
        needsOfficialVerification: false,
      }),
    ],
  });

  const result = await buildCaptureLegalGroundingHint({
    conceptKeyCandidates: ["civil_verified"],
    examSubject: "민법",
    sourceMode: "learner_capture",
    client,
  });

  assert.equal(result.status, "grounded_verified");
  assert.equal(result.canDraftLegalExplanation, true);
  assert.equal(result.needsReview, false);
  assert.equal(result.unsupported, false);
  assert.equal(result.learnerSafeMessage, "검증된 법령 근거를 찾았습니다.");
  assert.equal(result.sourceAnchors.summary.length, 1);
  assert.equal(result.sourceAnchors.summary[0].sampleAnchors.length >= 1, true);
});

test("capture grounding hook returns all expected statuses", async () => {
  const client = makeRpcClient({
    civil_verified: [
      anchorRow({
        conceptKey: "civil_verified",
        sourceStatus: "verified",
        needsOfficialVerification: false,
      }),
    ],
    civil_draft: [
      anchorRow({
        conceptKey: "civil_draft",
        sourceStatus: "draft",
        needsOfficialVerification: true,
      }),
    ],
    civil_keyword_only: [],
  });

  const verified = await buildCaptureLegalGroundingHint({
    conceptKeyCandidates: ["civil_verified"],
    examSubject: "민법",
    sourceMode: "learner_capture",
    client,
  });

  const draft = await buildCaptureLegalGroundingHint({
    conceptKeyCandidates: ["civil_draft"],
    examSubject: "민법",
    sourceMode: "learner_capture",
    client,
  });

  const candidates = await buildCaptureLegalGroundingHint({
    conceptKeyCandidates: ["civil_keyword_only"],
    examSubject: "민법",
    sourceMode: "learner_capture",
    client,
    keywordCandidates: [{ articleKey: "a-1" }],
  });

  const unsupported = await buildCaptureLegalGroundingHint({
    conceptKeyCandidates: ["civil_missing"],
    examSubject: "민법",
    sourceMode: "learner_capture",
    client: makeRpcClient({ civil_missing: [] }),
  });

  const statuses = new Set([verified.status, draft.status, candidates.status, unsupported.status]);
  assert.equal(statuses.has("grounded_verified"), true);
  assert.equal(statuses.has("grounded_draft"), true);
  assert.equal(statuses.has("source_candidates_only"), true);
  assert.equal(statuses.has("unsupported"), true);
});

test("capture grounding hook does not use service role key or mutate supabase", async () => {
  const source = readFileSync(hookPath, "utf8");

  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|service_role|createSupabaseAdminClient|createSupabasePersistenceClient/);
  assert.doesNotMatch(source, /\.\s*(insert|update|upsert|delete)\s*\(/i);
});

test("capture grounding hook summary does not expose article body text", async () => {
  const result = await buildCaptureLegalGroundingHint({
    conceptKeyCandidates: ["civil_verified"],
    examSubject: "민법",
    sourceMode: "learner_capture",
    client: makeRpcClient({
      civil_verified: [
        anchorRow({
          conceptKey: "civil_verified",
          sourceStatus: "verified",
          needsOfficialVerification: false,
        }),
      ],
    }),
  });

  const serialized = JSON.stringify(result);
  assert.equal(/body_text/.test(serialized), false);
});

test("capture grounding hook docs define no-source rule and no official grading claims", async () => {
  assert.equal(existsSync(docsPath), true);
  const docs = readFileSync(docsPath, "utf8").toLowerCase();
  assert.match(docs, /no source, no legal claim/);
  assert.match(docs, /검증된 법령 근거를 찾았습니다|draft anchors are not production-ready|draft anchors|검수/);
  assert.match(docs, /no official grading|official model answers|pass-fail|model answer|score prediction/);
});
