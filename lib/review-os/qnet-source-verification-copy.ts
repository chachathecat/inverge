import type { QnetTodayPlanReference } from "./qnet-reference-today-plan-adapter";

export type QnetSourceVerificationCopy = {
  badge: string;
  title: string;
  body: string;
  shortNote: string;
  metadataOnly: true;
  safeUse: "qnet_source_verification_copy_only";
};

type QnetReferenceLike = Partial<QnetTodayPlanReference> | null | undefined;

const BADGE_COPY = "공식자료 metadata 참고";
const TITLE_COPY = "공식자료 기반 출제영역 후보";
const BODY_COPY =
  "Q-Net 공식자료의 metadata만 참고해 과목, 출제영역, 복습 우선순위 정보를 보강했습니다. 표시되는 내용은 분류 보조 신호이며, 원문이나 풀이 내용을 보여주거나 결과를 판정하는 기능이 아닙니다.";
const SHORT_NOTE_COPY = "분류 보조 신호입니다. 애매하면 원 자료와 내 기록을 직접 확인해 주세요.";

const FORBIDDEN_FIELD_NAMES = new Set([
  "rawText",
  "rawUserText",
  "rawOcrText",
  "ocrText",
  "ocrFullText",
  "rawAnswerText",
  "answerText",
  "rawProblemText",
  "rawQuestionText",
  "problemText",
  "questionText",
  "officialAnswer",
  "officialAnswerBody",
  "modelAnswer",
  "explanationBody",
  "fullText",
  "sourceText",
  "sourceExcerpt",
  "sourceUrl",
  "copyrightedText",
  "originalText",
  "localFileName",
  "localRawFileName",
  "score",
  "officialScore",
  "predictedScore",
  "passFail",
  "passGuarantee",
]);

const FORBIDDEN_COPY_PATTERNS = [
  /https?:\/\//i,
  /\bsource\s+excerpt\b/i,
  /\bofficial\s+grading\b/i,
  /\bofficial\s+score\b/i,
  /\bscore\s*prediction\b/i,
  /\bpass\s*\/\s*fail\b/i,
  /\bpass[-\s]*fail\b/i,
  /\bmodel\s+answer\b/i,
  /\bpass\s*guarantee\b/i,
  /local[_\s-]*official[_\s-]*materials/i,
  /qnet[_\s-]*manifest\.json/i,
  /\.(?:pdf|hwp|hwpx|doc|docx|zip|png|jpe?g|webp|gif|tiff?)\b/i,
  /공식\s*채점/,
  /공식\s*점수/,
  /점수\s*예측/,
  /합불/,
  /합격\s*보장/,
  /모범\s*답안/,
  /모범답안/,
  /기준\s*정답/,
  /공식\s*정답/,
  /공식\s*해설/,
  /정답\s*제공/,
  /해설\s*제공/,
  /게으름/,
  /망했/,
  /불합격/,
  /공포/,
  /부끄/,
  /순위\s*하락/,
  /streak/i,
  /casino/i,
  /gacha/i,
  /random\s*reward/i,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function hasReferenceMetadata(reference: QnetReferenceLike) {
  if (!isRecord(reference)) return false;
  return Boolean(
    stringArray(reference.matchedSourceIds).length
    || stringArray(reference.matchedTopics).length
    || stringArray(reference.matchedCurriculumNodeCandidates).length
    || stringArray(reference.trapPatternCandidates).length
    || stringArray(reference.answerSkeletonTags).length
    || stringArray(reference.calculationTemplateCandidates).length
    || reference.casioRelevant === true
  );
}

export function shouldShowQnetSourceVerificationCopy(qnetReference?: QnetReferenceLike) {
  if (!isRecord(qnetReference)) return false;
  if (qnetReference.metadataOnly !== true || qnetReference.safeUse !== "metadata_reference_only") return false;
  return hasReferenceMetadata(qnetReference);
}

export function buildQnetSourceVerificationBadge(qnetReference?: QnetReferenceLike) {
  if (!shouldShowQnetSourceVerificationCopy(qnetReference)) return null;
  assertSafeQnetSourceVerificationCopy(BADGE_COPY);
  return BADGE_COPY;
}

export function buildQnetSourceVerificationCopy(qnetReference?: QnetReferenceLike): QnetSourceVerificationCopy | null {
  if (!shouldShowQnetSourceVerificationCopy(qnetReference)) return null;

  const copy: QnetSourceVerificationCopy = {
    badge: BADGE_COPY,
    title: TITLE_COPY,
    body: BODY_COPY,
    shortNote: SHORT_NOTE_COPY,
    metadataOnly: true,
    safeUse: "qnet_source_verification_copy_only",
  };
  assertSafeQnetSourceVerificationCopy(copy);
  return copy;
}

export function assertSafeQnetSourceVerificationCopy(value: unknown): asserts value is QnetSourceVerificationCopy {
  const visited = new WeakSet<object>();

  function visit(entry: unknown) {
    if (typeof entry === "string") {
      if (entry.length > 320 || /[\r\n]/.test(entry)) throw new Error("unsafe-qnet-source-verification-copy");
      const forbidden = FORBIDDEN_COPY_PATTERNS.find((pattern) => pattern.test(entry));
      if (forbidden) throw new Error("unsafe-qnet-source-verification-copy");
      return;
    }
    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }
    if (!isRecord(entry) || visited.has(entry)) return;
    visited.add(entry);

    for (const [key, nested] of Object.entries(entry)) {
      if (FORBIDDEN_FIELD_NAMES.has(key)) throw new Error("unsafe-qnet-source-verification-copy");
      visit(nested);
    }
  }

  visit(value);
  if (isRecord(value) && "metadataOnly" in value && value.metadataOnly !== true) {
    throw new Error("unsafe-qnet-source-verification-copy");
  }
  if (isRecord(value) && "safeUse" in value && value.safeUse !== "qnet_source_verification_copy_only") {
    throw new Error("unsafe-qnet-source-verification-copy");
  }
}
