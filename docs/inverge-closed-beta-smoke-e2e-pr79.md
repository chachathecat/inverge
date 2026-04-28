# PR79 Playwright smoke E2E 운영 가이드

closed beta MVP 배포 후 핵심 route가 깨지지 않았는지 최소 비용으로 반복 확인하기 위한 smoke E2E 가이드입니다.

## 실행 커맨드

```bash
npm run test:e2e:smoke
```

- 기본적으로 `tests/e2e/closed-beta-smoke.spec.ts`만 실행합니다.
- 로컬에서 `E2E_BASE_URL`이 없으면 Playwright가 `npm run dev`를 띄워서 실행합니다.

## 커버 범위

- Public route
  - `/`
  - `/exams`
  - `/answer-review`
  - `/answer-review` 3-step indicator (`자료 넣기`, `구조화 확인`, `피드백 복사`) 확인
  - 금지 문구(`AI 채점`, `합격 판정`, `점수 보장`) 미노출 확인
- Answer-review interaction
  - 텍스트 입력 3종(문제/사례, 내 답안, 기준답안)
  - `/api/answer-review/structure`는 네트워크 mock으로 대체
  - 실제 Gemini 호출 없이 Step CTA 전환만 확인
- Auth-required route (조건부)
  - `/app?mode=first`
  - `/app?mode=second`
  - `/app/study-log?mode=first&subject=회계학`
  - `/app/write?mode=second`
  - `/app/settings?mode=first`
  - 초대 미승인 계정이면 `아직 초대 승인 전입니다.` 안내 노출을 정상 상태로 간주

## 인증 테스트 실행 조건

아래 중 하나를 설정하면 auth-required smoke가 실행됩니다.

1. `TEST_AUTH_STATE_PATH`
   - Playwright `storageState` 파일 경로
2. `TEST_USER_EMAIL`
   - 로그인 기반 실행 신호
   - 실제 로그인 수행에는 `TEST_USER_PASSWORD`가 함께 필요
3. 호환 fallback: `E2E_USER_EMAIL` + `E2E_USER_PASSWORD`

어떤 조건도 없으면 auth-required smoke는 **skip** 처리됩니다.
`TEST_USER_EMAIL`만 있고 비밀번호가 없으면 auth-required smoke는 **skip** 처리됩니다.

## CI / Vercel 권장 env

- 필수(원격 배포 대상 테스트 시)
  - `E2E_BASE_URL` (예: preview 또는 production URL)
- 선택(인증 smoke까지 수행할 때)
  - `TEST_AUTH_STATE_PATH` 또는
  - `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`

`GEMINI_API_KEY`는 smoke E2E에서 직접 요구하지 않습니다. (`/api/answer-review/structure`를 mock 처리)
