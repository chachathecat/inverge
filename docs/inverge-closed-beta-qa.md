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
