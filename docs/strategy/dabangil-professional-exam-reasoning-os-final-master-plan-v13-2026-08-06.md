---
document_title: "답안길 / Professional Exam Reasoning OS 통합 마스터플랜 최종본 v13"
document_subtitle: "감정평가사 시험 디지털 트윈·강건 커리큘럼 통제·검증증명형 평가와 내부 휴대형 전문직 시험 코어를 결합한 단일 전략 통제본"
document_role: "single active strategy entry point and final control plane"
status: "owner-strategy/proposed-final-for-merge"
dated: "2026-08-06 KST"
repository: "chachathecat/inverge"
active_pointer: "docs/strategy/ACTIVE-MASTER-PLAN.md"
v13_owner_decision: "docs/decisions/2026-08-06-owner-v13-exam-digital-twin-and-portable-professional-exam-core.md"
v13_machine_contract: "config/dabangil-exam-digital-twin-portable-core-v1.json"
exam_digital_twin_spec: "docs/strategy/dabangil-exam-digital-twin-and-robust-curriculum-control-v1-2026-08-06.md"
portable_core_spec: "docs/strategy/dabangil-portable-professional-exam-core-and-profile-contract-v1-2026-08-06.md"
validation_record: "docs/qa/master-plan-v13-exam-digital-twin-portability-validation.md"
inherits_as_mandatory_baseline:
  - "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v12-2026-08-06.md"
  - "docs/strategy/dabangil-versioned-exam-scope-evidence-graph-v1-2026-08-06.md"
  - "docs/strategy/dabangil-appraiser-coverage-compiler-and-original-question-engine-v1-2026-08-06.md"
  - "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v11-2026-08-05.md"
  - "docs/strategy/dabangil-professional-exam-reasoning-os-master-plan-v8-2026-08-05.md"
  - "docs/strategy/dabangil-adaptive-understanding-progression-recovery-master-plan-v9-2026-08-05.md"
supersedes_for_strategy:
  - "v12 as the single active entry point; v12 remains the mandatory Appraiser coverage and source-safe baseline"
  - "single-paper or single-topic-list forecasting as the curriculum allocation model"
  - "single-scalar mastery as the learner state model"
  - "generated questions released without a profile-specific proof bundle"
  - "post-exam hit claims without a frozen pre-exam denominator"
strategy_coverage_scope: "감정평가사 제1차 5개 과목 + 제2차 3개 과목"
current_learner_facing_runtime_scope: "Dabangil Appraiser Second three subjects only"
portable_core_scope: "internal architecture and synthetic portability proof only"
other_exam_profile_authorization: "none"
generic_multi_exam_learner_surface_authorization: "none"
first_stage_runtime_authorization: "none"
runtime_authorization: "none"
schema_authorization: "none"
provider_authorization: "none"
dependency_authorization: "none"
deployment_authorization: "none"
production_authorization: "none"
real_third_party_content_authorization: "none"
learner_model_fitting_authorization: "none"
execution_rule: "Every Work must reconcile live repository/runtime, AGENTS.md, roadmap authority, current exam sources, target-date law/accounting/standards, source rights, dependency licenses and exact activation authority. This document authorizes no implementation, dependency, real-source processing, Ready transition or merge."
research_checked_at: "2026-08-06 KST"
---

# 답안길 / Professional Exam Reasoning OS 통합 마스터플랜 최종본 v13

## 시험을 맞히는 앱이 아니라, 가능한 시험 세계에서 점수 붕괴를 막는 검증형 학습 통제 OS

---

## 0. 최종 결론

V13은 V12의 공식범위·현행성·기출·독창문제·저작권 안전·evidence-gated
learning을 그대로 보존하고, 그 위에 다음 여섯 개의 통제층을 추가한다.

```text
1. VESG Truth Kernel
   공식범위·목표시험일 규범·기출관측·버전·권리·우선순위의 source of truth

2. Exam World Twin
   하나의 예상시험지가 아니라 합리적으로 가능한 복수 시험지 세계

3. Learner Capability Twin
   지식·회상·방법선택·실행·표현·검산·속도·전이·회복·자기확신 교정 상태

4. Robust Curriculum Controller
   공식범위 최소선과 학습시간 제약 아래 최악 시나리오의 붕괴와 최대 후회를 감소

5. Proof-Carrying Assessment Foundry
   문제·정답·규범·단위·반올림·rubric·변형불변식·권리·계보를 함께 검증

6. Calibrated Scoring & Pre-registered Audit
   채점불일치 공개, 시험 전 동결, 시험 후 분모·실패·시간낭비까지 감사
```

그리고 이 구조를 다음처럼 분리한다.

```text
Portable Professional Exam Core — 내부 공통 계약
        ↓ exact ExamProfile admission
Appraiser Exam Profile — 현재 유일한 실제 전략 profile
        ↓
현재 learner-facing runtime: 감정평가사 2차 실무·이론·법규 only
```

다른 전문직 시험으로의 확장성은 높다. 다만 재사용되는 것은 **계약·도구·검증
흐름**이며, 다음은 시험마다 처음부터 다시 만들어야 한다.

```text
공식 권위
출제범위
목표일 규범
기출 corpus
문항문법
시험지 blueprint
solver/validator
rubric
권리판단
currentness
activation evidence
```

따라서 V13은 다중시험 제품을 지금 여는 계획이 아니다. **감정평가사를 제대로
구축하면서 공통 코어와 시험별 profile 경계를 지금부터 바르게 나누는 계획**이다.

---

# PART I — Authority

## 1. 단일 active entry point

```text
ACTIVE-MASTER-PLAN.md
→ V13
   ├─ V12 Appraiser coverage/source-safe baseline
   ├─ VESG
   ├─ Appraiser Coverage Compiler & Original Question Engine
   ├─ Exam Digital Twin & Robust Curriculum Control
   ├─ Portable Professional Exam Core & Profile Contract
   ├─ V11 source-safety/legal-operation annex
   ├─ V8 reasoning/evidence/Full-Day annex
   └─ V9 adaptive-understanding/ethical-progression annex
```

V13이 전략상 단일 진입점이다. V12는 폐기되지 않으며 V13이 명시적으로
강화하지 않은 모든 Appraiser coverage와 source-safety 상세를 계속 지배한다.

## 2. Authority precedence

```text
live law / accounting standard / official exam authority
+ live repository and runtime facts
→ current AGENTS.md and roadmap authority
→ final dated Owner decisions for their exact scope
→ exact machine-readable contracts
→ v13
→ V13 detailed specifications
→ V12 and earlier annexes where non-conflicting
```

전략문서, 과거 URL, 연구일, 모델판단 또는 오픈소스 결과는 현재 공식범위나
현재 정답을 스스로 확정하지 않는다.

## 3. 비승인 경계

V13은 다음을 승인하지 않는다.

- runtime, API, UI, schema, migration, RLS, Storage
- provider, dependency, package lock, environment, deployment
- 실제 기출 ingest
- 실제 제3자 교재 처리
- 생성문제 learner release
- 채점·추천·optimizer runtime
- 제1차 learner-facing activation
- 다른 시험 profile 생성·활성화
- generic multi-exam learner-facing copy/navigation
- 외부학습자·결제·Production
- Ready·merge·auto-merge

---

# PART II — Product identity

## 4. 답안길이 아닌 것

- 다음 시험의 문항을 확정적으로 맞히는 서비스
- “이것만 보면 된다”는 적중목록
- 출제확률·합격확률 계산기
- 학원 비공개 자료 수집기
- 내부자 제보 또는 현행시험 유출정보 활용기
- 한 숫자로 숙련도를 표시하는 dashboard
- AI 한 모델이 문제·답·채점을 동시에 승인하는 시스템
- 여러 전문직 시험을 얕게 포장한 범용 챗봇
- 제3자 문제집을 축적한 RAG·답지 데이터베이스

## 5. 답안길인 것

> **공식 시험범위를 버전형 근거 그래프로 컴파일하고, 가능한 복수 시험지에
> 대해 학습자의 실제 수행능력을 검증하며, 제한시간 안의 독립적 설명·계산·
> 논증·선택을 재현하게 만드는 evidence-gated Professional Exam Reasoning OS**

## 6. 제품가치 우선순위

```text
1. 공식범위 누락 방지
2. 현재 정답·규범 정확성
3. 선행개념 폐쇄
4. 독립 회상과 방법선택
5. 실행·표현·검산 정확성
6. 처음 보는 변형 전이
7. D+1/D+7 회복
8. 제한시간 시험지 통합
9. 불리한 시험지에 대한 강건성
10. 학습시간의 설명가능한 배분
```

적중광고, 생성량, model confidence 또는 화려한 답안은 위 목표보다 우선하지
않는다.

---

# PART III — Unified operating model

## 7. 일곱 개 plane

### Plane A — Authority

- 공식 시험과목·시행계획·정정
- 공식 세부 출제영역
- 목표시험일 법률·규칙·회계기준·실무기준·판례상태
- 공식 기출·최종정답·공개 채점자료
- exact source locator·hash·rights·effective interval

### Plane B — Scope and curriculum

- VESG
- concept/prerequisite/bridge graph
- misconception and failure registry
- skill operation
- question archetype
- evidence gate

### Plane C — Exam intelligence

- paper blueprint
- historical paper observation
- official-unobserved and one-hop
- reviewed expert prior
- public academy metadata signal
- scenario ensemble
- pre-exam frozen snapshot

### Plane D — Assessment foundry

- constrained generator
- deterministic solver
- rubric validator
- metamorphic/property checks
- adversarial critic
- rights/non-reconstruction scan
- proof bundle and release decision

### Plane E — Learner capability

- attempt
- assistance/exposure
- error cause
- multidimensional capability state
- repair
- transfer
- delayed recovery
- timed integration

### Plane F — Curriculum control

- official-scope floor
- macro phase plan
- weekly budget
- Today primary tasks ≤3
- robust scenario comparison
- native policy authority
- optional isolated shadow optimizer

### Plane G — Audit and governance

- frozen provenance
- score disagreement
- walk-forward evaluation
- post-exam autopsy
- drift hold
- rollback
- profile admission and activation

원문 body와 권한은 plane 사이에서 자동 승격되지 않는다.

## 8. 콘텐츠 공급경로

### Original path

```text
authority snapshot
→ VESG validated node
→ owned curriculum
→ proof-carrying original assessment
→ learner attempt
→ capability evidence
```

### Private Book path

```text
client-held one-problem source
→ ephemeral processor
→ client-only source-bound help
→ source-scrubbed private concept/error projection
→ trusted VESG resolver
→ fresh owned transfer assessment
→ capability evidence
```

Book path의 raw source 또는 source-bound output은 Exam World Twin, shared VESG,
generator corpus, analytics 또는 다른 이용자의 응답으로 들어가지 않는다.

---

# PART IV — Coverage, demand, need and allocation

## 9. 네 값을 분리한다

```text
CorpusPriority
= 전체 corpus에서의 근거기반 학습 중요도

BlueprintDemand
= 하나의 목표시험 시나리오에서 요구될 역할과 배점 노출

LearnerNeed
= 특정 학습자의 결손·망각·전이·속도·검산 위험

AllocationUtility
= 제한된 시간에서 지금 배정할 학습가치
```

강제 규칙:

```text
official scope ≠ historical frequency
historical frequency ≠ future probability
expert emphasis ≠ answer authority
blueprint demand ≠ learner need
high learner need ≠ official importance
allocation rank ≠ pass probability
```

## 10. Complete Coverage V13

V12 정의를 보존하고 시험지·증명·감사 축을 추가한다.

```text
Complete Coverage V13 =
  official subject completeness
× official detailed-scope completeness
× historical official-question mapping completeness
× target-date authority completeness
× prerequisite/bridge completeness
× question/evidence completeness
× paper-blueprint representation completeness
× proof-policy completeness
× auditability
```

하나의 축이 0이면 complete라고 표시하지 않는다.

## 11. 공식범위 floor

최적화 이전에 다음 hard floor를 적용한다.

- 모든 active official leaf 최소 exposure
- foundation prerequisite closure
- 과목별 최소시간
- official-unobserved/rotation 방어예산
- D+1/D+7 회복예산
- full-paper timed integration 예산
- currentness unknown 콘텐츠 배정 0
- rights unknown shared content 배정 0

공식 node는 학습 우선순위가 낮아도 범위 밖으로 삭제되지 않는다.

---

# PART V — VESG Truth Kernel

## 12. 다섯 canonical view

```text
OfficialScope
TargetDateNorm
ObservedExam
AdjacentAndOfficialUnobserved
LearningPriority
```

V13의 Exam World Twin, learner controller, proof bundle과 portable profile은 모두
동일 graph snapshot을 참조한다.

## 13. 역사 정답과 현재 정답

```text
answerAsExamined
answerAsOfTargetDate
```

둘을 덮어쓰지 않는다. 조문 renumber, 개정, 폐지, 정답변경, split/merge는
version crosswalk로 추적한다.

## 14. 기출 최소 단위

### 실무

```text
question
→ subquestion
→ points
→ required judgment/calculation
→ complete procedure step
→ object × purpose × method × condition
→ norm snapshot
```

### 이론

```text
concept
× command verb
× comparison target
× practical linkage
× criticism/limitation
× improvement/transfer
```

### 법규

```text
statute/article
→ issue
→ doctrine
→ decisive facts
→ application
→ conclusion
→ remedy/action form
```

### 제1차

```text
question
→ option
→ independent proposition
→ truth as examined
→ exact error point
→ target-date truth
→ trap type
```

## 15. first corpus build order

```text
VESG-0 authority/source/rights/root taxonomy
VESG-1 Practice 2013-2026
VESG-2 Theory and Law 2013-2026
VESG-3 First Stage 2016-2026 option propositions
VESG-4 target-date norm closure and crosswalk
VESG-5 official-unobserved, one-hop, priority and grouped walk-forward audit
VESG-6 read adapters
VESG-7 hostile synthetic and Owner-private evaluation
```

V13은 이 순서를 변경하지 않는다.

---

# PART VI — Exam World Twin

## 16. 단일 예상시험지 금지

하나의 “올해 예상문제”를 canonical plan으로 사용하지 않는다. 다음과 같은
복수 world를 bounded scenario로 만든다.

```text
S1 recurrent-central
S2 official-unobserved/rotation
S3 current-change/watch
S4 integrated multi-issue
S5 representation/command shift
S6 data-volume/time-pressure
S7 learner-hostile but officially plausible
```

시나리오는 공식범위, 목표일 규범, 시험 형식, 총점, 시간, 권리와 review를
통과해야 한다.

## 17. Paper blueprint

각 paper snapshot은 다음을 갖는다.

```text
exam/profile/subject
graph snapshot
norm snapshot
question slots
marks and time
required nodes
rotation nodes
official-unobserved nodes
command profile
integration breadth
novelty budget
time-pressure profile
construction evidence
review status
frozen time
```

총점·제한시간·과목구조를 만족하지 못하면 world가 아니다.

## 18. Exam intelligence signal

Signal은 source of truth가 아니다.

```text
OFFICIAL_OBSERVATION
REVIEWED_CORPUS_INFERENCE
REVIEWED_EXPERT_PRIOR
PUBLIC_ACADEMY_METADATA
PRIVATE_UNVERIFIED
SUSPICIOUS_NONPUBLIC_CURRENT_EXAM
```

- `OFFICIAL_OBSERVATION`만 historical exam fact를 확정한다.
- 전문가와 공개 학원 signal은 depth 또는 scenario diversity의 bounded feature다.
- 유료 GS 원문, 해설, 회원자료, 비공개 단톡방 또는 출처불명 문항은 사용하지
  않는다.
- 현행시험 비공개 정보라고 주장하는 자료는 quarantine하며 graph, generator,
  curriculum 또는 learner에게 사용하지 않는다.
- 동일 출처를 여러 전문가가 반복한 경우 `independentOriginId`로 중복 제거한다.
- 모든 signal은 시험 전에 동결하고 시험 후 calibration한다.

## 19. learner-facing 표현

허용:

- “공식범위상 포함”
- “과거 시험에서 관측”
- “답안길의 검토된 시나리오”
- “현재 학습시간 배분상 우선”

금지:

- “올해 출제확률 70%”
- “반드시 출제”
- “작년에 나왔으므로 제외”
- “오래 안 나와서 곧 출제”
- “내부정보”
- “합격확률”

---

# PART VII — Learner Capability Twin

## 20. 단일 mastery 숫자 금지

각 concept/skill은 최소 다음 축을 분리한다.

```text
knowledgeAccuracy
retrievalStrength
methodSelection
executionAccuracy
explanationCompleteness
verificationDiscipline
speedAdequacy
transferDistance
delayedRecovery
confidenceCalibration
```

각 축에는 evidence, assistance, uncertainty와 timestamp가 필요하다.

## 21. 오류 분류

```text
KNOWLEDGE_GAP
RETRIEVAL_FAILURE
METHOD_SELECTION_ERROR
PROCEDURE_ORDER_ERROR
CALCULATION_ERROR
NORM_VERSION_ERROR
REPRESENTATION_ERROR
ANSWER_EXPRESSION_ERROR
TIME_ALLOCATION_FAILURE
VERIFICATION_FAILURE
TRANSFER_FAILURE
```

같은 오답이라도 원인별 다음 행동이 달라야 한다.

## 22. evidence ladder

```text
exposed
→ recognized
→ explained
→ applied_assisted
→ applied_independent
→ transferred_near
→ transferred_far
→ recovered_d1
→ recovered_d7
→ integrated_timed
```

`answer_seen`, `full_reveal`, `guided success`, AI 공동작성 또는 reference 복사는
독립수행이 아니다.

## 23. capability prescription

```text
knowledge gap          → owned explanation + contrast
retrieval failure      → retrieval-first delayed retry
method selection       → branch-choice assessment
procedure-order error  → step-order reconstruction
calculation error      → exact failing step + new numbers
expression error       → outline/compression rewrite
time failure           → bounded timed segment + stop rule
verification failure   → planted-error reverse check
transfer failure       → representation/condition/object shift
```

버튼 클릭이나 task completion만으로 capability를 올리지 않는다.

---

# PART VIII — Robust Curriculum Controller

## 24. 세 단계 controller

```text
Macro Curriculum Assembly
→ Weekly Budget Controller
→ Daily Native Scheduler: primary tasks ≤3
```

### Macro phases

```text
P0 diagnosis
P1 official-scope foundation closure
P2 question-family unit practice
P3 mixed/transfer integration
P4 full-paper GS
P5 final compression/currentness/tail defense
```

phase 전환은 강의완료가 아니라 evidence gate로 한다.

## 25. robust objectives

후보계획 비교에 다음 두 목적을 사용한다.

```text
maximin:
  maximize the minimum defensible performance across reviewed scenarios

minimax regret:
  minimize the maximum gap from the scenario-specific hindsight plan
```

이는 확정 점수·합격예측이 아니다. V13에서 `defensible performance`는 검증된
capability와 blueprint exposure를 이용한 내부 비교지표이며 learner-facing
공식점수가 아니다.

## 26. native authority

현재 AGENTS/Full-Day 계약을 보존한다.

- native learning policy가 `CoreOutcome`, 학습가치와 우선순위를 결정한다.
- Today의 primary task는 최대 3개다.
- optimizer는 이미 선택된 metadata-only 후보의 제한된 배치 또는 shadow 비교만
  할 수 있다.
- optimizer는 official answer, mastery, Law status, pass risk, feedback,
  delayed recovery 또는 learner-visible priority를 결정하지 않는다.
- optimizer 실패 시 native fallback이 필수다.
- 직접 product state mutation은 금지한다.

## 27. plan explanation

각 배정은 다음을 설명할 수 있어야 한다.

```text
왜 지금인가
어떤 official node인가
어떤 prerequisite를 푸는가
어떤 world를 방어하는가
어떤 learner deficit을 수리하는가
몇 분이 필요한가
무엇을 하면 통과인가
무엇이 밀렸고 왜 밀렸는가
```

계획이 infeasible하면 조건을 조용히 완화하지 않고 충돌 hard constraint를
보고한다.

---

# PART IX — Proof-Carrying Assessment Foundry

## 28. generation flow

```text
target capability contract
→ constrained generation
→ independent solve/rubric construction
→ property/metamorphic checks
→ adversarial mutation
→ rights/non-reconstruction scan
→ independent review
→ proof bundle
→ release
```

AI가 문제·답·해설·채점을 한 번에 생성한 결과는 released assessment가 아니다.

## 29. Question Proof Bundle

모든 released assessment는 최소 다음을 가진다.

```text
question/profile ID
graph and norm snapshot
rights manifest
target and prerequisite nodes
misconception targets
deterministic solution or rubric
accepted answer variants
unit and rounding policy
intermediate invariants
metamorphic relations
counterexamples/adversarial mutations
source-similarity fingerprint
generator/solver/validator versions
random seed where applicable
review decisions
release state
```

서술형 문제는 수치형 정답증명과 동일한 형식을 강요하지 않는다. 대신
profile-specific proof policy가 요구동사, 핵심논점, 대안구성, 결정적 사실,
규범상태와 rubric completeness를 검증한다.

## 30. Appraiser proof policies

### Practice

- 단위 일관성
- 합계·부분합
- 중간값과 최종 반올림 위치
- 자료 사용·배제
- 방법선택
- 계산순서
- irrelevant fact invariance
- 결정적 조건 변화 시 결과 변화
- fx-9860GIII reset-safe hand routine where relevant

### Theory

- 요구동사 충족
- 양쪽 비교 균형
- 한계·비판·개선 구별
- 실무연결
- 배점대비 구성
- 대안 목차
- reference가 공식답안으로 표시되지 않음

### Law

- 목표시험일 법령·판례상태
- 쟁점·조문·법리·결정적 사실
- 포섭·결론·구제수단
- historical/current answer separation
- 당사자·처분단계·소송형식 변형
- unresolved legal conflict hold

### First Stage

- 정답 유일성
- option proposition 독립성
- exact error point
- distractor provenance
- 계산·그래프 consistency
- target-date truth

## 31. Full GS Digital Twin

```text
frozen paper blueprint
→ question-slot allocation
→ proof-carrying assessment assembly
→ cross-question duplicate/conflict check
→ total mark/time validation
→ frozen exam packet
→ timed attempt without mutation
→ scoring council
→ capability postmortem
```

시험 시작 후 문제나 rubric을 learner 결과에 맞추어 변경하지 않는다.

---

# PART X — Calibrated Scoring Council

## 32. 다중 검토 구조

```text
1. deterministic checker
2. rubric scorer
3. adversarial over-credit/omission reviewer
4. alternative-answer reviewer
5. sampled blind human anchor
```

한 모델이 최종권위를 갖지 않는다.

## 33. scoring decision

```text
score interval
deterministic findings
rubric findings
grader agreement
unresolved disagreements
confidence
human-review requirement
```

불일치는 감추지 않는다. 중대한 계산·규범·rubric 충돌이 남으면 `held`이며
mastery를 올리지 않는다.

## 34. 점수의 의미

- 학습용 practice range
- 공식점수 아님
- 공식채점기준 아님
- 합격예측 아님
- evidence quality에 따라 confidence 표시
- 점수가 끝이 아니라 가장 큰 간극과 다음 행동으로 종료

---

# PART XI — Pre-registered exam audit

## 35. 시험 전 동결

다음을 시험 전에 immutable snapshot으로 고정한다.

- VESG and target norm
- corpus priority
- paper worlds and blueprints
- expert/public-academy signals
- curriculum allocation
- generated GS packets
- scoring policy
- denominator

시험 후 문구를 넓혀 적중으로 재분류하지 않는다.

## 36. hit taxonomy

```text
Domain hit
Issue hit
Task hit
Combination hit
Mark-role hit
Transfer defense
```

`대분류가 같음`과 `요구행위·배점·조합까지 방어함`을 분리한다.

## 37. denominator metrics

```text
actual-mark coverage
missed actual marks
false-positive study hours
official-unobserved defense yield
scenario coverage
expert-signal lift
public-academy-signal lift
baseline lift
learner gain per hour
timed completion
false mastery
```

“몇 개 맞혔다”만 보고하지 않는다.

## 38. backtest integrity

```text
data through exam year N
→ freeze snapshot
→ evaluate exam year N+1
→ repeat
```

- 같은 시험연도의 unit을 train/test 양쪽에 넣지 않는다.
- 무작위 소문항 split로 표본을 부풀리지 않는다.
- 목표연도 이후 법령·기출·학원신호를 사용하지 않는다.
- baseline은 공식 목차, 누적빈도, 최근창, VESG priority를 포함한다.
- 복잡한 모델은 단순 baseline을 안정적으로 이긴 evidence 전에는 승격하지 않는다.

---

# PART XII — Private Ephemeral Book Tutor

## 39. 허용선

```text
한 ephemeral job당 한 문제
동일 문제의 불가피한 2페이지 예외
raw source persistence 0
cross-user reuse 0
book-level answer database 0
```

한 사용자는 합법적으로 가진 책 전체를 문제별로 순서대로 공부할 수 있다.

## 40. capability bridge

```text
book problem
→ transient source-bound help
→ private scrubbed concept/error signature
→ VESG resolver
→ fresh proof-carrying owned assessment
→ no-help transfer evidence
```

Book source는 shared Exam World Twin이나 Portable Core corpus를 채우는 재료가
아니다.

---

# PART XIII — Data, currentness and integrity

## 41. data classes

V12 C0–C7과 V11 D0–D6를 유지하고 다음 metadata-only class를 추가한다.

```text
E0 paper blueprint metadata
E1 reviewed exam-world scenario
E2 capability vector metadata
E3 proof-bundle metadata
E4 scoring disagreement metadata
E5 pre-registration/audit metadata
E6 portable-profile contract metadata
E7 held/quarantined signal metadata
```

raw question, learner answer, OCR, textbook expression 또는 source-bound output을
이 class로 재분류하지 않는다.

## 42. currentness

법규·회계·실무기준·판례 node는 다음을 갖는다.

```text
source identity
published/promulgated/effective dates
target exam date
retrieved time
content digest
affected graph/question/world
review status
```

unknown이면 assessment, world 또는 subject를 hold한다.

## 43. integrity quarantine

다음은 `SUSPICIOUS_NONPUBLIC_CURRENT_EXAM`으로 격리한다.

- 현재시험의 정확한 사실관계·수치라고 주장
- 출제·검토 관계자에게 들었다는 주장
- 출처불명 비공개 문항
- 독특한 수치·오탈자·문장까지 특정 유료자료와 일치
- 유료자료 대량복제

강제 결과:

```text
shared graph promotion = 0
world construction = 0
generator input = 0
learner redistribution = 0
manual integrity review required
```

---

# PART XIV — Portable Professional Exam Core

## 44. portability 원칙

공통 코어는 다음을 재사용한다.

- authority/provenance contracts
- effective-date/version machinery
- graph and snapshot interfaces
- question-unit abstraction
- evidence and capability semantics
- blueprint/scenario interfaces
- proof-bundle/release lifecycle
- scoring disagreement contract
- curriculum controller constraints
- audit and rollback
- source-safety and rights boundaries
- adapter lifecycle

시험별 profile이 소유한다.

- official authority and source precedence
- detailed scope taxonomy
- target-date norm universe
- historical-question corpus
- question and option grammar
- paper blueprint
- subject solvers and rubrics
- calculator/tool rules
- rights decisions
- profile calibration
- activation evidence

## 45. Appraiser is the only real profile

```text
profileId: appraiser_kr
strategy coverage: First + Second
current learner runtime: Second three subjects only
```

다른 real profile은 존재하지 않는 것으로 취급한다. 미래 profile은 Appraiser의
node, answer, weight, learner evidence 또는 approval을 상속하지 않는다.

## 46. ExamProfile admission

새 profile은 최소 다음을 독립적으로 통과해야 한다.

```text
PROFILE-0 named Owner decision and product boundary
PROFILE-1 official authority/source/rights manifest
PROFILE-2 target-date norm and drift policy
PROFILE-3 detailed scope and question-unit grammar
PROFILE-4 historical corpus and grouped audit
PROFILE-5 profile-specific solver/rubric/proof policy
PROFILE-6 synthetic hostile benchmark
PROFILE-7 Owner-private exact-profile evaluation
PROFILE-8 separate learner-facing activation
```

한 단계 통과가 다음 단계를 자동 승인하지 않는다.

## 47. cross-exam isolation

```text
answer transfer = 0
question-body transfer = 0
calibration-weight transfer = 0
mastery transfer = 0
learner-state inference transfer = 0
official-source authority transfer = 0
activation evidence transfer = 0
```

재사용 가능한 것은 code/interface와 rights-cleared generic test fixture뿐이다.

## 48. portability proof before a second exam

첫 portability 검증은 실제 다른 전문직 시험을 넣지 않는다.

```text
author-created synthetic mock profile
→ profile schema validation
→ fake authority/norm fixtures
→ fake question grammar
→ proof adapter
→ graph/world/controller/audit compatibility
→ destruction after test where required
```

이를 통과해도 real exam profile 권한은 생기지 않는다.

---

# PART XV — Open-source and interoperability

## 49. OSS 역할

오픈소스는 판단권자가 아니라 독립 검산자다.

### proposed build-time candidates

```text
Ajv         schema and closed-contract validation
Graphology  graph traversal, orphan/cycle/reachability checks
decimal.js  exact decimal, unit and rounding reference
fast-check  property/metamorphic/model-based hostile generation
```

### proposed isolated benchmark candidates

```text
DuckDB      immutable metadata snapshot and grouped analytical audit
Z3          constraint satisfiability and infeasibility explanation
Inspect AI  synthetic-only generator/grader evaluation
```

## 50. OSS authority ceiling

어느 adapter도 다음 권한을 갖지 않는다.

```text
official scope change
current answer change
CoreOutcome selection
mastery promotion
learner-visible scoring release
Law status decision
raw user-source access
Production persistence
automatic lifecycle transition
```

## 51. dependency lifecycle

각 후보는 다음 단계를 독립적으로 따른다.

```text
proposed
→ benchmark_only
→ shadow
→ limited_activation
→ active unscheduled
→ rollback always available
```

`proposed → benchmark_only` 전 요구:

- exact version pin
- license and transitive dependency review
- SBOM
- no-network/isolation where required
- closed input/output schema
- native fallback
- rollback test
- log and persistence inventory
- named owner
- synthetic fixture

V13은 어떤 설치도 승인하지 않는다.

## 52. interoperability targets

- QTI: question/test/result interchange compatibility target
- W3C PROV: Entity/Activity/Agent lineage mapping reference
- Caliper/xAPI: closed metadata event compatibility reference

다음은 금지한다.

- certification claim without conformance evidence
- raw learner/source body in interoperability events
- external standard identifier가 내부 권한을 부여하는 구조
- standard export를 통한 source-rights 우회

---

# PART XVI — Product surfaces

## 53. learner-facing surfaces

현재 Appraiser Second scope에서만 미래 별도 승인 후 다음 surface를 고려한다.

### Coverage Map

공식영역→현재 prerequisite→다음 evidence gate.

### Capability Workbench

```text
무엇을 아는가
무엇을 회상하지 못했는가
방법선택
실행
표현
검산
속도
전이
다음 행동
```

### Exam World Readout

확률을 보여주지 않는다.

```text
방어 중인 시험지 유형
아직 취약한 요구행위
공식 미출제/rotation 방어상태
다음 full-paper gate
```

### Question/GS Studio

- proof-verified original assessment
- frozen timed packet
- no mid-attempt mutation
- score interval and disagreement
- biggest gap and repair

### Review Queue / Today

- primary task ≤3
- due reason
- required independent action
- prior assistance
- D+1/D+7
- no source body

## 54. generic multi-exam surface 금지

Portable Core의 이름, 다른 시험 후보, generic exam selector 또는 “모든 전문직
시험” copy를 현재 learner UI, marketing, pricing 또는 onboarding에 노출하지
않는다.

---

# PART XVII — Measurement

## 55. system dashboards

### Truth and coverage

- official leaf total/mapped
- currentness unknown
- historical unit mapped
- rights unknown
- orphan/cycle/reachability
- official-unobserved

### Exam World

- reviewed world count
- mark/time-valid world count
- scenario diversity
- signal provenance/conflict
- same-origin duplicate
- freeze status

### Assessment proof

- proof-bundle completeness
- solver/rubric conflict
- metamorphic failure
- generated item rejection
- rights similarity hold
- drift hold

### Capability

- first independent attempt
- error-cause repair
- far transfer
- D+7 recovery
- timed completion
- confidence calibration
- false mastery

### Curriculum

- official-floor coverage
- scenario worst-case coverage
- max regret comparison
- time budget variance
- postponed official nodes
- Today task count

### Audit

- denominator
- missed marks
- false-positive hours
- baseline lift
- expert/public signal lift
- post-exam reclassification attempts
- data leakage defects

## 56. no unauthorized fitting

learner data로 BKT, IRT, CAT, 추천모델, 합격확률 또는 policy를 fitting하지 않는다.
별도 eligible input, consent, O2/O5, held-out and lifecycle authority가 필요하다.

N-of-1 teaching-method comparison도 synthetic 또는 exact-purpose authorized
closed evidence로 사전등록하고 shadow에서 시작한다. online model-weight update는
항상 금지한다.

---

# PART XVIII — Execution program

## 57. program order

```text
A. Preserve current live authority and blockers.

B. V13 strategy closeout
   - human legal/product/technical review
   - explicit merge decision

C. CPF source-safety
   - persistence-sink inventory
   - raw no-credential processor
   - provider/output firewall
   - bodyless evidence
   - hostile acceptance
   - written Korean copyright/privacy review

D. VESG/Appraiser profile
   - exact first corpus order
   - source/currentness/rights
   - grouped walk-forward baseline

E. EDT
   EDT-0 contracts and synthetic fixtures
   EDT-1 graph compiler
   EDT-2 Practice proof-carrying engine
   EDT-3 historical paper twin
   EDT-4 robust-controller shadow comparison
   EDT-5 Full GS Digital Twin
   EDT-6 synthetic isolated eval lab
   EDT-7 separately authorized adapters

F. PEXK
   PEXK-0 internal profile interfaces
   PEXK-1 synthetic mock-profile portability test
   PEXK-2 no real profile automatically

G. Activation
   - exact Appraiser profile Owner-private synthetic evidence
   - separate First-stage decision
   - separate real additional-profile decision
   - separate external/commercial/Production decision
```

## 58. bounded deliverables

### EDT-0

- JSON schemas
- closed enums
- synthetic fixtures
- no dependency
- no runtime

### EDT-1

- deterministic VESG graph audit adapter
- orphan/cycle/reachability reports
- no learner data

### EDT-2

- one Practice family
- exact decimal/unit/rounding policy
- property/metamorphic tests
- proof bundle
- synthetic only

### EDT-3

- 2013-2026 paper-level metadata twin
- marks/time/slot/combination
- no learner runtime

### EDT-4

- native plan vs baseline vs robust shadow
- no Today mutation
- infeasibility explanation

### EDT-5

- one frozen full GS synthetic packet
- scoring disagreement
- postmortem

### EDT-6

- pinned isolated OSS benchmark candidates
- synthetic rights-cleared fixtures only
- separate authorization

### PEXK-1

- fictional profile
- no public exam data
- no product surface
- interface portability report

큰 한 번의 runtime PR로 구현하지 않는다.

---

# PART XIX — Acceptance and hard gates

## 59. strategy acceptance

- V13 single active pointer
- V12/V11/VESG baseline preserved
- Appraiser current runtime boundary unchanged
- four priority/need/allocation axes separated
- world/capability/controller/proof/scoring/audit contracts
- internal-only portability
- no cross-exam evidence transfer
- OSS candidate authority ceiling
- exact non-authorization

## 60. hard gates

```text
official_scope_modified_by_inference = 0
current_answer_modified_by_expert_or_academy_signal = 0
same_origin_signal_double_count = 0
nonpublic_current_exam_signal_used = 0
scenario_presented_as_probability = 0

single_scalar_mastery_used = 0
guided_success_as_independent_mastery = 0
unresolved_score_used_as_mastery = 0
grader_disagreement_hidden = 0

released_question_without_profile_proof_bundle = 0
released_question_without_solver_or_rubric = 0
unit_or_rounding_ambiguity = 0
rights_unknown_shared_generation = 0

optimizer_direct_core_outcome_mutation = 0
plan_without_official_scope_floor = 0
today_primary_tasks_over_three = 0
infeasible_plan_silently_relaxed = 0

same_exam_year_train_test_leakage = 0
future_exam_data_leakage = 0
post_exam_prediction_backfill = 0
hit_claim_without_denominator = 0

portable_core_learner_visible = 0
other_exam_profile_activated = 0
cross_exam_answer_or_mastery_transfer = 0
profile_without_authority_owner = 0
profile_without_subject_verifier = 0

oss_raw_user_source_seen = 0
oss_persistent_raw_eval_log = 0
oss_component_with_product_decision_authority = 0
unpinned_oss_dependency = 0
```

## 61. runtime acceptance before any later real launch

V12 gates를 모두 유지하고 다음을 추가한다.

- exact Appraiser profile binding
- mark/time-valid reviewed worlds
- profile proof policies
- score disagreement policy
- frozen audit denominator
- no nonpublic signal
- no optimizer direct authority
- no cross-exam leakage
- no raw-source OSS sink
- exact adapter lifecycle evidence

자동화 통과만으로 legal, content, scoring 또는 Production 승인이 되지 않는다.

---

# PART XX — Governance

## 62. roles

- VESG/coverage authority owner
- target-date norm owner
- Exam World blueprint owner
- signal integrity reviewer
- subject curriculum reviewer
- generator/solver owner
- proof-bundle reviewer
- scoring calibration owner
- learner evidence owner
- curriculum controller owner
- source-safety/privacy owner
- Portable Core owner
- exam-profile admission owner
- OSS/license/SBOM owner
- independent release reviewer

한 사람이 generation, validation, scoring, release와 profile activation을 모두
단독 승인하지 않는다.

## 63. high-risk changes

- official source precedence
- scope leaf deletion
- currentness gate relaxation
- expert/academy signal authority expansion
- scenario probability display
- capability axes collapse
- mastery gate relaxation
- optimizer authority expansion
- proof policy weakening
- raw source shared reuse
- other-exam real profile
- cross-exam state transfer
- OSS raw-data access or persistence
- provider retention route

각 change는 exact Owner decision, review, rollback과 필요한 roadmap gate를
요구한다.

---

# PART XXI — Expansion and commercial boundary

## 64. 다른 전문직 시험 확장성의 정확한 답

### 재사용성이 높은 부분

- source/provenance/version framework
- graph/snapshot interfaces
- capability/evidence model
- world/blueprint contracts
- proof-bundle lifecycle
- scoring disagreement
- robust planning constraints
- source-safety and rights separation
- audit and release governance
- OSS adapter wrappers

### 재사용성이 낮거나 없는 부분

- 공식범위 taxonomy
- 법령·기준·판례
- 기출문항 corpus
- 문항분해 문법
- 시험지 blueprint
- solver/rubric
- 채점 calibration
- exam-specific UX copy
- activation evidence

따라서 새 시험을 붙일 때 처음부터 플랫폼 전체를 다시 만들 필요는 없지만,
콘텐츠·권위·검증을 shortcut할 수도 없다.

## 65. 장기 제품 구조

```text
Portable Professional Exam Core — internal
├─ Appraiser Profile — current strategy
└─ Future profiles — nonexistent until separately admitted

Each admitted profile may later have:
Original Curriculum
+ official calibration
+ private source-safe companion
+ licensed publisher/academy companion where rights permit
```

현재 learner-facing 브랜드와 제품은 감정평가사 2차에 집중한다. portability는
기술부채를 줄이고 미래 확장 비용을 낮추기 위한 내부설계이며 현재 시장범위를
넓히는 근거가 아니다.

---

# PART XXII — Final invariants

1. V13은 단일 active strategy entry다.
2. V12의 coverage와 V11의 source-safety를 약화하지 않는다.
3. 전략 coverage는 감정평가사 제1차 5과목과 제2차 3과목이다.
4. 현재 learner-facing runtime은 감정평가사 제2차 3과목뿐이다.
5. Portable Core는 internal-only이며 다른 real profile은 승인되지 않았다.
6. complete coverage는 source-universe와 evidence의 bounded completeness다.
7. 하나의 예상시험지 또는 확률을 canonical truth로 사용하지 않는다.
8. CorpusPriority, BlueprintDemand, LearnerNeed, AllocationUtility를 분리한다.
9. 전문가·학원 signal은 공식범위나 현재 정답을 바꾸지 않는다.
10. 현행시험 비공개 정보 주장은 quarantine한다.
11. learner state를 하나의 mastery 숫자로 축약하지 않는다.
12. 해설·힌트·공동작성은 independent mastery가 아니다.
13. Today primary task는 최대 3개다.
14. native policy가 CoreOutcome과 학습가치를 결정한다.
15. optimizer는 direct learner/product authority를 갖지 않는다.
16. released assessment는 profile-specific proof bundle을 갖는다.
17. generated reference는 공식답안·공식채점기준이 아니다.
18. 채점불일치는 공개하고 unresolved score로 mastery를 올리지 않는다.
19. 시험 intelligence는 시험 전에 동결하고 시험 후 denominator와 함께 평가한다.
20. exam-year grouped audit 없이 예측모형을 승격하지 않는다.
21. Book Tutor raw/source-bound output은 shared graph/world/core로 들어가지 않는다.
22. 다른 시험은 독립 profile admission과 activation을 통과해야 한다.
23. cross-exam answer, calibration, mastery와 activation evidence transfer는 0이다.
24. OSS는 검산자이며 권위자나 product decision maker가 아니다.
25. dependency·runtime·schema·provider·Production은 별도 exact-scope Work로만 바뀐다.
26. 전략 병합은 implementation, real-source processing 또는 activation을 자동 승인하지 않는다.

> **답안길의 장기 자산은 문제 적중목록도, 제3자 문제집 원문도, AI 답안의
> 수량도 아니다. 공식범위와 현재 규범을 추적하고, 가능한 시험 세계에서
> 학습자의 실제 수행을 검증하며, 그 판단과 실패를 재현 가능하게 감사하는
> 공통 코어와 시험별 profile이다.**
