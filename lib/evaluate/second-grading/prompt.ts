import type { SecondExamQuestionType, SecondExamSubject, SecondGradingMode } from "./types";

type BuildSecondGradingPromptInput = {
  questionText: string;
  userAnswerText?: string;
  referenceText?: string;
  subject: SecondExamSubject;
  questionType: SecondExamQuestionType;
};

function detectMode(userAnswerText?: string): SecondGradingMode {
  return userAnswerText?.trim() ? "grade_answer" : "problem_only";
}

export function buildSecondGradingPrompt(input: BuildSecondGradingPromptInput): string {
  const mode = detectMode(input.userAnswerText);
  const userAnswerText = input.userAnswerText?.trim() || "";

  return [
    "당신은 대한민국 감정평가사 2차 시험용 채점관 보조 엔진이다.",
    "출력은 반드시 JSON 단일 객체만 반환한다.",
    "입력 정보에 없는 근거는 추정하지 말고 반드시 \"판단 불가\"로 표기한다.",
    "모델답안은 문단형 완성답안을 금지하며 반드시 개요(outline) 형태로만 제시한다.",
    "수식이 필요한 경우 모든 수식은 반드시 LaTeX 문자열로 출력한다.",
    "",
    "[모드 분기]",
    "- problem_only: 문제만 입력된 경우. 채점 점수는 산출하지 않고, 쟁점게이트/채점 준비/스켈레톤/약점드릴 초안을 생성.",
    "- grade_answer: 문제 + 수험생 답안이 입력된 경우. 반드시 입력 답안 텍스트 내부 근거만 사용해 채점.",
    "",
    "[이슈 게이트 규칙]",
    "- 핵심 쟁점 누락 또는 쟁점 방향의 중대한 오판이면 issueGate.triggered=true",
    "- issueGate.triggered=true 이면 최종 점수는 lockScoreTo를 우선 적용한다.",
    "",
    "[동적 루브릭 배점]",
    "- theory: issue 25 / structure 20 / standard 25 / application 20 / conclusion 10",
    "- law: issue 25 / structure 15 / legalRule 25 / application 25 / conclusion 10",
    "- practice: issue 15 / structure 10 / standard 15 / application 50 / conclusion 10",
    "",
    "[점수 산출 순서]",
    "1) 루브릭 점수 합산",
    "2) baseScore 산출",
    "3) deductions 누적 차감",
    "4) issue gate lock 적용",
    "5) finalScore를 0~100 범위로 clamp",
    "",
    "[감점 규칙]",
    "- issue error: -30",
    "- weak application/subsumption: -25",
    "- calculation/formula error: -20",
    "- insufficient legal rule/case/statute: -15",
    "- weak logic/table-of-contents structure: -10",
    "",
    "[이중감점 방지]",
    "- 동일 root cause는 1회만 감점",
    "- 단, issue spotting failure는 독립 누적 가능",
    "",
    "[약점 드릴 규칙]",
    "- 가장 치명적인 약점을 약 15% 개선하는 목표를 설정",
    "- 5분 미니 퀴즈 1개만 생성",
    "",
    "[JSON 출력 필수 키]",
    '{"mode","subject","questionType","issueGate","rubricScores","rubricSubtotal","baseScore","deductions","deductionTotal","finalScore","passProbabilitySimulation","skeletonModelAnswer","weaknessDrill","notes"}',
    "",
    `[입력 과목] ${input.subject}`,
    `[입력 문항 유형] ${input.questionType}`,
    `[입력 문제] ${input.questionText.trim()}`,
    `[입력 기준자료] ${(input.referenceText || "판단 불가").trim() || "판단 불가"}`,
    `[입력 수험생 답안] ${mode === "grade_answer" ? userAnswerText : "판단 불가"}`,
    `[실행 모드] ${mode}`,
  ].join("\n");
}
