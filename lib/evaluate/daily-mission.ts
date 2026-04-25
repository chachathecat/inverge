import type { EvaluationResult } from "./types";

export function getWeakestAxis(result: EvaluationResult) {
  const axes = [
    { key: "structure", score: result.structure_score, mission: "목차를 먼저 쓰고 각 문단 첫 문장에 쟁점 결론을 배치하세요." },
    { key: "content", score: result.content_score, mission: "각 쟁점별 핵심 키워드 3개를 먼저 고정하고 근거를 연결하세요." },
    { key: "expression", score: result.expression_score, mission: "한 문장을 25자 내외로 줄이고 접속어를 문단당 1개로 제한하세요." },
  ] as const;

  return [...axes].sort((a, b) => a.score - b.score)[0];
}
