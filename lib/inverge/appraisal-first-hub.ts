import { appraisalFirstService } from "@/lib/appraisal-first/service";
import type { SubjectId, SubjectDashboardSummary } from "@/lib/appraisal-first/types";

export type AppraisalFirstHubCard = {
  subjectId: SubjectId;
  title: string;
  recentWork: string;
  nextAction: string;
  primaryHref: string;
  secondaryHref: string;
  secondaryLabel: string;
  statusLine: string;
};

export type AppraisalFirstHubState = {
  title: string;
  subtitle: string;
  cards: AppraisalFirstHubCard[];
};

const HUB_SUBJECTS: SubjectId[] = ["civil_law", "economics", "accounting", "real_estate"];

const SUBJECT_LABELS: Record<SubjectId, string> = {
  civil_law: "민법",
  economics: "경제학원론",
  real_estate: "부동산학",
  appraisal_law: "감정평가관계법규",
  accounting: "회계학",
};

function buildRecentWork(summary: SubjectDashboardSummary) {
  if (!summary.lastActivityAt) {
    return "아직 이 과목의 최근 작업이 없습니다.";
  }
  if (summary.remainingReviewCount > 0) {
    return "최근 풀이에서 다시 볼 항목이 남아 있습니다.";
  }
  if (summary.pastSetCount > 0) {
    return "최근 세트 풀이를 마치고 다음 흐름을 기다리고 있습니다.";
  }
  if (summary.activeWeeklyPlan) {
    return "이번 주 코칭 흐름 안에서 이어지고 있습니다.";
  }
  return "최근 작업 흐름이 기록되어 있습니다.";
}

function buildNextAction(summary: SubjectDashboardSummary) {
  if (summary.nextAction === "reviewQueue") {
    return "리뷰 큐부터 정리하세요.";
  }
  if (summary.nextAction === "weeklyCoaching") {
    return "이번 주 코칭을 먼저 확인하세요.";
  }
  if (summary.nextAction === "records") {
    return "기록에서 최근 흐름을 먼저 보세요.";
  }
  return "다음 세트로 이어가세요.";
}

function buildSecondary(summary: SubjectDashboardSummary, subjectId: SubjectId) {
  if (summary.remainingReviewCount > 0) {
    return {
      secondaryHref: `/exams/appraisal-first/${subjectId}/review`,
      secondaryLabel: "리뷰 보기",
    };
  }

  return {
    secondaryHref: `/exams/appraisal-first/${subjectId}/records`,
    secondaryLabel: "기록 보기",
  };
}

function buildStatusLine(summary: SubjectDashboardSummary) {
  if (!summary.lastActivityAt) {
    return "최근 작업 없음";
  }
  if (summary.remainingReviewCount > 0) {
    return `리뷰 큐 ${summary.remainingReviewCount}개`;
  }
  if (summary.activeWeeklyPlan) {
    return "이번 주 코칭 진행 중";
  }
  return `최근 세트 ${summary.pastSetCount}개`;
}

export async function buildAppraisalFirstHubState(userId: string): Promise<AppraisalFirstHubState> {
  const summaries = await Promise.all(HUB_SUBJECTS.map((subjectId) => appraisalFirstService.getSubjectSummary(subjectId, userId)));

  return {
    title: "감정평가사 1차",
    subtitle: "객관식 학습 운영은 과목 단위로 이어집니다. 과목을 고른 뒤 세트 풀이, 리뷰, 기록으로 들어가세요.",
    cards: summaries.map((summary) => {
      const secondary = buildSecondary(summary, summary.subjectId);

      return {
        subjectId: summary.subjectId,
        title: SUBJECT_LABELS[summary.subjectId],
        recentWork: buildRecentWork(summary),
        nextAction: buildNextAction(summary),
        primaryHref: `/exams/appraisal-first/${summary.subjectId}/dashboard`,
        secondaryHref: secondary.secondaryHref,
        secondaryLabel: secondary.secondaryLabel,
        statusLine: buildStatusLine(summary),
      };
    }),
  };
}
