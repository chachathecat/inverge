# Inverge Closed Beta Launch Prep & Operator Handoff (PR55)

이 문서는 **PR47~54 MVP를 새 기능 추가 없이 운영 가능한 상태로 인계**하기 위한 운영자용 handoff 문서입니다.
범위는 learner-facing **감정평가사 1차 / 2차**만 포함합니다.

---

## 1) 베타 운영 목적
- 실제 초대 계정으로 핵심 학습 루프가 끊기지 않고 동작하는지 검증한다.
- 운영자가 피드백을 체계적으로 수집/분류하여 다음 배치(PR) 우선순위로 연결한다.
- 장애 발생 시 확인 순서를 표준화해 대응 시간을 줄인다.

## 2) 초대 대상 (Invite-only)
- 내부 운영팀/튜터/협력자 중 사전 동의된 소수 사용자
- 감정평가사 1차/2차 학습 플로우 테스트를 수행할 수 있는 사용자
- 개인정보/콘텐츠 처리 안내에 동의한 사용자

## 3) 베타 지원 범위 (In scope)
- 감정평가사 1차: study log, set-solving, review queue, review detail
- 감정평가사 2차: write → compare → rewrite
- calculator workflow
- 서비스 내 feedback 제출

## 4) 현재 지원하지 않는 것 (Out of scope)
- 감정평가사 1차/2차 외 시험 카테고리
- AI 최종 채점/합격 판정/무검수 자동평가
- 신규 라우트/신규 마이그레이션/외부 AI 호출 추가
- auth/entitlement/Supabase 접근 동작 변경

---

## 5) Invite-only 운영 절차

### 5-1. allowlist 계정 추가/확인
1. 운영 시크릿(`ALPHA_INVITE_EMAILS`)에 초대 대상 이메일을 추가한다.
2. 배포 환경에서 반영 여부를 확인한다.
3. 초대 대상은 본인 이메일로 로그인하여 `/app` 진입을 확인한다.

### 5-2. 미초대 vs 초대 계정 화면 구분
- **미초대 계정**: invite pending/접근 제한 안내 화면을 본다.
- **초대 계정**: 정상적으로 learner app(`/app`)에 진입한다.

### 5-3. entitlement 필드 보호 원칙 (중요)
- `invite_status`, `entitlement_tier`는 운영 중 임의 bulk update 금지.
- 수동 수정이 필요하면 단일 사용자 기준으로 사유/작업자/시간을 운영 로그에 남긴다.
- 잘못된 스크립트/관리 작업으로 두 필드가 덮어써지지 않도록, 업데이트 전/후 값을 반드시 대조한다.

---

## 6) 첫 사용자 온보딩 (운영자 실행 순서)
1. 초대 메일/메신저로 베타 목적과 지원 범위를 안내한다.
2. 로그인 후 첫 진입 경로(`/app`)를 안내한다.
3. 1차/2차 중 오늘 테스트할 트랙을 하나만 선택하게 한다.
4. 아래 스모크 시나리오 중 최소 1회 complete하도록 요청한다.
5. 완료 직후 피드백 폼 링크를 전달해 즉시 제출받는다.

---

## 7) Beta smoke test runbook (launch 전 매회)

아래는 **베타 시작 전 운영자가 직접** 확인하는 최소 시나리오입니다.

1. `/app` 진입  
   - Expected: 초대 계정은 앱 홈이 정상 렌더링되고 치명적 에러가 없다.
2. 1차 study-log 저장  
   - Expected: 저장 성공 후 새 기록이 목록/상태에 즉시 반영된다.
3. 1차 set-solving → review queue  
   - Expected: set-solving 완료 항목이 review queue에 생성/노출된다.
4. review item detail  
   - Expected: 해당 사용자의 item detail만 열리고 내용 로드에 실패하지 않는다.
5. 2차 write → compare → rewrite  
   - Expected: 작성/비교/재작성 단계가 순서대로 진행되고 rewrite 진입이 가능하다.
6. calculator workflow  
   - Expected: 계산기 흐름이 중단 없이 열리고 입력/결과 확인이 가능하다.
7. feedback submission  
   - Expected: 피드백 제출이 성공하고 중복/실패 없이 완료 상태를 확인할 수 있다.

---

## 8) 피드백 수집 & triage 기준

### 8-1. 수집 방법
- 채널: 서비스 내 피드백 제출 + 운영자 수동 인터뷰 메모
- 원칙: 재현 경로(어디서/무엇을/어떻게), 계정 타입(초대 여부), 발생 시각을 함께 수집

### 8-2. 분류 기준
- **P0: 로그인/저장 불가**
- **P1: 핵심 루프 중단**
- **P2: 문구/UX 혼란**
- **P3: 개선 아이디어**

### 8-3. 베타 중 처리 원칙
- 베타 기간 즉시 수정 대상: **P0/P1만**
- **P2/P3는 누적 정리 후 다음 PR 배치로 이관**

---

## 9) 장애 발생 시 확인 순서 (Operator order)
1. 재현 범위 확인: 특정 계정인지, 전체 사용자 공통인지 확인
2. 초대 상태 확인: allowlist, `invite_status`, `entitlement_tier` 이상 여부 확인
3. 배포 상태 확인: production 배포 SHA와 최신 main 일치 여부 확인
4. 데이터 저장 확인: Supabase 로그/테이블에서 해당 요청 실패 여부 확인
5. 라우트 단위 확인: `/app` → 문제 발생 세부 경로 순으로 축소 확인
6. 분류/에스컬레이션: P0/P1이면 즉시 대응, P2/P3면 백로그로 전환

---

## 10) Product guardrails (재확인)
- “AI 최종 채점/판정” 표현 금지
- 감정평가사 1차/2차 외 확장 금지
- raw 문제 원문을 무단 저장하거나 모델 학습 데이터로 전용하지 않기
- 서비스 데이터와 모델 개선 데이터 분리 원칙 유지
- 사용자에게는 “보조 학습 운영 도구”로 인지되도록 안내

---

## 11) 베타 시작 전 사람 체크리스트 (Quick)
- [ ] allowlist 계정 반영 확인 (`ALPHA_INVITE_EMAILS`)
- [ ] 초대 계정 `/app` 진입 확인
- [ ] 미초대 계정 invite pending 화면 확인
- [ ] 1차/2차 핵심 루프 스모크 1회 완료
- [ ] feedback 제출 성공 확인
- [ ] 오늘 접수된 이슈 P0~P3 분류 완료
- [ ] P0/P1 즉시 대응 여부/담당자 지정 완료

