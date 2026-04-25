# Inverge Closed Beta QA Checklist

운영 경계 점검용 최소 체크리스트입니다. (학습 루프/디자인 변경 없이 운영 안정성 확인 목적)

## 1) Invite-only learner access
- [ ] 로그인 후 `/app` 진입 시 allowlist 미포함 계정은 invite-pending 상태 화면을 본다.
- [ ] allowlist 포함 계정은 `/app` 실행 화면으로 진입한다.
- [ ] `ensureAccess` 재호출 시 기존 `invite_status`/`entitlement_tier`가 덮어써지지 않는다.

## 2) Admin mutation safety (`/api/admin/*`)
- [ ] `POST /api/admin/sets`
- [ ] `POST /api/admin/sets/[setId]`
- [ ] `POST /api/admin/curriculum-mappings`
- [ ] `POST /api/admin/root-cause-tags`
- [ ] `POST /api/admin/rewrite-seed-templates`
- [ ] `POST /api/admin/ai-outputs`

검증 조건:
- [ ] 비로그인 또는 비관리자 이메일이면 `403 admin-required`로 차단된다.
- [ ] 관리자 allowlist 이메일이면 정상 처리된다.

## 3) Production-safe auth/session behavior
- [ ] production/non-local 환경에서 임의 `x-mvp-user-id`로 인증 우회가 불가하다.
- [ ] 보호된 API는 Supabase 세션 확보 실패 시 fail-open 하지 않고 인증 오류로 닫힌다.

## 4) Unsupported exam exposure
- [ ] `/exams` 화면에는 감정평가사 1차/2차만 노출된다.
- [ ] `/exams/actuary*` 경로는 `notFound` 처리된다.
- [ ] 레거시 `/exams/appraiser`는 `/exams`로 안전 리다이렉트된다.

## 5) Instructor boundary (documentation-only)
- [ ] learner 네비게이션에 `/instructor`, `/studio` 링크가 노출되지 않는다.
- [ ] `/instructor`, `/studio` 직접 접근은 `notFound` 처리된다.
