# 감정평가사 2차 World-Class Benchmark & Adoption Matrix v1

- 작성일: 2026-08-10 KST
- contract version: `1.0.6`
- 상태: source-only benchmark / non-operative
- 목적: 세계급 제품·연구·오픈소스의 작동 원리를 추출하고 답안길의
  `adopt / adapt / reject / proof` 결정을 고정한다.
- 원칙: 외부 제품의 마케팅 주장은 답안길 효능 증거가 아니다.

## 1. 판정 프레임

각 후보는 다음을 닫아야 한다.

1. 어떤 learner problem을 해결하는가?
2. 실제 mechanism은 무엇인가?
3. 답안길에 그대로 복사하면 어떤 문제가 생기는가?
4. 무엇을 adopt/adapt/reject하는가?
5. 어떤 baseline과 evidence를 이겨야 하는가?
6. exact version, license, security, SBOM, data egress, fallback, rollback과
   uninstallability는 무엇인가?

외부 제품·논문·오픈소스는 mechanism source일 뿐 answer, mastery,
biggest gap, release, transfer 또는 Today priority authority가 아니다.

---

## 2. Product patterns

### 2.1 UWorld

확인된 mechanism:

- exam-like Tutor/Timed mode
- performance report에서 약한 범위로 바로 practice
- seen/new item 구분
- 일정과 가용시간을 반영한 planner

답안길 adopt/adapt:

```text
exact answer anchor
→ deduction cause
→ repair / sealed variant / timed task
```

- seen practice와 unseen transfer를 분리한다.
- subject score보다 exact failure operation을 우선한다.
- calendar보다 Today CoreOutcome 0..3과 Full-Day block 0..N을 분리한다.

Reject:

- QBank-first product
- seen score를 transfer/closure로 사용

Proof:

- same-surface contamination 0
- diagnosis→next action 2 interaction 이하
- held-out transfer evidence

Source:
- https://medical.uworld.com/blog/product-updates/creating-a-test-from-the-reports-section/
- https://medical.uworld.com/usmle/features/study-planner/
- retrieved 2026-08-10 KST

### 2.2 AMBOSS

Mechanism:

- prior performance, personal need, progress and exam importance를 recommendation에 결합
- recommendation을 Qbank action에 연결
- exam date/week schedule 기반 study plan

답안길 adapt:

```text
exam impact
+ exact learner evidence
+ recurrence/forgetting risk
+ available time
→ explainable next action
```

Reject:

- 이유 없는 fixed recommendation
- stale evidence가 계속 권위가 되는 plan

Proof:

- accept/edit/reject evidence
- stale evidence 제거
- reasonless recommendation 0

Source:
- https://support.amboss.com/hc/en-us/articles/360047938152-Study-Recommendations
- https://support.amboss.com/hc/en-us/articles/4416258516884-Custom-Study-Plans
- retrieved 2026-08-10 KST

### 2.3 Duolingo Birdbrain

Mechanism:

- learner state와 exercise difficulty를 결합
- Session Generator가 적절한 task 선택
- model change를 experiment로 검증

답안길 adapt:

```text
Learner Capability
× Task Difficulty
× Exam Impact
× Evidence Reliability
× Repair Time
```

초기에는 deterministic baseline을 사용하고 adaptive policy는 별도
benchmark/shadow gate 뒤에만 후보가 된다.

Reject:

- engagement optimization을 learning optimization으로 대체
- opaque score를 learner-facing mastery로 표시
- data sufficiency 전 조기 ML authority

Source:
- https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain/
- https://blog.duolingo.com/unique-engineering-problems/
- retrieved 2026-08-10 KST

### 2.4 Khanmigo

Mechanism:

- quiz, unit test, course/mastery challenge 같은 knowledge measurement
  surface에서는 AI help를 제공하지 않음

답안길 adopt:

```text
Learning Lane ≠ Measurement Lane
```

- route, cache, prefetch, event와 eligibility를 물리적으로 분리
- Measurement 제출/timeout 전 help byte 0
- Learning full reveal 전에 append-only exposure commit

Reject:

- UI label만 다른 가짜 lane
- exposed attempt를 unseen으로 되돌림

Proof:

- direct API/cache/prefetch/multi-tab leak 0
- assistance commit failure 시 output 0
- assisted attempt→independent 승격 0

Source:
- https://support.khanacademy.org/hc/en-us/articles/13982530363533-Where-can-I-access-Khanmigo-while-working-on-Khan-Academy
- retrieved 2026-08-10 KST

---

## 3. Open-source candidates

### 3.1 OATutor

Mechanism:

- problem을 step으로 분해
- step-level knowledge component
- modular hint/scaffold
- configurable item selection/policy comparison

Adopt as pattern:

```text
요구 해석
→ 쟁점/방법
→ 사실·자료
→ 규칙/산식
→ 적용·포섭·계산
→ 구조·표현
→ 검산·전사
```

Reject:

- OATutor runtime/UI/content 직접 복제
- BKT probability를 canonical mastery로 사용
- raw learner body를 연구 log로 자동 전송

Current disposition: `pattern_reference`.

Source:
- https://github.com/CAHLR/OATutor
- retrieved 2026-08-10 KST

### 3.2 Ajv

Proposed role:

- model output의 strict JSON Schema/JTD validation
- unknown/extra field, wrong enum/type, null/array/primitive를 fail-closed
- closed schema before trusted ranking/release

Reject:

- schema-valid output을 semantic truth로 간주
- exact package/license/security/SBOM review 없는 도입

Current disposition: `future_phase_1_candidate`.

Source:
- https://ajv.js.org/

### 3.3 decimal.js

Proposed role:

- percentage, decimal, unit conversion and rounding의 deterministic arithmetic
- JavaScript binary floating-point drift 제거
- exact rounding policy와 intermediate/final value regression

Reject:

- method selection 또는 legal/theory truth authority
- exact version/license/SBOM/fallback 없는 도입

Current disposition: `future_phase_1_candidate`.

Source:
- https://github.com/MikeMcl/decimal.js

### 3.4 Inspect AI

Proposed role:

- offline Owner Gold regression
- prompt/model/rubric/policy exact manifest evaluation
- adversarial scorer와 reproducible eval log

Reject:

- production learner raw body를 shared eval corpus로 복제
- eval framework output을 release authority로 사용

Current disposition: `future_phase_1_candidate`.

Source:
- https://github.com/UKGovernmentBEIS/inspect_ai

### 3.5 FSRS / ts-fsrs

Allowed role:

- 이미 선택된 ReviewUnit의 due-date candidate
- fixed baseline과 비교

Forbidden:

- biggest gap
- mastery/closure
- Today priority
- D+7 eligibility
- pass readiness

Current disposition: `deferred_due_candidate`.

Source:
- https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler
- https://github.com/open-spaced-repetition/ts-fsrs

### 3.6 pyBKT

Current disposition is exactly:

> `benchmark_only`

Allowed now:

- local synthetic/offline benchmark
- fixed/rule baseline comparison on non-production fixtures

Shadow transition prerequisites:

1. sufficient closed-schema skill-event data
2. exact-scope O2 measurement/consent gate
3. versioned privacy, retention, export/delete and opt-out contract
4. hidden instrumentation field list and data-boundary approval
5. rollback and baseline comparison

Explicitly forbidden:

- local synthetic benchmark만으로 `shadow` 승격
- O2 이전 hidden learner instrumentation
- raw answer/OCR/note body input
- canonical MasteryState write
- learner-facing mastery/pass probability
- biggest-gap/Today authority

This corrects the earlier ambiguous `benchmark_shadow_only` wording. Until all
prerequisites are complete, pyBKT remains `benchmark_only`.

Source:
- https://github.com/CAHLR/pyBKT

### 3.7 H5P Branching Scenario

Adopt only the authoring pattern:

```text
canonical
→ near-miss
→ counterexample
→ flip-condition
```

Adapt:

- Law: decisive fact change
- Theory: command/evaluation-axis change
- Practice: number/premise/method-condition change

Reject:

- H5P runtime as core dependency
- branch score as mastery
- unverified branch as D+7

Source:
- https://h5p.org/branching-scenario

### 3.8 pgvector, PaddleOCR and Tesseract

pgvector proposed later role:

- similarity/search inside legally cleared content only
- no secretly scraped academy corpus

PaddleOCR proposed later role:

- shadow OCR benchmark against current provider
- Korean handwriting quality must be measured on authorized data

Tesseract proposed role:

- printed-text local fallback candidate
- not assumed adequate for handwriting

All remain Phase 2 or reference candidates and require separate qualification.

Sources:
- https://github.com/pgvector/pgvector
- https://github.com/PaddlePaddle/PaddleOCR
- https://github.com/tesseract-ocr/tesseract

### 3.9 OR-Tools

Allowed later role:

- native evidence policy가 이미 선택한 task를 time window에 배치

Forbidden:

- mastery, biggest gap 또는 learning priority 결정
- native planner baseline 이전 activation

Current disposition: `future_optional_adapter`.

Source:
- https://developers.google.com/optimization

---

## 4. Standards references

### QTI 3

Adopt:

- item/test interchange와 accessibility-compatible internal structure target

Reject:

- premature full conformance
- QTI format이 rights/answer validity를 보증한다고 간주

Source:
- https://www.1edtech.org/standards/qti/versions

### Caliper Analytics

Adopt:

- bodyless learning activity vocabulary
- event/outcome separation

Reject:

- raw answer/OCR/problem/AI body in event payload
- event count as learning outcome

Source:
- https://www.1edtech.org/standards/caliper

### W3C PROV

Adopt:

```text
entity + activity + agent + version + derivation
```

을 source, revision, model, prompt, validator, exposure와 release artifact에
연결한다.

Source:
- https://www.w3.org/TR/prov-overview/

### NIST AI RMF GenAI Profile

Adopt:

- governance
- provenance
- pre-deployment test
- incident disclosure
- risk register and TEVV

Reject:

- compliance badge처럼 사용
- framework를 actual eval evidence로 대체

Source:
- https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence

---

## 5. Learning research

### Structured AI Tutor RCT

Scientific Reports 2025 RCT는 research-based scaffold가 대학 물리학의
두 lesson에서 단기 learning gain을 보였다고 보고한다.

Adopt:

- curriculum-aligned scaffold
- problem-specific sequence
- active learner response
- platform-enforced step progression

Limit:

- 감정평가사 답안, D+7, 장기 transfer 또는 구매를 측정하지 않음

Source:
- https://www.nature.com/articles/s41598-025-97652-6

### Generative AI without guardrails

PNAS 2025 field experiment는 약 1,000명의 고교 수학 학생에서 일반 GPT가
practice performance를 높이면서 AI 제거 시험 성과를 해칠 수 있음을
보였다. Teacher-designed guardrail은 피해를 줄였지만 답안길의 효능을
증명하지 않는다.

Adopt:

- answer withholding
- commitment before feedback
- minimum scaffold
- unassisted outcome as primary evidence

Source:
- https://doi.org/10.1073/pnas.2422633122

### Tutor CoPilot

Tutor CoPilot RCT는 AI가 human tutor에게 guiding question과 pedagogy를
제안하는 구조에서 topic mastery 개선을 보고했다.

Adopt:

- AI가 답 대신 좋은 diagnostic question/intervention을 제안
- accept/edit/reject와 adjudication feedback 기록

Limit:

- consumer price, 감평사 long-term transfer 또는 expert marketplace evidence가 아님

Source:
- https://arxiv.org/abs/2410.03017

### Retrieval Practice

2021 systematic review는 학교·교실 50개 실험, 총 5,374명을 분석했다.

Adopt:

- same-session understanding과 delayed retrieval 분리
- D+1/D+7은 product policy hypothesis로 운영
- exact interval은 답안길 evidence로 조정

Source:
- https://doi.org/10.1007/s10648-021-09595-9

---

## 6. Consolidated matrix

| Pattern | Adopt | Adapt | Reject |
|---|---|---|---|
| UWorld | exam fidelity, report→practice | anchor→repair/variant | QBank-first |
| AMBOSS | evidence→recommendation | gap+exam impact+time | unexplained plan |
| Birdbrain | learner×task, experiments | rule-first promotion | opaque early ML |
| Khanmigo | learning/measurement split | route/cache/event split | label-only split |
| OATutor | step/KC/scaffold | appraisal operation map | BKT as truth |
| Ajv | strict output schema | closed candidate contract | semantic oracle |
| decimal.js | exact decimals | Practice validator | method authority |
| Inspect AI | offline eval harness | Owner Gold/adversarial | production authority |
| FSRS | due-date candidate | ReviewUnit only | priority/mastery |
| pyBKT | benchmark only | O2-gated future shadow | hidden early instrumentation |
| H5P | branching authoring | contrast foundry | runtime/score truth |
| OR-Tools | task placement | post-native planner | priority authority |
| QTI | compatibility | internal interfaces | premature conformance |
| Caliper | bodyless vocabulary | private metadata events | raw body analytics |
| PROV | lineage | source/model/evidence graph | detached docs |
| NIST | governance/TEVV | risk/release process | compliance theater |

## 7. Final recommendation

세계급 차이는 도구 수가 아니라 다음에서 발생한다.

1. exact answer anchor
2. compact subject diagnosis with counter-evidence
3. deterministic/source/rubric Trust
4. pre-help exposure commit
5. frozen-config D+1
6. sealed verified transfer bank
7. learner-private deduction lineage
8. evidence-driven daily command
9. honest abstention and usable coverage
10. voluntary repurchase after independent value
