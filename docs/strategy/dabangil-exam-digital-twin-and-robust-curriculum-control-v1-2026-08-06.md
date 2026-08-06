---
document_title: "답안길 Exam Digital Twin & Robust Curriculum Control v1"
document_subtitle: "복수 시험지 세계·학습자 능력 디지털 트윈·강건 학습배분·검증증명형 평가·사전등록 감사를 결합한 V13 필수 명세"
document_role: "V13 mandatory exam-intelligence, learner-capability, assessment-proof and curriculum-control specification"
status: "owner-strategy/non-authoritative"
dated: "2026-08-06 KST"
repository: "chachathecat/inverge"
active_master_plan: "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md"
owner_decision: "docs/decisions/2026-08-06-owner-v13-exam-digital-twin-and-portable-professional-exam-core.md"
machine_contract: "config/dabangil-exam-digital-twin-portable-core-v1.json"
integrates_with:
  - "docs/strategy/dabangil-versioned-exam-scope-evidence-graph-v1-2026-08-06.md"
  - "docs/strategy/dabangil-appraiser-coverage-compiler-and-original-question-engine-v1-2026-08-06.md"
  - "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v12-2026-08-06.md"
  - "docs/strategy/dabangil-professional-exam-reasoning-os-master-plan-v8-2026-08-05.md"
  - "docs/strategy/dabangil-adaptive-understanding-progression-recovery-master-plan-v9-2026-08-05.md"
current_learner_facing_scope: "Dabangil Appraiser Second three subjects only"
runtime_authorization: "none"
schema_authorization: "none"
dependency_authorization: "none"
real_content_authorization: "none"
production_authorization: "none"
execution_rule: "This specification defines future contracts and source-only acceptance. It authorizes no runtime, dependency, real-source processing, learner activation, Ready transition or merge."
---

# 답안길 Exam Digital Twin & Robust Curriculum Control v1

## 하나의 적중목록 대신 복수 시험세계와 실제 수행증거를 통제하는 시스템

---

## 0. 역할

이 명세는 V13의 다음 다섯 하위시스템을 기계적으로 구현 가능한 수준으로
고정한다.

```text
Exam Intelligence & World Twin
Learner Capability Twin
Robust Curriculum Controller
Proof-Carrying Assessment Foundry
Calibrated Scoring & Pre-registered Audit
```

VESG가 truth를 제공하고, 이 명세는 그 truth로 무엇을 시뮬레이션하고 어떻게
학습시간을 배분하며 무엇을 evidence로 인정할지 정한다.

```text
VESG truth
→ reviewed paper worlds
→ learner capability state
→ native robust allocation
→ proof-carrying assessments
→ scoring disagreement and audit
```

이 명세는 공식범위·현재정답·권리판단을 소유하지 않는다.

---

# 1. Decision-axis separation

## 1.1 Four independent values

```ts
type CorpusPriorityV1 = {
  scopeNodeId: string;
  graphSnapshotId: string;
  score: number;
  tier: "A" | "B" | "C" | "D";
  features: {
    regimeAdjustedFrequency: number;
    markOrOptionExposure: number;
    recency: number;
    graphCentrality: number;
    officialEmphasis: number;
    changeRisk: number;
    reviewedTransformability: number;
  };
  meaning: "learning_corpus_priority_not_exam_probability";
};

type BlueprintDemandV1 = {
  scenarioId: string;
  scopeNodeId: string;
  role:
    | "required"
    | "supporting"
    | "integrated"
    | "rotation"
    | "tail_defense";
  markBand?: string;
  slotIds: string[];
  rationaleRefs: string[];
};

type LearnerNeedV1 = {
  learnerPrivateScopeId: string;
  scopeNodeId: string;
  deficitCodes: LearnerErrorCodeV1[];
  forgettingRisk: number;
  transferDeficit: number;
  timeDeficit: number;
  uncertainty: "low" | "medium" | "high";
  evidenceRefs: string[];
};

type AllocationUtilityV1 = {
  candidateId: string;
  corpusPriorityRef: string;
  blueprintDemandRefs: string[];
  learnerNeedRef: string;
  estimatedMinutes: number;
  nativePolicyScore: number;
  explanation: string[];
  hardConstraintRefs: string[];
};
```

## 1.2 Forbidden collapsing

다음 구현은 금지한다.

```text
priorityScore field 하나에 official scope, expert opinion, learner need를 혼합
frequency를 probability로 명명
low score를 outside scope로 처리
expert signal로 current answer 변경
allocation rank로 합격확률 생성
```

---

# 2. Exam intelligence signal registry

## 2.1 Signal contract

```ts
type ExamIntelligenceSignalKindV1 =
  | "OFFICIAL_OBSERVATION"
  | "REVIEWED_CORPUS_INFERENCE"
  | "REVIEWED_EXPERT_PRIOR"
  | "PUBLIC_ACADEMY_METADATA"
  | "PRIVATE_UNVERIFIED"
  | "SUSPICIOUS_NONPUBLIC_CURRENT_EXAM";

type ExamIntelligenceSignalV1 = {
  signalId: string;
  kind: ExamIntelligenceSignalKindV1;
  profileId: string;
  targetExamId: string;
  scopeNodeIds: string[];
  archetypeIds: string[];
  independentOriginId: string;
  observedOrSubmittedAt: string;
  frozenAt?: string;
  confidence: "low" | "medium" | "high";
  rationale: string[];
  supportingEvidenceRefs: string[];
  disconfirmingEvidenceRefs: string[];
  answerAuthority: 0;
  officialScopeAuthority: 0 | 5;
  learnerVisibility:
    | "official_fact"
    | "reviewed_inference"
    | "quarantined"
    | "not_visible";
  reviewStatus:
    | "candidate"
    | "reviewed"
    | "conflict"
    | "quarantined"
    | "frozen"
    | "evaluated";
};
```

`officialScopeAuthority=5`는 official source가 직접 말한 `OFFICIAL_OBSERVATION`
일 때만 가능하다. 나머지는 0이다.

## 2.2 Expert prior

전문가 판단은 다음을 요구한다.

- 다른 전문가의 판단을 보기 전 독립 제출
- 근거와 반대근거
- 예상 역할과 배점 band
- `independentOriginId`
- 이해충돌 상태
- 시험 전 freeze
- 시험 후 calibration
- 명성만으로 자동 weight 부여 금지

초기에는 expert signal이 official-scope floor 또는 current answer를 바꾸지 않고
depth allocation의 bounded soft feature로만 사용된다.

## 2.3 Public academy signal

허용:

- 공개 강의계획
- 공개 커리큘럼 단계
- 무료 공개 설명의 일반 논점 metadata
- 공개 훈련형식과 일정
- 시험 전에 고정된 공개 예상목차 metadata

금지:

- 유료 GS 원문·해설
- 회원전용 예상문제
- 비공개 단톡방
- 교재·강의자료 full text
- 여러 공개조각을 합쳐 유료자료 복원
- 출처불명 현행시험 정보

공개 학원 signal도 `answerAuthority=0`, `officialScopeAuthority=0`이다.

## 2.4 Same-origin control

다음은 하나의 origin으로 계산한다.

- 동일 학원 자료를 인용한 복수 강사
- 동일 논문·설명회를 재인용한 복수 게시물
- 하나의 원자료에서 파생된 요약
- model이 같은 source를 반복 paraphrase한 결과

중복 제거 전에는 consensus로 표시하지 않는다.

## 2.5 Quarantine

`SUSPICIOUS_NONPUBLIC_CURRENT_EXAM`의 허용 operation:

```text
store raw body = 0
shared signal promotion = 0
world construction = 0
generator input = 0
learner display = 0
manual incident metadata only
```

---

# 3. Exam World Twin

## 3.1 World contract

```ts
type ExamWorldScenarioV1 = {
  scenarioId: string;
  profileId: string;
  targetExamId: string;
  subjectId: string;
  graphSnapshotId: string;
  normSnapshotId: string;
  rightsSnapshotId: string;

  blueprintId: string;
  scenarioClass:
    | "RECURRENT_CENTRAL"
    | "OFFICIAL_UNOBSERVED_ROTATION"
    | "CURRENT_CHANGE_WATCH"
    | "INTEGRATED_MULTI_ISSUE"
    | "REPRESENTATION_COMMAND_SHIFT"
    | "DATA_VOLUME_TIME_PRESSURE"
    | "LEARNER_HOSTILE_PLAUSIBLE";

  requiredNodeIds: string[];
  supportingNodeIds: string[];
  rotationNodeIds: string[];
  officialUnobservedNodeIds: string[];

  commandProfile: string[];
  integrationBreadth: number;
  noveltyBudget: number;
  timePressureProfile: string;

  constructionEvidenceRefs: string[];
  signalRefs: string[];
  reviewDecisions: string[];
  frozenAt?: string;
  status:
    | "candidate"
    | "source_checked"
    | "subject_reviewed"
    | "frozen"
    | "evaluated"
    | "held";
};
```

## 3.2 Blueprint contract

```ts
type PaperBlueprintV1 = {
  blueprintId: string;
  profileId: string;
  targetExamId: string;
  stageId: string;
  subjectId: string;

  totalMarks: number;
  timeLimitMinutes: number;
  questionSlots: QuestionSlotV1[];

  minimumOfficialCoverage: string[];
  maximumDuplicateExposure: number;
  integrationPolicy: string;
  noveltyPolicy: string;
  timePressurePolicy: string;

  sourceRefs: string[];
  reviewRefs: string[];
  frozenAt?: string;
};

type QuestionSlotV1 = {
  slotId: string;
  marks: number;
  estimatedMinutes: number;
  responseModality:
    | "selected_response"
    | "numeric_or_table"
    | "constructed_short"
    | "constructed_extended"
    | "case_analysis";
  allowedArchetypeIds: string[];
  requiredCommandIds: string[];
  integrationRange: [number, number];
  requiredProofPolicyId: string;
};
```

## 3.3 World validity

```text
sum(slot marks) = total marks
slot time feasible under exam time
all node IDs resolve in exact graph snapshot
all current answers resolve in exact norm snapshot
official-unobserved node is inside official scope
rights state permits the intended use
all signals have provenance and no quarantined input
subject reviewer accepts question grammar
```

하나라도 실패하면 world는 `held`다.

## 3.4 Scenario ensemble

canonical output은 하나의 world가 아니라 다음이다.

```ts
type ExamWorldEnsembleV1 = {
  ensembleId: string;
  targetExamId: string;
  scenarioIds: string[];
  diversityChecks: string[];
  uncoveredOfficialNodeIds: string[];
  scenarioWeightsForInternalSensitivityOnly?: number[];
  probabilityInterpretationAllowed: false;
  frozenAt: string;
};
```

weight는 internal sensitivity analysis에만 사용할 수 있고 출제확률로 해석하거나
learner에게 표시하지 않는다.

---

# 4. Learner Capability Twin

## 4.1 State vector

```ts
type LearnerCapabilityStateV1 = {
  capabilityStateId: string;
  learnerPrivateScopeId: string;
  profileId: string;
  scopeNodeId: string;

  knowledgeAccuracy: number | null;
  retrievalStrength: number | null;
  methodSelection: number | null;
  executionAccuracy: number | null;
  explanationCompleteness: number | null;
  verificationDiscipline: number | null;
  speedAdequacy: number | null;
  transferDistance: number | null;
  delayedRecovery: number | null;
  confidenceCalibration: number | null;

  evidenceRefs: string[];
  assistanceRefs: string[];
  exposureRefs: string[];
  lastIndependentEvidenceAt?: string;
  uncertainty: "low" | "medium" | "high";
  status: "insufficient_evidence" | "candidate" | "stable" | "held";
};
```

`null`은 0이 아니다. 관측되지 않은 축을 임의로 추정하지 않는다.

## 4.2 Error code

```ts
type LearnerErrorCodeV1 =
  | "KNOWLEDGE_GAP"
  | "RETRIEVAL_FAILURE"
  | "METHOD_SELECTION_ERROR"
  | "PROCEDURE_ORDER_ERROR"
  | "CALCULATION_ERROR"
  | "NORM_VERSION_ERROR"
  | "REPRESENTATION_ERROR"
  | "ANSWER_EXPRESSION_ERROR"
  | "TIME_ALLOCATION_FAILURE"
  | "VERIFICATION_FAILURE"
  | "TRANSFER_FAILURE";
```

각 error event는 다음을 갖는다.

```text
evidence locator
assistance/exposure state
decisive failing step
severity
repair prescription
next independent gate
D+1/D+7 schedule
```

## 4.3 Evidence admission

독립 evidence 요구:

- assessment가 exact profile/graph/norm/proof bundle에 binding
- learner response가 help 전에 제출
- assistance/exposure가 append-only
- answer reveal 뒤의 수정은 separate assisted evidence
- scoring conflict 없음 또는 held
- profile-specific threshold
- same representation 재사용 아님
- stable 후보는 D+7 unseen transfer
- timed integration은 prerequisite clearance 후

## 4.4 Confidence calibration

다음을 함께 저장한다.

```text
learner confidence before reveal
actual result interval
overconfidence/underconfidence bucket
whether confidence changed after help
```

confidence는 정답이나 mastery를 대체하지 않는다.

---

# 5. Robust Curriculum Controller

## 5.1 Inputs

```ts
type RobustCurriculumInputV1 = {
  profileId: string;
  targetExamId: string;
  studyDateKst: string;
  minutesAvailable: number;

  officialFloorCandidateIds: string[];
  reviewedWorldIds: string[];
  learnerNeedIds: string[];
  forgettingRiskIds: string[];
  fixedReviewIds: string[];
  timedIntegrationIds: string[];

  nativePolicyVersion: string;
  graphSnapshotId: string;
  normSnapshotId: string;
};
```

raw body, title, filename, question text, learner free text 또는 private content hash는
optimizer projection 대상이 아니다.

## 5.2 Hard constraints

```text
official floor
prerequisite order
currentness
rights
available minutes
fixed/immutable blocks
D+1/D+7 due items
subject balance
maximum three primary outcomes
time windows
hard deadline
non-overlap
profile isolation
```

## 5.3 Soft objectives

```text
reduce prerequisite blockage
reduce severe learner deficit
reduce forgetting risk
increase far-transfer coverage
increase reviewed-world coverage
reduce time deficit
reduce schedule churn
preserve subject balance
reduce maximum scenario regret
```

soft objective가 hard constraint를 override하지 않는다.

## 5.4 Maximin and regret

내부 비교식:

```text
WorstCaseCoverage(plan)
= min over reviewed worlds of defensible capability-weighted mark-role coverage

MaxRegret(plan)
= max over reviewed worlds of
  [best feasible hindsight coverage for that world - plan coverage]
```

이 값은 official score, pass probability 또는 predicted mark가 아니다.

## 5.5 Native-first and shadow

```text
native plan
frequency baseline
recent-window baseline
VESG-priority plan
maximin shadow candidate
minimax-regret shadow candidate
```

초기에는 비교만 한다. shadow result는 Today, Queue, mastery 또는 product state를
변경하지 않는다.

## 5.6 Infeasibility

필수 official floor와 남은 시간이 양립하지 않으면:

```text
silent floor reduction = prohibited
fabricated feasible plan = prohibited
manual conflict report = required
smallest conflicting constraint set = preferred
native safe partial plan = separately validated
```

Z3 같은 도구는 향후 isolated shadow에서 satisfiability와 conflict explanation만
보조할 수 있다. current Full-Day authority를 대체하지 않는다.

---

# 6. Macro curriculum assembly

## 6.1 Phase model

```ts
type CurriculumPhaseV1 =
  | "P0_DIAGNOSIS"
  | "P1_OFFICIAL_FOUNDATION"
  | "P2_FAMILY_UNIT_PRACTICE"
  | "P3_MIXED_TRANSFER"
  | "P4_FULL_PAPER_GS"
  | "P5_FINAL_COMPRESSION";
```

## 6.2 Phase gates

### P0 → P1

- initial profile diagnostic
- prerequisite unknown map
- speed and confidence baseline
- no official scope omission

### P1 → P2

- active foundation explanation gate
- minimum single-skill application
- currentness unknown 0 for assigned nodes

### P2 → P3

- family-level independent application
- recurring misconception repair
- method-selection evidence

### P3 → P4

- mixed near/far transfer
- prerequisite and representation shift
- no unresolved blocker

### P4 → P5

- full-paper timed attempts
- scoring council agreement/holds processed
- time allocation postmortem

### P5

- no uncontrolled scope expansion
- currentness/watch closure
- repeated misconception
- timing/verification
- rotation and tail defense
- recovery

## 6.3 Daily output

```ts
type NativeDailyPlanV1 = {
  coreOutcomes: Array<{
    outcomeId: string;
    candidateId: string;
    reasonCodes: string[];
    requiredEvidenceGateId: string;
    estimatedMinutes: number;
  }>;
  maximumCoreOutcomes: 3;
  executionBlocks: unknown[];
  deferredCandidateIds: string[];
  conflictReport?: string[];
};
```

---

# 7. Proof-Carrying Assessment Foundry

## 7.1 Bundle contract

```ts
type QuestionProofBundleV1 = {
  proofBundleId: string;
  profileId: string;
  questionId: string;

  graphSnapshotId: string;
  normSnapshotId: string;
  rightsManifestId: string;
  blueprintSlotId?: string;

  targetNodeIds: string[];
  prerequisiteNodeIds: string[];
  misconceptionCodes: string[];

  proofPolicyId: string;
  deterministicSolutionRef?: string;
  rubricRef?: string;
  acceptedAnswerVariantRefs: string[];

  unitPolicyRef?: string;
  roundingPolicyRef?: string;
  intermediateInvariantRefs: string[];
  metamorphicRelationRefs: string[];
  counterexampleRefs: string[];
  adversarialMutationRefs: string[];

  sourceSimilarityFingerprintRef: string;
  generatorVersion: string;
  solverVersion?: string;
  validatorVersions: string[];
  randomSeed?: string;

  reviewerDecisionRefs: string[];
  releaseStatus:
    | "candidate"
    | "solver_checked"
    | "subject_reviewed"
    | "proved"
    | "held"
    | "released";
};
```

## 7.2 Proof policy types

```ts
type ProofPolicyKindV1 =
  | "EXACT_NUMERIC"
  | "RELATIONAL_SELECTED_RESPONSE"
  | "STRUCTURED_RUBRIC"
  | "CURRENT_NORM_CASE_ANALYSIS"
  | "MIXED";
```

### EXACT_NUMERIC

- exact or declared precision
- dimensions/unit
- rounding location
- intermediate invariant
- alternate computation
- boundary cases

### RELATIONAL_SELECTED_RESPONSE

- one accepted option
- every distractor falsity/defect
- no overlap
- target-date truth
- wording sufficiency

### STRUCTURED_RUBRIC

- command coverage
- must-have and optional elements
- alternative organization
- contradiction checks
- mark band
- uncertainty

### CURRENT_NORM_CASE_ANALYSIS

- source/effective date
- issue set
- decisive facts
- alternative fact branch
- remedy/action form
- historical/current separation

## 7.3 Metamorphic examples

### Practice

- irrelevant row permutation does not change result
- equivalent unit conversion preserves value
- common scaling preserves allocation share where mathematically valid
- one decisive condition mutation changes only expected branch
- rounding before declared stage is rejected

### Theory

- command changes from explain to compare require both sides
- removing practical linkage fails an application rubric
- swapping comparison order preserves balanced coverage
- criticism without basis fails

### Law

- party or procedure-stage mutation re-evaluates standing/remedy
- future norm cannot apply early
- renumbering without substantive change preserves rule but changes locator
- decisive fact mutation changes conclusion where doctrine requires

### First Stage

- option order permutation preserves keyed proposition
- irrelevant numeric formatting does not change answer
- changed assumption triggers re-solve
- distractor remains independently false

## 7.4 Rights proof

proof bundle은 저작권 허가를 만드는 문서가 아니다. 다음을 연결한다.

```text
input allowlist
source class
rights manifest
non-reconstruction checks
distinctive-expression review
release reviewer
```

rights unknown이면 `held`.

---

# 8. Full GS Digital Twin

## 8.1 Assembly

```ts
type FrozenExamPacketV1 = {
  packetId: string;
  profileId: string;
  targetExamId: string;
  worldId: string;
  blueprintId: string;
  questionIds: string[];
  proofBundleIds: string[];
  scoringPolicyId: string;
  totalMarks: number;
  timeLimitMinutes: number;
  packetDigest: string;
  frozenAt: string;
};
```

## 8.2 Attempt integrity

- packet freeze 후 문항/정답/rubric 변경 금지
- hint를 보면 assistance event 기록
- pause/resume policy 고정
- answer reveal 전 제출시간 고정
- timeout·미완성도 evidence
- same packet 재시도는 unseen transfer가 아님
- full-paper result와 unit practice를 구분

## 8.3 Postmortem

```text
what was unknown
what was known but not retrieved
wrong method choice
execution/procedure failure
expression omission
verification omission
time allocation
question ordering
unattempted marks
assistance/exposure
next repair and delayed gate
```

---

# 9. Calibrated Scoring Council

## 9.1 Components

```ts
type ScoringComponentKindV1 =
  | "DETERMINISTIC_CHECKER"
  | "RUBRIC_SCORER"
  | "ADVERSARIAL_REVIEWER"
  | "ALTERNATIVE_ANSWER_REVIEWER"
  | "HUMAN_ANCHOR";
```

## 9.2 Decision

```ts
type ScoringDecisionV1 = {
  scoringDecisionId: string;
  profileId: string;
  attemptId: string;
  scoringPolicyId: string;
  componentResultRefs: string[];

  scoreInterval: [number, number] | null;
  deterministicFindings: string[];
  rubricFindings: string[];
  agreementScore: number | null;
  unresolvedDisagreements: string[];
  confidence: "low" | "medium" | "high";
  humanReviewRequired: boolean;

  masteryEligible: boolean;
  status: "candidate" | "agreed" | "held" | "reviewed";
};
```

## 9.3 Hold triggers

- deterministic answer and reference conflict
- current norm conflict
- missing critical rubric issue
- multiple acceptable answer unmodeled
- score spread above threshold
- grader prompt injection or unsupported citation
- missing proof bundle
- rights/currentness hold

`held` 점수는 mastery·scheduler deficit severity의 확정근거로 사용하지 않는다.

---

# 10. Pre-registration and post-exam audit

## 10.1 Freeze manifest

```ts
type PreExamFreezeManifestV1 = {
  manifestId: string;
  profileId: string;
  targetExamId: string;
  graphSnapshotId: string;
  normSnapshotId: string;
  corpusPrioritySnapshotId: string;
  worldEnsembleId: string;
  signalSnapshotIds: string[];
  curriculumPolicyId: string;
  gsPacketIds: string[];
  scoringPolicyId: string;
  denominator: {
    worlds: number;
    nodes: number;
    plannedMinutes: number;
    gsQuestions: number;
    signals: number;
  };
  digest: string;
  frozenAt: string;
};
```

## 10.2 Hit classification

```ts
type PostExamMatchLevelV1 =
  | "DOMAIN"
  | "ISSUE"
  | "TASK"
  | "COMBINATION"
  | "MARK_ROLE"
  | "TRANSFER_DEFENSE";
```

각 claim은 exact actual unit, frozen predicted unit, match rule과 independent review를
가진다.

## 10.3 No hindsight rewrite

금지:

- 시험 후 scope node 확장
- broad topic match를 exact task hit로 승격
- 사전자료가 없던 예상문제를 기억으로 추가
- 예상 총량 숨김
- failed worlds 삭제
- 실제 시험을 training에 넣고 같은 연도를 test로 보고

## 10.4 Evaluation

### First Stage

- A/B node next-year question/option coverage
- exact error-point coverage
- official-unobserved defense
- missed questions at equal study budget
- stale answer defects

### Second Stage

- actual mark-role coverage
- one-hop new subquestion defense
- command/task miss
- stale norm defect
- missed marks under scope compression
- timed completion

### Curriculum

- gain per hour
- D+7 transfer
- worst-world coverage
- maximum regret
- false-positive study hours
- subject imbalance

---

# 11. Instructional N-of-1 lane

## 11.1 Purpose

어떤 학습법이 해당 learner에게 더 잘 남는지 비교할 수 있다.

예:

```text
retrieval-first vs worked-example-first
contrastive examples vs isolated examples
step reconstruction vs full re-solve
outline-first vs full-answer-first
```

## 11.2 Admission

- comparable node pairs
- pre-registered intervention
- no raw source sharing
- delayed outcome
- assistance recorded
- no high-stakes automatic policy mutation
- shadow first
- human-reviewed policy version

## 11.3 Outcomes

```text
D+1 independent retrieval
D+7 far transfer
time cost
hint dependence
confidence calibration
timed completion
```

당일 만족도나 즉시 정답만으로 policy를 승격하지 않는다.

---

# 12. Artifact provenance

## 12.1 Lightweight PROV mapping

```text
Entity:
  source snapshot, graph snapshot, world, assessment, proof bundle, score, audit

Activity:
  extraction, mapping, generation, solving, review, scoring, freezing, evaluation

Agent:
  official issuer, Owner, subject reviewer, generator, validator, scoring reviewer
```

## 12.2 Contract

```ts
type ArtifactProvenanceV1 = {
  artifactId: string;
  artifactType: string;
  contentDigest: string;

  generatedByActivityId: string;
  derivedFromArtifactIds: string[];
  associatedAgentIds: string[];

  profileId: string;
  graphSnapshotId?: string;
  normSnapshotId?: string;
  rightsManifestId?: string;

  createdAt: string;
  supersedesArtifactId?: string;
  status: "active" | "held" | "superseded" | "retired";
};
```

## 12.3 Drift propagation

```text
changed norm
→ affected VESG nodes
→ worlds
→ assessments/proof bundles
→ GS packets
→ scoring references
→ learner evidence eligibility
→ hold/revalidate
```

historical attempt 사실은 삭제하지 않되 current applicability를 hold할 수 있다.

---

# 13. OSS validation adapters

## 13.1 Tier A candidates

### Ajv

Proposed role:

- strict JSON Schema/JTD validation
- closed enum
- required fields
- unknown-field rejection
- standalone validator candidate

Boundary:

- metadata/contract only
- no authority
- no dependency authorized by this document

### Graphology

Proposed role:

- orphan node
- prerequisite cycle
- source/norm reachability
- bridge/transfer gap
- disconnected misconception
- concentration diagnostics

Centrality is one feature only.

### decimal.js

Proposed role:

- exact decimal reference
- configurable precision
- declared rounding mode
- display vs internal precision separation

It cannot decide the legally or professionally correct formula.

### fast-check

Proposed role:

- property-based input generation
- shrinking counterexamples
- model/state checks
- metamorphic adversarial cases

Generated fixtures must be author-created or rights-cleared.

## 13.2 Tier B candidates

### DuckDB

Proposed isolated role:

- immutable metadata snapshot analysis
- exam-year grouped queries
- baseline comparison
- Parquet/CSV synthetic audit

Prohibited:

- user raw source
- OCR/body
- source-bound output
- Production analytics sink

### Z3

Proposed isolated role:

- constraint satisfiability
- paper mark/time composition
- hard-floor feasibility
- minimal conflict explanation candidate

It cannot select `CoreOutcome` or become official answer/mastery authority.

### Inspect AI

Proposed isolated role:

- synthetic generator/grader regression
- multi-grader agreement
- prompt/model version comparison
- adversarial answer evaluation

Logs must be explicitly minimized. Real learner/source data is prohibited absent later
exact authority, and this V13 grants none.

## 13.3 Common lifecycle contract

```ts
type OSSAdapterCandidateV1 = {
  adapterId: string;
  role: string;
  lifecycle:
    | "proposed"
    | "benchmark_only"
    | "shadow"
    | "limited_activation"
    | "active"
    | "rollback";
  exactVersion?: string;
  licenseVerifiedAt?: string;
  sbomRef?: string;
  isolationPolicyRef?: string;
  inputSchemaRef?: string;
  outputSchemaRef?: string;
  fallbackRef?: string;
  rollbackRef?: string;
  rawUserSourceAllowed: false;
  productDecisionAuthority: false;
};
```

---

# 14. Hard gates

```text
signal_without_provenance = 0
same_origin_signal_double_count = 0
quarantined_signal_used = 0
signal_changed_current_answer = 0

world_without_blueprint = 0
world_marks_or_time_invalid = 0
world_outside_official_scope = 0
world_without_target_norm = 0
world_weight_presented_as_probability = 0

capability_without_evidence = 0
single_scalar_mastery = 0
assisted_evidence_mislabeled_independent = 0
same_representation_counted_far_transfer = 0

native_authority_bypassed = 0
optimizer_selects_core_outcome = 0
official_floor_omitted = 0
today_primary_task_count_over_three = 0
silent_hard_constraint_relaxation = 0

assessment_without_proof_bundle = 0
assessment_without_profile_proof_policy = 0
numeric_unit_or_rounding_ambiguity = 0
rubric_critical_omission = 0
current_norm_conflict = 0
rights_unknown_release = 0

score_disagreement_hidden = 0
held_score_advances_mastery = 0
official_grading_label = 0

future_data_leakage = 0
same_exam_year_split_leakage = 0
post_exam_backfill = 0
hit_claim_without_denominator = 0

oss_raw_user_source_seen = 0
oss_persistent_raw_log = 0
oss_unpinned_benchmark = 0
oss_product_decision_authority = 0
```

---

# 15. Source-only implementation sequence

```text
EDT-0
- contracts, enums, fixtures, validation
- no dependency

EDT-1
- native graph audit
- optional Graphology candidate evaluation later

EDT-2
- one Practice exact-numeric proof policy
- native decimal reference first
- decimal.js/fast-check benchmark only after separate authority

EDT-3
- paper twin metadata for Practice 2013-2026

EDT-4
- native robust-policy comparison in shadow
- no Today mutation
- optional Z3 feasibility benchmark later

EDT-5
- full synthetic GS packet and scoring council

EDT-6
- DuckDB/Z3/Inspect isolated synthetic lab
- pinned versions, SBOM, no raw logs

EDT-7
- read adapters only after exact authorization
```

V13 PR은 EDT-0 implementation도 승인하지 않는다. 위 순서는 미래 Work
decomposition이다.

---

# 16. Definition of Done

## Contract DoD

- all types have closed fields/enums
- authority ceilings explicit
- profile IDs mandatory
- graph/norm/rights bindings mandatory
- exact freeze and audit denominator
- Today ≤3 preserved
- native authority preserved
- no probability/pass claims
- no raw-source OSS path
- strict JSON parse
- hostile static review

## Runtime DoD — later only

- exact profile authority
- rights-cleared synthetic fixtures
- proof-policy correctness
- world mark/time validity
- scoring disagreement calibration
- grouped walk-forward evidence
- fallback/rollback
- no raw residue
- separate Owner activation

---

# 17. Final contract

> **답안길 Exam Digital Twin은 다음 시험문제를 하나로 맞히지 않는다. 공식범위와
> 목표시험일 규범 안에서 복수의 시험지 세계를 만들고, 학습자의 지식·회상·
> 선택·실행·표현·검산·속도·전이·회복을 분리해 관측하며, 공식범위 최소선을
> 지킨 상태에서 불리한 세계의 붕괴를 줄인다. 모든 생성평가는 profile-specific
> proof bundle과 독립검토를 갖고, 모든 시험정보 판단은 시험 전에 동결되어
> 시험 후 분모와 실패까지 감사된다.**
