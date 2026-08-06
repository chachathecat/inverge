---
decision_title: "답안길 V13 Exam Digital Twin·강건 커리큘럼·Portable Professional Exam Core Owner 결정"
status: "owner-decision/proposed-for-merge"
dated: "2026-08-06 KST"
repository: "chachathecat/inverge"
active_master_plan: "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md"
exam_digital_twin_spec: "docs/strategy/dabangil-exam-digital-twin-and-robust-curriculum-control-v1-2026-08-06.md"
portable_core_spec: "docs/strategy/dabangil-portable-professional-exam-core-and-profile-contract-v1-2026-08-06.md"
machine_contract: "config/dabangil-exam-digital-twin-portable-core-v1.json"
amends:
  - "docs/strategy/ACTIVE-MASTER-PLAN.md"
supersedes_for_strategy:
  - "V12 as the single active strategy entry point; V12 remains mandatory baseline"
does_not_authorize:
  - "runtime, API, UI, schema, migration, RLS, Storage, provider, dependency, deployment or Production changes"
  - "historical-question ingestion or real third-party source processing"
  - "First-stage learner-facing activation"
  - "another professional-exam profile or generic multi-exam learner surface"
  - "learner-model fitting, optimizer activation or scoring runtime"
  - "Ready transition, merge or auto-merge"
---

# Owner 결정 — V13 Exam Digital Twin과 Portable Professional Exam Core

## 1. 단일 전략 진입점

다음 문서를 답안길의 단일 active proposed strategy entry point로 채택한다.

```text
docs/strategy/
dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md
```

V13은 V12를 폐기하지 않는다. V12는 다음의 mandatory baseline으로 유지한다.

- 감정평가사 1차·2차 coverage
- VESG
- Original Concept Curriculum
- Original Question Engine
- Private Ephemeral Book Tutor
- V11 source-safety
- V8 reasoning/evidence/Full-Day
- V9 adaptive understanding

## 2. Exam Digital Twin 결정

답안길은 다음 시험을 하나의 예상시험지나 적중목록으로 표현하지 않는다.

```text
official scope and target-date norm
→ multiple reviewed paper worlds
→ learner multidimensional capability state
→ robust native curriculum allocation
→ proof-carrying assessment
→ calibrated scoring and pre-registered audit
```

Scenario weight, frequency, expert opinion, public academy signal 또는 learner
allocation을 출제확률·합격확률로 표시하지 않는다.

## 3. 네 decision axis 분리

다음을 서로 덮어쓰지 않는다.

```text
CorpusPriority
BlueprintDemand
LearnerNeed
AllocationUtility
```

또한 다음 권위를 분리한다.

```text
official fact/current answer
historical observation
reviewed inference
expert/public academy signal
learner-specific plan
```

전문가·학원 signal은 official scope와 current answer authority를 갖지 않는다.

## 4. Learner Capability Twin 결정

learner state는 단일 mastery 숫자가 아니다.

```text
knowledge
retrieval
method selection
execution
explanation
verification
speed
transfer
delayed recovery
confidence calibration
```

answer reveal, hint, guided success 또는 AI 공동작성은 independent mastery가 아니다.
unresolved scoring conflict는 mastery를 올리지 않는다.

## 5. Robust Curriculum 결정

native learning policy가 계속 다음의 sole authority다.

- `CoreOutcome` 선택
- learning value
- learner priority
- official floor
- Today primary tasks 최대 3개

미래 optimizer 또는 constraint solver는 exact separately approved boundary에서
shadow comparison 또는 already-selected metadata placement만 할 수 있다. official
answer, mastery, pass risk, Law status, feedback 또는 learner-visible priority를
결정하지 않는다.

## 6. Proof-Carrying Assessment 결정

released generated assessment는 최소 다음을 요구한다.

```text
exact profile
graph/norm/rights snapshot
target/prerequisite nodes
profile-specific solver or rubric
unit/rounding policy where applicable
invariants/metamorphic/adversarial evidence
source non-reconstruction review
review decisions
proof bundle
```

generated reference는 학습용이며 공식답안·공식채점기준이 아니다.

## 7. Pre-registered audit 결정

시험 전에 다음을 freeze한다.

- graph/norm
- priorities
- paper worlds
- signals
- curriculum allocation
- GS packets
- scoring policy
- denominator

시험 후에는 domain/issue/task/combination/mark-role/transfer를 구별하고, 맞힌 것뿐
아니라 놓친 배점, false-positive 학습시간, baseline 대비 추가효용을 보고한다.
같은 시험연도의 소문항을 train/test 양쪽에 넣지 않는다.

## 8. Portable Professional Exam Core 결정

다음 공통계약을 internal core로 분리한다.

- source/provenance/version
- scope/question-unit graph interface
- evidence/capability
- world/blueprint
- proof bundle
- scoring disagreement
- curriculum constraints
- pre-registration/audit
- source-safety
- adapter lifecycle

시험별 `ExamProfile`은 다음을 독립 소유한다.

- official issuer/source precedence
- official scope and target-date norms
- historical corpus
- question grammar and paper blueprint
- solver/rubric
- rights/currentness
- calibration
- activation evidence

현재 유일한 실제 profile은 `appraiser_kr`이다.

## 9. 다른 전문직 시험 경계

이번 결정은 다른 전문직 시험을 추가하지 않는다.

```text
other real profile = none
generic multi-exam learner surface = none
cross-exam answer transfer = 0
cross-exam calibration transfer = 0
cross-exam mastery transfer = 0
cross-exam activation evidence transfer = 0
```

첫 portability proof는 author-created fictional profile만 사용한다. 통과해도 real
exam support 또는 learner activation을 주장하지 않는다.

## 10. Open-source candidate 결정

다음을 candidate adapter로만 기록한다.

```text
Ajv
Graphology
decimal.js
fast-check
DuckDB
Z3
Inspect AI
```

이번 결정은 dependency 설치나 실행을 승인하지 않는다.

각 future Work는 exact version, license, transitive dependency, SBOM, isolation,
closed schema, logging/persistence, native fallback과 rollback을 다시 검증해야 한다.

어느 candidate도 다음 권한을 갖지 않는다.

- official scope/current answer 변경
- CoreOutcome 선택
- mastery promotion
- learner-visible score release
- raw user source 접근
- Production persistence
- automatic lifecycle transition

## 11. Standards boundary

QTI, W3C PROV, Caliper와 xAPI는 compatibility/reference target일 뿐이다.
certification/conformance claim, provider activation, external event export 또는
rights 우회가 아니다.

## 12. 프로그램 순서

```text
1. current blocker and roadmap/WIP preservation
2. V13 strategy closeout
3. CPF source-safety
4. VESG/Appraiser profile exact corpus order
5. EDT-0 through EDT-7
6. PEXK-0 and fictional PEXK-1
7. separately authorized activation
```

전략문서 병합은 다음 Work를 자동 선택하지 않는다.

## 13. 비승인 경계

이 결정은 source-only 문서와 proposed machine contract를 Draft PR에 게시하는
범위만 승인한다.

승인하지 않는 것:

- runtime, schema, migration, RLS, Storage
- provider/dependency/package/environment
- actual historical corpus acquisition
- real learner/source processing
- real second exam profile
- First-stage learner activation
- external/commercial/Production
- Ready, merge, auto-merge

## 14. 최종 결정문

> **답안길 V13은 감정평가사의 공식범위와 현재규범을 VESG truth로 유지하면서,
> 복수 시험지 세계·학습자 능력 디지털 트윈·강건 학습배분·검증증명형 평가·
> 채점불일치·사전등록 감사를 추가한다. 공통 계약은 internal Portable
> Professional Exam Core로 분리하되, 모든 실제 시험은 독립 ExamProfile 권위와
> 검증을 요구한다. 현재 learner-facing 제품은 감정평가사 2차 3과목으로
> 고정한다.**
