# Inverge Closed Beta Readiness Guard (PR 52)

이 문서는 PR 47~51에서 정리된 핵심 학습 루프(분류 taxonomy, Today 홈, 1차 set-solving/review, 2차 write/compare/rewrite)가 closed beta 직전에 깨지지 않았는지 확인하기 위한 운영용 체크리스트다.

범위 원칙:
- learner-facing scope는 감정평가사 1차/2차만 유지한다.
- 새로운 시험 카테고리/새 라우트/새 DB schema/새 외부 AI 호출은 추가하지 않는다.
- auth/entitlement/Supabase access behavior는 변경하지 않는다.
- 제품 포지셔닝은 "AI 자동 채점기"가 아니라 학습 운영 시스템으로 유지한다.

## 1) Closed beta 핵심 사용자 루프 QA checklist

아래 항목은 모두 **Expected behavior**와 **Failure symptom**을 함께 본다.

### 1-1. 로그인 / invite-only 접근
- Expected behavior
  - allowlist 포함 계정은 로그인 후 `/app`으로 진입한다.
  - allowlist 미포함 계정은 invite-pending 상태를 본다.
  - 세션 재확인 시 `invite_status`, `entitlement_tier`가 덮어써지지 않는다.
- Failure symptom
  - 미초대 계정이 learner 화면으로 바로 진입한다.
  - 초대 계정이 반복적으로 pending 화면에 갇힌다.
  - 로그인 직후 entitlement가 free/basic으로 되돌아간다.

### 1-2. `/app` Today home
- Expected behavior
  - 모드(`mode=first|second`)에 맞는 오늘의 핵심 작업 CTA 하나가 우선 노출된다.
  - 공개 랜딩/마케팅 UI가 로그인 앱 쉘 안에 섞여 보이지 않는다.
- Failure symptom
  - Today에서 1차/2차 맥락이 섞여 잘못된 CTA로 이동한다.
  - 동일 화면에 경쟁하는 primary CTA가 2개 이상 나타난다.

### 1-3. 1차 study-log 저장
- Expected behavior
  - 과목 선택 + 입력 후 저장이 정상 완료되고 기록 목록/요약에 반영된다.
  - 저장 실패 시 사용자에게 실패 상태가 표시되고 입력값이 사라지지 않는다.
- Failure symptom
  - 저장 성공 토스트/상태 없이 기록이 누락된다.
  - 네트워크 오류 후 입력값이 초기화된다.

### 1-4. 1차 set-solving → 오답 기록 생성
- Expected behavior
  - 세트 풀이 제출 후 오답 항목이 생성되고, 오답 이유/회상 입력 흐름이 이어진다.
  - quick capture 경로와 set-solving 경로가 서로 대체되지 않고 목적이 분리된다.
- Failure symptom
  - 오답이 있어도 review queue로 연결되지 않는다.
  - set-solving이 quick capture를 덮어써 1차 루프가 단일 경로로 붕괴된다.

### 1-5. review queue → item detail → 완료 처리
- Expected behavior
  - review queue에서 item detail로 이동할 때 mode/컨텍스트가 유지된다.
  - 완료 처리 후 다음 행동(재시도/다시쓰기/다음 복습)으로 이어지는 종료 상태가 제공된다.
- Failure symptom
  - item 상세 진입 시 mode가 유실되어 1차/2차가 섞인다.
  - 완료 처리 후 점수만 보이고 다음 행동 없이 종료된다.

### 1-6. 2차 write → compare → rewrite
- Expected behavior
  - `쟁점 회상 → 목차 → 내 답안 → 기준답안 비교 → 간극 확인 → rewrite` 순서가 유지된다.
  - rewrite 저장 후 history/review 흐름으로 자연스럽게 복귀된다.
- Failure symptom
  - 중간 단계 생략/역순 진행으로 학습 루프가 깨진다.
  - rewrite 저장 후 상태가 반영되지 않거나 재진입이 막힌다.

### 1-7. weekly summary
- Expected behavior
  - 해당 주차 기록 기반으로 요약(진행량/핵심 신호/다음 복습)이 표시된다.
  - 1차/2차 모드별 요약이 분리되어 노출된다.
- Failure symptom
  - 빈 데이터인데도 임의 더미 요약이 노출된다.
  - 1차 요약 화면에서 2차 카피/데이터가 섞여 보인다.

### 1-8. feedback button
- Expected behavior
  - 주요 학습 화면에서 피드백 버튼이 접근 가능하고 제출 경로가 동작한다.
  - 제출 실패 시 재시도 가이드(또는 문의 안내)가 제공된다.
- Failure symptom
  - 버튼이 일부 핵심 화면에서 사라진다.
  - 제출 후 무응답 상태로 멈춰 사용자 행동이 막힌다.

## 2) Smoke/E2E seed data 노출 방지

- Expected behavior
  - production/preview learner 화면에서 E2E 전용 문구/계정/세트 데이터가 노출되지 않는다.
  - 테스트 데이터는 운영 데이터와 명확히 분리되고, 실제 사용자의 Today/review 우선순위를 가리지 않는다.
- Failure symptom
  - 실제 계정의 Today/review 목록에 `e2e`, `smoke`, `test-user` 등 테스트 흔적이 노출된다.
  - 운영 사용자 핵심 CTA가 테스트 데이터 카드에 밀려 잘못된 다음 행동을 유도한다.

권장 수동 점검:
1. preview URL에서 실계정/테스트계정 각각 로그인
2. `/app`, `/app/review`, `/app/weekly`에서 테스트 흔적 문자열 검색
3. 최근 생성 데이터 정렬 기준에서 테스트 데이터가 상단 점유하지 않는지 확인

## 3) Supabase migration / env readiness

### 3-1. PR 47 taxonomy migration 적용 여부
- 체크 항목
  - PR 47에서 도입된 taxonomy 관련 migration이 대상 환경(특히 preview/prod)에 적용되었는지 확인
  - taxonomy 분류 스크립트(`npm run check:taxonomy`)가 현재 스키마/데이터 기준으로 통과하는지 확인
- Failure symptom
  - taxonomy 분류 결과가 비정상적으로 `unknown`/fallback만 반환
  - 저장은 성공해도 분류/집계 화면에서 subject/category 매핑 누락

### 3-2. 필수 env 키
- 공통(필수)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- AI/모델 키(현재 기능 사용 범위에 따라 선택)
  - `OPENAI_API_KEY` (OpenAI 연동 경로 사용 시)
  - `GEMINI_API_KEY` 또는 프로젝트에서 사용 중인 Gemini 키 이름 (Gemini 연동 경로 사용 시)

운영 원칙:
- 실제로 호출되는 provider의 키만 환경별로 활성화한다.
- 미사용 provider 키 누락은 허용하되, 사용 경로에서 해당 키 누락 시 명시적 오류를 남겨야 한다.

### 3-3. 저장 실패 시 DB 컬럼/로그 확인 포인트
- 1차/2차 공통 저장 레코드에서 우선 확인
  - `user_id`, `exam_id`, `subject_id`, `stage`, `created_at`, `updated_at`
  - payload 계열(`raw_payload`, 필요 시 `derived_payload`)
- 로그 확인 포인트
  - API route 서버 로그(요청 body 검증 실패, 인증/권한 실패)
  - Supabase insert/update error 코드 및 메시지
  - 클라이언트 콘솔의 저장 실패 응답 status/body

## 4) UI/UX beta-readiness checklist

### 4-1. 과장된 AI 판정 표현 금지
- "AI가 최종 채점/최종 판정" 같은 표현이 learner UI에 없는지 확인
- 피드백 카피는 "다음 행동 제안" 중심인지 확인

### 4-2. Primary CTA 경쟁 방지
- 한 화면(primary task)에서 우선 CTA가 1개인지 확인
- 보조 CTA는 secondary/tertiary로 명확히 내려가 있는지 확인

### 4-3. 모바일 폼/CTA 안정성
- iOS Safari/Android Chrome 기준으로 입력 폼, 저장 버튼, 다음 단계 버튼이 깨지지 않는지 확인
- 키보드 오픈 시 주요 CTA가 화면 밖으로 사라지지 않는지 확인

### 4-4. 시험 범위 노출 검증
- learner-facing 경로에서 감정평가사 1차/2차 외 시험이 노출되지 않는지 확인
- 특히 아래 금지 확장 키워드가 UI/카피/네비게이션에 없는지 확인:
  - 계리사/보험계리사
  - CPA
  - TOEFL
  - SAT

## 5) Minimal code guard 적용 원칙

PR 52에서는 기능 확장 없이 문서 기반 guard를 우선한다.
- 허용: 체크리스트 보강, 운영 확인 포인트 명문화, 작은 문구/안전 가드
- 금지: 새 route, 새 DB migration, 새 AI flow, auth/entitlement 동작 변경

코드 가드가 정말 필요한 경우에도 아래 조건을 모두 만족해야 한다.
1. 기존 루프 회귀를 막는 최소 변경일 것
2. 데이터 스키마/권한 정책 변경이 없을 것
3. PR 47~51의 사용자 경로를 바꾸지 않을 것

## 6) Beta 전 최종 실행 체크 (release gate)

- `npm run build` 통과
- `npm run check:taxonomy` 가능 환경에서는 통과
- 미실행/실패 시 이유와 영향 범위를 배포 노트에 명시

수동 확인이 반드시 남는 항목:
- 실제 allowlist 계정(초대 전/후) 접근
- preview/prod에서 seed/E2E 데이터 비노출
- 모바일 실기기 CTA/폼 레이아웃 안정성
- Supabase 대상 프로젝트에 taxonomy migration 적용 상태
