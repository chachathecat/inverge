# Inverge Closed Beta Operator Runbook

Closed beta 운영 담당자를 위한 실행 문서입니다. 범위는 감정평가사 1차/2차 learner 운영 준비 및 점검에 한정합니다.

## Entry IA 원칙 (운영 고정)
- `/exams`는 아래 3개 카드만 제공해야 합니다.
  - 감정평가사 1차
  - 감정평가사 2차
  - 답안 검토실(운영자용 베타)
- learner 실행 화면은 1차/2차 트랙 분리를 유지해야 하며, 실행 중 모드 전환 picker를 노출하지 않습니다.
- 답안 검토실은 안내성 베타 영역으로만 취급하며 최종 채점/합격 판정 기능으로 안내하지 않습니다.

## 1) Production URL
- 운영 URL (현재 검증됨): `https://inverge-rust.vercel.app`
- Custom domain, if configured later: `https://www.inverge.app`
- 배포 점검/스모크 실행 시 기본 대상은 현재 검증된 운영 URL을 기준으로 합니다.

## 2) Required environment variables checklist
아래 항목은 **운영/검증 환경에서 수동 확인**이 필요합니다.

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, 절대 노출 금지)
- [ ] `ALPHA_INVITE_EMAILS` (초대 허용 이메일 목록)
- [ ] `E2E_BASE_URL` (권장: `https://inverge-rust.vercel.app`)
- [ ] `E2E_USER_EMAIL` (테스트 전용 계정)
- [ ] `E2E_USER_PASSWORD` (테스트 전용 계정)
- [ ] `E2E_USER_A_EMAIL` (2인 분리 검증용)
- [ ] `E2E_USER_A_PASSWORD` (2인 분리 검증용)
- [ ] `E2E_USER_B_EMAIL` (2인 분리 검증용)
- [ ] `E2E_USER_B_PASSWORD` (2인 분리 검증용)

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
  - Public smoke 통과(`/exams` 3카드 + unsupported exam 미노출)
  - Route safety 통과
  - (자격증명 제공 시) authenticated 1차/2차 흐름 통과
  - 답안 검토실이 안내 페이지로만 열리고 업로드/변경 surface가 없음
- **Fail 기준**
  - public route 로드 실패, exam scope 노출 오류, 보호 라우트 경계 실패
  - authenticated 흐름에서 저장/이동/완료 상태 검증 실패
  - learner surface에서 1차/2차 전환 picker 재노출
  - 답안 검토실이 최종 채점/합격 판정으로 표현되거나 mutation 기능이 노출됨
- **주의**
  - `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` 미설정 시 authenticated suite는 skip될 수 있습니다.
  - `E2E_USER_A_*`/`E2E_USER_B_*` 미설정 시 `tests/e2e/data-isolation.spec.ts`는 skip됩니다.
  - skip는 pass가 아니며, closed beta 오픈 전에는 테스트 전용 계정으로 반드시 full smoke를 1회 이상 통과해야 합니다.

## 6) Two-user data isolation verification
사전 조건:
1. Supabase Auth에 User A, User B를 수동 생성합니다.
2. 두 이메일 모두 `ALPHA_INVITE_EMAILS`에 추가합니다.
3. 로컬에 `E2E_USER_A_EMAIL`, `E2E_USER_A_PASSWORD`, `E2E_USER_B_EMAIL`, `E2E_USER_B_PASSWORD`를 설정합니다.

실행:
1. `npm run check:e2e-env`
2. `npm run test:e2e`
3. `npx playwright test tests/e2e/data-isolation.spec.ts`

판정:
- **Pass**
  - User A가 생성한 고유 제목(1차 set-solving 기록)이 User B review/API 목록에서 보이지 않음
  - User B가 생성한 고유 제목이 User A review/API 목록에서 보이지 않음
  - 가능할 때 item detail direct access 시도 시 notFound/비노출/차단으로 처리됨
  - 트랙 분리(1차/2차 mode) 상태에서도 사용자 간 데이터가 교차 노출되지 않음
- **Fail**
  - 한 사용자의 고유 제목/상세 데이터가 다른 사용자 계정에서 노출됨
  - item detail 또는 API 응답에 타 사용자 콘텐츠가 실질적으로 노출됨

Fail 대응(즉시):
1. 베타 초대/온보딩을 즉시 중단합니다.
2. Playwright 결과, 서버 로그, Supabase 로그를 보존합니다. (삭제 금지)
3. 새로운 사용자 초대를 진행하지 않습니다.
4. 저장소의 접근 가드(`userId`, `email` 기반 필터링)와 Supabase 조회 조건을 우선 조사합니다.
5. 재현 시나리오를 문서화하고 수정/재검증 전까지 closed beta 오픈을 보류합니다.

## 7) Must never be committed
다음 항목은 저장소/커밋/PR 본문/스크린샷에 포함하면 안 됩니다.

- 비밀번호 (모든 계정 공통)
- `SUPABASE_SERVICE_ROLE_KEY`
- `E2E_USER_PASSWORD`
- 실제 사용자 개인 데이터 (답안 원문, 개인 식별 정보 등)

운영 원칙:
- 테스트 계정은 테스트 전용으로 분리합니다.
- 시크릿은 Vercel/Supabase의 비밀 관리 채널에서만 다룹니다.
- 문서에는 값이 아닌 **변수명/절차**만 기록합니다.
