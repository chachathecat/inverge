# Inverge Closed Beta Admin Checklist

클로즈드 베타 운영 전/중 점검 체크리스트입니다.

## A. Before inviting users
- [ ] Vercel production deployment가 latest `main` 커밋인지 확인
- [ ] Supabase 관련 환경 변수 구성 확인
- [ ] `ALPHA_INVITE_EMAILS` 구성 확인
- [ ] `E2E_BASE_URL`가 production URL로 설정되었는지 확인
- [ ] `npm run test:e2e` 로컬 통과 확인
- [ ] `test-results` 산출물 정리(필요 시 삭제)
- [ ] `git status` clean 확인

## B. Test accounts
- [ ] Supabase Auth에서 테스트용 사용자 2~3개를 수동 생성
- [ ] 위 테스트 이메일을 `ALPHA_INVITE_EMAILS`에 수동 반영
- [ ] 자격증명(이메일/비밀번호)을 저장소에 커밋하지 않음
- [ ] E2E는 테스트 전용 자격증명으로만 실행

## C. Manual QA
- [ ] invite pending 계정 확인
- [ ] allowlist 허용 계정 확인
- [ ] 1차 set solving 흐름 확인
- [ ] 1차 quick wrong-answer capture 확인
- [ ] 2차 writing workspace 흐름 확인
- [ ] 2차 `rewriteFrom` 흐름 확인
- [ ] review queue 확인
- [ ] 데이터 분리 관점 수동 점검

## D. Data separation
- [ ] 사용자 A 기록이 사용자 B 화면에 나타나지 않음
- [ ] review queue가 사용자별로 분리됨
- [ ] item detail이 사용자별로 분리됨
- [ ] admin route 보호가 유지됨

## E. Data Isolation E2E (optional but recommended before invite)
1. Supabase Auth에서 테스트용 사용자 2개를 수동 생성합니다. (User A / User B)
2. 두 이메일을 `ALPHA_INVITE_EMAILS`에 수동 추가합니다.
3. 로컬 환경 변수에 아래 값을 설정합니다. (값은 절대 커밋 금지)
   - `E2E_USER_A_EMAIL`
   - `E2E_USER_A_PASSWORD`
   - `E2E_USER_B_EMAIL`
   - `E2E_USER_B_PASSWORD`
4. 기본 스모크를 먼저 실행합니다.
   - `npm run test:e2e`
5. 2인 데이터 분리 스모크를 실행합니다.
   - `npx playwright test tests/e2e/data-isolation.spec.ts`
6. 자격증명은 로컬 `.env` 또는 시크릿 매니저로만 관리하고, 저장소/PR 본문/스크린샷에 포함하지 않습니다.
