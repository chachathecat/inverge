# Inverge Closed Beta QA Checklist

운영 경계 점검용 최소 체크리스트입니다. (학습 루프/디자인 변경 없이 운영 안정성 확인 목적)

## 1) Invite-only learner access
- [x] 로그인 후 `/app` 진입 시 allowlist 미포함 계정은 invite-pending 상태 화면을 본다.
- [x] allowlist 포함 계정은 `/app` 실행 화면으로 진입한다.
- [x] `ensureAccess` 재호출 시 기존 `invite_status`/`entitlement_tier`가 덮어써지지 않는다.

## 2) Admin mutation safety (`/api/admin/*`)
- [ ] `POST /api/admin/sets`
- [ ] `POST /api/admin/sets/[setId]`
- [ ] `POST /api/admin/curriculum-mappings`
- [ ] `POST /api/admin/root-cause-tags`
- [ ] `POST /api/admin/rewrite-seed-templates`
- [ ] `POST /api/admin/ai-outputs`

검증 조건:
- [x] 비로그인 또는 비관리자 이메일이면 `403 admin-required`로 차단된다.
- [x] 관리자 allowlist 이메일이면 정상 처리된다.

## 3) Production-safe auth/session behavior
- [x] production/non-local 환경에서 임의 `x-mvp-user-id`로 인증 우회가 불가하다.
- [x] 보호된 API는 Supabase 세션 확보 실패 시 fail-open 하지 않고 인증 오류로 닫힌다.

## 4) Unsupported exam exposure
- [x] `/exams` 화면에는 감정평가사 1차/2차만 노출된다.
- [x] `/exams/actuary*` 경로는 `notFound` 처리된다.
- [x] 레거시 `/exams/appraiser`는 `/exams`로 안전 리다이렉트된다.

## 5) Instructor boundary (documentation-only)
- [x] learner 네비게이션에 `/instructor`, `/studio` 링크가 노출되지 않는다.
- [x] `/instructor`, `/studio` 직접 접근은 `notFound` 처리된다.

## 6) Capture subject selection visibility (`/app/capture`)
- [x] `/app/capture?mode=first` 최초 진입 시 과목 드롭다운이 텍스트 입력영역보다 먼저 즉시 노출된다.
- [x] 1차 과목 드롭다운에 공식 5과목(민법, 경제학원론, 부동산학원론, 감정평가관계법규, 회계학)이 모두 표시된다.
- [x] `/app/capture?mode=second` 과목 드롭다운에 공식 3과목(감정평가실무, 감정평가이론, 감정평가 및 보상법규)이 모두 표시된다.
- [x] 1차에서 `감정평가관계법규` 선택 후 저장 시 선택 과목이 유지된다.

## 7) OCR/photo intake UX v1 (`/app/capture`)
- [ ] 이미지 업로드 경로가 동작하거나, 실패 시 사용자에게 명확한 오류를 보여주며 입력값이 사라지지 않는다.
- [ ] OCR 결과에 필수 항목 누락 또는 불확실 값이 있으면 `OCR 확인 필요` 상태가 노출된다.
- [ ] `OCR 확인 필요` 상태에서는 누락 필드 확인 전 저장이 차단된다.
- [ ] 텍스트 붙여넣기 경로와 수기 입력 경로는 이미지 업로드 없이도 동일하게 저장된다.
- [ ] 1차 set-solving 흐름(오답 기록 시작)은 기존 단계 규칙을 유지한다.
- [ ] 2차 writing 흐름(쟁점 회상→목차→답안→기준답안→간극→rewrite)은 기존 단계 규칙을 유지한다.

---

## Final closed-beta QA pass (2026-04-25)

### Checked surfaces
- Public: `/`, `/exams`, `/login`
- Learner app: invite-pending state, `/app?mode=first|second`, `/app/capture?mode=first|second`,
  `/app/capture?mode=second&rewriteFrom=...`, `/app/review?mode=first|second`,
  `/app/items/[itemId]?mode=second`, `/app/weekly?mode=first|second`
- Admin & boundaries: `/admin/alpha`, `/instructor`, `/studio`, unsupported exam routes

### Small fixes applied
1. **Mode preservation on review → item detail transition**
   - `review queue`의 "항목 열기"에서 `?mode=`를 유지하도록 수정해 1차/2차 컨텍스트가 끊기지 않게 정리.
2. **Public header polish for closed beta positioning**
   - 비로그인 헤더에서 `alpha 플랜` 링크를 제거해 payment-first 인상을 줄이고, 공개 랜딩의 1차 CTA를 `시작하기` 중심으로 유지.

### Notes / known limitations
- 실제 allowlist 계정별 runtime 검증(초대 승인 전/후)은 운영 Supabase 환경에서 최종 확인이 필요.
- 본 pass는 기능 추가 없이 라우팅/카피/노출 경계와 운영 안정성 위주로 점검.

### Closed beta readiness
- **판정: Ready (P0 blocker 없음)**  
  현재 범위(감정평가사 1차/2차 learner closed beta) 기준으로 출시 가능한 상태.

---

## Focused learner-flow QA pass after PR #30 (2026-04-26)

### Scope checked (learner only)
- 1차: `/app?mode=first` → Today CTA → `/app/sets?mode=first` → bulk answer input → 오답 이유/회상 → retry queue → `/app/review?mode=first` → `/app/capture?mode=first`
- 2차: `/app?mode=second` → Today CTA → `/app/write?mode=second` → 쟁점 회상/목차/답안/기준답안/간극/rewrite → `/app/capture?mode=second&rewriteFrom=...` → `/app/review?mode=second` → `/app/items/[itemId]?mode=second`

### Small fixes applied
1. **2차 빈 상태 CTA 목적지 정리**
   - review queue가 비어 있을 때, 2차는 generic capture 대신 `/app/write?mode=second`로 유도하도록 조정.
   - 기록 목록이 비어 있을 때도 동일하게 `/app/write?mode=second`를 기본 시작점으로 정리.
2. **2차 완료 요약의 다음 행동 링크 정리**
   - 항목 상세 완료 요약에서 “다른 답안 작업 보기” 링크를 `/app/write?mode=second`로 조정해 2차 실행 순서(회상→목차→작성→비교→rewrite)와 일치시킴.

### QA confirmations
- quick wrong-answer capture(`/app/capture?mode=first`)는 그대로 유지됨.
- set solving은 별도 경로(`/app/sets?mode=first`)이며 quick capture를 대체하지 않음.
- 2차 write workspace(`/app/write?mode=second`)와 generic capture(`/app/capture?mode=second`)가 분리되어 공존함.
- `rewriteFrom` 기반 direct paragraph rewrite 진입(`/app/capture?mode=second&rewriteFrom=...`)이 유지됨.
- 1차/2차 완료 요약(오늘 한 일/가장 큰 신호/다음 복습)이 계속 노출됨.
- review queue 완료는 다음 행동 선택이 선행되는 구조를 유지함.
- learner-facing `/instructor` 라우트 노출 추가 없음.

---

## Learner E2E QA follow-up pass after PR #30 (2026-04-26, final)

### Re-checked transitions (1차/2차)
- 1차 Today CTA → `/app/sets?mode=first` 진입과 quick capture(`/app/capture?mode=first`) 분리 유지 확인.
- 1차 set solving의 bulk 입력 → 오답 이유/회상 → retry queue 생성 → 완료 요약/다음 행동 동선 유지 확인.
- 2차 Today CTA → `/app/write?mode=second` 진입, 작성 단계(쟁점 회상→목차→답안→기준답안→간극→rewrite) 유지 확인.
- 2차 `rewriteFrom` 진입(`/app/capture?mode=second&rewriteFrom=...`)이 문단 직접 다시쓰기 컨텍스트를 유지하는지 확인.
- `/app/review?mode=first|second`와 `/app/items/[itemId]?mode=second`에서 mode 보존 및 completion summary/next action 구조 유지 확인.

### Small fix applied in this pass
1. **2차 빈 상태 CTA 문구를 실제 이동 경로와 일치시킴**
   - `primaryCta`를 `답안 비교 시작`에서 `2차 작성 워크스페이스 시작`으로 조정.
   - `/app/review?mode=second`, `/app/items?mode=second`의 빈 상태 버튼이 실제 타깃(`/app/write?mode=second`)과 동일 의미를 갖도록 정리.

### Final QA notes
- quick wrong-answer capture는 계속 `/app/capture?mode=first`로 제공됨.
- set solving은 `/app/sets?mode=first`로 유지되며 quick capture를 대체하지 않음.
- 2차 write workspace와 generic capture 경로가 분리되어 공존함.
- learner-facing `/instructor`, `/studio` 노출/진입 변화 없음.

---

## Focused learner-flow QA pass after subject-template updates (2026-04-26)

### Scope re-run (E2E, learner only)
- 1차: `/app?mode=first` → Today CTA → `/app/sets?mode=first` → bulk answer input → 오답 이유/회상 → retry queue → `/app/review?mode=first` → `/app/capture?mode=first`
- 2차: `/app?mode=second` → Today CTA → `/app/write?mode=second` → 쟁점 회상/목차/답안/기준답안/간극/rewrite → `/app/capture?mode=second&rewriteFrom=...` → `/app/review?mode=second` → `/app/items/[itemId]?mode=second`

### Small blocker fixed
1. **2차 작성 워크스페이스에서 임시 입력 초기화 시 막힘 상태 해소**
   - `workflow="second-write"` 상태에서 `임시 입력 지우기`를 누르면 단계가 `intake`로 리셋되어, 2차 단계 패널이 보이지 않고 저장 버튼이 비활성화된 채로 남는 문제가 있었음.
   - reset 시 워크플로별 초기 단계(`second-issue-recall` / `confirm` / `intake`)로 되돌리도록 수정해 즉시 다음 행동으로 복귀되게 조정.

### QA confirmations
- quick wrong-answer capture(`/app/capture?mode=first`) 유지.
- set solving(`/app/sets?mode=first`)은 quick capture를 대체하지 않음.
- 2차 write workspace(`/app/write?mode=second`)와 generic capture(`/app/capture?mode=second`) 공존 유지.
- `rewriteFrom` direct paragraph rewrite(`/app/capture?mode=second&rewriteFrom=...`) 유지.
- 완료 요약(오늘 한 일/가장 큰 신호/다음 행동) 노출 유지.
- review queue 완료는 다음 행동 선택 구조 유지.
- learner-facing instructor route 노출 추가 없음.
- 1차/2차 subject template 기반 가이드 문구 유지.

---

## Playwright E2E smoke (closed beta learner flows)

### 실행 방법 (로컬)
1. 의존성 설치
   - `npm install`
2. (선택) 로컬 서버 대신 외부 환경을 사용할 경우
   - `E2E_BASE_URL` 설정 (예: 스테이징 URL)
3. 테스트 실행
   - `npm run test:e2e`
   - 디버깅 시: `npm run test:e2e:headed`

### 환경 변수
- `E2E_BASE_URL` (optional)
  - 미설정 시 기본값: `http://127.0.0.1:3000`
- `E2E_USER_EMAIL` (authenticated smoke용)
- `E2E_USER_PASSWORD` (authenticated smoke용)

### 커버하는 흐름
- Public smoke (항상 실행)
  - `/` 로드 및 `시작하기` CTA 존재
  - `/exams`에 감정평가사 1차/2차만 노출
  - unsupported exam 키워드(보험계리사, CPA, 세무사, TOEFL, SAT) 비노출
- Authenticated learner smoke (자격 증명 있을 때만 실행)
  - 로그인(`/login`) 후 `/app?mode=first` Today CTA 확인
  - `/app/sets?mode=first` 5개 공식 과목 확인
  - 3문항 bulk 입력, 오답 생성, 공식 오답 이유 선택, 회상 문장 입력, 완료 상태 확인, `/app/review?mode=first` 확인
  - `/app?mode=second` 및 `/app/write?mode=second` 진입
  - 2차 3개 공식 과목 확인
  - 쟁점 회상 → 목차 → 내 답안 → 기준답안 → 간극 → 문단 다시쓰기 저장 및 완료 상태 확인
- Route safety smoke
  - `/instructor`, `/studio`는 learner UI 미노출
  - `/exams/actuary-first`, `/exams/actuary-second`는 blocked/notFound (404) 기대

### 자격 증명 누락 시 동작
- `E2E_USER_EMAIL` 또는 `E2E_USER_PASSWORD`가 없으면 authenticated smoke suite는
  명시적 사유 메시지와 함께 `skip`된다.
- public/route safety smoke는 계속 실행된다.

### 알려진 제한사항
- 인증 계정 상태(allowlist, 초대 상태, 실제 데이터 분리)는 실행 환경 Supabase 설정에 영향을 받는다.
- 브라우저 바이너리/패키지 설치가 제한된 환경에서는 e2e 실행이 실패할 수 있다.
