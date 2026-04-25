# Appraisal-First A/B Isolation QA

## 목적
- 감정평가사 1차의 운영 데이터가 사용자 UUID 기준으로 분리되는지 확인한다.
- 브라우저 저장소가 다른 사용자 데이터처럼 보이지 않는지 확인한다.

## 사전 조건
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `npm run dev -- --port 3001`

## 시나리오 A
1. user A로 로그인
2. `/exams/appraisal-first/onboarding` 저장
3. `/exams/appraisal-first/starter-diagnosis` 생성
4. `/exams/appraisal-first/civil_law/past-set/intro-10` 제출
5. `/exams/appraisal-first/civil_law/review`에서 리뷰 완료 1건 생성
6. `/exams/appraisal-first/weekly-coaching` 확인
7. `/exams/appraisal-first/civil_law/records` 확인

기대 결과:
- 리뷰 큐, 기록, 주간 코칭이 모두 user A 데이터로 보인다.
- 새로고침 후에도 동일하다.

## 시나리오 B
1. 같은 브라우저에서 user A 로그아웃
2. user B로 로그인
3. `/exams/appraisal-first/civil_law/review` 확인
4. `/exams/appraisal-first/civil_law/records` 확인
5. `/exams/appraisal-first/weekly-coaching` 확인

기대 결과:
- user A의 리뷰/기록/코칭이 보이지 않는다.
- 빈 상태 또는 user B 자신의 데이터만 보인다.

## 교차 검증
1. user B로 onboarding, starter diagnosis, set submission 1회 생성
2. user A로 다시 로그인
3. 같은 경로를 다시 확인

기대 결과:
- user A 화면에는 user A 데이터만 남는다.
- user B 데이터가 user A에게 보이지 않는다.

## 브라우저 저장소 점검
- `localStorage`에서 `inverge:appraisal-first` 키를 확인한다.
- 운영 데이터가 아니라 아래만 남아야 한다.
  - onboarding draft
  - past-set draft

## 실패 시 우선 점검
- `POST 200` 직후 `GET`이 비는지
- `/api/auth/session`의 `source`가 `supabase`인지
- `review_queue_items`, `answer_submissions`, `coaching_seeds` row의 `user_id`가 세션 UUID와 일치하는지
