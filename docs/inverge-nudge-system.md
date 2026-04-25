# Inverge Nudge System (Ethical Choice Architecture)

본 문서는 감정평가사 1차/2차 학습 실행을 돕는 윤리적 넛지 운영 기준을 정의한다.

## 1) Principles

### 1. Good default
- 가장 효과적인 다음 학습 행동을 기본 선택으로 노출한다.
- 예: “오늘은 회계 말문제 15문항(25분)을 먼저 권장합니다. 최근 시간 변동성이 커졌습니다.”

### 2. Easy override
기본값은 안내이며, 사용자를 가두지 않는다. 아래 옵션은 항상 제공:
- 다른 작업 보기
- 오늘은 짧게 하기
- 나중에 하기
- 복습 시점 바꾸기

### 3. Smart friction
중요 복습 건너뛰기 시 차단하지 않되 결과를 명확히 안내:
- “오늘 건너뛰면 4일 뒤로 밀립니다.”
- 행동 선택: [5분만 하기] / [건너뛰기]

### 4. Timely intervention
개입 타이밍:
- 세션 시작
- 오답 직후
- 약답 비교 직후
- 망각 위험 직전
- 계획 미실행 직후
- 세션 종료

### 5. Error-expected messaging
실수를 실패가 아닌 입력 데이터로 표현:
- “이 오답은 다음 계획의 재료가 됩니다.”
- “오늘은 한 문단만 고치면 됩니다.”

### 6. Dark-pattern prohibition
절대 금지:
- shame/fear copy
- ranking pressure
- streak addiction
- fake urgency, manipulative scarcity
- AI final judgment wording

## 2) Screen-level Nudge Contract
모든 핵심 화면은 아래를 명시해야 한다.
- Default action (권장 작업)
- Override path (대체 작업)
- Consequence note (건너뛰기 영향)
- Immediate next step (즉시 행동)
- Captured data (행동 로그)

## 3) Copy Style Contract (Korean)
- calm, precise, operational
- 과장/선동/불안 유도 금지
- 짧은 문장, 실행 중심 동사 사용
- 점수 과시보다 “다음 행동”을 먼저 제시

## 4) Metrics
넛지 품질은 아래로 검증:
- task_start_rate
- task_completion_rate
- time_to_first_action
- override_usage_rate
- review_completion_rate
- retry/rewrite conversion
- recovery_task_completion_rate

## 5) Non-goals
- 동기부여 앱화
- 배지/랭킹/스트릭 중심 설계
- 결제유도형 우선 흐름
- 범용 시험 플랫폼화

## Short References (non-quoted)
- Thaler & Sunstein (Nudge)
- Behavioural Insights Team (EAST)
- Nielsen Norman usability heuristics
