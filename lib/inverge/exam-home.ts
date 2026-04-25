import type { ExamHomeState } from "@/components/inverge/exam-home";
import { appraisalFirstRepository } from "@/lib/appraisal-first/file-repository";
import { appraisalFirstService } from "@/lib/appraisal-first/service";
import type { SubjectId } from "@/lib/appraisal-first/types";
import { actuaryFirstService } from "@/lib/actuary-first/service";
import { actuarySecondService } from "@/lib/actuary-second/service";
import { secondExamRepository } from "@/lib/inverge/second-exam-repository";

const APPRAISAL_SUBJECT_LABELS: Record<SubjectId, string> = {
  civil_law: "민법",
  economics: "경제학원론",
  real_estate: "부동산학원론",
  appraisal_law: "감정평가관계법규",
  accounting: "회계학",
};

const ACTUARY_FAILURE_LABELS: Record<string, string> = {
  formula_selection_error: "공식 선택",
  arithmetic_slip: "계산 실수",
  variable_misuse: "변수 사용",
  confidence_mismatch: "확신과 결과 불일치",
  time_pressure: "시간 압박",
  error_burst: "반복 오류",
  concept_recall_gap: "개념 공백",
  final_answer_mismatch: "최종값 불일치",
  parse_failure: "입력 해석",
  verification_missing: "검산 흔적 부족",
  step_omission: "중간 단계 누락",
  weak_formula_evidence: "공식 흔적 부족",
  variable_assumption_error: "가정 오류",
  result_interpretation_gap: "결과 해석 부족",
  calculation_to_judgment_gap: "계산과 판단 연결 부족",
  weak_conclusion: "결론 마무리 부족",
};

function parseDate(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatBool(value: boolean, trueLabel: string, falseLabel: string) {
  return value ? trueLabel : falseLabel;
}

function summarizeAppraisalRecentWork(
  subjectId: SubjectId,
  nextAction: "solveSet" | "reviewQueue" | "weeklyCoaching" | "records",
) {
  const subjectLabel = APPRAISAL_SUBJECT_LABELS[subjectId];
  if (nextAction === "reviewQueue") return `${subjectLabel} 리뷰 큐가 열려 다시 볼 문제를 정리할 수 있습니다.`;
  if (nextAction === "weeklyCoaching") return `${subjectLabel} 흐름을 바탕으로 이번 주 코칭이 준비되어 있습니다.`;
  if (nextAction === "records") return `${subjectLabel} 기록이 쌓여 최근 흐름을 다시 확인할 수 있습니다.`;
  return `${subjectLabel}에서 다음 세트 풀이로 이어갈 수 있습니다.`;
}

function summarizeAppraisalNextAction(nextAction: "solveSet" | "reviewQueue" | "weeklyCoaching" | "records") {
  if (nextAction === "reviewQueue") return "리뷰 큐부터 차분히 정리하세요.";
  if (nextAction === "weeklyCoaching") return "이번 주 코칭을 먼저 확인하세요.";
  if (nextAction === "records") return "기록에서 최근 흐름을 먼저 정리하세요.";
  return "다음 세트 풀이로 이어가세요.";
}

function getActuaryFailureLabel(value: string | null | undefined) {
  if (!value) return "없음";
  return ACTUARY_FAILURE_LABELS[value] ?? value.replaceAll("_", " ");
}

export async function buildAppraiserHomeState(userId: string): Promise<ExamHomeState> {
  const subjectIds: SubjectId[] = ["civil_law", "economics", "real_estate", "appraisal_law", "accounting"];
  const subjectSummaries = await Promise.all(
    subjectIds.map((subjectId) => appraisalFirstService.getSubjectSummary(subjectId, userId)),
  );

  const recentSummary =
    [...subjectSummaries].sort((left, right) => parseDate(right.lastActivityAt) - parseDate(left.lastActivityAt))[0] ??
    subjectSummaries[0];
  const reviewQueue = await appraisalFirstService.listReviewQueue(undefined, userId);
  const activeWeeklyPlan = await appraisalFirstRepository.getActiveWeeklyPlan(userId);
  const firstRecords = await appraisalFirstService.getRecords(undefined, userId);
  const secondHistory = await secondExamRepository.listHistory(userId, {
    examId: "appraiser-second",
    sessionId: "2026-1",
    subjectId: "practice",
  });

  const latestSecondRewrite = secondHistory.rewrites[0] ?? null;
  const latestSecondSubmission = secondHistory.submissions[0] ?? null;
  const latestSecondAt = latestSecondRewrite?.submittedAt ?? latestSecondSubmission?.submittedAt ?? null;
  const latestFirstAt = firstRecords.aggregate.recentActivityAt;
  const secondIsActive = Boolean(latestSecondAt && parseDate(latestSecondAt) >= parseDate(latestFirstAt));

  const firstHasActivity = Boolean(recentSummary?.lastActivityAt);
  const firstCtaHref = "/exams/appraisal-first";
  const secondCtaHref = latestSecondRewrite
    ? "/exams/appraiser-second/2026-1/practice/rewrite/latest"
    : latestSecondSubmission
      ? "/exams/appraiser-second/2026-1/practice/compare/latest"
      : "/exams/appraiser-second/2026-1/practice/write";

  return {
    title: "감정평가사",
    subtitle: "1차 객관식 운영과 2차 답안 교정을 하나의 흐름으로 관리합니다.",
    currentStatus: {
      recentTrack: secondIsActive ? "2차 답안 교정" : "1차 객관식 운영",
      recentWork: secondIsActive
        ? latestSecondRewrite
          ? "최근 답안을 다시 써서 교정 흐름이 이어졌습니다."
          : latestSecondSubmission
            ? "최근 답안을 제출했고 비교 화면이 준비되어 있습니다."
            : "최근 2차 작업이 아직 없습니다."
        : firstHasActivity
          ? summarizeAppraisalRecentWork(recentSummary.subjectId, recentSummary.nextAction)
          : "온보딩과 초기 진단부터 시작할 수 있습니다.",
      nextAction: secondIsActive
        ? latestSecondRewrite
          ? "기록을 확인하거나 다음 답안을 다시 써 보세요."
          : latestSecondSubmission
            ? "비교에서 가장 큰 차이 하나를 먼저 확인하세요."
            : "실무·이론·법규 중 한 과목 답안부터 시작하세요."
        : firstHasActivity
          ? summarizeAppraisalNextAction(recentSummary.nextAction)
          : "온보딩과 초기 진단을 먼저 진행하세요.",
    },
    firstCard: {
      title: "1차 객관식 운영",
      body: "온보딩, 초기 진단, 세트 풀이, 리뷰 큐, 주간 코칭으로 1차 흐름을 관리합니다.",
      recentWork: firstHasActivity
        ? summarizeAppraisalRecentWork(recentSummary.subjectId, recentSummary.nextAction)
        : "아직 1차 작업이 없습니다.",
      nextAction: firstHasActivity ? summarizeAppraisalNextAction(recentSummary.nextAction) : "온보딩부터 시작하세요.",
      statusItems: [
        `최근 과목 · ${APPRAISAL_SUBJECT_LABELS[recentSummary.subjectId]}`,
        `리뷰 큐 · ${reviewQueue.length}개`,
        `이번 주 코칭 · ${formatBool(Boolean(activeWeeklyPlan), "있음", "없음")}`,
      ],
      ctaLabel: "1차 이어서 하기",
      ctaHref: firstCtaHref,
    },
    secondCard: {
      title: "2차 답안 교정",
      body: "실무 · 이론 · 법규 답안을 쓰고, 가장 큰 차이 하나를 교정합니다.",
      recentWork: latestSecondRewrite
        ? "최근 다시 쓰기까지 진행해 교정 흐름이 이어져 있습니다."
        : latestSecondSubmission
          ? "최근 답안을 제출했고 비교가 준비되어 있습니다."
          : "아직 2차 답안 작업이 없습니다.",
      nextAction: latestSecondRewrite
        ? "기록을 확인하거나 다음 답안을 다시 써 보세요."
        : latestSecondSubmission
          ? "비교에서 가장 큰 차이 하나를 먼저 확인하세요."
          : "답안 하나를 먼저 써서 비교 흐름을 여세요.",
      statusItems: [
        "최근 과목 · 실무 / 이론 / 법규 흐름",
        `최근 작업 · ${latestSecondRewrite ? "다시 쓰기" : latestSecondSubmission ? "비교 대기" : "시작 전"}`,
        `기록 · ${formatBool(secondHistory.submissions.length + secondHistory.rewrites.length > 0, "있음", "없음")}`,
      ],
      ctaLabel: "2차 이어서 하기",
      ctaHref: secondCtaHref,
    },
    footer: "점수보다, 지금 다시 볼 것과 바로 고칠 것을 먼저 제시합니다.",
  };
}

export async function buildActuaryHomeState(userId: string): Promise<ExamHomeState> {
  const firstSubmissions = await actuaryFirstService.listSetSubmissions("probability", userId);
  const firstReviewQueue = await actuaryFirstService.listReviewQueue("probability", userId);
  const firstRecords = await actuaryFirstService.getRecords("probability", userId);
  const secondSubmissions = await actuarySecondService.listSubmissions("insurance_math", userId);
  const secondReviewQueue = await actuarySecondService.listReviewQueue("insurance_math", userId);
  const secondRecords = await actuarySecondService.getRecords("insurance_math", userId);

  const latestFirstAt = firstRecords.aggregate.recentActivityAt;
  const latestSecondAt = secondRecords.aggregate.recentActivityAt;
  const secondIsActive = Boolean(latestSecondAt && parseDate(latestSecondAt) >= parseDate(latestFirstAt));
  const latestSecondSubmission = secondSubmissions[0] ?? null;
  const hasFirstActivity = firstSubmissions.length > 0;
  const hasSecondActivity = secondSubmissions.length > 0;

  return {
    title: "보험계리사",
    subtitle: "1차 계산형 학습 운영과 2차 계산서술 교정을 하나의 흐름으로 관리합니다.",
    currentStatus: {
      recentTrack: secondIsActive ? "2차 계산서술 교정" : "1차 계산형 학습 운영",
      recentWork: secondIsActive
        ? hasSecondActivity
          ? "현가·연금형 샘플 답안에서 최근 교정 흐름이 이어졌습니다."
          : "2차 샘플 답안 작업이 아직 없습니다."
        : hasFirstActivity
          ? "확률론 샘플 세트와 리뷰 흐름이 이어지고 있습니다."
          : "1차 확률론 샘플 세트를 아직 시작하지 않았습니다.",
      nextAction: secondIsActive
        ? secondReviewQueue.length > 0
          ? "교정 포인트 하나를 골라 다시 써 보세요."
          : "현가·연금형 sample problem으로 이어가세요."
        : firstReviewQueue.length > 0
          ? "리뷰 큐부터 정리하세요."
          : "확률론 샘플 세트를 먼저 풀어 보세요.",
    },
    firstCard: {
      title: "1차 계산형 학습 운영",
      body: "확률론 중심의 계산 검증, 리뷰 큐, 다음 행동 추천으로 1차 흐름을 관리합니다.",
      recentWork: hasFirstActivity
        ? `최근 세트는 ${firstSubmissions[0]?.setId ?? "intro-12"}입니다.`
        : "아직 1차 샘플 세트 기록이 없습니다.",
      nextAction: firstReviewQueue.length > 0 ? "리뷰 큐부터 정리하세요." : "확률론 샘플 세트를 먼저 풀어 보세요.",
      statusItems: [
        `최근 세트 · ${firstSubmissions[0]?.setId ?? "없음"}`,
        `리뷰 큐 · ${firstReviewQueue.length}개`,
        `최근 root-cause · ${getActuaryFailureLabel(firstRecords.aggregate.topFailureClass)}`,
      ],
      ctaLabel: "1차 이어서 하기",
      ctaHref:
        firstReviewQueue.length > 0
          ? "/exams/actuary-first/probability/review"
          : "/exams/actuary-first/probability/past-set/intro-12",
    },
    secondCard: {
      title: "2차 계산서술 교정",
      body: "현가 · 연금형 문제부터 계산 단계와 해석을 함께 교정합니다.",
      recentWork: hasSecondActivity
        ? `최근 작업은 ${latestSecondSubmission?.questionId ?? "sample-1"} 기준으로 이어집니다.`
        : "아직 2차 현가·연금형 샘플 답안이 없습니다.",
      nextAction: secondReviewQueue.length > 0
        ? "교정 포인트 하나를 골라 다시 써 보세요."
        : "현가·연금형 sample-1부터 조용히 시작하세요.",
      statusItems: [
        "최근 problem family · 현가·연금형",
        `교정 초안 · ${formatBool(Boolean(latestSecondSubmission?.evaluation.correction_seed), "있음", "없음")}`,
        `기록 · ${formatBool(secondRecords.aggregate.submissionCount > 0, "있음", "없음")}`,
      ],
      ctaLabel: "2차 이어서 하기",
      ctaHref: latestSecondSubmission
        ? `/exams/actuary-second/insurance_math/present-value/${latestSecondSubmission.questionId}`
        : "/exams/actuary-second/insurance_math/present-value/sample-1",
    },
    footer: "계산 결과보다, 지금 다시 확인할 단계와 다음 행동을 먼저 제시합니다.",
  };
}
