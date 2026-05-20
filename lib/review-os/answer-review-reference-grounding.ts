import type { AnswerReviewStructureDraft } from "../evaluate/answer-review-structure";
import { findPastExamReferenceMatches, listPastExamReferences, type PastExamReferenceItem } from "./past-exam-reference";

type GroundingInput = {
  examMode: "first" | "second";
  subject: string;
  questionText?: string;
  answerText?: string;
  referenceText?: string;
  normalizedDraft?: AnswerReviewStructureDraft | null;
};

type GroundingReference = Pick<
  PastExamReferenceItem,
  | "id"
  | "exam_year"
  | "subject"
  | "topic_tags"
  | "issue_tags"
  | "skill_tags"
  | "expected_answer_skeleton"
  | "scoring_checkpoint_skeleton"
  | "common_gap_candidates"
> & { reason: string };

export type AnswerReviewReferenceGrounding = {
  references: GroundingReference[];
  promptContext: string;
  displayLabel: string;
};

const NO_REFERENCE_CONTEXT = "유사 기출 reference 없음. 입력 자료만 기준으로 검토하세요.";

function keywordSignals(input: GroundingInput): string[] {
  const fromDraft = input.normalizedDraft
    ? [
        input.normalizedDraft.requiredIssues,
        ...input.normalizedDraft.missingIssueCandidates,
        ...input.normalizedDraft.coreConcepts,
        input.normalizedDraft.weakParagraphPoint,
        input.normalizedDraft.weakLogicPoint,
      ]
    : [];

  const conservativeText = input.normalizedDraft ? [] : [input.questionText, input.referenceText, input.answerText];
  return [...fromDraft, ...conservativeText]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function buildReason(reference: PastExamReferenceItem, signals: string[]): string {
  const matched = signals.find((signal) =>
    [...reference.issue_tags, ...reference.topic_tags, ...reference.skill_tags].some((tag) => signal.includes(tag) || tag.includes(signal)),
  );
  return matched ? `주요 신호 '${matched}'와(과) 유사` : "과목/논점 구조 유사";
}

export function buildAnswerReviewReferenceGrounding(input: GroundingInput): AnswerReviewReferenceGrounding {
  if (input.examMode !== "second") {
    return { references: [], promptContext: NO_REFERENCE_CONTEXT, displayLabel: "" };
  }

  const signals = keywordSignals(input);
  const candidates = signals.flatMap((signal) =>
    findPastExamReferenceMatches({
      mode: "second",
      subject: input.subject,
      topicCandidate: signal,
      weakStructurePoint: signal,
      mistakeType: signal,
    }),
  );

  const dedupedById = new Map<string, GroundingReference>();
  for (const match of candidates) {
    if (dedupedById.has(match.reference.id)) continue;
    dedupedById.set(match.reference.id, {
      id: match.reference.id,
      exam_year: match.reference.exam_year,
      subject: match.reference.subject,
      topic_tags: match.reference.topic_tags,
      issue_tags: match.reference.issue_tags,
      skill_tags: match.reference.skill_tags,
      expected_answer_skeleton: match.reference.expected_answer_skeleton,
      scoring_checkpoint_skeleton: match.reference.scoring_checkpoint_skeleton,
      common_gap_candidates: match.reference.common_gap_candidates,
      reason: match.reason || buildReason(match.reference, signals),
    });
  }

  if (dedupedById.size === 0) {
    const subjectFallback = listPastExamReferences("second", input.subject).slice(0, 2);
    for (const reference of subjectFallback) {
      dedupedById.set(reference.id, {
        id: reference.id,
        exam_year: reference.exam_year,
        subject: reference.subject,
        topic_tags: reference.topic_tags,
        issue_tags: reference.issue_tags,
        skill_tags: reference.skill_tags,
        expected_answer_skeleton: reference.expected_answer_skeleton,
        scoring_checkpoint_skeleton: reference.scoring_checkpoint_skeleton,
        common_gap_candidates: reference.common_gap_candidates,
        reason: buildReason(reference, signals),
      });
    }
  }

  const references = Array.from(dedupedById.values()).slice(0, 2);
  if (references.length === 0) {
    return { references, promptContext: NO_REFERENCE_CONTEXT, displayLabel: "" };
  }

  const promptContext = [
    "다음은 참고용 유사 기출 Skeleton/채점 포인트 후보입니다. 원문 기출이나 공식 답안이 아니며, reference_only 자료입니다. 이를 근거로 누락 논점과 Skeleton을 보강하되, 입력 자료와 충돌하면 입력 자료를 우선하세요.",
    ...references.map(
      (ref, index) =>
        `${index + 1}) ${ref.exam_year} ${ref.subject} (${ref.id})\n- expected_answer_skeleton: ${ref.expected_answer_skeleton.join(" / ")}\n- scoring_checkpoint_skeleton: ${ref.scoring_checkpoint_skeleton.join(" / ")}\n- common_gap_candidates: ${ref.common_gap_candidates.join(" / ")}\n- reason: ${ref.reason}`,
    ),
  ].join("\n");

  return {
    references,
    promptContext,
    displayLabel: `${references[0].exam_year} ${references[0].subject} · ${references[0].topic_tags.slice(0, 2).join("/")}`,
  };
}
