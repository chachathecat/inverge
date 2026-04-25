import { WEAKNESS_TAGS } from "./tags";

const evaluationSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "total_score",
    "structure_score",
    "content_score",
    "expression_score",
    "weaknesses",
    "next_action",
  ],
  properties: {
    total_score: { type: "number", minimum: 0, maximum: 100 },
    structure_score: { type: "number", minimum: 0, maximum: 100 },
    content_score: { type: "number", minimum: 0, maximum: 100 },
    expression_score: { type: "number", minimum: 0, maximum: 100 },
    weaknesses: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    next_action: { type: "string" },
  },
} as const;

const tagGuide = WEAKNESS_TAGS.map((item) => `${item.key}: ${item.description}`).join("; ");

const fewShot = [
  {
    answer: "도입에서 쟁점을 선언했지만 본문에서 핵심 법리를 누락했고 결론이 단정적이지 않다.",
    output: {
      total_score: 58,
      structure_score: 62,
      content_score: 51,
      expression_score: 61,
      weaknesses: ["논점누락", "법리정확성", "결론약함"],
      next_action: "다음 답안에서는 쟁점별 핵심 법리 2개를 먼저 적고 결론을 한 문장으로 단정하세요.",
    },
  },
  {
    answer: "쟁점 분류와 키워드는 명확하지만 사례 적용이 약하고 비교 분석이 부족하다.",
    output: {
      total_score: 74,
      structure_score: 78,
      content_score: 70,
      expression_score: 75,
      weaknesses: ["사례적용부족", "비교분석부족", "근거밀도"],
      next_action: "각 쟁점마다 사례 사실 1개와 비교 기준 1개를 짝지어 3세트로 작성하세요.",
    },
  },
];

const systemPrompt = [
  "당신은 감정평가사 2차 서술형 전문 채점관이다.",
  "절대 합격 확률 문구를 사용하지 말고 상대적 위치 해석에 도움이 되는 채점을 수행한다.",
  "평가 기준: 논점 누락, 구조, 키워드 충족, 결론의 명확성, 표현 정확성.",
  "total_score는 구조30/내용50/표현20 가중 평균으로 계산한다.",
  `weaknesses는 반드시 아래 15개 태그에서만 3개를 선택한다: ${tagGuide}`,
  "next_action은 다음 답안에서 즉시 실행 가능한 한 문장으로 작성한다.",
  "설명 텍스트 없이 JSON만 출력한다.",
].join(" ");

export function buildEvaluationPrompts(answer: string) {
  return {
    system: systemPrompt,
    user: [
      "[Few-shot examples]",
      JSON.stringify(fewShot),
      "[Target Answer]",
      answer,
      "요구 스키마에 맞는 JSON 한 개만 출력하라.",
    ].join("\n"),
    schema: evaluationSchema,
  };
}
