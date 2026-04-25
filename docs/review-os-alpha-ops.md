# Review OS Closed Alpha 운영 가이드

## 운영 원칙
- 점수보다 다음 행동을 먼저 보여준다.
- source of truth는 서버와 DB다.
- localStorage는 draft와 preference 정도로만 쓴다.

## 운영자가 매일 먼저 볼 것
- `/admin/alpha` 최근 이벤트
- `/admin/alpha` 최근 피드백
- 오답 생성 실패 여부
- 리뷰 큐가 비정상적으로 비어 있는지
- 주간 리포트가 계속 생성되지 않는지

## 우선 확인할 질문
- 첫 오답 입력 후 상세 페이지로 바로 이동하는가
- 리뷰 큐가 실제로 생성되는가
- 오늘의 학습 방향이 비어 있지 않은가
- 첫 사용자가 무엇을 해야 할지 바로 이해할 수 있는가

## 문제가 생기면 먼저 볼 곳
- `/api/auth/session`
- `/api/os/profile`
- `/api/os/items`
- `/api/os/review-queue`
- `/api/os/today-focus`
- `/api/os/weekly-summary`

## DB에서 먼저 볼 테이블
- `study_profiles`
- `wrong_answer_items`
- `wrong_answer_notes`
- `wrong_answer_tags`
- `recurrence_features`
- `review_queue_items`
- `weekly_learning_summaries`
- `usage_events`
- `feedback_items`
