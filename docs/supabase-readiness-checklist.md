# Inverge Supabase 연결 준비 체크리스트

이 문서는 실제 Supabase env 연결과 migration 적용 전에 확인할 항목만 정리한다.
이번 단계의 목적은 실연결이 아니라, 데모 fallback과 real path의 경계를 분명히 하고 운영 차단점을 줄이는 것이다.

## 1. 범위

- 감정평가사 1차
- 감정평가사 2차
- 보험계리사 1차
- 보험계리사 2차

데이터 원칙:

- `raw_payload`: 서비스 제공용 원문/원본 캡처
- `derived_payload`: 제품 분석/엔진 개선용 파생 특징
- `research_participation`: opt-in 연구/모델 개선 동의 분리

## 2. 필요한 env

| 항목 | 용도 | 없을 때 동작 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 브라우저/서버 Supabase client 생성 | auth/session demo fallback |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저/서버 auth session | auth/session demo fallback |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 admin persistence, profile seed, user-level Postgres write | auth는 켜져도 persistence는 file fallback 가능 |

핵심:

- `URL + anon key`만 있으면 auth/session은 real path를 탈 수 있다.
- `service role key`까지 있어야 user-level DB persistence가 완전히 real path로 간다.

## 3. Supabase 관련 코드 경계

### 3-1. env / client 생성

- `lib/supabase/server.ts`
  - `isSupabaseConfigured()`
  - `createOptionalSupabaseServerClient()`
- `lib/supabase/client.ts`
  - `createOptionalSupabaseBrowserClient()`
- `lib/supabase/admin.ts`
  - `createSupabaseAdminClient()`
- `lib/supabase/persistence.ts`
  - `canUseSupabasePersistence(userId)`

### 3-2. auth/session 경계

- `lib/auth/session.ts`
- `app/api/auth/session/route.ts`
- `app/api/auth/sign-in/route.ts`
- `app/api/auth/sign-up/route.ts`
- `app/api/auth/sign-out/route.ts`
- `app/exams/layout.tsx`

### 3-3. persistence 전환 경계

- `lib/appraisal-first/file-repository.ts`
- `lib/inverge/second-exam-repository.ts`
- `lib/actuary-first/file-repository.ts`
- `lib/actuary-second/file-repository.ts`
- `lib/inverge/subscription-repository.ts`

이 레이어들은 공통적으로 `canUseSupabasePersistence(userId)`가 `true`일 때만 Supabase 경로를 탄다.

## 4. demo fallback 작동 지점

### 4-1. auth/session

`lib/auth/session.ts`

- Supabase env 없음:
  - `authEnabled=false`
  - `isDemo=true`
  - `source="demo"`
  - fallback user id 사용
- Supabase env 있음 + 세션 없음:
  - `authEnabled=true`
  - `isDemo=false`
  - `source="supabase"`
  - `userId=null`
  - 더 이상 demo user로 내려가지 않음

### 4-2. demo user

현재 demo fallback user id는 `mvp-user`다.

적용 위치:

- `lib/auth/session.ts`
- `/exams` 하위 일부 server page summary helper
- subscription / checkout demo path

### 4-3. `x-mvp-user-id`

`getRequestUserId()`는 Supabase env가 없을 때만 `x-mvp-user-id` 헤더를 읽는다.

의미:

- 개발 환경에서 pseudo multi-user 테스트 용도
- real auth-enabled 환경에서는 무시되어야 정상

## 5. migration 파일 위치와 적용 순서

### 파일 위치

- `supabase/migrations/20260422_inverge_service_core.sql`
- `supabase/migrations/20260423_inverge_service_role_grants.sql`

### 현재 포함 테이블

- `profiles`
- `research_participation`
- `exam_sessions`
- `answer_submissions`
- `rewrite_submissions`
- `diagnosis_results`
- `review_queue_items`
- `coaching_seeds`
- `problem_uploads`
- `derived_problem_features`
- `derived_answer_features`
- `subscriptions`
- `checkout_sessions`

### schema 확인 포인트

- `user_id` ownership
- `exam_id / subject_id / stage`
- `raw_payload / derived_payload`
- `created_at / updated_at`
- RLS enabled

### 적용 순서

1. Supabase 프로젝트 생성
2. env 준비
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. migration 적용
   - `20260422_inverge_service_core.sql`
   - `20260423_inverge_service_role_grants.sql`
4. auth session 확인
5. user-level persistence 확인
6. product route별 저장/조회 검증

### 적용 방법

우선순위는 아래 순서로 본다.

1. Supabase SQL Editor에서 `20260422_inverge_service_core.sql` 실행
2. 또는 CLI가 정상인 환경에서 `supabase db push`

현재 로컬 머신에서 CLI가 실행되지 않으면 SQL Editor 적용이 더 안전하다.

### 적용 전 주의

- 현재 migration은 `create policy ...`를 사용한다.
- 정책이 이미 있는 DB에 같은 migration을 다시 적용하면 실패할 수 있다.
- 따라서:
  - 새 프로젝트에 첫 적용하는 흐름이 가장 안전하다.
  - 이미 일부 schema가 있는 DB라면 정책 중복 여부를 먼저 확인해야 한다.
  - 재적용이 필요하면 policy 충돌을 먼저 정리한 뒤 실행해야 한다.

## 6. real auth/session으로 전환될 경로

### 전환 조건

1. `NEXT_PUBLIC_SUPABASE_URL` 존재
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` 존재
3. `SUPABASE_SERVICE_ROLE_KEY` 존재

### 전환 결과

- `/api/auth/session`
  - `authEnabled=true`
  - `isDemo=false`
  - `source="supabase"`
- `/api/auth/sign-in`
  - `503 supabase-not-configured`가 사라져야 함
- `/api/auth/sign-up`
  - auth user 생성 + `profiles`, `research_participation` seed upsert
- `/exams/*`
  - unauthenticated 시 `/login` redirect
- repository/service
  - UUID user id일 때 Supabase persistence 사용

## 7. user A / user B 데이터 분리 위험 지점

### 현재 코드상 점검 포인트

| 위치 | 위험 | 해석 |
|---|---|---|
| `lib/auth/session.ts` demo fallback | `mvp-user` 공유 | demo mode에서만 의도된 공유 상태 |
| `app/exams/page.tsx` | `session.userId ?? "mvp-user"` | auth-enabled 환경에서는 layout 보호로 실사용 문제 낮음 |
| `app/exams/appraiser/page.tsx` | same fallback | demo mode에서는 공유 가능 |
| `app/exams/actuary/page.tsx` | same fallback | demo mode에서는 공유 가능 |
| `app/api/inverge/subscription/route.ts` GET | unauthenticated free fallback | auth-enabled 환경에서는 `authRequired: true`와 함께 free state 반환 |
| `app/api/inverge/checkout/route.ts` | demo user fallback | auth-enabled 환경에서는 `401 auth-required` |

### 운영상 의미

- real auth-enabled 환경에서는 demo user가 source of truth가 되면 안 된다.
- 현재 코드는 그 경계를 대체로 지키고 있다.
- 다만 demo mode에서는 여러 테스트 사용자의 데이터가 섞이는 것이 정상 동작이다.

## 8. 화면/기능별 user-level persistence 경로

### 감정평가사 1차

| 기능 | 저장/조회 API | 주 테이블 |
|---|---|---|
| onboarding | `/api/appraisal-first/onboarding` | `exam_sessions` |
| starter diagnosis | `/api/appraisal-first/starter-diagnosis` | `diagnosis_results` |
| set submissions | `/api/appraisal-first/set-submissions` | `answer_submissions` |
| review completions | `/api/appraisal-first/review-completions` | `diagnosis_results`, `review_queue_items` |
| weekly coaching | `/api/appraisal-first/weekly-coaching` | `coaching_seeds` |
| records | `/api/appraisal-first/records` | composite read |

### 감정평가사 2차

| 기능 | 저장/조회 API | 주 테이블 |
|---|---|---|
| write submissions | `/api/inverge/second-exam/submissions` | `answer_submissions` |
| rewrites | `/api/inverge/second-exam/rewrites` | `rewrite_submissions` |
| compare source | `/api/inverge/second-exam/source` | latest submission/rewrite |
| records history | `/api/inverge/second-exam/history` | submission/rewrite history |

### 보험계리사 1차

| 기능 | 저장/조회 API | 주 테이블 |
|---|---|---|
| sample set submissions | `/api/actuary-first/set-submissions` | `answer_submissions` |
| verifier output | `derived_payload` | `answer_submissions` |
| review queue | `/api/actuary-first/review-queue` | `review_queue_items` |
| records | `/api/actuary-first/records` | composite read |

### 보험계리사 2차

| 기능 | 저장/조회 API | 주 테이블 |
|---|---|---|
| sample problem submissions | `/api/actuary-second/verifier` | `answer_submissions` |
| verifier output | `/api/actuary-second/verifier` | `diagnosis_results` |
| correction seed | verifier/service path | `coaching_seeds` |
| review queue | `/api/actuary-second/review-queue` | `review_queue_items` |
| records | `/api/actuary-second/records` | composite read |

## 9. env 누락 시 실패 방식

| 상황 | 기대 동작 |
|---|---|
| Supabase env 전부 없음 | demo auth/session + file-backed fallback |
| URL/anon만 있음 | real auth/session 가능, DB persistence는 일부 또는 전체 file fallback 가능 |
| service role만 없음 | sign-up profile seed / Postgres write 불완전 가능 |
| auth-enabled인데 세션 없음 | `/exams/*` redirect, 일부 API는 `401 auth-required` |
| `/api/auth/sign-in`, `/api/auth/sign-up` with no env | `503 supabase-not-configured` |

운영자 확인 포인트:

- `/api/auth/session`의 `source`
- `/api/auth/session`의 `authEnabled`
- UUID user id 사용 여부

## 10. 실제 연결 후 수동 검증 체크리스트

### A. auth/session

1. user A 회원가입
2. user A 로그인
3. `/api/auth/session` 확인
   - `authEnabled=true`
   - `isDemo=false`
   - `source="supabase"`
   - `userId` is UUID
4. `/exams` 진입 확인
5. 로그아웃
6. `/exams` 접근 시 로그인 유도 확인

### B. user A 데이터 생성

1. 감정평가사 1차 onboarding 저장
2. 감정평가사 1차 set submission 저장
3. 감정평가사 2차 write / rewrite 저장
4. 보험계리사 1차 sample set submission 저장
5. 보험계리사 2차 sample problem submission 저장
6. 각 records / review queue 확인

### C. user B 분리 확인

1. user B 회원가입/로그인
2. user A의 감평 1차 records 미노출 확인
3. user A의 감평 2차 compare/history 미노출 확인
4. user A의 보험계리사 records/review queue 미노출 확인
5. user B의 신규 데이터만 보이는지 확인

### D. subscription

1. user A pricing 진입
2. mock checkout started
3. current plan / checkout session이 user A 기준으로 생성되는지 확인
4. user B 로그인
5. user A의 subscription state가 user B에 보이지 않는지 확인

### E. fallback 차단 확인

1. auth-enabled 환경에서 `/api/auth/session`의 `isDemo=false` 확인
2. auth-enabled 환경에서 unauthenticated API 요청 시 `401` 확인
3. auth-enabled 환경에서 `mvp-user`가 source of truth로 쓰이지 않는지 확인

### F. 감정평가사 1차 우선 확인

1. onboarding 저장
2. starter diagnosis 저장
3. past set submission 저장
4. review queue 조회
5. weekly coaching 생성
6. records 조회

이 여섯 개가 같은 UUID user 기준으로 반복 조회되면 1차 persistence 전환은 기준을 충족한다.

## 11. 연결 직전 운영 메모

- demo mode는 개발 편의를 위한 경로다.
- closed beta 직전 환경에서는 real auth/session이 켜지면 demo fallback이 운영 source가 되면 안 된다.
- raw text는 서비스 제공용 저장으로만 남고, derived/research layer와 분리되어야 한다.
