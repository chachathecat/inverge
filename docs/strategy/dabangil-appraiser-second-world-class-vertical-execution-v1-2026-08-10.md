---
document_title: "답안길 감정평가사 2차 World-Class Vertical Execution Standard v1"
document_subtitle: "정확한 감점 위치·AI 협업 교정·독립 전이·재발 검증·하루 관제"
document_role: "V13 subordinate execution standard; not a new master plan"
status: "proposed_non_authoritative_source_contract"
version: "1.0.4"
dated: "2026-08-10 KST"
repository: "chachathecat/inverge"
active_master_plan: "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md"
active_pointer_mutation: "none"
roadmap_mutation: "none"
runtime_authorization: "none"
schema_authorization: "none"
provider_authorization: "none"
dependency_authorization: "none"
commercial_activation_authorization: "none"
production_authorization: "none"
---

# 답안길 감정평가사 2차 World-Class Vertical Execution Standard v1

## 0. 최종 제품 정의

> **답안길은 수험생의 답안에서 가장 큰 감점 원인을 정확한 위치에서 찾아,
> AI와 함께 원인을 이해하고 직접 고치게 한 뒤, 다음 날·다른 문제·제한시간
> 전체 답안에서 같은 감점이 다시 나타나는지 확인하고, 그 증거로 오늘의
> 공부를 다시 지휘하는 감정평가사 2차 학습 OS다.**

이 문서는 V13을 교체하지 않는다. V13의 Trust, evidence, source/rights,
transfer, Full-Day와 privacy 원칙을 감정평가사 2차 product로 번역하는
subordinate execution standard다.

이 문서는 runtime, schema, provider, real content, learner, payment,
deployment 또는 Production 작업을 승인하지 않는다.

---

## 1. 세계급의 판정

세계급은 기능 수, AI 대화량, 생성 답안 길이, dashboard, streak, 결제자 수
또는 guided score로 판정하지 않는다.

```text
Trust
Precision
Diagnosis
Action
Transfer
Recurrence
Continuity
Daily Command
Market Proof
```

```ts
type WorldClassVerticalReadinessV1 = {
  sourceContractReady: boolean;
  syntheticVerticalReady: boolean;
  ownerPrivateReady: boolean;
  trustReady: boolean;
  transferReady: boolean;
  recurrenceReady: boolean;
  continuityReady: boolean;
  dailyCommandReady: boolean;
  externalUsabilityObserved: boolean;
  commercialReady: boolean;
  renewalSignalObserved: boolean;
  efficacyObserved: boolean;
  reasonCodes: string[];
  evidenceRefs: string[];
  featureManifestChecksum: string;
  policyVersion: string;
};
```

한 상태가 다른 상태를 자동으로 대신하지 않는다. 문서와 CI는 runtime,
subject quality, efficacy, price 또는 PMF evidence가 아니다.

---

## 2. 최초 핵심 사용자

첫 vertical은 다음 learner를 우선한다.

- 감정평가사 2차 유예생·재시생
- 주 2~3회 이상 실제 답안을 쓰는 learner
- GS 피드백 뒤에도 같은 오류가 반복되는 learner
- 실무 계산·법규 포섭·이론 비교평가의 반복 감점이 있는 learner
- 오답노트와 D+1 복습이 끊기는 learner

초기 비핵심은 기본강의 미완료자, 답안을 거의 쓰지 않는 learner,
공식 점수·모범답안만 원하는 learner와 자유형 범용 chat를 원하는 learner다.

---

## 3. 하나의 완전한 vertical

```text
Capture
→ Confirmed Revision
→ Exact Answer Anchor
→ Independent Commit / Attempt
→ Successful-Outcome-Qualified Biggest Gap
→ Bounded AI Collaboration
→ Learner Reconstruction / Direct Repair
→ Same-Session Verification
→ Frozen-Config D+1 Independent Reconstruction
→ Sealed D+7 Verified Non-Same-Surface Transfer
→ Timed Full-Answer Recurrence
→ Recurring Deduction Projection
→ Today / Full-Day Replan
```

각 단계는 뒤 단계를 outer claim, alias, model confidence 또는 evaluation
completion으로 대체하지 않는다.

---

## 4. System 1 — Capture & Exact Answer Anchor

```ts
type AnswerEvidenceAnchorKindV1 =
  | "page_line_range"
  | "paragraph"
  | "outline_node"
  | "calculation_step"
  | "table_cell"
  | "conclusion"
  | "missing_required_slot";

type AnswerEvidenceAnchorV1 = {
  id: string;
  learnerScopeRef: string;
  sourceArtifactRef: string;
  problemRevisionChecksum: string;
  answerRevisionChecksum: string;
  subject: "practice" | "theory" | "law";
  kind: AnswerEvidenceAnchorKindV1;
  locatorRef: string;
  rubricOrRequirementRefs: string[];
  sourceAndVerificationRefs: string[];
  status: "usable" | "uncertain" | "blocked" | "stale";
  basisChecksum: string;
};
```

불변식:

- immutable source asset과 editable OCR/problem/answer revision을 분리한다.
- learner-confirmed revision만 diagnosis basis가 된다.
- answer/source revision이 바뀌면 anchor와 파생 diagnosis는 stale이다.
- `missing_required_slot`은 검증된 requirement/rubric의 누락만 가리킨다.
- 위치를 확정하지 못하면 `uncertain`이고 usable biggest gap을 만들지 않는다.
- private locator/body는 learner vault를 벗어나지 않는다.

Learner UX:

```text
답안 위치
7쪽 3번째 문단, 2~3문장

가장 큰 감점 원인
수용권 설정이라는 법적 효과를 처분성 판단에 연결하지 못했습니다.

지금 할 일
해당 문단을 8분 안에 다시 쓰세요.
```

---

## 5. System 2 — Compact Subject Diagnosis

거대한 수작업 grading rules engine을 먼저 만들지 않는다. AI가 후보를
생성하되 trusted code가 구조, validator와 evidence effect를 통제한다.

### 5.1 protocol

```text
confirmed revision
→ exact answer map / anchors
→ subject rubric
→ up to three gap candidates
→ supporting and counter evidence
→ deterministic top-1 ranking
→ one bounded repair
→ repair success criterion
```

```ts
type GapCauseCodeV1 =
  | "demand_misread"
  | "requirement_omission"
  | "fact_rule_application_gap"
  | "method_selection_error"
  | "procedure_order_error"
  | "calculation_input_error"
  | "unit_sign_rounding_error"
  | "verification_omission"
  | "expression_structure_error"
  | "time_allocation_failure"
  | "confidence_miscalibration"
  | "assistance_dependence"
  | "integration_failure"
  | "insufficient_evidence";

type GapCandidateV1 = {
  id: string;
  learnerScopeRef: string;
  attemptRef: string;
  answerAnchorRefs: string[];
  criterionRef: string;
  observedRef: string;
  expectedRef: string;
  causeCode: GapCauseCodeV1;
  supportingEvidenceRefs: string[];
  counterEvidenceRefs: string[];
  severity: "blocking" | "major" | "minor";
  confidence: "low" | "medium" | "high";
  repairKind: "rewrite" | "recalculate" | "recall" | "contrast";
  repairInstructionRef: string;
  successCriteriaRefs: string[];
  policyVersion: string;
  basisChecksum: string;
};
```

### 5.2 fast path

- one strong model
- strict structured output
- current rubric/source binding
- deterministic Practice validation
- Law source/effective-version validation
- release only when evidence and confidence are sufficient

### 5.3 conditional escalation

두 번째 critic/adjudication은 다음 경우에만 실행한다.

- low confidence
- top-1과 top-2가 근접
- deterministic calculation conflict
- Law source/currentness conflict
- schema violation or extra fields
- unsupported assertion
- new item family
- learner objection

### 5.4 ranking

```text
priority =
exam impact
× blocking/prerequisite risk
× evidence strength
× recurrence/transfer value
× repair efficiency
÷ uncertainty
```

AI는 candidate를 제안할 수 있지만 success, independence, transfer,
mastery 또는 usage commit을 자기 선언하지 못한다.

### 5.5 실무

```text
요구 해석
→ 방법 선택
→ 자료 역할·기준시점
→ 산식·변수
→ 계산 순서
→ 숫자 입력
→ 단위·부호·반올림
→ 검산
→ 계산기 루틴
→ 답안지 전사
```

숫자·단위·부호·반올림·역산은 deterministic validator가 AI보다 우선한다.

### 5.6 이론

```text
요구 동사
→ 목차
→ 정의
→ 논거 연결
→ 비교축
→ 평가·비판
→ 실무 연결
→ 결론·압축
```

단일 모델 자유형 숫자점수를 truth로 사용하지 않는다.

### 5.7 법규

```text
쟁점
→ controlling source/effective version
→ 요건·효과
→ 결정적 사실
→ 사실→요건 포섭
→ 반대논거
→ 결론·구제
```

필수 source/currentness/conflict가 닫히지 않으면 verified conclusion 또는
usable legal reference body를 release하지 않는다.

---

## 6. System 3 — Server-Enforced Tutor Episode

```ts
type VerticalTutorStateV1 =
  | "intake"
  | "orient"
  | "commit"
  | "attempt"
  | "diagnose"
  | "scaffold"
  | "reconstruct"
  | "repair"
  | "verify"
  | "contrast"
  | "transfer"
  | "timed_recurrence"
  | "schedule"
  | "completed"
  | "guided_exit"
  | "blocked"
  | "stale";
```

```text
intake → orient → commit → attempt → diagnose → scaffold
→ reconstruct → repair → verify → contrast → transfer
→ timed_recurrence → schedule
```

### 6.1 scaffold ladder

```text
neutral reprompt
→ recall cue
→ representation cue
→ discrimination question
→ concept hint
→ structural hint
→ partial example
→ worked step
→ full solution
```

- smallest useful help부터 시작한다.
- answer leak 수준의 hint는 실제 높은 assistance로 기록한다.
- full solution 뒤에는 closed-book reconstruction을 요구한다.
- full solution 뒤 same-item success는 transfer가 아니다.
- client/model은 tutor state, qualification 또는 evidence effect를 제출하지 못한다.

### 6.2 pre-help exposure transaction

```ts
type AssistanceExposureCommitV1 = {
  learnerScopeRef: string;
  tutorEpisodeRef: string;
  attemptRef: string;
  itemRevisionRef: string;
  assistanceKind: string;
  outputKind: "hint" | "explanation" | "worked_step" | "probe" | "full_solution";
  appendOnlyEventRef: string;
  committedAt: string;
  transactionState: "committed";
  idempotencyKey: string;
  derivationAuthority: "trusted_server";
};
```

어떤 hint, explanation, worked step, probe 또는 full solution byte도 위 event가
trusted server에 append-only로 commit되기 전에 반환하지 않는다.

- commit 실패: output 0 byte, positive evidence 0, usage success 0
- request/client/model의 success boolean은 authority 0
- exposed attempt/item은 이후 unseen으로 relabel 불가
- 이후 독립 evidence는 별도의 distinct independent attempt가 필요
- retry, multi-tab, direct endpoint, cache, prefetch가 우회하지 못함

### 6.3 Learning / Measurement Lane

Learning Lane:

- scaffold, explanation, contrast, repair 허용
- same item 사용 가능
- objective는 이해와 교정

Measurement Lane:

- hint/reference/probe byte 차단
- pre-presentation unseen snapshot
- verified item family
- trusted server timer
- objective는 독립 수행과 transfer

route, cache, prefetch, event와 eligibility를 물리적으로 분리한다.

---

## 7. System 4 — Gap Closure and Frozen D0

```ts
type GapClosureStatusV1 =
  | "detected"
  | "repair_pending"
  | "repair_verified_same_session"
  | "d1_pending"
  | "d1_reproduced"
  | "transfer_pending"
  | "d7_transfer_confirmed"
  | "timed_recurrence_pending"
  | "timed_recurrence_clear"
  | "recurred"
  | "blocked"
  | "stale";

type FrozenD0ConfigurationSnapshotV1 = {
  problemRevisionRef: string;
  sourceVersionRef: string;
  itemReleaseArtifactRef: string;
  modelVersion: string;
  promptVersion: string;
  rubricVersion: string;
  validatorVersion: string;
  tutorPolicyVersion: string;
  assistancePolicyVersion: string;
  measurementPolicyVersion: string;
  notebookSchemaVersion: string;
  fullDayPolicyVersion?: string;
  configurationChecksum: string;
  frozenAt: string;
};

type GapClosureCaseV1 = {
  id: string;
  learnerScopeRef: string;
  subject: "practice" | "theory" | "law";
  sourceAttemptRef: string;
  answerAnchorRefs: string[];
  gapFindingRef: string;
  repairActionRef: string;
  frozenD0ConfigurationRef: string;
  sameSessionRepairEvidenceRef?: string;
  d1IndependentEvidenceRef?: string;
  d7VerifiedVariantEvidenceRef?: string;
  timedRecurrenceEvidenceRef?: string;
  currentStatus: GapClosureStatusV1;
  policyVersion: string;
  basisChecksum: string;
};
```

D+1은 frozen D0 configuration과 exact match해야 한다.

- model/prompt/rubric/source/validator/tutor/assistance/measurement/schema의
  incompatible change는 case를 stale로 만들고 D0부터 restart한다.
- assignment/timing에 영향을 준 Full-Day policy도 binding한다.
- 필요한 security repair는 명시적으로 invalidate/restart할 수 있다.
- security repair가 incompatible evidence를 조용히 보존하거나 pair하지 못한다.

| 사건 | 최대 상태 |
|---|---|
| gap 탐지 | detected |
| same-session repair success | repair_verified_same_session |
| exact frozen-config D+1 success | d1_reproduced |
| D+7 verified non-same-surface success | d7_transfer_confirmed |
| timed full answer non-recurrence | timed_recurrence_clear |
| later qualifying independent failure | recurred |
| source/validator conflict | blocked |
| basis/configuration change | stale |

---

## 8. System 5 — Verified Transfer Foundry

```ts
type TransferCaseKindV1 =
  | "canonical"
  | "near_miss"
  | "counterexample"
  | "flip_condition"
  | "d7_verified_variant"
  | "timed_integration";

type VariantQualificationV1 = {
  itemRevisionRef: string;
  targetSkillRefs: string[];
  itemFamilyRef: string;
  surfaceDistancePolicyRef: string;
  rightsState: "verified" | "private_only" | "unresolved" | "blocked";
  sourceVersionRef: string;
  answerOrRubricRef: string;
  validatorRefs: string[];
  prePresentationUnseenSnapshotRef: string;
  solutionHidden: boolean;
  assistanceEligible: boolean;
  qualification:
    | "learning_only"
    | "d7_transfer_eligible"
    | "timed_recurrence_eligible"
    | "blocked";
  basisChecksum: string;
};
```

D+7 자격은 current rights/source/version, exact target skill,
non-same-surface item family, answer/rubric/validator, unseen snapshot, hidden
solution, independent attempt와 replay/contamination 0을 모두 요구한다.
Generated item은 기본 `learning_only/unverified`다.

---

## 9. System 6 — Personal Recurring Deduction Projection

Canonical MasteryState는 하나만 유지한다.

```ts
type RecurringDeductionStatusV1 =
  | "insufficient_evidence"
  | "candidate"
  | "repeating"
  | "recovery_watch"
  | "currently_clear"
  | "recurred"
  | "stale";

type RecurringDeductionSignatureV1 = {
  id: string;
  learnerScopeRef: string;
  subjectScope: "practice" | "theory" | "law" | "cross_subject";
  causeCode: GapCauseCodeV1;
  timedState: "timed" | "untimed" | "mixed";
  assistanceState: "independent" | "assisted" | "mixed";
  eligibleOccurrenceRefs: string[];
  counterEvidenceRefs: string[];
  distinctEligibleItemFamilyCount: number;
  status: RecurringDeductionStatusV1;
  nextBestActionRef?: string;
  policyVersion: string;
  basisChecksum: string;
};
```

- one attempt의 파생 gap은 한 번만 기여한다.
- distinct eligible item family 없이는 `repeating`으로 승격하지 않는다.
- assisted/same-surface/unverified attempt는 recurrence 분자에 넣지 않는다.
- counter-evidence를 보존한다.
- raw body를 projection, graph label 또는 analytics에 넣지 않는다.

---

## 10. System 7 — Personal Study Ledger

```text
immutable source
→ confirmed OCR/problem/answer revision
→ commitment and attempt
→ assistance/exposure
→ answer anchors
→ diagnosis
→ repair
→ D+1
→ D+7
→ timed recurrence
→ recurring deduction projection
→ current next action
```

필수:

- reopen/search/resume
- revision history
- stale propagation
- export/delete
- new AI generation과 existing result read 분리
- same revision reopen 재차감/재생성 없음
- refresh, second browser, device recovery
- provider/model change에도 lineage 보존

정당한 switching cost는 데이터 감금이 아니라 accumulated learning lineage다.

---

## 11. System 8 — Evidence-Driven Today / Full-Day

```ts
type DailyCommandDecisionV1 = {
  learnerScopeRef: string;
  studyDateKst: string;
  availableMinutes: number;
  evidenceThroughRef: string;
  coreOutcomeRefs: string[];
  executionBlockRefs: string[];
  deferShortenDropDecisionRefs: string[];
  decisionReasonRefs: string[];
  policyVersion: string;
  basisChecksum: string;
};
```

- `availableMinutes`는 trusted-server integer 30..720이다.
- outside-range/non-integer/malformed는 `REJECT_NO_PLAN`한다.
- CoreOutcome은 0..3이다.
- ExecutionBlock은 available minutes 안의 0..N이다.
- due review는 item count보다 minute budget을 사용한다.
- closure-confirmed gap은 priority가 내려가고 recurrence gap은 올라간다.
- defer/shorten/drop 이유를 설명한다.
- engagement, streak, time-in-app는 priority input이 아니다.
- block completion은 mastery/closure를 바꾸지 않는다.

초기 priority는 설명 가능한 deterministic rule baseline이다. FSRS, OR-Tools,
pyBKT 또는 model이 final priority를 직접 쓰지 못한다.

---

## 12. Trust, Abstention and Escalation

- deterministic validator: 계산·단위·부호·반올림
- source registry: 법령·기준·effective version
- subject rubric: requirement·쟁점·방법·논증
- AI: candidate explanation/diagnosis/next action
- trusted resolver: conflict, release, qualification, evidence effects
- Owner/human: 별도 승인된 adjudication

Learner-facing state:

```text
verified
supported
inference
review_required
conflict
insufficient_evidence
stale
blocked
```

품질은 severe error among released, usable coverage, abstention rate와
resolution latency를 함께 본다. 모든 것을 block해 오류율만 낮추는 것도
실패다.

---

## 13. Golden 3 Complete Verticals

### 13.1 Practice

```text
answer/calculation capture
→ exact calculation-step anchor
→ knowledge vs execution diagnosis
→ deterministic recalculation
→ casio_fx_9860giii routine
→ direct repair
→ frozen-config D+1
→ changed-values sealed D+7
→ timed full-solution recurrence
```

적용 가능한 `casio_fx_9860giii` routine은 다음을 모두 가진다.

1. formula
2. extracted values
3. reset-safe hand-key sequence
4. expected display
5. unit/sign/rounding checks
6. answer-sheet transfer
7. reset 뒤 재현
8. no-program-storage guardrail

완료 evidence:

- deterministic Gold 100%
- intermediate/final value consistency
- unit/sign/rounding conflict release 0
- same-surface contamination 0

### 13.2 Theory

```text
answer capture
→ exact paragraph/outline anchor
→ demand/argument diagnosis
→ direct paragraph repair
→ D+1 blank outline
→ changed-command sealed D+7
→ timed full-answer recurrence
```

단일 model numeric score를 truth로 사용하지 않는다.

### 13.3 Law

```text
answer capture
→ exact application anchor
→ controlling source/effective version
→ fact-to-element diagnosis
→ direct application repair
→ D+1
→ changed-facts sealed D+7
→ timed full-answer recurrence
```

source/effective-version binding 100%, conflict/unknown fail-closed 100%,
unsupported verified release 0을 요구한다.

---

## 14. Synthetic Build and Live Activation Lanes

Synthetic Build Lane 허용:

- author-created synthetic fixtures
- local/disposable database
- mock account
- state machine and UI contract
- deterministic validators
- Golden structure
- source/machine contracts
- hostile tests

금지:

- real learner body
- live private storage/provider
- Supabase mutation
- Preview/Production activation
- payment

Live activation은 current unexpired O3A exact approval, completed exact S236P
acceptance (`acceptanceCompleted=true`, `terminalPass=true`), CPF/privacy/RLS,
exact Owner activation과 exact runtime evidence를 모두 요구한다. 두 completion
boolean은 필요조건일 뿐 충분조건이 아니다. 각 live activation 직전에 downstream은
정확히 하나의 canonical content-addressed S236P completion artifact를 다시 resolve하고,
receipt/assertion-evidence/primary-attestor-provenance sets, verified independent
attestation, exact environment/vault, final O4V approved-packet digest, current O4V
decision receipt·approval·revocation state와 completion time을 모두 recompute해야 한다.
unresolved, ambiguous, duplicate, stale, revoked, digest mismatch, attestation failure,
environment/vault mismatch 또는 recomputation failure는 live activation을 막는다.

S236P blocked, failed, consumed 또는 terminal disposition은 acceptance가 아니다.
후속 #713이 canonical authority를 명시적으로 바꾸기 전까지 이 gate를
조용히 우회하지 않는다.

---

## 15. Dependency-Ordered Implementation Slices

```text
WCV-0 Source Standard
WCV-1 Golden 3 Contracts / Synthetic Fixtures
WCV-2 Capture Revision / Answer Anchor
WCV-3 Diagnosis / Direct Repair
WCV-4 Frozen D+1 / D+7 / Timed Recurrence
WCV-5 Personal Study Ledger
WCV-6 Recurring Deduction Projection
WCV-7 Today / Full-Day
WCV-8 Owner-Private Acceptance
WCV-9 Golden 9 External Readiness / Commercial O4 Entry Gate
WCV-10 S243C Paid Canary
WCV-11 Post-Canary Expansion
```

이 source PR은 위 runtime을 시작하지 않는다. PR #700 merge 뒤 #713이
accelerated Owner model을 current authority에 명시적으로 reconcile할 수 있다.

현재 canonical external path는 별도 authority 전까지 다음을 보존한다.

```text
S241A → O3C → S239A → S242C → O4F → S243C
```

S243C는 paid Wave A 자체이며 O4F까지의 pre-canary path와 exact entry
authorization이 필요하다. S243C completion은 later waves만 gate한다.

---

## 16. World-Class Eval Manifest

```text
development fixture
≠ product quality Gold
≠ learner readiness holdout
≠ external efficacy set
≠ marketing evidence
```

초기 product hypotheses:

| 지표 | 초기 가설 |
|---|---:|
| Capture→trusted anchor/gap/action p50 | ≤5분 |
| world-class target p50 | ≤3분 |
| biggest-gap top-1 agreement | ≥80% |
| deterministic Practice Gold | 100% |
| unsupported Law verified release | 0 |
| severe fail-open | 0 |
| result→direct repair | ≥60% |
| D+1 independent participation | ≥50% |
| D+7 participation | ≥30~40% |
| 4주 same-gap recurrence | baseline 대비 ≥25% 감소 |
| interaction+wait / study time | ≤5% |
| active paid voluntary repurchase | ≥65% |
| qualified “very disappointed” | ≥40% |

North Star:

```text
Verified Recurring-Gap Eliminations
per Active Learner per Effective Study Hour
```

Messages, time-in-app, streak, tokens, generated item count, assisted score와
upload volume은 North Star가 아니다.

---

## 17. Open-Source Qualification Ledger

각 후보는 project, exact version, license, maintenance, security posture,
transitive dependencies, SBOM, data egress, offline/self-host, adopted/rejected
mechanism, exact interface, benchmark, fallback, rollback, uninstallability와
promotion gate를 닫아야 한다.

| Candidate | Current disposition | Allowed role |
|---|---|---|
| OATutor | pattern_reference | step/KC/scaffold pattern |
| Ajv | future_phase_1_candidate | strict structured-output validation |
| decimal.js | future_phase_1_candidate | deterministic decimals/rounding |
| Inspect AI | future_phase_1_candidate | offline Gold/adversarial eval |
| ts-fsrs | deferred_due_candidate | ReviewUnit due only |
| pyBKT | benchmark_only | local synthetic benchmark only |
| H5P Branching | authoring_pattern | contrast-set design |
| OR-Tools | future_optional_adapter | selected-block placement only |
| QTI 3 | compatibility_target | item/test interchange |
| Caliper | vocabulary_target | bodyless event vocabulary |
| W3C PROV | lineage_target | provenance model |
| NIST AI RMF | governance_reference | risk/TEVV/incident process |

pyBKT는 다음 전에는 hidden shadow로 전환하지 않는다.

1. sufficient closed-schema skill-event data
2. exact-scope O2 measurement/consent gate
3. versioned privacy/export/retention contract
4. fixed/rule baseline comparison and rollback

Local synthetic benchmark만으로 shadow를 허용하지 않는다. pyBKT는 canonical
mastery 또는 learner-facing probability authority가 아니다.

이 PR은 dependency를 설치하지 않는다.

---

## 18. UX Contract

First Meaningful Value:

```text
confirmed answer
→ exact anchor
→ one biggest gap
→ one repair action
```

OCR 완료 또는 AI response 도착은 value가 아니다.

첫 화면:

```text
오늘은 이것만 고치면 됩니다.
```

- exact answer location
- biggest deduction cause
- evidence/trust state
- one next action
- next independent check

한 화면의 dominant action은 하나다. 가짜 점수 대신 독립 확인, 회복 중,
안정 후보, 근거 부족과 재발을 표시한다.

---

## 19. Market Proof

결제만으로 PMF를 선언하지 않는다.

```text
exact offer purchase
AND usable review ≥2
AND direct repair
AND D+1 independent attempt
AND voluntary next-pack purchase or explicit decline
```

서로 다른 offer/feature/price/refund cohort를 합산하지 않는다. Owner dogfood와
external commercial evidence를 같은 분자에 넣지 않는다.

---

## 20. 명시적 Non-goals

- 새 active master plan 또는 PR #697 부활
- first-stage/another-exam activation
- public problem archive
- free-form AI chat center
- official grade/pass probability/pass guarantee
- expert marketplace
- streak/leaderboard/large dashboard
- 20-year content build before Golden 3
- adaptive model before rule baseline
- unlimited AI
- private learner/academy/publisher content의 shared bank 또는 training 사용
- raw learner content training with or without consent
- S236P blocked state를 acceptance로 해석
- current commercial gate를 별도 authority 없이 우회
- pyBKT shadow before O2 and sufficient event data

---

## 21. Definition of Done

이 standard의 product intent가 구현됐다고 말하려면:

1. Practice/Theory/Law Golden vertical complete
2. exact anchors usable
3. compact diagnosis and direct repair verified
4. help-before-exposure failure 0
5. frozen-config D+1, sealed D+7 and timed recurrence separated
6. later failure reopens closure
7. GIII routine complete where applicable
8. Personal Study Ledger resumes correctly
9. Today explains max-three priorities inside 30..720 minutes
10. severe fail-open, false evidence and raw leak 0
11. current commercial authority satisfied before external payment
12. paid learner voluntarily repurchases

문서와 CI만으로 위 완료를 주장하지 않는다.
