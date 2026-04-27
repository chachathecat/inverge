# Inverge Past Exam Metadata Contract (Taxonomy v1)

본 문서는 감정평가사 1차/2차 범위에서 과거 기출 메타데이터를 안전하게 분류하기 위한 v1 계약입니다.

## 1) 목적과 범위
- 본 계약은 **메타데이터 분류 표준**입니다.
- 본 단계는 Taxonomy v1(스타터 맵)이며, 전체 출제범위를 완전 포괄하지 않습니다.
- 대상 트랙은 아래로 제한됩니다.
  - 감정평가사 1차
  - 감정평가사 2차
- 본 문서는 원문 문제 수집/대량 적재 계약이 아닙니다.

## 2) 필드 정의 (v1)
향후 20년치 기출 import는 아래 필드를 우선 채워야 합니다.

- `year`
- `round`
- `mode`
- `subject`
- `questionNumber`
- `sourceLabel`
- `taxonomyNodeId`
- `unit`
- `topic`
- `subtopic`
- `examSkill`
- `difficulty`
- `answerType`
- `commonMistakeTypes`
- `rightsStatus`
- `rawTextStoragePolicy`
- `classificationStatus` (`ai_suggested` | `human_verified` | `needs_review`)
- `classificationConfidence`

### 권장 타입 예시

```ts
type PastExamMetadataV1 = {
  year: number;
  round: string;
  mode: "first" | "second";
  subject: string;
  questionNumber: string;
  sourceLabel: string;
  taxonomyNodeId: string;
  unit: string;
  topic: string;
  subtopic?: string;
  examSkill: string;
  difficulty: "low" | "medium" | "high";
  answerType: "objective" | "short" | "essay" | "calculation";
  commonMistakeTypes: string[];
  rightsStatus: "unknown" | "cleared" | "restricted";
  rawTextStoragePolicy: "none" | "service_delivery_only" | "restricted";
  classificationStatus: "ai_suggested" | "human_verified" | "needs_review";
  classificationConfidence: number; // 0.0 ~ 1.0
};
```

## 3) 저작권/사용 정책 (필수)
- 제3자 기출 원문을 **전역 학습 코퍼스**로 사용하지 않습니다.
- 원문 저장은 권리/사용 범위가 명확한 경우에만 허용하며, 목적은 서비스 제공 범위로 제한합니다.
- 메타데이터/택소노미는 학습 계획, 분류, 운영 자동화 보조에 활용할 수 있습니다.
- 운영 환경에서 AI 분류 결과를 신뢰하기 전, **반드시 사람 검수(human verification)** 를 거쳐야 합니다.

## 4) Import 원칙 (20년치 시작 가이드)
1. 원문 이전에 메타데이터 레이어를 먼저 구축합니다.
2. `taxonomyNodeId` 중심으로 분류 일관성을 확보합니다.
3. `classificationStatus=ai_suggested` 항목은 운영 의사결정에 바로 사용하지 않습니다.
4. `human_verified` 전환 전까지는 재검토 큐(`needs_review`)를 유지합니다.

## 5) 샘플 분류 예시

### Example 1
입력:
- `회계학 재고자산 저가법이 헷갈림`

기대 후보:
- `1차 / 회계학 / 재고자산 / 측정(저가법)`

### Example 2
입력:
- `민법 물권 변동 요건이 헷갈림`

기대 후보:
- `1차 / 민법 / 물권 / 물권변동`

### Example 3
입력:
- `보상법규 사업인정 절차가 약함`

기대 후보:
- `2차 / 감정평가 및 보상법규 / 절차 / 사업인정`

## 6) Non-goals (이 PR 범위 밖)
- 20년치 원문 기출 적재
- DB 스키마 추가/변경
- 저장된 study log 자동 분류 연결
- instructor console 구현
- 결제/과금 흐름 추가


## 7) Study log / wrong-answer taxonomy candidate connection v1
- Study log 및 wrong-answer 분류는 **local heuristic v1**만 사용합니다. (외부 AI 호출 없음)
- `ai_suggested`는 **후보 제안 상태**이며 확정 분류가 아닙니다.
- `human_verified` 상태는 향후 운영자 수동 검수 플로우에서만 설정해야 합니다.
- confidence가 낮거나 primary가 없으면 `needs_review`로 유지합니다.
- taxonomy 분류는 최종 채점/최종 커리큘럼 판정 근거로 사용하지 않습니다.
