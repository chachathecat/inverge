export const WEAKNESS_TAGS = [
  { key: "논점누락", description: "질문이 요구한 핵심 쟁점을 일부 빠뜨린 상태" },
  { key: "법리정확성", description: "법리 또는 기준 서술의 정확도가 낮은 상태" },
  { key: "키워드부족", description: "채점 포인트 핵심 키워드가 충분히 드러나지 않은 상태" },
  { key: "결론약함", description: "최종 결론이 모호하거나 근거 연결이 약한 상태" },
  { key: "사례적용부족", description: "사례를 기준에 연결해 적용하는 설명이 부족한 상태" },
  { key: "구조불균형", description: "도입-본론-결론 비중이 불균형한 상태" },
  { key: "문단전개", description: "문단 간 논리 연결이 약해 흐름이 끊기는 상태" },
  { key: "시간관리", description: "핵심 파트에 시간 배분이 부족해 완성도가 떨어지는 상태" },
  { key: "근거밀도", description: "주장 대비 근거 개수와 밀도가 부족한 상태" },
  { key: "용어정밀성", description: "전문 용어 사용이 부정확하거나 일관되지 않은 상태" },
  { key: "표현명확성", description: "문장 표현이 장황하거나 모호해 이해가 어려운 상태" },
  { key: "오탈자", description: "오탈자나 문장 오류로 신뢰도가 떨어지는 상태" },
  { key: "채점포맷미준수", description: "문제 요구 포맷(목차/항목/분량)을 지키지 못한 상태" },
  { key: "비교분석부족", description: "대안/기준 간 비교 분석이 부족한 상태" },
  { key: "실무연결성", description: "실무 관점 연결이 부족해 설득력이 낮은 상태" },
] as const;

export function getWeaknessDescription(tag: string) {
  const found = WEAKNESS_TAGS.find((item) => item.key === tag);
  return found?.description ?? "약점 설명 데이터가 없습니다.";
}
