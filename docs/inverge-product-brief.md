# Inverge Product Brief

## 1) Core Definition
Inverge는 **AI 채점 서비스가 아니라**, 감정평가사 수험을 위한 **프리미엄 합격 운영 시스템**이다.

- 목적: 학습자에 대한 최종 판정이 아니라, 합격 확률을 높이는 반복 가능한 고가치 학습 행동을 낮은 인지부하로 실행하게 만드는 것
- 운영 루프: **input → diagnosis → tracking → prediction → recommendation → execution → retry/rewrite**
- 고정 범위(학습자 서비스): **감정평가사 1차, 감정평가사 2차만 지원**
- 비원칙: **AI 최종 판정 없음**, 자동 합격 판정 없음

## 2) Product Positioning (Korean-first)
### Must-use framing (learner-facing)
- 감정평가사 합격 운영 시스템
- 오늘 해야 할 학습 행동을 정리하는 학습 운영 시스템
- 점수보다 다음 행동을 정리하는 시스템

### Must-not-use framing (learner-facing)
- AI 채점기
- 자동 채점 서비스
- 공부 기록장
- 동기부여 앱
- 대시보드 SaaS
- 시험 범용 플랫폼

## 3) Dual-Surface Policy (Learner vs Instructor)
### A. Learner-facing Inverge (primary)
In scope:
- 감정평가사 1차
- 감정평가사 2차
- learning operations system
- retry/rewrite 중심 학습 실행

Out of scope:
- 보험계리사/계리사, CPA, 세무사, TOEFL, SAT
- universal exam track
- payment-first flow
- control-room dashboard
- AI final judgment framing
- streak addiction, rankings, shame-based motivation

### B. Instructor-facing B2B (separate documentation scope)
별도 콘솔은 **학원용 답안 운영 콘솔**로 정의하며, 학습자 앱과 분리된 B2B 운영 표면으로 다룬다.

Allowed scope:
- academy staff / instructors / graders only
- OCR answer upload
- **첨삭 운영 보조**
- **채점 초안**(rubric-based scoring draft)
- feedback/comment draft
- reference answer draft
- **강사 검수** 후 확정 (human final approval required)

Not allowed wording:
- AI가 최종 채점
- 자동 합격 판정
- 무검수 채점
- 학생 답안 무단 학습

## 4) Routing and Permission Direction (Future)
- Instructor console route candidate: `/instructor` or `/studio`
- Access role: instructor/admin only
- Learner navigation에는 instructor 도구를 절대 노출하지 않음
- 인증/권한/테넌트 경계는 learner 앱과 별도 정책으로 설계

## 5) Product Tone
- calm
- precise
- operational
- premium
- Korean-first
- low-hype

## 6) Inverge Triad (Operating Governance)
모든 제품 결정은 아래 3층 통합 거버넌스로 판단한다.

1. **Cognitive science**: 어떤 학습 행동이 실제 성과를 높이는가
2. **Ethical nudge / choice architecture**: 효과적인 행동을 기본값으로 두되, 사용자 주도권 보장
3. **Learning-focused design**: 인지부하를 줄이고 차분한 실행 환경 제공

모든 기능/화면은 아래 질문 7개에 답해야 한다.
1. 어떤 학습 행동을 만들었는가?
2. 왜 근거 기반인가?
3. 어떤 좋은 기본값을 주는가?
4. 사용자는 어떻게 override 가능한가?
5. 어떤 인지부하를 제거했는가?
6. 어떤 데이터를 남기는가?
7. 다음 행동은 무엇인가?

## 7) Execution Priorities
- 점수 표시보다 **다음 행동 제시**를 우선
- 피드백은 요약 종결이 아니라 **retry/rewrite로 연결**
- 홈/실행 화면은 **하나의 주행동(Primary Action)** 중심
- 1차와 2차 학습 루프를 분리하되 동일 운영원칙 적용
- instructor-facing 채점 관련 산출물은 **초안 + 강사 검수** 원칙 유지

## 8) Documentation Map
- 학습 근거 원칙: `docs/inverge-learning-science.md`
- 넛지/선택설계: `docs/inverge-nudge-system.md`
- 디자인 운영체계: `docs/inverge-design-system.md`
- 화면 패턴: `docs/inverge-screen-patterns.md`
- 품질 점검: `docs/inverge-audit-rubric.md`
- 우선순위/데이터 모델: `docs/inverge-learning-engine-spec.md`
- instructor scope: `docs/inverge-instructor-console.md`
- data governance: `docs/inverge-data-governance.md`

## 9) Short References (non-quoted)
- Roediger & Karpicke (2006), retrieval practice / test-enhanced learning
- Cepeda et al., distributed practice / spacing effect
- Sweller, van Merriënboer & Paas, cognitive load theory
- Hattie & Timperley, feedback
- Gollwitzer, implementation intentions
- Thaler & Sunstein, nudge / choice architecture
- Behavioural Insights Team, EAST framework
- Apple Human Interface Guidelines
- Nielsen Norman usability heuristics
- GOV.UK Design Principles
