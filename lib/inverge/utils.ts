import type { RiskLevel } from "@/lib/inverge/types";

export const INVERGE_DISCLAIMER =
  "본 서비스의 진단과 추천은 학습 보조를 위한 참고 정보이며, 실제 성적 향상이나 합격을 보장하지 않습니다.";

export function buildPositionCopy(relativePosition: number) {
  return `현재 기준 위치는 상위 ${relativePosition}% 수준으로 추정됩니다.`;
}

export function buildTargetCopy(passingZoneTarget: number, focus: string) {
  return `목표 구간인 상위 ${passingZoneTarget}%에 가까워지려면 ${focus}를 먼저 보완하는 편이 좋습니다.`;
}

export function draftStorageKey(contextId: string) {
  return `inverge:subject-draft:${contextId}`;
}

export function getRiskLabel(level: RiskLevel) {
  switch (level) {
    case "Stable":
      return "안정";
    case "Watch":
      return "주의";
    case "Risk":
      return "위험";
    case "Recovery Needed":
      return "보완 필요";
  }
}

export function riskTone(level: RiskLevel) {
  switch (level) {
    case "Stable":
      return {
        shell: "border-[color:rgba(90,141,130,0.28)] bg-[color:rgba(90,141,130,0.12)] text-[color:var(--foreground-strong)]",
        dot: "bg-[#5a8d82]",
      };
    case "Watch":
      return {
        shell: "border-[color:rgba(196,141,47,0.3)] bg-[color:rgba(196,141,47,0.12)] text-[color:var(--foreground-strong)]",
        dot: "bg-[#c48d2f]",
      };
    case "Risk":
      return {
        shell: "border-[color:rgba(201,111,99,0.3)] bg-[color:rgba(201,111,99,0.12)] text-[color:var(--foreground-strong)]",
        dot: "bg-[#c96f63]",
      };
    case "Recovery Needed":
      return {
        shell: "border-[color:rgba(191,77,77,0.34)] bg-[color:rgba(191,77,77,0.14)] text-[color:var(--foreground-strong)]",
        dot: "bg-[#bf4d4d]",
      };
  }
}

export function getRecoveryPriorityLabel(priority: "Immediate" | "High" | "Moderate") {
  switch (priority) {
    case "Immediate":
      return "즉시";
    case "High":
      return "높음";
    case "Moderate":
      return "보통";
  }
}

export function clampProgress(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function formatDelta(delta: number) {
  if (delta < 0) {
    return `이전 제출 대비 ${Math.abs(delta)}%p 개선`;
  }

  if (delta > 0) {
    return `이전 제출 대비 ${delta}%p 하락`;
  }

  return "이전 제출과 동일";
}
