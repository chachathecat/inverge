# Inverge Learning Science (Research-Grade Behavior Rules)

본 문서는 감정평가사 1차/2차에서 합격 확률을 높이기 위한 핵심 학습 행동 규칙과 제품 구현 기준을 정의한다.

## Principle 1. Retrieval before passive review
### Product rule
수동 읽기보다 회상/산출이 가능하면 반드시 회상을 먼저 둔다.

### 1차 적용 예시
- 해설 전: 왜 오답 선지인지 먼저 설명하게 함
- 오답 후: 한 문장 개념 회상 후 재시도
- 개념 열람 전: 규칙/구분기준 먼저 회상

### 2차 적용 예시
- 모범답안 전: 쟁점 회상
- 본답안 전: 목차 회상
- 비교 전: 답안/목차/문단 산출 완료 필수

### Operationalization
- Behavior: 설명 전 회상 습관 형성
- Feature: pre-explanation recall prompt, issue recall, outline recall
- Data: recall_attempt, recall_correctness, confidence, time_spent, delayed_retry_accuracy
- Metric: 3–7일 지연 재시도 정확도, 반복오류 감소
- Failure mode: explanation-first

---

## Principle 2. Spaced review by default
### Product rule
복습은 opt-out 기본값이어야 하며 사용자가 원할 때만 수정 가능해야 한다.

### Initial scheduling
- 정답+확신: +7일
- 정답+불확실: +3일
- 오답+개념부족: +1일
- 오답+반복오류: 오늘 단기 재시도 +2일
- 2차 약문단: 24–72시간 내 rewrite queue

### Operationalization
- Behavior: 지연 후 재노출 실행
- Feature: retry/rewrite queue, Today Priority, Weekly Plan
- Data: attempt_result, confidence, error_reason, next_review_at, repeat_count
- Metric: review completion, delayed gain, same-tag error 감소
- Failure mode: 사용자 수동 복습 결정 의존

---

## Principle 3. Low cognitive load
### Product rule
모든 화면은 하나의 주행동만 가져야 하며, 3개 이상 경쟁 선택지를 만들지 않는다.

### Avoid
- 카드 과다
- 그래프/점수/코멘트 동시 노출
- 긴 AI 피드백
- 다중 CTA

### Use
- one primary CTA
- progressive disclosure
- 간결한 한국어 카피
- one-gap feedback

### Operationalization
- Behavior: 결정을 줄이고 즉시 시작
- Feature: TodayPriorityCard, quiet secondary actions
- Data: time_to_first_action, drop_off_before_start, choice_count
- Metric: 시작시간 단축, 시작률 향상
- Failure mode: 예쁜 대시보드지만 실행 부재

---

## Principle 4. One-biggest-gap feedback
### Product rule
피드백은 항상 “가장 큰 하나의 차이”를 지정하고 즉시 행동으로 이어야 한다.

### Required feedback questions
1. 가장 큰 gap은 무엇인가?
2. 정확히 어디인가?
3. 지금 무엇을 해야 하나?
4. 즉시 retry/rewrite가 가능한가?

### Operationalization
- Behavior: 과부하 없이 고레버리지 수정
- Feature: OneGapFeedbackCard + RewriteCTA/RetryCTA
- Data: gap_type, affected_paragraph, rewrite_attempted, quality_delta
- Metric: rewrite completion, same-gap recurrence 감소
- Failure mode: 장문 AI 피드백 + 무행동

---

## Principle 5. Immediate retry/rewrite
### Product rule
피드백 종료점은 점수/요약이 아니라 행동이다.

### Flows
- 1차: set solving → grading → error reason → concept recall → retry queue
- 2차: issue recall → outline → answer → compare → biggest gap → paragraph rewrite

### Operationalization
- Behavior: 오류를 즉시 행동으로 변환
- Feature: short retry today, rewrite queue
- Data: retry_started/completed, rewrite_started/completed, gap_delta
- Metric: retry/rewrite conversion, delayed improvement
- Failure mode: 평가를 종착점으로 사용

---

## Principle 6. Implementation intentions
### Product rule
Today/Weekly Plan은 반드시 실행 문장(행동+시간+범위+소요+이유)이어야 한다.

### Good format
- “오늘 20:40에 회계 말문제 15문항을 25분 안에 풉니다.”

### Operationalization
- Behavior: 시작 마찰 감소
- Feature: Today Plan, Weekly Plan, session-end commitment
- Data: planned_time, duration, task_type, started, completed
- Metric: plan completion, time-to-start
- Failure mode: 추상적 동기 문구

---

## Principle 7. Recovery-first design
### Product rule
밀림 상황에서 비난 대신 최소 복구 과제를 제시한다.

### Example
- “이번 주 계획이 조금 밀렸습니다. 오늘은 18분 복구 작업 1개만 하세요.”

### Operationalization
- Behavior: 이탈 후 재복귀
- Feature: recovery task, short mode, rescheduling
- Data: missed_task_count, recovery_started/completed
- Metric: return rate, recovery completion
- Failure mode: shame/guilt/streak loss 중심 메시지

## Scope and language constraints
- 제품 대상은 감정평가사 1차/2차로 고정
- 보험/계리/범용 시험 확장 언어 금지
- calm Korean operational copy 유지

## Short References (non-quoted)
- Roediger & Karpicke (2006)
- Cepeda et al.
- Sweller, van Merriënboer & Paas
- Hattie & Timperley
- Gollwitzer
