# Inverge Closed Beta Acceptance Checklist

이 문서는 **감정평가사 1차/2차** 범위에서, 클로즈드 베타 사용자 초대 전에 수행해야 하는 수동 QA 체크리스트입니다.

- 목적: 초대 전 최소 품질 기준 확인
- 범위: 문서 기반 수동 검증 (제품 동작 변경 없음)
- 제외: 스키마/Auth/Gemini/Supabase/learning-signal 로직/라우트/UI/카피 변경 작업

---

## 테스트 기본 정보

- 테스트 일시:
- 테스트 환경 (예: local/staging):
- 테스트 계정:
- 테스트 담당자:
- 앱 버전/커밋:

---

## 결과 기록 포맷 (모든 항목 공통)

각 항목마다 아래 형식으로 기록합니다.

- **Status:** Pass / Fail / Needs fix
- **Notes:** 관찰 내용, 재현 조건, 기대 대비 차이
- **Screenshot (optional):** 파일 경로 또는 링크

예시:

- Status: Pass
- Notes: `/app?mode=first` 진입 직후 첫 카드가 단일 CTA로 노출되며, 클릭 시 입력 화면으로 이동함.
- Screenshot (optional): `screenshots/first-home-cta.png`

---

## 1) 1차 (First-stage) 해피패스

### 1.1 로그인
- [ ] 로그인 가능 여부 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 1.2 `/app?mode=first` 이동
- [ ] URL 진입 후 1차 모드로 정상 로드되는지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 1.3 첫 가시 카드의 단일 다음 행동
- [ ] 첫 번째로 보이는 카드가 **명확한 하나의 다음 행동**을 제시하는지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 1.4 입력 화면 진입
- [ ] 상단 내비 또는 CTA를 통해 `입력`으로 이동
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 1.5 오답/학습 기록 1건 추가
- [ ] 오답 또는 학습 기록 1건 저장
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 1.6 `/app?mode=first` 복귀 후 Today Plan 확인
- [ ] 홈 복귀 시 Today Plan이 업데이트되거나, 합리적인 다음 행동을 제시하는지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 1.7 기록 화면 확인
- [ ] `기록`에서 아래 항목이 이해 가능한지 확인
  - 최근 기록
  - 반복 약점
  - 다시 볼 항목
  - 주간 정리
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

---

## 2) 2차 (Second-stage) 해피패스

### 2.1 `/app?mode=second` 이동
- [ ] URL 진입 후 2차 모드로 정상 로드되는지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 2.2 명확한 단일 다음 행동 확인
- [ ] 홈 첫 영역에서 **하나의 분명한 다음 행동**이 보이는지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 2.3 답안 작성 또는 답안 리뷰 시작
- [ ] 답안 작성/답안 리뷰 중 하나를 시작
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 2.4 답안/리뷰 기록 1건 추가
- [ ] 답안 또는 리뷰 기록 1건 저장
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 2.5 `/app?mode=second` 복귀 후 Today Plan 확인
- [ ] 홈 복귀 시 Today Plan이 업데이트되는지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 2.6 기록 화면 확인
- [ ] `기록`에서 아래 항목이 이해 가능한지 확인
  - 최근 답안 기록
  - 반복 약점
  - 다시 볼 항목
  - 주간 정리
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

---

## 3) 답안 리뷰 경로 (Answer-review path)

### 3.1 의미 있는 입력 → 리뷰 결과 생성
- [ ] 충분한 길이/내용의 입력 시 리뷰 결과가 생성되는지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 3.2 의미 있는 결과 → learning signal 저장
- [ ] 의미 있는 리뷰 결과일 때 learning signal이 저장되는지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 3.3 불충분/placeholder 입력 차단
- [ ] placeholder 수준 입력은 차단되며, **차분한 톤의 안내 문구**가 표시되는지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 3.4 fallback-heavy 결과 저장 방지
- [ ] fallback-heavy로 판단되는 결과는 learning signal 저장이 되지 않는지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 3.5 사용자 카피의 내부 용어 노출 금지
- [ ] 사용자 노출 카피에서 아래 내부 용어가 나타나지 않는지 확인
  - Gemini
  - API
  - review queue
  - raw field names
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

---

## 4) 데이터 검증

> 필요 시 DB 콘솔/관리자 검증 엔드포인트를 사용하되, 사용자 개인정보/원문 데이터 노출 없이 점검합니다.

### 4.1 `learning_signal_events` 저장 필드 제한
- [ ] 다음 파생 필드만 저장되는지 확인
  - derived tags
  - nextTask
  - subject
  - mode
  - sourceType
  - metadata
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 4.2 원문 데이터 미저장
- [ ] 아래 원문 데이터가 저장되지 않는지 확인
  - raw question
  - raw answer
  - OCR text
  - reference answer
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 4.3 1차/2차 signal 혼합 방지
- [ ] first/second 모드 signal이 서로 섞이지 않는지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 4.4 Admin verify endpoint 로그-세이프 출력
- [ ] 관리자 검증 endpoint가 로그-세이프 출력만 반환하는지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

---

## 5) UX 검증

### 5.1 Primary CTA 시각적 우선순위
- [ ] 주요 CTA가 다른 액션 대비 시각적으로 우선되는지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 5.2 버튼 라벨-목적지 일치
- [ ] 버튼 라벨이 실제 이동 목적지/행동과 일치하는지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 5.3 한국어 CTA 줄바꿈 자연스러움
- [ ] CTA 텍스트 줄바꿈이 어색하지 않은지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 5.4 상단 내비 단순성
- [ ] 상단 내비가 `오늘 할 일 / 입력 / 기록` 중심으로 단순하게 유지되는지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 5.5 기록 화면의 비-대시보드 톤
- [ ] 기록 페이지가 복잡한 관제 대시보드처럼 느껴지지 않는지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

### 5.6 빈 상태의 단일 다음 행동 유도
- [ ] 빈 상태에서 사용자가 해야 할 다음 행동 1개가 명확한지 확인
- 기록:
  - Status:
  - Notes:
  - Screenshot (optional):

---

## 6) 실행 커맨드

아래 커맨드를 실행하고 결과를 기록합니다.

- [ ] `npm run test:learning-signal`
- [ ] `npm run check:taxonomy`

기록:
- Command:
- Exit code:
- Status: Pass / Fail / Needs fix
- Notes:

---

## 7) 최종 게이트 (베타 초대 전)

아래 조건을 모두 만족해야 클로즈드 베타 초대 진행이 가능합니다.

- [ ] 섹션 1~5의 치명 이슈(사용 불가/데이터 오염/모드 혼합/오해 유발 카피) 없음
- [ ] 섹션 6 커맨드 통과 또는 차단 사유와 대응 계획 문서화 완료
- [ ] Fail/Needs fix 항목에 대해 담당자와 수정 일정이 배정됨
- [ ] 범위가 감정평가사 1차/2차로 유지됨

최종 판정:
- Release Decision: Go / No-Go
- 결정일:
- 결정자:
- 비고:
