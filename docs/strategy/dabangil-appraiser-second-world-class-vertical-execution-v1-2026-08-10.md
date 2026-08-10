---
document_title: "답안길 감정평가사 2차 World-Class Vertical Execution Standard v1"
document_subtitle: "정확한 감점 위치·교정·독립 전이·재발 검증·하루 관제"
document_role: "V13 subordinate execution standard; not a new master plan"
status: "proposed_non_authoritative_source_contract"
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

이 문서는 V13을 교체하지 않는다. V13의 기술적 두뇌를 감정평가사 2차의
learner-facing product로 번역하는 실행 표준이다.

## 1. 세계급의 정의

세계급은 다음이 아니다.

- 기능 수
- AI 대화량
- 생성 답안 길이
- 화려한 dashboard
- streak
- 단순 결제자 수
- guided practice score

세계급 판정은 다음 아홉 축으로 분리한다.

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

### 1.1 준비상태

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

어떤 boolean도 다른 boolean을 대신하지 않는다.

## 2. 최초 핵심 사용자

첫 product cohort:

- 감정평가사 2차 유예생·재시생
- 주 2~3회 이상 답안을 쓰는 learner
- 인간 GS 첨삭을 받아도 같은 실수가 반복되는 learner
- 실무 계산, 법규 포섭, 이론 비교·평가의 반복 감점이 있는 learner
- 오답노트와 D+1 복습이 끊기는 learner

초기 비핵심:

- 기본강의도 끝나지 않은 learner
- 답안을 거의 쓰지 않는 learner
- 공식 점수·모범답안만 원하는 learner
- 자유형 범용 AI chat를 원하는 learner

## 3. 한 줄 vertical

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

어느 단계도 뒤 단계를 추론으로 대체하지 않는다.

## 4. System 1 — Capture & Answer Evidence Anchor

### 4.1 목적

총평이 아니라 exact location에 diagnosis를 붙인다.

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

### 4.2 규칙

- immutable source asset과 editable OCR/problem/answer revision을 분리한다.
- answer/source revision 변경 시 anchor는 stale이다.
- `missing_required_slot`은 검증된 requirement/rubric에서 누락된 slot만 가리킨다.
- 위치를 확정할 수 없으면 uncertain이며 usable biggest gap을 만들지 않는다.
- learner-private locator/body는 vault-local이다.
- raw excerpt를 analytics, logs, shared graph, cross-user cache로 보내지 않는다.

### 4.3 UX

```text
답안 위치
7쪽 3번째 문단, 2~3문장

가장 큰 감점 원인
수용권 설정이라는 법적 효과를 처분성 판단에 연결하지 못했습니다.

지금 할 일
해당 문단을 8분 안에 다시 쓰세요.
```

## 5. System 2 — Subject-Specific Diagnosis

### 5.1 공통

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

biggest gap은 LLM의 자유형 선호가 아니다. versioned policy가 다음을 사용한다.

```text
exam impact
× blocking risk
× recurrence
× evidence confidence
× prerequisite importance
× transferability
÷ estimated repair minutes
```

### 5.2 실무

진단 해상도:

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

숫자·단위·부호·반올림·역산은 deterministic validator가 AI보다 우선한다.

### 5.3 이론

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

단일 LLM 자유형 점수를 truth로 사용하지 않는다.

### 5.4 법규

```text
쟁점
→ controlling source/effective version
→ 요건·효과
→ 결정적 사실
→ 사실→요건 포섭
→ 반대논거
→ 결론·구제
```

source, effective date, controlling rule, conflict가 닫히지 않으면
verified conclusion 또는 usable reference body를 release하지 않는다.

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

정상 흐름:

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
- client/model은 state, qualification, mastery를 제출하지 못한다.

### 6.2 Learning / Measurement Lane

Learning Lane:

- scaffold, explanation, contrast, repair 허용
- same item 사용 가능
- objective: 이해와 교정

Measurement Lane:

- hint/reference/probe byte 차단
- pre-presentation unseen snapshot
- verified item family
- server timer
- objective: 독립 수행과 transfer

route, cache, prefetch, event, eligibility를 분리한다.

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

상태 규칙:

| 사건 | 최대 상태 |
|---|---|
| gap 탐지 | detected |
| 같은 세션 direct repair success | repair_verified_same_session |
| D+1 무도움 성공 | d1_reproduced |
| D+7 verified non-same-surface 성공 | d7_transfer_confirmed |
| timed full answer에서 재발 없음 | timed_recurrence_clear |
| 후속 qualifying failure | recurred |
| source/validator conflict | blocked |
| basis 변경 | stale |

`감점 원인이 제거됨` 표현은 policy-required evidence가 모두 있을 때만 허용한다.
인과효과를 주장하려면 별도 controlled efficacy study가 필요하다.

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

D+7 자격:

- rights/source/version current
- exact target skill
- non-same-surface item family
- answer/rubric/validator
- pre-presentation unseen
- hidden solution
- independent attempt
- replay/contamination 0

generated item은 기본 learning-only/unverified다.

## 9. System 6 — Personal Recurring Deduction Projection

canonical MasteryState는 하나만 유지한다.

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
- 같은 attempt 파생 gap은 한 번만 기여한다.
- 서로 다른 eligible item family가 없으면 repeating으로 승격하지 않는다.
- assisted/same-surface/unverified는 recurrence 분자에 넣지 않는다.
- counter-evidence를 보존한다.
- raw body를 projection 또는 analytics에 넣지 않는다.

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

## 11. System 8 — Evidence-Driven Daily Command

```ts
type DailyCommandDecisionV1 = {
  learnerScopeRef: string;
  studyDateKst: string;
  availableMinutes: number;
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

규칙:

- CoreOutcome 0..3
- ExecutionBlock 0..N, available minutes 내
- due review는 item count보다 minute budget
- closure-confirmed gap priority down
- recurrence gap priority up
- 무엇을 defer/shorten/drop했는지 설명
- engagement/streak/time-in-app는 priority input이 아님
- block completion은 mastery/closure 변화 없음

## 12. System 9 — Trust, Abstention, Escalation

### 12.1 역할

- deterministic validator: 계산·단위·부호·반올림
- source registry: 법령·기준·공식자료·effective version
- subject validator: rubric·쟁점·방법·요구행위
- AI: explanation, hypothesis, comparison, next-action candidate
- release resolver: candidate, critic, conflict, final gate
- human: 별도 승인된 benchmark/escalation

### 12.2 상태

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

중대한 오류율만 낮추려고 모든 결과를 block하는 것도 실패다. 함께 본다.

```text
severe error among released
+ usable coverage
+ abstention rate
+ resolution latency
```

### 12.3 인간 escalation

초기 marketplace를 만들지 않는다.

허용 후보:

- named expert blind benchmark
- exact owner-authorized quality review lane
- future academy instructor approval

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
- deterministic gold 100%
- unit/sign/rounding conflict 0
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
- unsupported assertion release 0
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
- real private storage
- live provider
- Supabase mutation
- Preview activation
- Production
- payment

### 14.2 Live Activation Lane

선행:

- current O3A exact approval
- S236P terminal disposition 또는 explicit replacement decision
- CPF/privacy/RLS conditions
- Owner activation approval
- exact runtime evidence

분리를 roadmapping할 때 안전 gate를 우회하지 않는다.

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
WCV-9 External Trust and Paid Canary
WCV-10 Golden 9 and Staged Expansion
```

### WCV-0

- 본 문서 세트
- no runtime
- no active pointer
- no roadmap state fabrication

### WCV-1

- 실무·이론·법규 각 1개 완전 story
- synthetic fixture
- source/rights placeholders are closed and explicit
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
- same-session verification
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

- CoreOutcome≤3
- ExecutionBlock 0..N
- evidence reasons
- recovery/defer/drop

### WCV-8

- authenticated owner
- three-subject end-to-end
- exact deployment/head
- accessibility and friction
- raw leak 0

### WCV-9

- external expert top-1 review
- Wave A 3~5
- exact offer
- support/cost/refund
- voluntary next-pack decision

### WCV-10

- Golden 9
- 10~15 then 20~30
- second renewal
- quality drift/capacity

## 16. World-Class Eval Manifest

### 16.1 분리된 set

```text
development fixture
≠ product quality Gold
≠ learner readiness holdout
≠ external efficacy set
≠ marketing evidence
```

### 16.2 핵심 지표 가설

| 지표 | 초기 gate 가설 |
|---|---:|
| Capture→trusted anchor/gap/action p50 | ≤5분 |
| world-class target p50 | ≤3분 |
| biggest-gap top-1 external agreement | ≥80% |
| deterministic Practice Gold | 100% |
| unsupported Law verified release | 0 |
| severe fail-open | 0 |
| released general severe misfeedback | 극소수, 별도 confidence interval |
| result→direct repair | ≥60% |
| D+1 independent participation | ≥50% |
| D+7 eligible participation | ≥30~40% |
| 4주 same-gap recurrence | baseline 대비 ≥25% 감소 |
| interaction+wait / study time | ≤5% |
| active paid voluntary repurchase | ≥65% 가설 |
| qualified active learner “very disappointed” | ≥40% 가설 |

수치는 marketing claim이 아니라 versioned product hypothesis다.

### 16.3 North Star

```text
Verified Recurring-Gap Eliminations
per Active Learner per Effective Study Hour
```

필수 분자:

- distinct recurring gap
- D+7 verified non-same-surface independent success
- policy-required timed recurrence
- unresolved conflict 0
- replay/same-family duplicate 0

금지 North Star:

- messages
- time in app
- streak
- token usage
- generated problem count
- assisted score
- upload volume

## 17. Open-Source Qualification Ledger

각 후보는 다음을 통과해야 한다.

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

## 18. UX Contract

### 18.1 First Meaningful Value

```text
confirmed answer
→ exact anchor
→ one biggest gap
→ one repair action
```

OCR 완료나 AI 응답 도착은 value가 아니다.

### 18.2 화면

첫 화면:

```text
오늘은 이것만 고치면 됩니다.
```

- answer location
- biggest deduction cause
- evidence/trust state
- one next action
- next independent check

one screen = one dominant action.

### 18.3 Progress

가짜 점수 대신:

```text
방법 선택: 독립 확인
계산 실행: 회복 중
단위·반올림: 안정
timed full solution: 근거 부족
```

보여줄 수 있는 지표:

- same-gap recurrence
- completion time
- blank/partial
- D+7 success
- unassisted share

## 19. Market Proof

결제만으로 PMF를 선언하지 않는다.

qualified product-value event:

```text
exact offer purchase
AND usable review ≥2
AND direct repair
AND D+1 independent attempt
AND voluntary next-pack purchase or explicit decline
```

서로 다른 가격, feature manifest, refund policy를 합산하지 않는다.

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
- raw learner content training by default

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
9. Today explains max-three priorities
10. severe fail-open and raw leak 0
11. external biggest-gap review
12. paid user voluntarily repurchases

문서와 CI만으로 완료를 주장하지 않는다.
