# Inverge Product Brief

## 1) Core Definition
Inverge는 **AI 채점 서비스가 아니라**, 감정평가사 수험을 위한 **프리미엄 합격 운영 시스템**이다.

- 목적: 학습자에 대한 최종 판정이 아니라, 합격 확률을 높이는 반복 가능한 고가치 학습 행동을 낮은 인지부하로 실행하게 만드는 것
- 운영 루프: **input → diagnosis → tracking → prediction → recommendation → execution → retry/rewrite**
- 고정 범위: **감정평가사 1차, 감정평가사 2차만 지원**

## 2) Product Positioning (Korean-first)
### Must-use framing
- 감정평가사 합격 운영 시스템
- 오늘 해야 할 학습 행동을 정리하는 학습 운영 시스템
- 점수보다 다음 행동을 정리하는 시스템

### Must-not-use framing
- AI 채점기
- 자동 채점 서비스
- 공부 기록장
- 동기부여 앱
- 대시보드 SaaS
- 시험 범용 플랫폼

## 3) Fixed Product Scope and Guardrails
### In scope
- 감정평가사 1차
- 감정평가사 2차

### Out of scope (do not expose)
- 보험계리사/계리사, CPA, 세무사, TOEFL, SAT
- universal exam track
- payment-first flow
- control-room dashboard
- AI final judgment framing
- streak addiction, rankings, shame-based motivation

## 4) Product Tone
- calm
- precise
- operational
- premium
- Korean-first
- low-hype

## 5) Inverge Triad (Operating Governance)
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

## 6) Execution Priorities
- 점수 표시보다 **다음 행동 제시**를 우선
- 피드백은 요약 종결이 아니라 **retry/rewrite로 연결**
- 홈/실행 화면은 **하나의 주행동(Primary Action)** 중심
- 1차와 2차 학습 루프를 분리하되 동일 운영원칙 적용

## 7) Documentation Map
- 학습 근거 원칙: `docs/inverge-learning-science.md`
- 넛지/선택설계: `docs/inverge-nudge-system.md`
- 디자인 운영체계: `docs/inverge-design-system.md`
- 화면 패턴: `docs/inverge-screen-patterns.md`
- 품질 점검: `docs/inverge-audit-rubric.md`
- 우선순위/데이터 모델: `docs/inverge-learning-engine-spec.md`

## 8) Short References (non-quoted)
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
