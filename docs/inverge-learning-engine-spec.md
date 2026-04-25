# Inverge Learning Engine Spec (Implementation-Ready Concept)

## 0) Scope and role
- Scope fixed: 감정평가사 1차, 감정평가사 2차
- 엔진 역할: 우선순위를 계산하고 실행 가능한 다음 행동을 결정
- AI 역할: 계산된 결과를 차분한 한국어로 설명 (계획을 임의 생성하지 않음)

## 1) Priority Engine

### 1.1 Formula (conceptual)
```txt
priority_score =
  exam_weight
+ weakness_score
+ forgetting_risk
+ recent_error_frequency
+ time_instability
+ rewrite_due_score
+ user_available_time_fit
+ exam_date_urgency
+ task_unblock_value
```

### 1.2 Factor definitions
- `exam_weight`: 감정평가사 합격 관점에서 과목/단원 중요도
- `weakness_score`: 최근 정답률, gap 빈도, rewrite 취약성
- `forgetting_risk`: 마지막 성공 회상 이후 경과
- `recent_error_frequency`: 동일 태그 반복 오류 빈도
- `time_instability`: 풀이/작성 시간 변동성
- `rewrite_due_score`: 2차 약문단 재작성 기한 도래 여부
- `user_available_time_fit`: 오늘 가용시간과 과제 길이 적합도
- `exam_date_urgency`: 시험일 임박도
- `task_unblock_value`: 후속 과제 해금 가치

### 1.3 Required output contract
- Today Priority
- reason
- estimated duration
- easy overrides
- review/retry/rewrite target
- next scheduled follow-up

## 2) 1차 Error Data Model

### 2.1 Required fields
- subject
- unit
- concept_tag
- set_id
- question_id
- answer_result
- error_reason
- confidence
- time_spent
- is_repeated_error
- retry_count
- last_reviewed_at
- next_review_at

### 2.2 Allowed error reasons
- 개념 부족
- 선지 오독
- 계산 실수
- 시간 부족
- 헷갈리는 개념과 혼동
- 찍음/확신 부족

### 2.3 Event examples
- `first_stage_answer_submitted`
- `first_stage_error_reason_selected`
- `first_stage_retry_scheduled`
- `first_stage_retry_completed`

## 3) 2차 Biggest-Gap Taxonomy

### 3.1 Gap types (single biggest gap only)
- 쟁점 누락
- 목차 구조 불안정
- 법리/이론 연결 약함
- 사안 포섭 부족
- 결론 선명도 부족
- 숫자/계산 근거 부족
- 문장 압축 실패
- 시간 배분 실패
- 논리 흐름 단절
- 핵심 키워드 누락

### 3.2 Required fields
- submission_id
- subject
- prompt_id
- gap_type
- affected_section
- affected_paragraph
- severity
- rewrite_required
- rewrite_completed
- rewrite_quality_delta
- next_rewrite_at

### 3.3 Event examples
- `second_stage_gap_detected`
- `second_stage_rewrite_started`
- `second_stage_rewrite_completed`
- `second_stage_rewrite_rescheduled`

## 4) Scheduling Policy (default)
- Correct + confident → +7d
- Correct + uncertain → +3d
- Wrong + concept gap → +1d
- Wrong + repeated error → today short retry +2d
- 2차 weak paragraph → rewrite queue in 24–72h

정책은 기본 적용이며 사용자 override 가능.

## 5) Metrics Contract
각 학습 원칙은 최소 1개 지표와 연결되어야 한다.

### Core metrics
- time_to_first_action
- task_start_rate
- task_completion_rate
- retry_conversion_rate
- rewrite_conversion_rate
- delayed_retry_accuracy
- repeated_error_rate
- review_completion_rate
- recovery_task_completion_rate
- one_gap_rewrite_completion_rate
- reduction_in_same_gap_recurrence

### Vanity metrics (do not optimize)
- raw time spent (quality 미반영)
- streak count
- AI comment count
- dashboard views
- score without next action

## 6) Explainability and UX Contract
- 이유(reason)는 1~2문장으로 제공
- 우선순위 근거는 데이터 필드 기반으로 설명
- 카피는 불안/비난 없이 운영형 문장 사용

## 7) Safety and scope guardrails
- 범위 외 시험 추천/노출 금지
- AI final judgment 표현 금지
- score-only endpoint 금지
- 피드백 후 retry/rewrite/schedule 액션 필수

## Short References (non-quoted)
- Roediger & Karpicke (2006)
- Cepeda et al.
- Hattie & Timperley
- Gollwitzer
- Thaler & Sunstein
