import Link from "next/link";
import { notFound } from "next/navigation";

import { LearnerSupportPanel } from "@/components/core-blitz/learner-support-panel";
import { ReviewOsAccessState } from "@/components/review-os/review-os-access-state";
import { normalizeAnswerReviewStructureDraft } from "@/lib/evaluate/answer-review-structure";
import { getAppraisalMode } from "@/lib/review-os/appraisal";
import {
  buildReviewOsReturnTo,
  getReviewOsServerContext,
} from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import { buildDetailStudyNote } from "@/lib/review-os/study-note";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ itemId: string }>;
};

function substantiveReference(value: string | undefined | null) {
  const normalized = value?.trim() ?? "";
  return normalized && !["-", "–", "—"].includes(normalized)
    ? normalized
    : null;
}

export default async function LearnerSupportPage({ params }: PageProps) {
  const { itemId } = await params;
  const { session, access } = await getReviewOsServerContext(
    buildReviewOsReturnTo(`/app/items/${itemId}/support`),
  );
  if (access.status !== "allowed") {
    return <ReviewOsAccessState access={access} embedded />;
  }
  if (!session.userId || !session.email) return null;

  const detail = await reviewOsService.getWrongAnswerDetail(
    session.userId,
    session.email,
    itemId,
  );
  if (
    !detail ||
    detail.item.id !== itemId ||
    detail.item.examName !== "감정평가사 2차"
  ) {
    notFound();
  }

  const note = buildDetailStudyNote(detail);
  const draft = normalizeAnswerReviewStructureDraft({
    questionSummary:
      detail.item.rawQuestionText ??
      detail.item.problemTitle ??
      detail.item.problemIdentifier ??
      "문제 요구를 다시 확인해 주세요.",
    coreConcepts:
      detail.item.keyConcepts?.length
        ? detail.item.keyConcepts
        : detail.tags.map((tag) => tag.topicTag),
    requiredIssues: note.missingIssue ?? note.weakPoint,
    userAnswerSummary:
      detail.item.rewriteParagraph ?? detail.item.userAnswer ?? "",
    userAnswerStructure:
      detail.item.outlineDraft ?? detail.item.myAnswerSummary ?? "",
    referenceStructure:
      detail.item.referenceStructure ?? note.coreLine,
    strengths: detail.note?.keyDistinction
      ? [detail.note.keyDistinction]
      : [],
    missingIssueCandidates: [
      note.missingIssue,
      note.weakStructurePoint,
    ].filter(Boolean),
    weakParagraphPoint: note.weakStructurePoint ?? note.weakPoint,
    weakLogicPoint: note.weakApplicationSentence ?? note.weakPoint,
    rewriteTarget: note.rewriteInstruction ?? note.nextAction,
    rewriteDraftSuggestion:
      detail.item.rewriteParagraph ?? detail.item.userAnswer ?? "",
    nextAction: note.nextAction,
    caution:
      "이 화면의 설명은 학습 보조이며 공식 채점·합격 판정이 아닙니다.",
    plainExplanation: note.coreLine,
    keyTermExplanations: note.keyTerms,
    stepByStepExplanation: [
      note.summaryLine,
      note.coreLine,
      note.nextAction,
    ],
    examAnswerHints: [
      note.rewriteInstruction,
      note.noteCard,
    ].filter(Boolean),
  });
  const mode = getAppraisalMode(detail.item.examName);
  const referenceAnswer = substantiveReference(detail.item.correctAnswer);

  return (
    <main className="mx-auto w-full max-w-[900px] space-y-6 px-5 py-8 md:px-8">
      <header className="space-y-3">
        <Link
          href={`/app/items/${encodeURIComponent(itemId)}?mode=${mode}`}
          className="v3-type-label-strong inline-flex min-h-11 items-center text-[var(--color-text-link)] underline underline-offset-4"
        >
          학습 기록으로 돌아가기
        </Link>
        <p className="v3-type-caption text-[var(--color-text-brand)]">
          {detail.item.subjectLabel} · 학습 도움
        </p>
        <h1 className="v3-type-screen ko-keep text-[var(--color-text-primary)]">
          {detail.item.problemTitle ?? detail.item.problemIdentifier ?? "이 항목 다시 보기"}
        </h1>
        <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">
          직접 풀기부터 1타 쉬운풀이와 전체풀이까지 필요한 수준을 선택할 수 있습니다.
        </p>
      </header>

      <LearnerSupportPanel
        itemId={itemId}
        draft={draft}
        referenceAnswer={referenceAnswer}
      />
    </main>
  );
}
