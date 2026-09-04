import { NextResponse } from "next/server";

import { getServerSessionUser, requireRequestUserId } from "@/lib/auth/session";
import {
  LearnerSupportEventError,
  buildLearnerSupportUsageEventV1,
} from "@/lib/core-blitz/learner-support-event";
import { hasCoreBlitzLearnerSupportOwnerAccess } from "@/lib/core-blitz/learner-support-access";
import { recordLearnerSupportUsageEventV1 } from "@/lib/core-blitz/learner-support-repository";
import { projectLearnerSupportV1 } from "@/lib/core-blitz/learner-capability";
import { normalizeAnswerReviewStructureDraft } from "@/lib/evaluate/answer-review-structure";
import { reviewOsErrorResponse } from "@/lib/review-os/http";
import { reviewOsService } from "@/lib/review-os/service";
import { buildDetailStudyNote } from "@/lib/review-os/study-note";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = Object.freeze({
  "Cache-Control": "private, no-store, max-age=0",
});

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSessionUser();
    if (!hasCoreBlitzLearnerSupportOwnerAccess(session)) {
      return noStoreJson(
        { ok: false, error: "learner-support-unavailable" },
        404,
      );
    }
    const userId = await requireRequestUserId(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return noStoreJson({ ok: false, error: "invalid-json" }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return noStoreJson({ ok: false, error: "invalid-input" }, 400);
    }
    const input = body as Record<string, unknown>;
    const requestKeys = Object.keys(input).sort();
    const expectedRequestKeys = ["choice", "eventId", "itemId", "surface"];
    if (
      requestKeys.length !== expectedRequestKeys.length ||
      requestKeys.some((key, index) => key !== expectedRequestKeys[index])
    ) {
      return noStoreJson({ ok: false, error: "invalid-input" }, 400);
    }
    const itemId = typeof input.itemId === "string" ? input.itemId : "";
    const detail = itemId
      ? await reviewOsService.getWrongAnswerDetail(
          userId,
          session.email,
          itemId,
        )
      : null;
    if (
      !detail ||
      detail.item.id !== itemId ||
      detail.item.userId !== userId ||
      detail.item.examName !== "감정평가사 2차"
    ) {
      return noStoreJson({ ok: false, error: "item-not-found" }, 404);
    }

    const event = buildLearnerSupportUsageEventV1({
      eventId: input.eventId,
      itemId,
      choice: input.choice,
      surface: input.surface,
      occurredAt: new Date().toISOString(),
    });
    const recorded = await recordLearnerSupportUsageEventV1(userId, event);

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
    const verifiedReferenceAnswer: string | null = null;
    const projection = projectLearnerSupportV1({
      choice: recorded.event.metadataJson.choice,
      draft,
      referenceAnswer: verifiedReferenceAnswer,
    });

    return noStoreJson({
      ok: true,
      status: recorded.status,
      decision: recorded.event.metadataJson,
      projection,
    });
  } catch (error) {
    if (error instanceof LearnerSupportEventError) {
      return noStoreJson(
        {
          ok: false,
          error: "invalid-learner-support-event",
          errorCode: error.code,
        },
        400,
      );
    }
    const response = reviewOsErrorResponse(error);
    response.headers.set("Cache-Control", NO_STORE_HEADERS["Cache-Control"]);
    return response;
  }
}
