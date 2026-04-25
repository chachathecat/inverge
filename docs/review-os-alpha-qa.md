# Review OS Closed Alpha QA

## 1. 접근 / 세션
- 회원가입 또는 로그인 가능 여부 확인
- `/api/auth/session`에서 아래 값 확인
  - `authEnabled=true`
  - `isAuthenticated=true`
  - `isDemo=false`
  - `source="supabase"`
- `/app` 진입 시 초대 대상 계정은 작업 공간이 열리고, 미초대 계정은 대기 화면이 보이는지 확인

## 2. 온보딩
- `/app/onboarding`에서 아래만 입력하면 저장 가능한지 확인
  - 주력 시험
  - 자주 보는 과목
- 저장 후 `/app/capture`로 바로 이동하는지 확인

## 3. 첫 오답 입력
- `/app/capture`에서 텍스트 입력으로 오답 1개 생성
- 저장 직후 `/app/items/[itemId]`로 이동하는지 확인
- 상세 페이지에서 아래가 보이는지 확인
  - 오답 노트
  - 오답 유형
  - 반복 횟수
  - 다음 행동

## 4. 리뷰 큐
- `/app/review`에서 방금 생성한 오답이 큐에 들어오는지 확인
- `복습 완료`를 누르면 목록이 갱신되는지 확인

## 5. 오늘의 학습 방향
- `/app`에서 아래가 비어 있지 않은지 확인
  - 학습 방향 3줄
  - 다음 행동 1개
- 첫 사용자일 때도 빈 화면 대신 첫 오답 입력 안내가 보이는지 확인

## 6. 주간 리포트
- 오답 2개 이상 생성 후 `/app/weekly` 확인
- 아래가 자연스럽게 보이는지 확인
  - 가장 많이 틀린 유형
  - 반복 실수가 겹친 주제
  - 다음 주 우선 순서

## 7. 피드백
- `/app`, `/app/capture`, `/app/review`, `/app/weekly`에서 피드백 버튼이 보이는지 확인
- 피드백 전송 후 `/admin/alpha`에 반영되는지 확인

## 8. 운영 확인
- `/admin/alpha`에서 최근 이벤트와 최근 피드백이 보이는지 확인
- 먼저 볼 이벤트 예시
  - `wrong_answer_create`
  - `ai_note_generate`
  - `review_queue_view`
  - `weekly_summary_view`

## 9. 실패 지점 빠른 점검
- capture에서 막히면
  - `/api/os/items`
- item detail이 안 열리면
  - `/api/os/items/[itemId]`
- review가 비면
  - `/api/os/review-queue`
- weekly가 비면
  - `/api/os/weekly-summary`
