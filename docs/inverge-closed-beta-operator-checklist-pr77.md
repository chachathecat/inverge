# Inverge Closed Beta Operator Checklist (PR77)

PR47~76으로 구현된 closed beta MVP를 초대 사용자 3~5명에게 열기 전, 운영자가 그대로 따라 할 수 있는 최종 점검 문서입니다.
범위는 learner-facing **감정평가사 1차/2차**와 운영자용 `/answer-review` 흐름에 한정합니다.

## 1) Launch 전 필수 체크 (5분)

- [ ] **Vercel Production deploy 성공**: latest `main` SHA와 production deployment SHA 일치 확인
- [ ] **Vercel Preview deploy 성공**: 이번 배치(PR77) preview URL이 정상 렌더링되는지 확인
- [ ] **Supabase env 확인**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] **Gemini env 확인**: `GEMINI_API_KEY` 설정 확인
- [ ] **Gemini model 고정 확인**: `GEMINI_MODEL=gemini-2.5-flash`
- [ ] **allowlist 초대 계정 확인**: `ALPHA_INVITE_EMAILS`에 3~5명 반영
- [ ] **미초대 계정 안내 확인**: invite pending/접근 제한 안내가 정상 표시되는지 확인
- [ ] **feedback 제출 확인**: 앱 내 피드백 제출이 저장까지 완료되는지 확인

## 2) 첫 사용자 테스트 스크립트 (10분 이내)

운영자는 사용자가 아래 순서를 그대로 수행하도록 안내합니다. (도중 설명 최소화)

1. `/app` 진입
2. **1차**에서 공부 기록 1개 남기기 (짧은 텍스트도 허용)
3. review queue 열어서 방금 생성된 학습 항목 확인
4. **2차 write 화면** 열기
5. `/answer-review`에서 아래 3개 입력
   - 문제
   - 답안
   - 기준답안(또는 모범답안)
6. 생성된 피드백 **초안 복사** 버튼 실행
7. 마지막으로 “가장 불편했던 점 1개”를 feedback으로 제출

완료 기준:
- 사용자가 막히지 않고 10분 내에 1회 루프를 끝낸다.
- 운영자는 사용자의 설명보다 **실제 행동 로그/멈춤 지점**을 우선 기록한다.

## 3) 운영자 관찰 포인트 (세션 중 체크)

- [ ] 사용자가 첫 CTA의 의미를 바로 이해하는가?
- [ ] 사용자가 어디에서 멈추거나 되돌아가는가?
- [ ] 입력 항목(문제/답안/기준답안)을 부담스러워하는가?
- [ ] Gemini 실패/지연 상황에서도 텍스트 입력 기반으로 계속 진행하는가?
- [ ] 피드백 초안을 실제로 복사해서 외부(메모/채팅)로 가져가려는가?

기록 템플릿(권장):
- `화면`: 어디였는지
- `행동`: 사용자가 실제로 한 행동
- `멈춤 시간`: 5초/15초/30초+
- `원인 가설`: 문구/정보량/입력부담/기술오류
- `분류`: P0/P1/P2/P3

## 4) Beta issue triage 기준

- **P0**: 로그인/저장/OCR 구조화 전체 불가
- **P1**: 핵심 루프 중단 (`/app` 학습 루프, review queue, 2차 write, `/answer-review` 핵심 입력 흐름)
- **P2**: 문구/UX 혼란
- **P3**: 개선 아이디어

운영 원칙:
- 베타 기간 중 **즉시 수정은 P0/P1만** 수행
- P2/P3는 세션별로 묶어 backlog로 이관 후 일괄 처리

## 5) Scope & guardrails 재확인

- 새 route 추가 금지
- 새 DB migration 금지
- 외부 provider 추가 금지
- auth/entitlement/Supabase behavior 변경 금지
- 감정평가사 1차/2차 scope 유지
- answer-review는 운영자용 고빈도 답안 검토 흐름으로 유지
- 점수/등급/합격판정/AI 최종판정 표현 금지
- 큰 UI 리팩터링 금지
- 미니멀리즘 유지: 한 화면=한 행동, 한 CTA=한 다음 행동
