---
document_title: "답안길 / Professional Exam Reasoning OS 통합 마스터플랜 최종본 V13.1"
document_subtitle: "V13 신뢰 통제면 위에 감점원인 제거·독립전이·개인 감점 DNA·일일 관제를 결합한 단일 active strategy"
document_role: "single active strategy entry point and final product-value control plane"
status: "owner-strategy/proposed-final-for-merge"
dated: "2026-08-10 KST"
repository: "chachathecat/inverge"
active_pointer: "docs/strategy/ACTIVE-MASTER-PLAN.md"
mandatory_technical_baseline: "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md"
mandatory_mcal_follow_up: "docs/strategy/dabangil-memory-cue-and-annotation-layer-v1-2026-08-06.md"
owner_decision: "docs/decisions/2026-08-10-owner-v13-1-indispensable-product-and-gap-elimination.md"
machine_contract: "config/dabangil-indispensable-product-gap-elimination-v1.json"
validation_record: "docs/qa/master-plan-v13-1-indispensable-product-validation.md"
strategy_scope: "감정평가사 제1차 5과목 + 제2차 3과목"
current_learner_facing_runtime_scope: "감정평가사 2차 실무·이론·법규 only"
runtime_authorization: "none"
schema_authorization: "none"
provider_authorization: "none"
dependency_authorization: "none"
deployment_authorization: "none"
commercial_activation_authorization: "none"
production_authorization: "none"
other_exam_profile_authorization: "none"
execution_rule: "This strategy becomes active only after its stacked dependency is resolved and this exact source set is explicitly merged. It authorizes no implementation or activation."
---

# 답안길 / Professional Exam Reasoning OS 통합 마스터플랜 V13.1

## 기술적 신뢰를 실제 감점 제거와 재구매 가치로 연결하는 단일 제품 통제면

---

# PART I — Final decision

## 1. V13.1의 지위

V13.1은 V13을 폐기하거나 V14로 갈아엎는 계획이 아니다.

```text
ACTIVE-MASTER-PLAN.md
→ V13.1 — single active strategy
   ├─ V13 — mandatory technical baseline
   │  ├─ VESG Truth Kernel
   │  ├─ Appraiser Coverage Compiler
   │  ├─ Exam World Twin
   │  ├─ Learner Capability Twin
   │  ├─ Robust Curriculum Controller
   │  ├─ Proof-Carrying Assessment Foundry
   │  ├─ Calibrated Scoring & Audit
   │  └─ Portable Professional Exam Core — internal only
   ├─ MCAL — mandatory V13 follow-up
   └─ V13.1 — indispensable-product and verified gap-elimination layer
```

V13은 source, rights, currentness, question proof, capability evidence, scoring conflict,
audit와 portability의 기술적 두뇌다. V13.1은 그 두뇌가 사용자의 반복 감점을
실제로 제거하고, 그 결과로 매일의 공부를 다시 지휘하며, 외부 사용과 자발적
재구매로 제품가치를 증명하도록 만드는 제품 신경계다.

## 2. 최종 제품 정의

> **답안길은 사용자가 왜 점수를 잃는지 답안의 정확한 위치에서 찾아내고,
> 오늘 직접 고치게 한 뒤, 다음 미사용 문제에서 그 감점 원인이 실제로
> 사라졌는지 증명하며, 그 증거로 시험일까지의 공부를 매일 다시 지휘하는
> 감정평가사 2차 합격관제 OS다.**

최종 loop:

```text
Capture / Attempt
→ exact answer anchor
→ one biggest deduction cause
→ bounded direct repair
→ same-session repair verification
→ D+1 independent reconstruction
→ D+7 verified non-same-surface transfer
→ timed recurrence check
→ Personal Recurring Deduction DNA
→ Today max 3 / Full-Day replanning
→ paid use and voluntary repurchase proof
```

---

# PART II — Authority, scope and non-authorization

## 3. 권위 순서

```text
current law / accounting standards / official exam authority
+ live repository and runtime facts
→ current dated Owner decisions for their exact scope
→ canonical product/program contracts and roadmap authority
→ AGENTS.md and executable domain contracts
→ V13.1 single active strategy
→ V13 mandatory technical baseline and detailed specifications
→ MCAL and earlier mandatory non-conflicting annexes
```

전략 문서는 runtime 사실을 덮어쓰지 않는다. 모델 출력은 official source,
deterministic validator, subject validator, release gate 또는 canonical evidence를
대체하지 않는다.

## 4. 현재 범위

- 전략 coverage: 감정평가사 제1차 5과목 + 제2차 3과목
- 현재 learner-facing runtime: 감정평가사 2차 실무·이론·법규 only
- Portable Core: internal-only
- 다른 시험 profile, first-stage runtime, generic multi-exam UI: 승인 없음
- external learner, payment, pricing, entitlement, Production: 승인 없음

---

# PART III — Indispensable Product Minimum

## 5. 여덟 축

```text
A. First Meaningful Value
B. Evidence-Anchored Diagnosis
C. Outcome-Qualified Verified Gap Closure
D. Personal Recurring Deduction DNA
E. Daily Command and Recovery
F. Trust, Abstention and Escalation
G. Learner-Owned Continuity
H. Paid Use and Renewal Proof
```

어느 한 축도 다른 축으로 대체하지 않는다.

```ts
type IndispensableProductReadinessV1 = {
  runtimeReady: boolean;
  contentReady: boolean;
  qualityReady: boolean;
  gapClosureReady: boolean;
  continuityReady: boolean;
  externalUsabilityObserved: boolean;
  commercialReady: boolean;
  renewalSignalObserved: boolean;
  indispensableReady: boolean;
  reasonCodes: string[];
  evidenceRefs: string[];
  policyVersion: string;
};
```

문서 존재, Owner dogfood, 결제 1회, guided success 또는 같은 문제 재정답은
`indispensableReady`를 만들지 못한다.

## 6. First Meaningful Value

첫 가치의 정의:

- learner-confirmed problem and answer revision
- exact subject/task/source binding
- usable `AnswerEvidenceAnchorV1`
- one biggest gap with evidence and uncertainty
- one bounded repair action
- saved and reopenable result
- no hidden conflict or false success

초기 외부 beta 가설:

```text
confirmed capture
→ trusted anchor + one biggest gap + one next action
p50 <= 5 minutes
```

세계급 목표는 p50 3분 이내다. 수치는 marketing claim이 아니라 versioned
product-quality hypothesis다.

---

# PART IV — Evidence-anchored diagnosis

## 7. AnswerEvidenceAnchorV1

```ts
type AnswerEvidenceAnchorV1 = {
  id: string;
  learnerPrivateScopeRef: string;
  learningDocumentRef: string;
  problemRevisionChecksum: string;
  answerRevisionChecksum: string;
  subject: "practice" | "theory" | "law";
  anchorKind:
    | "page_line_range"
    | "paragraph"
    | "outline_node"
    | "calculation_step"
    | "table_cell"
    | "conclusion"
    | "missing_required_slot";
  locatorRef: string;
  privateExcerptRef?: string;
  rubricOrRequirementRefs: string[];
  sourceAndVerificationRefs: string[];
  status: "usable" | "uncertain" | "blocked" | "stale";
  basisChecksum: string;
};
```

규칙:

- raw excerpt는 learner-private vault 밖으로 나가지 않는다.
- problem, answer, OCR, rubric, source 또는 policy revision이 바뀌면 stale이다.
- exact location을 모르면 아는 척하지 않고 `uncertain` 또는 `blocked`다.
- “목차가 약함”, “포섭 부족” 같은 총평만으로 usable biggest gap을 만들지 않는다.
- missing slot은 검증된 requirement/rubric 구조에 결합한다.

---

# PART V — Successful-performance evidence gate

## 8. evaluation completion은 success가 아니다

V13.1의 핵심 fail-closed 규칙:

> **canonical evaluation record가 존재하고 완료됐다는 사실만으로
> independent retrieval, far transfer, stable D+7 또는 gap closure를 부여하지 않는다.**

모든 positive learning evidence에는 별도의 exact canonical outcome predicate가
필요하다.

```ts
type SuccessfulPerformanceOutcomeV1 = {
  evaluationRef: string;
  attemptRef: string;
  learnerPrivateScopeRef: string;
  taskRef: string;
  outcomeState:
    | "accepted_success"
    | "incorrect"
    | "zero_or_empty"
    | "below_threshold"
    | "unresolved"
    | "conflict"
    | "stale";
  acceptedByPolicy: boolean;
  thresholdPolicyRef: string;
  subjectValidatorRefs: string[];
  deterministicCheckRefs: string[];
  rubricOrAcceptedResultRefs: string[];
  unresolvedConflictCount: number;
  outcomeDigest: string;
  basisChecksum: string;
};
```

positive evidence 허용 조건:

```text
outcomeState == accepted_success
AND acceptedByPolicy == true
AND unresolvedConflictCount == 0
AND exact attempt/learner/task/evaluation binding
AND subject validator pass
AND required deterministic/rubric/source checks pass
AND assistance and exposure eligibility pass
AND replay/dedupe pass
```

다음은 positive evidence가 아니다.

- evaluated/completed only
- incorrect result
- zero or blank result
- below-threshold result
- unresolved rubric or source conflict
- stale evaluation
- client/model success flag
- outer score claim
- same-surface guided correction

base response, transfer response와 D+7 response는 각각 자기 canonical outcome
record를 독립적으로 통과해야 한다. base success가 transfer/D+7 success를
대신하지 않는다. D+7-only outcome failure는 valid base retrieval이나 valid
far transfer를 거꾸로 지우지 않지만 stable D+7과 closure를 거부한다.

---

# PART VI — Gap closure

## 9. GapClosureCaseV1

```ts
type GapClosureStatusV1 =
  | "detected"
  | "repair_pending"
  | "repair_verified_same_session"
  | "d1_pending"
  | "d1_reproduced"
  | "transfer_pending"
  | "d7_transfer_confirmed"
  | "timed_recurrence_check_pending"
  | "timed_recurrence_clear"
  | "recurred"
  | "blocked"
  | "stale";

type GapClosureCaseV1 = {
  id: string;
  learnerPrivateScopeRef: string;
  subject: "practice" | "theory" | "law";
  sourceAttemptRef: string;
  sourceAnswerRevisionRef: string;
  answerAnchorRefs: string[];
  targetConceptRefs: string[];
  gapKind: string;
  deductionRiskBand: "unknown" | "minor" | "major" | "blocking";
  diagnosticCauseHypothesisRefs: string[];
  supportingEvidenceRefs: string[];
  counterEvidenceRefs: string[];
  primaryRepairActionRef: string;
  sameSessionRepairEvidenceRef?: string;
  d1SuccessfulOutcomeRef?: string;
  d7SuccessfulOutcomeRef?: string;
  timedRecurrenceOutcomeRef?: string;
  currentStatus: GapClosureStatusV1;
  nextActionRef?: string;
  policyVersion: string;
  basisChecksum: string;
};
```

상태 상한:

| 사건 | 최대 상태 |
|---|---|
| gap 탐지 | `detected` |
| AI 예시·힌트·full solution | 개선 없음 |
| 같은 세션 직접 교정 + successful outcome | `repair_verified_same_session` |
| D+1 무도움 successful outcome | `d1_reproduced` |
| D+7 verified non-same-surface successful outcome | `d7_transfer_confirmed` |
| required timed successful recurrence check | `timed_recurrence_clear` |
| qualifying independent failure | `recurred` |
| conflict/stale/missing outcome | `blocked` 또는 `stale` |

“감점 원인이 사라졌습니다”라는 learner-facing claim은 D+7 verified transfer,
policy-required timed recurrence, conflict 0과 current basis를 모두 요구한다.

---

# PART VII — Personal Recurring Deduction DNA

## 10. 정체성

Personal Recurring Deduction DNA는 성격, 지능 또는 고정 능력 판정이 아니다.

> 서로 다른 eligible item family의 독립 수행에서 반복된 감점 경로와
> 발생조건을 learner-private로 묶은 재계산 가능한 derived projection이다.

Canonical MasteryState는 하나뿐이다. Deduction DNA는 두 번째 mastery oracle이
아니다.

```ts
type RecurringDeductionSignatureV1 = {
  id: string;
  learnerPrivateScopeRef: string;
  subjectScope: "practice" | "theory" | "law" | "cross_subject";
  causeCode:
    | "demand_misread"
    | "issue_or_requirement_omission"
    | "fact_rule_application_gap"
    | "method_selection_error"
    | "procedure_order_error"
    | "calculation_input_error"
    | "unit_sign_rounding_error"
    | "expression_structure_error"
    | "time_allocation_failure"
    | "verification_omission"
    | "confidence_miscalibration"
    | "assistance_dependence"
    | "integration_failure"
    | "insufficient_evidence";
  timedState: "timed" | "untimed" | "mixed";
  assistanceState: "independent" | "assisted" | "mixed";
  eligibleOccurrenceRefs: string[];
  counterEvidenceRefs: string[];
  distinctEligibleItemFamilyCount: number;
  recurrenceCount: number;
  latestStatus:
    | "insufficient_evidence"
    | "candidate"
    | "repeating"
    | "recovery_watch"
    | "currently_clear"
    | "recurred"
    | "stale";
  nextBestActionRef?: string;
  inferencePolicyVersion: string;
  basisChecksum: string;
};
```

규칙:

- 한 실패를 관련 concept 전체에 완전 실패로 복제하지 않는다.
- attempt와 derived gap/retry는 independent failure를 중복 계산하지 않는다.
- assisted, guided, same-surface, stale, unverified variant와 unsuccessful outcome은
  recurrence 또는 recovery success 분자에 넣지 않는다.
- counter-evidence와 disconfirmation path를 보존한다.
- raw answer/OCR/note/AI body를 analytics, graph label 또는 training input에 넣지 않는다.

---

# PART VIII — Subject-specific resolution

## 11. Practice

진단 해상도:

```text
method selection
→ data/date mapping
→ formula
→ procedure order
→ numeric input
→ unit/sign/rounding
→ verification
→ answer-sheet transcription
```

숫자, 단위, 부호, 반올림과 역산은 deterministic validator를 우선한다.
AI와 deterministic result가 충돌하면 successful outcome을 release하지 않는다.

## 12. Theory

```text
command verb
→ outline
→ concept accuracy
→ argument link
→ comparison axis
→ evaluation/criticism
→ practical linkage
→ conclusion/compression
```

단일 LLM 자유형 숫자점수는 canonical truth가 아니다. material rubric
disagreement는 held/human-review-required다.

## 13. Law

```text
issue
→ controlling source/effective version
→ elements/effect
→ decisive facts
→ fact-to-rule application
→ counterargument
→ conclusion/remedy
```

source/effective-version/conflict가 닫히지 않으면 verified reference,
successful outcome 또는 gap closure를 release하지 않는다.

---

# PART IX — Verified variant bank

## 14. transfer instrument

각 핵심 gap/skill은 필요 범위에서 다음을 가진다.

```text
canonical case
near-miss
counterexample
flip-condition
D+7 verified variant
timed integration item
```

D+7/stable/closure에 쓰는 variant는:

- rights/source/currentness usable
- exact target skill/gap
- solver/rubric/validator
- item-family and surface-distance policy
- pre-presentation unseen snapshot
- solution hidden
- independent attempt
- disqualifying assistance 0
- proof bundle and released state
- successful-performance outcome

를 모두 요구한다. Generated item은 기본 unverified/private이며 자동 승격하지
않는다.

---

# PART X — Daily command and Full-Day

## 15. Today

Today의 learner-visible `CoreOutcome`은 0~3개다.

각 outcome은 다음을 설명한다.

- 왜 지금인가
- 어떤 official node 또는 recurring deduction을 다루는가
- 어떤 evidence에서 왔는가
- 몇 분이 필요한가
- 무엇이 success인가
- 무엇을 defer/drop했는가

앱 체류, streak, message count 또는 token 사용량이 priority를 결정하지 않는다.

## 16. Full-Day

```text
CoreOutcome: 0..3
ExecutionBlock: 0..N within available minutes
Review Queue: minute-budgeted
LearningDocument: learner-owned continuity
```

- fixed schedule, lecture, textbook, answer writing, due review와 buffer를 함께 배치
- availability를 조용히 초과하지 않음
- illness/fatigue/miss에서는 bounded recovery
- block completion alone changes no mastery or gap closure
- verified closure는 priority를 낮추고 qualifying recurrence는 다시 올림
- native evidence policy가 learning value와 CoreOutcome을 결정
- optional optimizer는 selected metadata-only blocks 배치만 보조

---

# PART XI — Trust, abstention and continuity

## 17. 역할 분리

- deterministic validator: numeric and closed-rule truth
- source registry: official source/currentness/effective version
- subject validator: rubric, issue, method and requirement
- AI: explanation, hypothesis, comparison and next-action candidate
- release resolver: candidate, critic, conflict and final gate
- human: separately authorized benchmark/academy/quality lane only

learner-facing state:

```text
검증됨 / 근거 있음 / 추론 / 검토 필요 / 충돌 / 근거 부족 / stale
```

낮은 신뢰나 conflict에서 억지 답을 만들지 않는다.

## 18. Learner-owned continuity

정당한 continuity moat:

```text
problem/answer revision
→ anchor
→ repair
→ D+1
→ D+7
→ timed recurrence
→ recurring deduction signature
→ next-plan decision
```

사용자는 reopen, search, resume, version history, export와 delete를 가진다.
서비스가 끊기 어려운 이유는 artificial lock-in이 아니라 누적된 개인
학습계보와 다음 교정의 연속성이어야 한다.

---

# PART XII — Measurement and commercial proof

## 19. North Star

```text
Verified Recurring-Gap Eliminations
per Active Learner per Effective Study Hour
```

분자:

- distinct recurring gap
- D+7 verified non-same-surface independent successful outcome
- required timed successful outcome
- unresolved conflict 0
- replay/family duplication 0

금지 North Star:

- messages
- time in app
- streak
- AI tokens
- upload volume
- assisted score
- generated question count

## 20. 초기 제품가설

| 지표 | 초기 gate 가설 |
|---|---:|
| confirmed capture→trusted anchor/gap/action p50 | ≤5분 |
| 세계급 목표 | ≤3분 |
| external biggest-gap top-1 agreement | ≥80% |
| severe misfeedback | <1%, critical Gold 0 |
| deterministic Practical Gold | 100% |
| unsupported verified Law release | 0 |
| result→direct repair | ≥60% |
| D+1 independent participation | ≥50% |
| 4주 동일 gap recurrence | baseline 대비 ≥25% 감소 |
| false mastery/closure | 0 |
| active paid voluntary repurchase | ≥60% hypothesis |
| core active “없어지면 매우 곤란” | ≥40% hypothesis |

모든 수치는 frozen cohort, offer, feature manifest, denominator와 window를
요구하는 가설이며 효능·시장 claim이 아니다.

## 21. Paid use and renewal proof

결제만으로 제품가치가 증명되지 않는다.

```text
exact approved offer payment
AND usable review count >= 2
AND direct repair
AND D+1 independent successful outcome
AND voluntary next-pack purchase
```

다음은 충분하지 않다.

- payment only
- demo satisfaction
- one upload
- survey purchase intent
- AI explanation novelty

Owner dogfood는 external usability, price, renewal, efficacy 또는 market을
증명하지 않는다. 현재 commercial path와 Owner gates는 그대로 유지되며,
이 전략은 price, checkout, billing, entitlement 또는 cohort를 활성화하지 않는다.

---

# PART XIII — Product-value critical path

## 22. 제안 순서

```text
0. Close current blocking source work, including MCAL successful-outcome P1.
1. CPF/source-safety blocker closure.
2. V13.1 authority/contract/roadmap reconciliation.
3. Three-subject evidence-anchored biggest-gap Golden vertical.
4. Bounded repair verification.
5. D+1 independent reconstruction.
6. D+7 verified variant transfer.
7. Timed recurrence.
8. Personal Recurring Deduction DNA.
9. Today / Full-Day evidence-driven replanning.
10. Owner-private end-to-end acceptance.
11. External paid canary and voluntary repurchase proof.
12. Broader EDT / portable-core expansion that does not block 3–11.
13. First-stage or another profile only through separate admission.
```

Broad infrastructure, generic dashboard, multi-exam abstraction 또는 MCAL surface는
complete Gap-to-Transfer vertical을 무기한 늦추지 못한다.

---

# PART XIV — Hard gates and non-goals

## 23. zero-tolerance invariants

```text
generic_unanchored_biggest_gap = 0
positive_learning_evidence_without_successful_outcome = 0
gap_closed_without_d7_verified_transfer = 0
closure_without_required_timed_recurrence = 0
guided_or_same_surface_as_independent = 0
raw_body_in_deduction_dna_or_analytics = 0
second_mastery_oracle_created = 0
law_source_conflict_released = 0
deterministic_calculation_conflict_hidden = 0
today_primary_tasks_over_three = 0
plan_priority_from_engagement_metric = 0
owner_dogfood_counted_as_market_or_renewal_proof = 0
purchase_only_counted_as_product_market_fit = 0
price_or_checkout_activated_by_strategy_document = 0
artificial_lock_in_or_export_block = 0
portable_core_learner_visible = 0
other_exam_profile_activated = 0
```

## 24. 명시적 non-goals

- V14 or detached second master
- first-stage learner runtime from this strategy
- another professional exam
- generic exam selector or broad multi-exam marketing
- public problem archive
- B2C human-review marketplace
- pass probability, official score or guarantee
- raw learner online training
- free-form chat as product center
- community, leaderboard, streak or casino gamification
- dashboard as substitute for gap elimination
- unverified variant as transfer evidence
- unlimited high-cost AI
- weakening CPF, source, rights, privacy, RLS, release or commercial gates

---

# PART XV — Current stacked merge boundary

## 25. merge dependency

이 V13.1 source set은 MCAL branch 위에 쌓인다.

```text
PR #694 successful-performance P1 correction
→ exact-head tests and fresh review
→ PR #694 explicit merge
→ V13.1 stacked PR retargeted to main
→ exact-head tests and fresh strategy review
→ explicit V13.1 merge decision
```

PR #694의 unresolved P1이 닫히기 전에 V13.1을 main에 병합하지 않는다.
V13.1 전략에 successful-outcome invariant가 존재한다는 사실은 PR #694의
machine contract/test 결함을 자동 교정하거나 해결하지 않는다.

## 26. 이 문서가 승인하지 않는 것

- runtime/UI/API/schema/migration/RLS/Storage
- provider/model/prompt/dependency/env/deployment
- real learner/content processing
- roadmap active slice
- Owner Alpha/external account activation
- payment/pricing/refund/entitlement
- Ready, merge or auto-merge
- follow-on implementation

---

# PART XVI — Final invariants

1. V13.1은 merge 후 단일 active strategy entry다.
2. V13은 mandatory technical baseline으로 보존된다.
3. MCAL은 mandatory follow-up이며 V13.1의 제품 우선순위에 종속된다.
4. exact answer anchor 없는 generic feedback은 usable biggest gap이 아니다.
5. canonical evaluation completion만으로 positive learning evidence가 생기지 않는다.
6. accepted successful outcome이 base, transfer와 D+7 각각에 필요하다.
7. same-session repair는 elimination이 아니다.
8. D+7 verified transfer와 required timed recurrence가 closure에 필요하다.
9. Deduction DNA는 learner-private derived projection이며 mastery가 아니다.
10. Today primary task는 최대 3개다.
11. Full-Day는 available minutes 안의 ExecutionBlock 0..N이다.
12. AI가 없어졌을 때 다음 문제를 더 잘 푸는 것이 최종 학습 성공이다.
13. 결제·사용·repair·D+1·자발적 재구매를 함께 본다.
14. V13.1은 어떤 runtime, commercial 또는 Production activation도 자동 승인하지 않는다.

> **V13이 답안길의 신뢰 가능한 두뇌라면, V13.1은 그 두뇌가 사용자의
> 반복 감점을 실제로 제거하고, 매일의 공부를 지휘하며, 자발적 재구매로
> 가치를 증명하게 만드는 제품 신경계다.**
