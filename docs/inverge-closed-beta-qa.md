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
