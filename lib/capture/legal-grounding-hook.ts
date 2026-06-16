import { evaluateLegalGroundingGuard, type LegalGroundingGuardStatus } from "../legal/legal-grounded-explanation-guard";

const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/g;
const WHITESPACE_PATTERN = /\s+/g;
const MAX_QUERY_LENGTH = 160;

export type CaptureLegalGroundingMode = "learner_capture";
export type CaptureLegalGroundingHookStatus = LegalGroundingGuardStatus;

type CaptureLegalGroundingInputCandidate = {
  conceptKey?: string | null;
};

type LegalSourceAnchorRow = {
  concept_key: unknown;
  concept_label: unknown;
  exam_subject: unknown;
  unit: unknown;
  concept_metadata: unknown;
  anchor_type: unknown;
  anchor_confidence: unknown;
  anchor_metadata: unknown;
  law_title: unknown;
  article_no: unknown;
  article_key: unknown;
  article_title: unknown;
  body_text: unknown;
  chunk_metadata: unknown;
  source_status: unknown;
  needs_official_verification: unknown;
};

export type LegalConceptSourceAnchor = {
  conceptKey: string;
  conceptLabel: string;
  examSubject: string;
  lawTitle: string;
  articleNo: string;
  articleKey: string;
  sourceStatus: string;
  needsOfficialVerification: boolean;
};

export type LegalConceptSourceAnchorClient = {
  rpc: (
    fn: "get_legal_concept_source_anchors",
    params: {
      concept_key_filter: string | null;
      exam_subject_filter: string | null;
      match_count: number;
    },
  ) => Promise<{ data: unknown; error: unknown }>;
};

export type CaptureLegalGroundingHookInput = {
  conceptKeyCandidates: readonly (string | CaptureLegalGroundingInputCandidate)[] | null;
  examSubject: string | null;
  subject?: string | null;
  sourceMode: CaptureLegalGroundingMode;
  keywordCandidates?: readonly unknown[] | null;
  client?: LegalConceptSourceAnchorClient | null;
};

export type CaptureLegalGroundingHookAnchorSummary = {
  conceptKey: string;
  sourceCount: number;
  verifiedCount: number;
  draftLikeCount: number;
  sampleAnchors: Array<{
    lawTitle: string;
    articleNo: string;
    articleKey: string;
    sourceStatus: string;
    needsOfficialVerification: boolean;
  }>;
};

export type CaptureLegalGroundingHint = {
  status: CaptureLegalGroundingHookStatus;
  canDraftLegalExplanation: boolean;
  needsReview: boolean;
  unsupported: boolean;
  sourceAnchors: {
    conceptCandidateCount: number;
    sourceAnchorCount: number;
    verifiedAnchorCount: number;
    draftOrReviewRequiredAnchorCount: number;
    summary: CaptureLegalGroundingHookAnchorSummary[];
  };
  learnerSafeMessage: string;
};

export function normalizeCaptureGroundingQuery(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(CONTROL_CHAR_PATTERN, " ")
    .replace(WHITESPACE_PATTERN, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);

  return normalized.length > 0 ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return true;
}

function toLegalConceptSourceAnchor(row: LegalSourceAnchorRow): LegalConceptSourceAnchor | null {
  const conceptKey = readString(row.concept_key);
  const conceptLabel = readString(row.concept_label);
  const examSubject = readString(row.exam_subject);
  const lawTitle = readString(row.law_title);
  const articleNo = readString(row.article_no);
  const articleKey = readString(row.article_key);

  if (!conceptKey || !conceptLabel || !examSubject || !lawTitle || !articleNo || !articleKey) {
    return null;
  }

  return {
    conceptKey,
    conceptLabel,
    examSubject,
    lawTitle,
    articleNo,
    articleKey,
    sourceStatus: readString(row.source_status) || "draft",
    needsOfficialVerification: readBoolean(row.needs_official_verification),
  };
}

function summarizeConceptAnchorStatus(anchors: readonly LegalConceptSourceAnchor[]): Array<CaptureLegalGroundingHookAnchorSummary> {
  if (anchors.length === 0) {
    return [];
  }

  const map = new Map<string, LegalConceptSourceAnchor[]>();

  for (const anchor of anchors) {
    const key = anchor.conceptKey;
    const list = map.get(key);
    if (list) {
      list.push(anchor);
    } else {
      map.set(key, [anchor]);
    }
  }

  return Array.from(map.entries())
    .map(([conceptKey, conceptAnchors]) => {
      let verifiedCount = 0;
      let draftLikeCount = 0;

      for (const anchor of conceptAnchors) {
        if (anchor.sourceStatus === "verified" && anchor.needsOfficialVerification !== true) {
          verifiedCount += 1;
        } else {
          draftLikeCount += 1;
        }
      }

      return {
        conceptKey,
        sourceCount: conceptAnchors.length,
        verifiedCount,
        draftLikeCount,
        sampleAnchors: conceptAnchors.slice(0, 2).map((anchor) => ({
          lawTitle: anchor.lawTitle,
          articleNo: anchor.articleNo,
          articleKey: anchor.articleKey,
          sourceStatus: anchor.sourceStatus,
          needsOfficialVerification: anchor.needsOfficialVerification,
        })),
      };
    })
    .sort((a, b) => a.conceptKey.localeCompare(b.conceptKey));
}

function buildUnsupportedHint(message: string): CaptureLegalGroundingHint {
  return {
    status: "unsupported",
    canDraftLegalExplanation: false,
    needsReview: true,
    unsupported: true,
    sourceAnchors: {
      conceptCandidateCount: 0,
      sourceAnchorCount: 0,
      verifiedAnchorCount: 0,
      draftOrReviewRequiredAnchorCount: 0,
      summary: [],
    },
    learnerSafeMessage: message,
  };
}

function summarizeHookAnchors(conceptAnchors: readonly LegalConceptSourceAnchor[]) {
  let verifiedAnchorCount = 0;
  let draftLikeCount = 0;

  for (const anchor of conceptAnchors) {
    if (anchor.sourceStatus === "verified" && anchor.needsOfficialVerification !== true) {
      verifiedAnchorCount += 1;
    } else {
      draftLikeCount += 1;
    }
  }

  const summary = summarizeConceptAnchorStatus(conceptAnchors);

  return {
    sourceAnchorCount: conceptAnchors.length,
    verifiedAnchorCount,
    draftOrReviewRequiredAnchorCount: draftLikeCount,
    summary,
  };
}

function resolveLearnerSafeMessage(status: CaptureLegalGroundingHookStatus) {
  if (status === "grounded_verified") {
    return "검증된 법령 근거를 찾았습니다.";
  }

  if (status === "grounded_draft" || status === "source_candidates_only") {
    return "법령 근거 후보가 있지만 아직 검수 전입니다.";
  }

  return "아직 연결된 법령 근거가 없습니다.";
}

function normalizeCandidateValues(candidates: CaptureLegalGroundingHookInput["conceptKeyCandidates"]): string[] {
  if (!Array.isArray(candidates)) {
    return [];
  }

  const normalized = candidates
    .map((candidate) => {
      if (typeof candidate === "string") {
        return normalizeCaptureGroundingQuery(candidate);
      }

      if (candidate && typeof candidate === "object" && "conceptKey" in candidate) {
        return normalizeCaptureGroundingQuery(candidate.conceptKey);
      }

      return null;
    })
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const unique = new Set(normalized);

  return [...unique];
}

async function loadSourceAnchorsForCandidate(input: {
  conceptKey: string;
  examSubject: string;
  client: LegalConceptSourceAnchorClient | null;
}) {
  if (!input.client) {
    return [];
  }

  const { data, error } = await input.client.rpc("get_legal_concept_source_anchors", {
    concept_key_filter: input.conceptKey,
    exam_subject_filter: input.examSubject,
    match_count: 12,
  });

  if (error) {
    throw new Error("capture grounding anchor lookup failed");
  }

  const rows = Array.isArray(data) ? data : [];
  const parsed = rows
    .map((row) => (isRecord(row) ? toLegalConceptSourceAnchor(row as LegalSourceAnchorRow) : null))
    .filter((anchor): anchor is LegalConceptSourceAnchor => anchor !== null);

  return parsed;
}

export async function buildCaptureLegalGroundingHint(input: CaptureLegalGroundingHookInput): Promise<CaptureLegalGroundingHint> {
  const conceptKeys = normalizeCandidateValues(input?.conceptKeyCandidates);
  const examSubject = normalizeCaptureGroundingQuery(input?.examSubject);
  const normalizedSourceMode = input?.sourceMode === "learner_capture" ? "learner_capture" : null;
  const keywordCandidates = Array.isArray(input?.keywordCandidates) ? input.keywordCandidates.filter(Boolean) : [];

  if (conceptKeys.length === 0 || normalizedSourceMode !== "learner_capture" || !examSubject) {
    return buildUnsupportedHint(resolveLearnerSafeMessage("unsupported"));
  }

  const resultList = await Promise.all(
    conceptKeys.map((conceptKey) =>
      loadSourceAnchorsForCandidate({
        conceptKey,
        examSubject,
        client: input?.client ?? null,
      }),
    ),
  );

  const conceptAnchors = resultList.flatMap((result) => result);
  const summary = summarizeHookAnchors(conceptAnchors);
  const decision = evaluateLegalGroundingGuard({
    conceptAnchors,
    conceptKey: conceptKeys[0] ?? null,
    keywordCandidates,
  });

  return {
    status: decision.status,
    canDraftLegalExplanation: decision.canDraftLegalExplanation,
    needsReview: decision.needsReview,
    unsupported: decision.unsupported,
    sourceAnchors: {
      conceptCandidateCount: conceptKeys.length,
      sourceAnchorCount: summary.sourceAnchorCount,
      verifiedAnchorCount: summary.verifiedAnchorCount,
      draftOrReviewRequiredAnchorCount: summary.draftOrReviewRequiredAnchorCount,
      summary: summary.summary,
    },
    learnerSafeMessage: resolveLearnerSafeMessage(decision.status),
  };
}
