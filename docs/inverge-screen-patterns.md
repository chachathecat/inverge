# Inverge Screen Patterns

본 문서는 감정평가사 1차/2차 제품 화면의 실행 중심 패턴을 정의한다.

## 공통 규칙
- 화면당 1개 Primary Action
- 점수보다 다음 행동
- 피드백 후 retry/rewrite/schedule 중 하나 필수
- 한국어 카피는 차분/정확/운영형

---

## 1) Landing
### Goal
Inverge를 “감정평가사 합격 운영 시스템”으로 명확히 설명.

### Primary action
- 감정평가사 1차 시작
- 감정평가사 2차 시작

### Must include
- 운영 루프(입력→진단→추적→추천→실행→재시도/재작성)의 간결한 소개

### Must avoid
- AI hype
- 범용 시험 확장
- 보험/계리 레퍼런스
- 결제 우선 유도
- 기능 나열형 히어로

---

## 2) Exam Selection
### Allowed options only
- 감정평가사 1차
- 감정평가사 2차

### Forbidden options
- 보험계리사/계리사, CPA, 세무사, TOEFL, SAT, universal track

---

## 3) Exam Home
### Primary action
- 오늘 최우선 작업 시작

### Required blocks
- Today Priority
- reason (왜 지금 이 작업인지)
- estimated duration
- easy override actions
- weekly context (secondary)
- behind 상태면 recovery task

### Avoid
- 그래프 과다
- 동시 과제 과다
- 복잡 대시보드 구조

---

## 4) 감정평가사 1차 Set Solving
### Canonical flow
past-exam set solving → grading → error reason → retrieval prompt → retry queue

### Required capture
- set-based solving
- error reason selection
- confidence
- time spent
- next review scheduling
- retry queue 연결

---

## 5) 감정평가사 2차 Writing
### Canonical flow
issue recall → outline → answer writing → compare → one biggest gap → paragraph rewrite

### Required behavior
- compare 화면에서 one biggest gap 우선 제시
- rewrite CTA를 primary로 배치
- full score는 secondary/optional
- records/history는 추적용 보조 표면

---

## 6) Time Attack
### Progressive pressure ladder
1. Calm Timer (기록 중심)
2. Pacing Timer (권장 속도)
3. Exam Mode (전체 카운트다운)

### Purpose
불안 유도 아닌 페이싱 보정.

### Avoid
- 기본 red panic countdown
- 수치심 유발 카피
- 불필요 경보

---

## 7) Focus Audio
- 실행 화면에서만 노출
- compact / optional / quiet
- 랜딩/대시보드의 hero feature 금지

---

## Pattern QA checklist (quick)
- Primary action이 fold 상단에 명확한가?
- Override path가 보이는가?
- 피드백이 즉시 행동으로 끝나는가?
- 1차/2차 범위가 유지되는가?
- AI 채점기 톤이 섞이지 않았는가?
