---
document_title: "답안길 감정평가사 2차 World-Class Vertical Execution Standard v1"
document_subtitle: "정확한 감점 위치·교정·독립 전이·재발 검증·하루 관제"
document_role: "V13 subordinate execution standard; not a new master plan"
status: "proposed_non_authoritative_source_contract"
version: "1.0.2"
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
> 직접 고치게 하고, 다음 날·다른 문제·제한시간 전체 답안에서 같은 감점이
> 다시 나타나는지 확인한 뒤, 그 증거로 오늘의 공부를 다시 지휘하는
> 감정평가사 2차 합격관제 OS다.**

이 문서는 V13을 교체하지 않는다. V13의 Trust, evidence, source/rights,
transfer, Full-Day, privacy 원칙을 감정평가사 2차 learner-facing product로
번역하는 subordinate execution standard다.

이 문서는 어떤 runtime, schema, provider, real content, payment, external
learner 또는 Production 작업도 승인하지 않는다.

---

## 1. 세계급의 정의

세계급은 기능 수, AI 대화량, 생성 답안 길이, dashboard, streak, 단순
결제자 수 또는 guided practice score로 판정하지 않는다.

세계급 판정은 다음 아홉 축을 분리한다.

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

한 준비상태가 다른 준비상태를 자동으로 대신하지 않는다. 문서와 CI만으로
runtime, subject quality, efficacy, price 또는 PMF를 주장하지 않는다.

---

## 2. 최초 핵심 사용자

첫 cohort는 다음에 집중한다.

- 감정평가사 2차 유예생·재시생
- 주 2~3회 이상 답안을 쓰는 learner
- 인간 GS 첨삭을 받아도 같은 실수가 반복되는 learner
- 실무 계산, 법규 포섭, 이론 비교·평가의 반복 감점이 있는 learner
- 오답노트와 D+1 복습이 끊기는 learner

초기 비핵심은 기본강의 미완료자, 답안을 거의 쓰지 않는 learner,
공식 점수·모범답안만 원하는 learner, 자유형 범용 AI chat를 원하는
learner다.

---

## 3. 하나의 완전한 vertical

```text
Capture
→ Confirmed Revision
→ Exact Answer Anchor
→ Successful-Outcome-Qualified Biggest Gap
→ Direct Repair
→ Same-Session Verification
→ D+1 Independent Reconstruction
→ D+7 Verified Non-Same-Surface Transfer
→ Timed Recurrence
→ Recurring Deduction Projection
→ Today / Full-Day Replan
```

어느 단계도 뒤 단계를 추론·alias·outer claim으로 대체하지 않는다.

---

## 4. System 1 — Capture & Answer Evidence Anchor

총평이 아니라 정확한 답안 위치에 diagnosis를 붙인다.

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
- answer/source revision이 바뀌면 anchor와 파생 diagnosis는 stale이다.
- `missing_required_slot`은 검증된 requirement/rubric의 누락만 가리킨다.
- 위치를 확정할 수 없으면 `uncertain`이며 usable biggest gap을 만들지 않는다.
- learner-private locator/body는 vault-local이다.
- raw excerpt를 analytics, logs, shared graph, cross-user cache로 보내지 않는다.

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

## 5. System 2 — Subject-Specific Diagnosis

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

type GapFindingV3 = {
  id: string;
  learnerScopeRef: string;
  attemptRef: string;
  answerAnchorRefs: string[];
  targetConceptRefs: string[];
  causeCode: GapCauseCodeV1;
  supportingEvidenceRefs: string[];
  counterEvidenceRefs: string[];
  severity: "blocking" | "major" | "minor";
  confidence: "low" | "medium" | "high";
  primary: boolean;
  externalReviewState: "not_required" | "candidate" | "required" | "completed";
  policyVersion: string;
  basisChecksum: string;
};
```

biggest gap은 LLM의 자유형 선호가 아니다. Versioned policy가 다음을
bounded input으로 사용한다.

```text
exam impact
× blocking risk
× recurrence
× evidence confidence
× prerequisite importance
× transferability
÷ estimated repair minutes
```

### 5.1 실무

```text
방법 선택
→ 자료 역할·기준시점
→ 산식
→ 변수 대응
→ 계산 순서
→ 숫자 입력
→ 단위·부호·반올림
→ 검산
→ 답안지 전사
```

숫자·단위·부호·반올림·역산은 deterministic validator가 AI보다
우선한다. AI와 deterministic result가 충돌하면 숫자 결과를 release하지
않는다.

### 5.2 이론

```text
요구 동사
→ 목차
→ 개념 정확성
→ 논거 연결
→ 비교축
→ 평가·비판
→ 실무 연결
→ 결론·압축
```

단일 LLM 자유형 숫자점수를 truth로 사용하지 않는다. Dimension evidence,
independent verifier, disagreement state를 보존한다.

### 5.3 법규

```text
쟁점
→ controlling source/effective version
→ 요건·효과
→ 결정적 사실
→ 사실→요건 포섭
→ 반대논거
→ 결론·구제
```

source, effective date, controlling rule 또는 conflict가 닫히지 않으면
verified conclusion이나 usable reference body를 release하지 않는다.

---

## 6. System 3 — Server-Enforced Tutor State Machine

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
intake
→ orient
→ commit
→ attempt
→ diagnose
→ scaffold
→ reconstruct
→ repair
→ verify
→ contrast
→ transfer
→ timed_recurrence
→ schedule
```

### 6.1 Scaffold ladder

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
- client/model은 tutor state, qualification, mastery를 제출하지 못한다.

### 6.2 Learning / Measurement Lane

Learning Lane:

- scaffold, explanation, contrast, repair 허용
- same item 사용 가능
- objective는 이해와 교정

Measurement Lane:

- hint/reference/probe byte 차단
- pre-presentation unseen snapshot
- verified item family
- server timer
- objective는 독립 수행과 transfer

route, cache, prefetch, event, eligibility를 물리적으로 분리한다. UI label만
바꾸는 가짜 lane 분리는 금지한다.

---

## 7. System 4 — Gap Closure Case

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

type GapClosureCaseV1 = {
  id: string;
  learnerScopeRef: string;
  subject: "practice" | "theory" | "law";
  sourceAttemptRef: string;
  answerAnchorRefs: string[];
  gapFindingRef: string;
  repairActionRef: string;
  sameSessionRepairEvidenceRef?: string;
  d1IndependentEvidenceRef?: string;
  d7VerifiedVariantEvidenceRef?: string;
  timedRecurrenceEvidenceRef?: string;
  currentStatus: GapClosureStatusV1;
  policyVersion: string;
  basisChecksum: string;
};
```

| 사건 | 최대 상태 |
|---|---|
| gap 탐지 | detected |
| 같은 세션 direct repair success | repair_verified_same_session |
| D+1 무도움 성공 | d1_reproduced |
| D+7 verified non-same-surface 성공 | d7_transfer_confirmed |
| timed full answer에서 재발 없음 | timed_recurrence_clear |
| 후속 qualifying independent failure | recurred |
| source/validator conflict | blocked |
| basis 변경 | stale |

`감점 원인이 제거됨` 표현은 policy-required evidence가 모두 있을 때만
허용한다. 인과효과 주장은 별도 controlled efficacy study가 필요하다.

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

D+7 자격은 다음을 모두 요구한다.

- current rights/source/version
- exact target skill
- non-same-surface item family
- answer/rubric/validator
- pre-presentation unseen
- solution hidden
- independent attempt
- replay/contamination 0

generated item은 기본 `learning_only/unverified`다.

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
  conditionProfile: {
    timedState: "timed" | "untimed" | "mixed";
    assistanceState: "independent" | "assisted" | "mixed";
    taskFamilyRefs: string[];
    representationRefs: string[];
  };
  eligibleOccurrenceRefs: string[];
  counterEvidenceRefs: string[];
  distinctEligibleItemFamilyCount: number;
  status: RecurringDeductionStatusV1;
  nextBestActionRef?: string;
  policyVersion: string;
  basisChecksum: string;
};
```

- 한 failure를 관련 concept 전체에 복제하지 않는다.
- 같은 attempt의 파생 gap은 한 번만 기여한다.
- 서로 다른 eligible item family가 없으면 `repeating`으로 승격하지 않는다.
- assisted, same-surface, unverified attempt는 recurrence 분자에 넣지 않는다.
- counter-evidence를 보존한다.
- raw body를 projection, graph label, analytics에 넣지 않는다.

---

## 10. System 7 — Personal Study Ledger

```text
immutable source
→ confirmed OCR/problem/answer revision
→ commitment and attempt
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

- reopen
- search
- resume last position
- revision history
- export
- delete
- new AI generation과 existing result read 분리
- same revision reopen은 재차감/재생성 없음
- provider/model change에도 lineage 보존

정당한 switching cost는 데이터 감금이 아니라 accumulated learning lineage다.

---

## 11. System 8 — Evidence-Driven Daily Command

```ts
type DailyCommandDecisionV1 = {
  learnerScopeRef: string;
  studyDateKst: string;
  availableMinutes: number; // trusted-server integer, 30..720
  evidenceThroughRef: string;
  coreOutcomeRefs: string[]; // 0..3
  executionBlockRefs: string[]; // 0..N
  deferShortenDropDecisionRefs: string[];
  decisionReasonRefs: string[];
  policyVersion: string;
  basisChecksum: string;
};
```

입력:

- 가용시간
- 고정 강의·기본서 일정
- due review
- 최근 독립 답안 공백
- 반복 감점
- D+7/timed evidence 부족
- 실무·이론·법규 시험 영향
- 건강·피로·결석·밀림

불변식:

- `availableMinutes`는 trusted server가 **integer 30..720**으로 검증한다.
- 30 미만, 720 초과, non-integer, missing, malformed 값은 plan을 만들지
  않고 `REJECT_NO_PLAN`한다.
- CoreOutcome은 0..3이다.
- ExecutionBlock은 validated available minutes 안의 0..N이다.
- due review는 item count보다 minute budget을 사용한다.
- closure-confirmed gap은 priority가 내려가고 recurrence gap은 올라간다.
- defer/shorten/drop 이유를 설명한다.
- engagement, streak, time-in-app는 priority input이 아니다.
- block completion은 mastery/closure를 바꾸지 않는다.

---

## 12. System 9 — Trust, Abstention, Escalation

역할:

- deterministic validator: 계산·단위·부호·반올림
- source registry: 법령·기준·공식자료·effective version
- subject validator: rubric·쟁점·방법·요구행위
- AI: explanation, hypothesis, comparison, next-action candidate
- release resolver: candidate, critic, conflict, final gate
- human: 별도 승인된 benchmark/escalation

Learner-facing 상태:

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

품질은 다음을 함께 본다.

```text
severe error among released
+ usable coverage
+ abstention rate
+ resolution latency
```

초기 human marketplace는 만들지 않는다. Named expert blind benchmark,
exact owner-authorized quality-review lane, future academy instructor approval만
별도 gate로 허용한다.

---

## 13. Golden 3 — 세 개의 완전한 vertical

### 13.1 실무

```text
수익환원법 답안/계산 업로드
→ 환원이율 입력 step anchor
→ method/formula knowledge와 execution error 분리
→ deterministic recalculate
→ same-session repair
→ D+1 changed-values recall
→ D+7 verified variant
→ timed full solution recurrence
```

완료 evidence:

- supported calculation type
- deterministic Gold 100%
- unit/sign/rounding conflict release 0
- same-surface contamination 0

### 13.2 이론

```text
비교·평가 답안 업로드
→ 논증 연결이 끊긴 paragraph/outline anchor
→ demand verb diagnosis
→ 8분 paragraph repair
→ D+1 blank outline
→ 다른 command의 verified D+7
→ timed full answer recurrence
```

완료 evidence:

- rubric dimensions
- independent second review
- unsupported assertion verified release 0
- exact score보다 dimension evidence 우선

### 13.3 법규

```text
사업인정 답안 업로드
→ 처분성-수용권 연결 누락 anchor
→ controlling source/effective version
→ application paragraph repair
→ D+1 reconstruction
→ changed-facts verified D+7
→ timed full answer recurrence
```

완료 evidence:

- source/effective-version binding 100%
- conflict/unknown fail-closed 100%
- unsupported verified release 0

---

## 14. Synthetic Build Lane / Live Activation Lane

### 14.1 Synthetic Build Lane

허용:

- author-created synthetic fixtures
- local/disposable database
- mock account
- state machine
- UI contract
- deterministic validators
- Golden vertical structure
- source-only/machine contracts
- hostile tests

금지:

- real learner body
- live private storage
- live provider
- Supabase mutation
- Preview activation
- Production
- payment

### 14.2 Live Activation Lane

Live activation은 다음을 모두 요구한다.

- current unexpired O3A exact approval
- **completed exact S236P acceptance**, 즉 current evidence에서
  `acceptanceCompleted=true` 및 `terminalPass=true`
- CPF/privacy/RLS conditions
- exact Owner activation approval
- exact runtime evidence

S236P의 `blocked`, failed, consumed, terminal disposition 또는 generic
replacement proposal은 acceptance가 아니며 live activation의 선행조건을
충족하지 않는다. 이것은 AGENTS.md의 S236A dependency를 약화하지 않는다.

---

## 15. Dependency-Ordered Implementation Slices

```text
WCV-0 Source Standard and Benchmark Matrix
WCV-1 Golden 3 Contracts and Synthetic Fixtures
WCV-2 Capture Revision and Answer Anchor
WCV-3 Subject Diagnosis and Direct Repair
WCV-4 D+1 / D+7 / Timed Recurrence
WCV-5 Personal Study Ledger
WCV-6 Recurring Deduction Projection
WCV-7 Today / Full-Day Daily Command
WCV-8 Owner-Private Integrated Acceptance
WCV-9 Golden 9 External Readiness and Commercial O4 Entry Gate
WCV-10 S243C Paid Canary
WCV-11 Post-Canary Staged Expansion
```

### WCV-0

- 본 source package
- no runtime
- no active pointer
- no roadmap state fabrication

### WCV-1

- 실무·이론·법규 각 1개 완전 story
- author-created synthetic fixture
- closed source/rights placeholder
- no real content

### WCV-2

- immutable original
- editable revision
- exact locator
- stale propagation
- A/B privacy denial

### WCV-3

- top-1 policy
- counter-evidence
- one repair action
- same-session successful-outcome verification
- subject fail-closed

### WCV-4

- independent qualification
- item-family distance
- unseen snapshot
- server timer
- replay/idempotency
- recurrence reopen

### WCV-5

- lineage
- reopen/search/resume
- export/delete
- read/generation entitlement split

### WCV-6

- eligible recurrence
- counter-evidence
- no second mastery oracle

### WCV-7

- availableMinutes integer 30..720
- CoreOutcome≤3
- ExecutionBlock 0..N
- evidence reasons
- recovery/defer/drop

### WCV-8

- authenticated Owner-private only
- three-subject end-to-end
- exact deployment/head
- accessibility and friction
- raw leak 0

Owner dogfood는 external usability, price, payment, refund, support 또는
capacity를 검증하지 않는다.

### WCV-9 — Golden 9 External Readiness and Commercial O4 Entry Gate

먼저 O3C 뒤 S239A에서 Golden 9 external readiness를 완료하고, 그 다음
S242C와 O4F의 별도 exact external-commercial entry gate를 완료한다.
Paid canary는 이 순서를 건너뛸 수 없다.

필수:

- external expert top-1 review
- S239A / Golden 9 external readiness
- S242C completion
- O4F completion
- canonical external-commercial dependency path audit
- exact price/offer/refund/capacity/support manifest
- separately approved exact external-commercial O4 packet
- current commercial-readiness evidence
- current Production acceptance evidence

현재 canonical path는 다음 순서를 보존한다.

```text
S241A
→ O3C
→ S239A
→ S242C
→ O4F
→ S243C
```

Paid-canary 진입 전에 완료되어야 하는 pre-canary path는 다음에서 끝난다.

```text
S241A
→ O3C
→ S239A / Golden 9 external readiness
→ S242C
→ O4F
```

그 뒤에는 `EXACT_AUTHORIZATION_TO_ENTER_S243C`가 있어야 한다. S243C
completion은 S243C 진입 조건이 아니다.

Generic Owner activation, Owner-private acceptance, dogfood, Early Value,
strategy document 또는 generic packet은 exact external-commercial O4와
canonical dependency path를 대신하지 못한다.

### WCV-10 — S243C Paid Canary

S243C는 External Founding Beta Wave A 자체다. WCV-9, O4F까지의 completed
pre-canary path, exact O4 approval, current commercial/Production evidence와
exact authorization to enter S243C가 모두 확인된 뒤 Wave A 3~5명을 허용한다.
S243C completion을 S243C 진입 선행조건으로 요구해서는 안 된다.

- exact offer and entitlement
- support/cost/refund
- false charge 0
- raw leak/cross-account 0
- voluntary next-pack decision

### WCV-11 — Post-Canary Staged Expansion

- 총 10~15명
- 총 20~30명
- second renewal
- quality drift/capacity

S243C completion은 이 post-canary external wave와 acceptance만 gate한다.
각 wave는 별도 exact Owner approval을 요구하며 public self-serve를 자동으로
허용하지 않는다. Owner-private evidence는 어느 external-commercial path도
대체할 수 없다.

---

## 16. World-Class Eval Manifest

Set은 물리적·운영적으로 구분한다.

```text
development fixture
≠ product quality Gold
≠ learner readiness holdout
≠ external efficacy set
≠ marketing evidence
```

초기 product hypothesis:

| 지표 | 초기 gate 가설 |
|---|---:|
| Capture→trusted anchor/gap/action p50 | ≤5분 |
| world-class target p50 | ≤3분 |
| biggest-gap top-1 external agreement | ≥80% |
| deterministic Practice Gold | 100% |
| unsupported Law verified release | 0 |
| severe fail-open | 0 |
| result→direct repair | ≥60% |
| D+1 independent participation | ≥50% |
| D+7 eligible participation | ≥30~40% |
| 4주 same-gap recurrence | baseline 대비 ≥25% 감소 |
| interaction+wait / study time | ≤5% |
| active paid voluntary repurchase | ≥65% 가설 |
| qualified active learner “very disappointed” | ≥40% 가설 |

수치는 marketing claim이 아니라 versioned hypothesis다.

North Star:

```text
Verified Recurring-Gap Eliminations
per Active Learner per Effective Study Hour
```

분자는 distinct recurring gap, D+7 verified non-same-surface independent
success, policy-required timed recurrence, unresolved conflict 0,
replay/same-family duplicate 0을 요구한다.

금지 North Star:

- messages
- time in app
- streak
- token usage
- generated problem count
- assisted score
- upload volume

---

## 17. Open-Source Qualification Ledger

각 후보는 다음 필드를 닫아야 한다.

```text
project
version
license
maintenance
security posture
transitive dependencies
SBOM
data egress
offline/self-host
adopted mechanism
rejected mechanism
exact interface
benchmark
fallback
rollback
uninstallability
promotion gate
```

초기 disposition:

| Candidate | Disposition | Allowed role |
|---|---|---|
| OATutor | pattern_reference | step/KC/scaffold/eval pattern |
| ts-fsrs | future_shadow_candidate | ReviewUnit due candidate only |
| pyBKT | benchmark_shadow_only | hidden comparison only |
| H5P Branching | authoring_pattern | contrast-set design |
| OR-Tools | future_optional_adapter | selected blocks placement only |
| QTI 3 | compatibility_target | item/test interchange |
| Caliper | vocabulary_target | bodyless event vocabulary |
| W3C PROV | lineage_target | provenance model |
| NIST AI RMF | governance_reference | risk/TEVV/incident process |

어떤 외부 도구도 answer, mastery, biggest gap, release 또는 learning priority
authority가 아니다.

---

## 18. UX Contract

First Meaningful Value:

```text
confirmed answer
→ exact anchor
→ one biggest gap
→ one repair action
```

OCR 완료나 AI 응답 도착은 value가 아니다.

첫 화면:

```text
오늘은 이것만 고치면 됩니다.
```

- answer location
- biggest deduction cause
- evidence/trust state
- one next action
- next independent check

한 화면의 dominant action은 하나다.

가짜 점수 대신 다음을 보여준다.

```text
방법 선택: 독립 확인
계산 실행: 회복 중
단위·반올림: 안정
timed full solution: 근거 부족
```

허용 progress는 same-gap recurrence, completion time, blank/partial, D+7
success, unassisted share다.

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

서로 다른 가격, feature manifest, duration, refund policy를 합산하지 않는다.
Owner dogfood와 external commercial evidence를 같은 분자에 넣지 않는다.

---

## 20. 명시적 Non-goals

- 새 active master plan
- PR #697 retarget/merge
- first-stage learner activation
- another exam
- generic exam selector
- public question archive
- free-form AI chat center
- pass probability
- official grade
- expert marketplace
- streak/leaderboard
- large dashboard
- full 20-year content build before Golden 3
- adaptive model before rule baseline
- unlimited AI
- private raw learner content를 model training input으로 사용하는 행위
- exact-purpose consent만으로 raw learner-content training을 허용하는 행위
- consented pseudonymous non-reconstructive signal 또는 promoted Cleared Content Bank material이 아닌 대상을 future training candidate로 사용하는 행위
- S236P blocked state를 acceptance로 해석
- Owner-private evidence로 external commercial gate 대체

---

## 21. Definition of Done

이 표준의 product intent가 구현됐다고 말하려면:

1. 실무 Golden vertical complete
2. 이론 Golden vertical complete
3. 법규 Golden vertical complete
4. exact answer anchors usable
5. direct repair and successful outcome qualification
6. D+1, D+7 and timed recurrence separated
7. later failure reopens closure
8. Personal Study Ledger resumes correctly
9. Today explains max-three priorities within 30..720 minutes
10. severe fail-open and raw leak 0
11. external biggest-gap review
12. exact external-commercial O4 and canonical path
13. paid user voluntarily repurchases

문서와 CI만으로 완료를 주장하지 않는다.
