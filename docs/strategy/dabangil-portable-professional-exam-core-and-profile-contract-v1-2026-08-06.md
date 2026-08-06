---
document_title: "답안길 Portable Professional Exam Core & Exam Profile Contract v1"
document_subtitle: "감정평가사에서 검증한 근거·학습·평가·감사 코어를 재사용하되 시험별 권위·콘텐츠·검증·활성화를 완전히 분리하는 내부 확장 명세"
document_role: "V13 mandatory internal portability and exam-profile admission specification"
status: "owner-strategy/non-authoritative"
dated: "2026-08-06 KST"
repository: "chachathecat/inverge"
active_master_plan: "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md"
owner_decision: "docs/decisions/2026-08-06-owner-v13-exam-digital-twin-and-portable-professional-exam-core.md"
machine_contract: "config/dabangil-exam-digital-twin-portable-core-v1.json"
current_real_profile: "appraiser_kr"
current_learner_facing_scope: "appraiser_kr second stage three subjects only"
other_real_profile_authorization: "none"
generic_multi_exam_surface_authorization: "none"
runtime_authorization: "none"
schema_authorization: "none"
dependency_authorization: "none"
production_authorization: "none"
execution_rule: "This contract defines internal interfaces and admission gates only. It authorizes no other exam profile, generic learner surface, runtime, schema, dependency, real-source processing, Ready transition or merge."
---

# 답안길 Portable Professional Exam Core & Exam Profile Contract v1

## 공통 코어는 재사용하고 시험별 진실은 절대 상속하지 않는다

---

## 0. 결론

이 구조는 다른 전문직 시험으로 확장하기에 유리하다. 이유는 다음 공통문제를
한 번만 해결하기 때문이다.

- 출처·권리·effective date·version
- 공식범위와 기출관측 분리
- concept/prerequisite/evidence graph
- assistance-aware learner evidence
- 시험지 blueprint와 scenario
- 검증증명형 문제 release
- 채점불일치와 hold
- 강건 시간배분
- drift·rollback·audit
- source-safe private companion
- adapter lifecycle

그러나 **시험별 지식과 권위는 재사용 대상이 아니다.**

```text
portable contracts and infrastructure: reusable
exam truth, content and validation: profile-owned
learner mastery and activation evidence: never transferable
```

현재 유일한 실제 profile은 `appraiser_kr`이며, learner-facing runtime은 그중
제2차 실무·이론·법규뿐이다.

---

# 1. Two-layer architecture

```text
Portable Professional Exam Core (PEXC)
  ├─ authority/provenance interfaces
  ├─ version/currentness interfaces
  ├─ scope/question-unit graph interfaces
  ├─ evidence/capability interfaces
  ├─ world/blueprint interfaces
  ├─ assessment-proof interfaces
  ├─ scoring/audit interfaces
  ├─ source-safety boundaries
  └─ adapter lifecycle
           ↓ exact admitted ExamProfile
Exam Profile
  ├─ issuer and source precedence
  ├─ subjects/stages
  ├─ official scope taxonomy
  ├─ target-date norms
  ├─ historical corpus
  ├─ question grammar
  ├─ paper blueprint
  ├─ subject solvers/rubrics
  ├─ rights decisions
  └─ profile activation evidence
```

Portable Core는 learner product가 아니다. profile 없는 generic response를
생성하지 않는다.

---

# 2. Shared-kernel ownership

## 2.1 Reusable kernel

```ts
type PortableKernelCapabilityV1 =
  | "SOURCE_REGISTRY"
  | "RIGHTS_MANIFEST"
  | "EFFECTIVE_INTERVAL"
  | "VERSION_CROSSWALK"
  | "GRAPH_SNAPSHOT"
  | "QUESTION_UNIT"
  | "EVIDENCE_EVENT"
  | "CAPABILITY_STATE"
  | "PAPER_BLUEPRINT"
  | "EXAM_WORLD"
  | "PROOF_BUNDLE"
  | "SCORING_DECISION"
  | "CURRICULUM_CONSTRAINT"
  | "PRE_EXAM_FREEZE"
  | "POST_EXAM_AUDIT"
  | "DRIFT_HOLD"
  | "ROLLBACK";
```

이 capability는 구조와 lifecycle을 제공한다. 내용의 정당성을 제공하지 않는다.

## 2.2 Profile-owned truth

```ts
type ProfileOwnedAuthorityV1 =
  | "OFFICIAL_ISSUER"
  | "SOURCE_PRECEDENCE"
  | "SUBJECT_LIST"
  | "DETAILED_SCOPE"
  | "NORM_UNIVERSE"
  | "HISTORICAL_QUESTION_CORPUS"
  | "QUESTION_GRAMMAR"
  | "PAPER_BLUEPRINT_RULE"
  | "SUBJECT_SOLVER"
  | "RUBRIC"
  | "RIGHTS_DECISION"
  | "CALIBRATION"
  | "ACTIVATION_EVIDENCE";
```

profile-owned value는 다른 profile로 default 복사하지 않는다.

---

# 3. ExamProfile contract

```ts
type ExamProfileV1 = {
  profileId: string;
  displayNameInternal: string;
  jurisdiction: string;
  credentialIssuerIds: string[];
  targetExamCalendarPolicyId: string;

  stages: ExamStageProfileV1[];
  subjects: ExamSubjectProfileV1[];

  sourcePrecedenceIds: string[];
  officialScopeRootIds: string[];
  normUniverseIds: string[];
  historicalCorpusPolicyId: string;
  rightsPolicyId: string;
  driftPolicyId: string;

  questionUnitGrammarIds: string[];
  paperBlueprintPolicyIds: string[];
  proofPolicyIds: string[];
  solverRegistryIds: string[];
  rubricRegistryIds: string[];

  evidenceProjectionPolicyId: string;
  capabilityAxisPolicyId: string;
  curriculumPolicyId: string;
  scoringPolicyId: string;
  auditPolicyId: string;

  runtimeScope: {
    strategyOnly: boolean;
    learnerFacingStages: string[];
    learnerFacingSubjects: string[];
    externalLearners: boolean;
    production: boolean;
  };

  status:
    | "PROFILE_CANDIDATE"
    | "AUTHORITY_VERIFIED"
    | "CORPUS_VALIDATED"
    | "SYNTHETIC_BENCHMARKED"
    | "OWNER_PRIVATE_READY"
    | "LIMITED_ACTIVATION"
    | "ACTIVE"
    | "HELD"
    | "RETIRED";

  ownerDecisionRef: string;
  profileSnapshotId: string;
};
```

## 3.1 Stage

```ts
type ExamStageProfileV1 = {
  stageId: string;
  prerequisiteStageIds: string[];
  responseModalities: string[];
  examDurationPolicyId: string;
  scorePolicyId: string;
  administrativeGateIds: string[];
};
```

## 3.2 Subject

```ts
type ExamSubjectProfileV1 = {
  subjectId: string;
  stageId: string;
  officialScopeRootIds: string[];
  normUniverseIds: string[];
  questionGrammarIds: string[];
  blueprintPolicyIds: string[];
  solverIds: string[];
  rubricIds: string[];
  toolPolicyIds: string[];
  currentnessRequired: boolean;
};
```

## 3.3 No implicit default

다음 field는 Appraiser profile에서 자동 상속하지 않는다.

- issuer
- stage/subject
- law/accounting source
- question type
- mark/time
- currentness
- calculator/tool
- rubric
- solver
- rights
- learner activation

---

# 4. Adapter interfaces

## 4.1 Authority adapter

```ts
interface AuthorityAdapterV1 {
  discoverOfficialSources(): SourceCandidate[];
  validateIssuer(source: SourceCandidate): AuthorityDecision;
  extractEffectiveInterval(source: SourceCandidate): EffectiveInterval;
  bindRights(source: SourceCandidate): RightsDecision;
}
```

model output은 candidate이며 issuer validation을 대체하지 않는다.

## 4.2 Scope compiler

```ts
interface ScopeCompilerV1 {
  normalizeOfficialHierarchy(source: SourceSnapshot): ScopeCandidate[];
  preserveHistoricalLabels(): VersionCrosswalk[];
  derivePrerequisites(): ReviewedInferenceCandidate[];
  validateNoOfficialLeafLoss(): ValidationResult;
}
```

prerequisite는 curriculum inference이며 official label로 승격하지 않는다.

## 4.3 Question decomposer

```ts
interface QuestionDecomposerV1 {
  segmentQuestion(source: QuestionSource): QuestionUnitCandidate[];
  bindCommandsAndMarks(unit: QuestionUnitCandidate): UnitBinding;
  bindNorm(unit: QuestionUnitCandidate): NormBinding;
  validateCompleteAllocation(questionId: string): ValidationResult;
}
```

minimum unit은 profile이 정한다.

## 4.4 Blueprint adapter

```ts
interface BlueprintAdapterV1 {
  inferHistoricalPaperStructure(corpus: HistoricalCorpus): BlueprintObservation[];
  proposeReviewedWorlds(input: WorldInput): WorldCandidate[];
  validateMarksAndTime(world: WorldCandidate): ValidationResult;
}
```

`infer`는 official rule과 historical observation을 구분한다.

## 4.5 Subject verifier

```ts
interface SubjectVerifierV1 {
  verifyQuestion(candidate: AssessmentCandidate): VerificationResult;
  verifyReference(candidate: ReferenceCandidate): VerificationResult;
  enumerateAcceptedAlternatives(candidate: AssessmentCandidate): Alternative[];
  produceProofEvidence(candidate: AssessmentCandidate): ProofEvidence[];
}
```

generic LLM alone은 SubjectVerifier가 아니다.

## 4.6 Capability projector

```ts
interface CapabilityProjectorV1 {
  classifyError(attempt: AttemptEvidence): ErrorDecision;
  projectIndependentEvidence(attempt: AttemptEvidence): CapabilityCandidate;
  rejectAssistedPromotion(attempt: AttemptEvidence): ValidationResult;
  scheduleDelayedGate(candidate: CapabilityCandidate): ReviewCandidate;
}
```

cross-profile projection은 fail closed다.

## 4.7 Scoring adapter

```ts
interface ScoringAdapterV1 {
  deterministicCheck(attempt: AttemptEvidence): ScoringComponent;
  rubricScore(attempt: AttemptEvidence): ScoringComponent;
  adversarialReview(attempt: AttemptEvidence): ScoringComponent;
  reconcile(components: ScoringComponent[]): ScoringDecision;
}
```

reconcile은 불일치를 감출 수 없다.

---

# 5. Profile admission state machine

## 5.1 PROFILE-0 — Owner and product boundary

필수:

- named Owner decision
- exact credential/jurisdiction
- target learner and non-goals
- current product-surface decision
- data/rights model
- no inherited activation

결과:

```text
PROFILE_CANDIDATE
```

## 5.2 PROFILE-1 — Authority and rights

필수:

- official issuer registry
- exam rules
- official subject list
- detailed scope sources
- item-level rights policy
- source digest and locator
- currentness owner

결과:

```text
AUTHORITY_VERIFIED
```

## 5.3 PROFILE-2 — Norm universe

필수:

- statutes/regulations/standards/cases where applicable
- published/promulgated/effective dates
- target-exam snapshot
- historical/current answer crosswalk
- drift hold

결과가 unknown이면 다음 단계 금지.

## 5.4 PROFILE-3 — Scope and question grammar

필수:

- all official leaves
- concept/prerequisite distinction
- question/subquestion/option unit
- mark/command mapping
- profile-specific error grammar
- orphan 0

## 5.5 PROFILE-4 — Historical corpus

필수:

- bounded modern-regime window
- all selected questions allocated
- grouped exam-year split
- rights-safe source representation
- baseline metrics
- no future leakage

결과:

```text
CORPUS_VALIDATED
```

## 5.6 PROFILE-5 — Proof and scoring

필수:

- subject solver or structured rubric
- proof-policy kind
- alternative answer handling
- score disagreement
- human anchor sampling
- official-label guard

## 5.7 PROFILE-6 — Synthetic hostile benchmark

필수:

- author-created or rights-cleared fixtures
- exact version
- adversarial cases
- source reconstruction test
- currentness drift
- rollback
- no raw residue

결과:

```text
SYNTHETIC_BENCHMARKED
```

## 5.8 PROFILE-7 — Owner-private exact-profile evaluation

별도 exact scope, data plane, provider, retention, access and runtime evidence가
필요하다.

결과 후보:

```text
OWNER_PRIVATE_READY
```

## 5.9 PROFILE-8 — learner activation

별도 decision이 다음을 이름으로 고정해야 한다.

- profile snapshot
- stage/subject
- cohort
- provider/dependency versions
- runtime head
- measurements/consent
- rollback
- commercial/Production boundary

어떤 이전 profile의 activation evidence도 대체하지 않는다.

---

# 6. Cross-profile separation

## 6.1 Forbidden transfer matrix

| Artifact | Cross-profile reuse |
| --- | --- |
| generic interface code | allowed after review |
| author-created generic synthetic fixture | allowed if truly profile-neutral |
| official source locator | no |
| official scope node | no |
| historical question text/metadata | no by default |
| current answer/norm binding | no |
| question blueprint | no |
| solver/rubric | no by default |
| calibration weight | no |
| learner capability state | no |
| mastery/evidence | no |
| activation approval | no |
| rights decision | no |
| provider evidence | no |

## 6.2 Profile-scoped IDs

모든 다음 ID는 `profileId`를 포함하거나 profile-scoped namespace에 속한다.

```text
scope node
norm version
question
question unit
blueprint
world
proof policy
solver
rubric
capability state
scoring policy
audit manifest
```

동일 문자열 label은 동일 concept를 뜻하지 않는다.

## 6.3 Learner bridge prohibition

한 시험에서 “현재가치 계산”을 통과했다고 다른 시험 profile의 동일 이름
concept를 자동 통과시키지 않는다.

미래에 cross-profile prerequisite recommendation을 연구하려면:

- 별도 bridge contract
- 양 profile Owner
- semantic equivalence review
- no mastery transfer
- new profile independent assessment
- exact learner consent where applicable

이 필요하다.

---

# 7. Appraiser profile binding

## 7.1 Exact profile

```yaml
profileId: appraiser_kr
strategyStages:
  - first
  - second
currentLearnerFacingStage:
  - second
currentLearnerFacingSubjects:
  - appraisal_practice
  - appraisal_theory
  - appraisal_compensation_law
firstStageLearnerFacing: false
otherProfileLearnerFacing: false
```

## 7.2 Mandatory Appraiser-owned assets

- current 시행령 시험과목 별표
- Q-Net 시행계획·정정
- historical official scope
- exam-date statutes/rules/K-IFRS/practice standards
- VESG
- 2013-2026 Second corpus
- 2016-2026 First corpus
- Appraiser subject verifiers
- fx-9860GIII Practice policy
- Appraiser rights/currentness decisions
- exact Owner-private gates

Portable Core는 이 자산의 정확성을 주장하지 않는다.

---

# 8. Synthetic portability proof

## 8.1 Why synthetic first

실제 두 번째 시험을 가져오면 다음 위험이 즉시 생긴다.

- product scope ambiguity
- rights/currentness work
- taxonomy shortcut
- learner-facing expectation
- profile evidence transfer
- roadmap/WIP expansion

따라서 PEXK-1은 fictional profile만 사용한다.

## 8.2 Fictional profile requirements

```text
fictional issuer
fictional subjects
fictional official scope
fictional norm versions
fictional historical papers
fictional question grammar
fictional solver/rubric
no resemblance to one current exam corpus
author-created fixtures
```

## 8.3 Portability assertions

- profile ID is required everywhere
- no Appraiser node resolves
- generic graph interface works
- question-unit grammar can differ
- blueprint can use different modality/marks/time
- proof policy can differ
- capability axes remain common
- profile-specific error extensions are namespaced
- audit remains grouped by fictional exam year
- teardown leaves no real-source residue

## 8.4 What this proof establishes

허용 claim:

> “공통 interface가 하나의 fictional non-Appraiser profile을 수용했다.”

금지 claim:

- another real exam supported
- universal exam engine complete
- content coverage complete
- learner runtime ready
- market expansion validated

---

# 9. Portability design quality

## 9.1 Stable core, thin profile fallacy 금지

profile을 단순 config file 하나로 취급하지 않는다. 시험별 solver, rubric,
currentness와 rights가 충분히 다르므로 profile은 독립 domain package와 review
ownership을 가질 수 있다.

## 9.2 Avoid premature abstraction

두 번째 real profile 전에는 다음을 generic core로 승격하지 않는다.

- Appraiser-specific node labels
- 실무 계산 절차
- 법규 포섭 rubric
- 25/50/100점 assumption
- five-choice assumption
- fx-9860GIII
- 특정 법령 hierarchy
- Appraiser paper half-life

PEXC는 verified common behavior만 소유한다.

## 9.3 Compatibility over inheritance

권장:

```text
interfaces
closed schemas
adapters
capability negotiation
versioned profile snapshots
```

비권장:

```text
one giant universal taxonomy
deep class inheritance
shared answer bank
cross-profile free-text embeddings
one global mastery graph
```

## 9.4 Profile capability negotiation

```ts
type ExamProfileCapabilitiesV1 = {
  selectedResponse: boolean;
  numericExact: boolean;
  tableWork: boolean;
  extendedConstructedResponse: boolean;
  caseAnalysis: boolean;
  currentNormRequired: boolean;
  alternativeAnswersExpected: boolean;
  externalToolPolicy: boolean;
  officialFinalAnswersAvailable: boolean;
  officialRubricAvailable: boolean;
};
```

core는 false capability를 강제로 요구하지 않는다.

---

# 10. Source safety and rights portability

## 10.1 Shared rule

V11 source-safety는 모든 profile 후보에 기본 하한으로 적용한다.

- private raw source는 shared corpus로 자동 승격하지 않음
- provider/log/cache/persistence 명시
- no credential raw processor
- bodyless evidence
- no cross-user reuse
- takedown and rights manifest
- official availability ≠ redistribution right

## 10.2 Profile-specific rights

각 profile은 다음을 독립 결정한다.

```text
official question display
attachment/embed
metadata/deep link
commercial textbook companion
licensed content
academy tenant content
generated derivative risk
```

Appraiser 권리판단을 재사용하지 않는다.

## 10.3 Portable event restriction

interoperability event에는 다음만 허용한다.

- profile-scoped opaque IDs
- closed event type
- timestamps
- assistance/exposure enum
- aggregate/result bucket where approved
- version references

원문, 답안, OCR, title, filename, free text, 법률문장, 교재표현은 금지한다.

---

# 11. Interoperability

## 11.1 QTI compatibility target

Portable Core는 다음을 adapter boundary로 고려할 수 있다.

```text
assessment metadata
item/test structure
response declaration
result interchange
```

하지만:

- certification claim 없음
- QTI import가 rights를 부여하지 않음
- imported item은 profile/source/rights/currentness review 필요
- external identifier가 internal release authority가 아님

## 11.2 PROV mapping

W3C PROV의 Entity/Activity/Agent 개념을 lineage vocabulary로 참조할 수 있다.
RDF/OWL infrastructure 도입은 필수가 아니다.

## 11.3 Caliper/xAPI compatibility target

closed metadata event adapter를 고려할 수 있으나:

- raw source/body 0
- generic event가 mastery를 올리지 않음
- profile and purpose consent required
- external LRS는 별도 provider/data-plane decision
- V13은 export/runtime을 승인하지 않음

---

# 12. OSS adapter portability

오픈소스 wrapper는 profile-neutral contract를 가질 수 있지만 검증 logic은
profile-specific이어야 한다.

| Candidate | Portable wrapper | Profile-owned policy |
| --- | --- | --- |
| Ajv | schema validation | exact profile schema |
| Graphology | traversal API | valid edge/cycle rules |
| decimal.js | decimal arithmetic | formula/unit/rounding |
| fast-check | generator/shrinker | valid domain arbitraries/properties |
| DuckDB | analytical query runner | corpus/audit schema |
| Z3 | constraints/unsat explanation | valid profile constraints |
| Inspect AI | eval orchestration | task/scorer/data/log policy |

wrapper success는 profile correctness가 아니다.

---

# 13. Profile registry

## 13.1 Registry record

```ts
type ExamProfileRegistryRecordV1 = {
  profileId: string;
  currentSnapshotId: string;
  status: ExamProfileV1["status"];
  ownerDecisionRef: string;
  authorityManifestRef: string;
  rightsManifestRef: string;
  runtimeAuthorizationRef?: string;
  currentLearnerSurface: boolean;
  currentProduction: boolean;
  supersededSnapshotIds: string[];
};
```

## 13.2 Current registry

```text
appraiser_kr:
  real: true
  strategy: first + second
  learner runtime: second three subjects only

all other real profiles:
  nonexistent / unauthorized
```

fictional portability fixture는 real registry에 넣지 않는다.

---

# 14. Hard gates

```text
generic_core_without_profile_id = 0
profile_inherits_appraiser_authority = 0
profile_inherits_appraiser_answer = 0
profile_inherits_appraiser_calibration = 0
profile_inherits_appraiser_mastery = 0
profile_inherits_appraiser_activation = 0

profile_without_named_owner_decision = 0
profile_without_official_issuer = 0
profile_without_rights_manifest = 0
profile_without_target_norm = 0
profile_without_question_grammar = 0
profile_without_blueprint = 0
profile_without_solver_or_rubric = 0
profile_without_grouped_audit = 0

other_real_profile_created = 0
other_profile_learner_surface = 0
generic_multi_exam_marketing = 0
synthetic_fixture_claimed_as_real_support = 0

cross_profile_raw_source = 0
cross_profile_question_body = 0
cross_profile_answer = 0
cross_profile_capability_or_mastery = 0
cross_profile_activation_evidence = 0

standard_import_bypasses_rights = 0
standard_event_contains_raw_body = 0
oss_wrapper_claimed_profile_correctness = 0
```

---

# 15. Expansion workflow — future only

```text
1. Business/product decision
2. Exact profile Owner issue
3. Profile authority and source research
4. Rights/currentness review
5. Scope and question grammar
6. Historical corpus
7. Solver/rubric/proof policy
8. Synthetic hostile benchmark
9. Owner-private profile evaluation
10. Separate learner surface
11. Separate commercial/Production
```

각 단계는 focused issue/PR로 나눈다. 감정평가사 개발 WIP를 자동으로 공유하거나
방해하지 않는다.

---

# 16. Expansion feasibility assessment

## 16.1 High reuse

- versioned source registry
- rights/effective-date contracts
- graph snapshots
- assistance/exposure/evidence semantics
- capability vector
- proof-bundle lifecycle
- scoring disagreement
- robust planning shell
- pre-registration/audit
- source-safe private path
- adapter lifecycle

## 16.2 Medium reuse

- question-unit envelope
- blueprint/world framework
- generic assessment UI shell
- review queue and Today shell
- interoperability wrappers
- OSS wrappers

각 profile이 semantics를 채워야 한다.

## 16.3 Low reuse

- taxonomy
- content
- statutes/standards
- exact solver
- rubric
- historical calibration
- exam-specific copy and calculator routine

## 16.4 Strategic implication

새 시험마다 backend/platform 전체를 다시 만드는 비용은 크게 줄어든다. 그러나
“내용만 넣으면 즉시 출시”되는 white-label LMS가 되지는 않는다. 이 제한이
정확성과 신뢰를 지키는 장점이다.

---

# 17. Definition of Done

## Portable Core source-only DoD

- shared/profile-owned matrix
- closed ExamProfile contract
- adapter interfaces
- profile admission state machine
- Appraiser exact binding
- fictional portability fixture plan
- cross-profile separation
- interoperability boundaries
- OSS wrapper boundaries
- hard gates
- no learner-facing expansion authority

## Real profile DoD — future only

- independent official source universe
- independent currentness and rights
- complete corpus mapping
- profile-specific proof and scoring
- grouped audit
- synthetic hostile evidence
- Owner-private exact-profile evidence
- separate activation

---

# 18. Final contract

> **Portable Professional Exam Core는 시험지식의 공용창고가 아니다. 출처·버전·
> graph·evidence·시험세계·proof·scoring·audit의 공통 계약을 재사용하는 내부
> 코어다. 각 전문직 시험은 독립 ExamProfile로서 공식권위, 범위, 규범, 기출,
> 문항문법, blueprint, solver, rubric, 권리와 활성화 evidence를 처음부터
> 통과해야 한다. 현재 유일한 실제 profile은 감정평가사이며 learner-facing
> runtime은 제2차 3과목뿐이다.**
