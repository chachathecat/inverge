# Inverge Closed Beta Operator Runbook

Closed beta 운영 담당자를 위한 실행 문서입니다. 범위는 감정평가사 1차/2차 learner 운영 준비 및 점검에 한정합니다.

## 1) Production URL
- 운영 URL: `https://www.inverge.app`
- 배포 점검/스모크 실행 시 기본 대상도 위 URL을 기준으로 합니다.

## 2) Required environment variables checklist
아래 항목은 **운영/검증 환경에서 수동 확인**이 필요합니다.

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, 절대 노출 금지)
- [ ] `ALPHA_INVITE_EMAILS` (초대 허용 이메일 목록)
- [ ] `E2E_BASE_URL` (권장: `https://www.inverge.app`)
- [ ] `E2E_USER_EMAIL` (테스트 전용 계정)
- [ ] `E2E_USER_PASSWORD` (테스트 전용 계정)

> 참고: `SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용해야 하며 클라이언트 번들/문서/로그에 노출되면 안 됩니다.

## 3) Verify Vercel production is on latest main
1. GitHub에서 `main`의 최신 커밋 SHA를 확인합니다.
2. Vercel 프로젝트의 **Production Deployment**에서 배포 커밋 SHA를 확인합니다.
3. 두 SHA가 일치하는지 확인합니다.
4. 일치하지 않으면 `main` 기준으로 재배포 후 재확인합니다.
5. 배포 완료 후 `/`, `/exams`, `/login` 최소 접근 확인을 수행합니다.

## 4) Run local E2E tests
사전 점검:
1. 환경 변수 존재 여부 확인
   - `npm run check:e2e-env`
2. 테스트 실행
   - `npm run test:e2e`
3. 필요 시 헤디드 실행
   - `npm run test:e2e:headed`

## 5) How to interpret pass/fail
- **Pass 기준**
  - Public smoke 통과
  - Route safety 통과
  - (자격증명 제공 시) authenticated 1차/2차 흐름 통과
- **Fail 기준**
  - public route 로드 실패, exam scope 노출 오류, 보호 라우트 경계 실패
  - authenticated 흐름에서 저장/이동/완료 상태 검증 실패
- **주의**
  - `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` 미설정 시 authenticated suite는 skip될 수 있습니다.
  - skip는 pass가 아니며, closed beta 오픈 전에는 테스트 전용 계정으로 반드시 full smoke를 1회 이상 통과해야 합니다.

## 6) Must never be committed
다음 항목은 저장소/커밋/PR 본문/스크린샷에 포함하면 안 됩니다.

- 비밀번호 (모든 계정 공통)
- `SUPABASE_SERVICE_ROLE_KEY`
- `E2E_USER_PASSWORD`
- 실제 사용자 개인 데이터 (답안 원문, 개인 식별 정보 등)

운영 원칙:
- 테스트 계정은 테스트 전용으로 분리합니다.
- 시크릿은 Vercel/Supabase의 비밀 관리 채널에서만 다룹니다.
- 문서에는 값이 아닌 **변수명/절차**만 기록합니다.
