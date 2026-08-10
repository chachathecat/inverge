# 감정평가사 2차 World-Class Benchmark & Adoption Matrix v1

- 작성일: 2026-08-10 KST
- 상태: source-only benchmark / non-operative
- 목적: 세계급 제품·연구·오픈소스에서 작동 원리를 추출하고 답안길에
  `adopt / adapt / reject` 결정을 고정한다.
- 원칙: 외부 제품의 마케팅 주장은 답안길 효능 증거가 아니다.

## 1. 판정 프레임

각 후보는 다음 질문으로 평가한다.

1. 어떤 사용자 문제를 해결하는가?
2. 실제 메커니즘은 무엇인가?
3. 답안길에 그대로 복사하면 어떤 문제가 생기는가?
4. 무엇을 채택하고 무엇을 거부하는가?
5. 어떤 증거가 있어야 production 후보가 되는가?
6. license, data egress, fallback, uninstallability는 무엇인가?

## 2. 제품 패턴

### 2.1 UWorld

**확인된 메커니즘**

- 수행 리포트에서 약한 Subject/System을 확인하고 곧바로 해당 범위의
  테스트를 만들 수 있다.
- 이미 본 문제와 새 문제를 명시적으로 구분한다.
- study planner는 시작일·종료일·가용시간을 받아 일별 과제를 만든다.

**답안길 채택**

```text
evidence
→ weak subject/skill
→ 즉시 실행 가능한 repair/variant/timed task
```

**답안길식 변형**

- Subject/System 정답률 대신 exact answer anchor와 deduction cause를 사용한다.
- seen item 재연습과 unseen transfer를 별도 lane으로 보존한다.
- calendar 생성보다 Today CoreOutcome 0..3과 Full-Day block을 분리한다.

**거부**

- 거대한 QBank를 초기 learner-facing 중심으로 두는 것
- seen-question score를 transfer 또는 closure로 사용하는 것

**Production proof**

- diagnosis에서 next task까지 2클릭 이하
- same-surface와 unseen qualification 혼동 0
- top-1 gap external agreement gate

Source:
- https://medical.uworld.com/blog/product-updates/creating-a-test-from-the-reports-section/
- https://medical.uworld.com/usmle/features/study-planner/
- retrieved 2026-08-10 KST

### 2.2 AMBOSS

**확인된 메커니즘**

Study Recommendations는 이전 수행, 개인 필요, 진도와 시험 중요도를
결합하고 추천 topic을 pre-made Qbank session에 연결한다. Custom Study Plan은
시험일과 주간 일정을 입력받는다.

**답안길 채택**

```text
exam impact
+ learner evidence
+ progress
+ available time
→ ranked next action
```

**답안길식 변형**

- topic 추천 대신 exact gap/recovery state를 우선한다.
- 추천 이유를 learner에게 공개한다.
- task 완료가 mastery나 closure를 만들지 않는다.

**거부**

- plan 생성 시점의 고정 추천을 계속 authority로 유지하는 것
- 수정·삭제가 어려운 plan UX

**Production proof**

- plan accept/edit/reject 기록
- 이유 없는 recommendation 0
- evidence stale 시 replan

Source:
- https://support.amboss.com/hc/en-us/articles/360047938152-Study-Recommendations
- https://support.amboss.com/hc/en-us/articles/4416258516884-Custom-Study-Plans
- retrieved 2026-08-10 KST

### 2.3 Duolingo Birdbrain

**확인된 메커니즘**

Birdbrain은 learner와 exercise의 정보를 결합해 정답 가능성과 개인화된
난이도를 추정하고 Session Generator가 적절한 문제를 고르게 한다.
Duolingo는 모델 변경을 A/B test로 검증한다고 설명한다.

**답안길 채택**

```text
Learner Capability
× Task Difficulty
× Exam Impact
× Evidence Reliability
× Estimated Repair Time
```

**답안길식 변형**

- 초기에는 설명 가능한 deterministic baseline.
- adaptive policy는 shadow comparison을 먼저 수행한다.
- task difficulty는 verified item family evidence 없이는 확정하지 않는다.

**거부**

- engagement 최적화를 학습 최적화로 대체
- opaque score를 learner-facing mastery로 표시
- 수백만 interaction을 전제로 한 조기 ML 과대설계

**Production proof**

- rule baseline 대비 held-out transfer improvement
- calibration and abstention
- versioned A/B or shadow evaluation

Source:
- https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain/
- https://blog.duolingo.com/unique-engineering-problems/
- retrieved 2026-08-10 KST

### 2.4 Khanmigo

**확인된 메커니즘**

Khan Academy는 quizzes, unit tests, course challenges, mastery challenges가
지식을 독립적으로 측정하는 화면이므로 Khanmigo 도움을 제공하지 않는다.

**답안길 채택**

```text
Learning Lane
≠ Measurement Lane
```

**답안길식 변형**

- route, event, cache, prefetch, eligibility snapshot을 물리적으로 분리한다.
- Measurement Lane에서 제출·timeout 전 hint/reference/probe byte 0.
- Learning Lane에서 full reveal 시 guided exit와 exposure를 먼저 commit한다.

**거부**

- UI label만 바꾸고 같은 cache/API를 공유하는 가짜 분리

**Production proof**

- pre-presentation unseen snapshot
- direct API, prefetch, cache, multi-tab leak 0
- assisted attempt가 independent로 승격되는 경우 0

Source:
- https://support.khanacademy.org/hc/en-us/articles/13982530363533-Where-can-I-access-Khanmigo-while-working-on-Khan-Academy
- retrieved 2026-08-10 KST

## 3. 오픈소스 패턴

### 3.1 OATutor

**확인된 메커니즘**

OATutor는 problem을 step으로 분해하고 step-level knowledge component,
modular hint/scaffold, configurable item-selection heuristic와 BKT parameter를
지원한다. hint pathway와 selection policy를 A/B test할 수 있다.

**채택**

- step-level skill/gap mapping
- closed scaffold pathways
- configurable deterministic selection baseline
- treatment/eval separation
- content-source versioning

**변형**

감정평가사 2차 step taxonomy:

```text
요구 해석
→ 쟁점/방법 선택
→ 관련 사실·자료
→ 규칙/산식
→ 적용·포섭·계산
→ 구조·표현
→ 단위·반올림·검산
→ 시간·답안지 전사
```

**거부**

- BKT probability를 canonical mastery나 learner-facing truth로 사용
- OATutor 전체 UI/runtime을 제품에 임베드
- learner raw body를 연구 log로 자동 전송

**자격심사**

- license/SBOM/version pin
- no data egress default
- local synthetic benchmark
- exact uninstall/fallback
- pyBKT/OATutor BKT는 shadow only

Source:
- https://github.com/CAHLR/OATutor
- retrieved 2026-08-10 KST

### 3.2 FSRS / ts-fsrs

**확인된 메커니즘**

FSRS는 difficulty, stability, retrievability를 사용하는 spaced-repetition
scheduler이며 TypeScript, Python, Rust 등 구현이 있다.

**채택**

- 이미 선택된 ReviewUnit의 due-date candidate
- fixed schedule baseline과 shadow comparison

**거부**

- biggest gap 결정
- mastery/closure 결정
- Today priority 결정
- D+7 transfer eligibility 결정
- pass readiness 결정

**자격심사**

- exact package/version/license/SBOM
- review-log sufficiency
- fixed baseline retained
- feature flag + rollback
- Node runtime compatibility

Source:
- https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler
- https://github.com/open-spaced-repetition/ts-fsrs
- retrieved 2026-08-10 KST

### 3.3 H5P Branching Scenario

**확인된 메커니즘**

Branching Scenario는 선택에 따라 서로 다른 content/feedback path를 구성하는
free HTML5 content type이다.

**채택**

authoring pattern만 채택한다.

```text
canonical
→ near-miss
→ counterexample
→ flip-condition
```

**변형**

- 법규: 결정적 사실 변화
- 이론: 요구 동사·평가기준 변화
- 실무: 수치·전제·방법 적용조건 변화

**거부**

- H5P runtime 전체를 핵심 앱에 직접 포함
- branching score를 mastery 또는 transfer로 사용
- unverified generated branch를 D+7 item으로 사용

Source:
- https://h5p.org/branching-scenario
- retrieved 2026-08-10 KST

## 4. 표준 참조

### 4.1 QTI 3

채택 범위:

- item/test metadata와 interchange에 충돌하지 않는 내부 구조
- shared stimulus, accessibility, technology-enhanced item을 future target으로 고려

거부 범위:

- 지금 당장 full QTI conformance 구현
- QTI format이 rights/answer validity를 보증한다고 간주

Source:
- https://www.1edtech.org/standards/qti/versions

### 4.2 Caliper Analytics

채택 범위:

- bodyless learning activity vocabulary
- event label consistency
- activity와 outcome 분리

거부 범위:

- raw answer/OCR/problem/AI body를 event payload에 포함
- event count를 learning outcome으로 간주

Source:
- https://www.1edtech.org/standards/caliper

### 4.3 W3C PROV

채택 범위:

```text
entity
+ activity
+ agent
+ version
+ derivation
```

을 source, revision, model, prompt, validator, release artifact와 연결한다.

Source:
- https://www.w3.org/TR/prov-overview/

### 4.4 NIST AI RMF GenAI Profile

채택 범위:

- governance
- content provenance
- pre-deployment testing
- incident disclosure
- risk register와 TEVV

거부 범위:

- compliance badge처럼 사용
- framework를 실제 eval evidence로 대체

Source:
- https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence
- retrieved 2026-08-10 KST

## 5. 학습연구

### 5.1 Structured AI Tutor RCT

Scientific Reports 2025 RCT는 research-based scaffold를 갖춘 AI tutor가
두 개의 대학 물리학 lesson에서 active-learning class보다 높은 단기
learning gain을 보였다고 보고한다.

채택:

- curriculum-aligned scaffold
- problem-specific sequence
- short active engagement
- pre/post evidence

제한:

- 감정평가사 답안, D+7, 장기 transfer, 구매의사를 측정하지 않았다.

Source:
- https://www.nature.com/articles/s41598-025-97652-6

### 5.2 Generative AI without guardrails

PNAS 2025 field experiment는 약 1,000명의 고교 수학 학생에서 GPT access가
practice performance를 높였지만 일반 GPT interface는 AI 제거 시험에서
control보다 낮은 결과를 낼 수 있음을 보고했다. teacher-designed hint
guardrail은 피해를 크게 줄였지만 positive independent-test superiority는
확립하지 못했다.

채택:

- answer withholding
- commitment before feedback
- teacher/subject-designed hint
- unassisted outcome as primary evidence

Source:
- https://doi.org/10.1073/pnas.2422633122

### 5.3 Tutor CoPilot

Tutor CoPilot RCT는 AI가 human tutor에게 guiding question과 pedagogical
strategy를 제안할 때 900 tutor, 1,800 student 환경에서 topic mastery가
4 percentage points 개선됐다고 보고한다.

채택:

- AI가 답 대신 좋은 질문과 intervention을 제안
- low-confidence/high-risk case의 human escalation 후보
- accept/edit/reject와 reviewer feedback 기록

제한:

- 소비자 subscription price 또는 감평사 장기 transfer 증거가 아니다.

Source:
- https://arxiv.org/abs/2410.03017

### 5.4 Retrieval Practice

2021 systematic review는 학교·교실의 50개 실험, 총 5,374명을 분석했고
49 effect size 중 57%가 medium 또는 large benefit이었다.

채택:

- same-session 이해와 delayed retrieval 분리
- D+1/D+7을 product policy hypothesis로 운영
- exact interval은 답안길 data로 조정

Source:
- https://doi.org/10.1007/s10648-021-09595-9

## 6. 종합 Adopt / Adapt / Reject

| Pattern | Adopt | Adapt | Reject |
|---|---|---|---|
| UWorld | exam fidelity, report→practice | anchor→repair/variant | QBank-first product |
| AMBOSS | evidence→recommendation | gap + exam impact + time | unexplained fixed plan |
| Birdbrain | learner×task model, A/B | rule-first shadow | opaque early ML |
| Khanmigo | learning/measurement split | route/cache/event separation | label-only split |
| OATutor | step/KC, hints, policy eval | appraisal reasoning steps | BKT as truth |
| FSRS | due-date candidate | ReviewUnit only | mastery/priority authority |
| H5P | branching authoring | contrast-set foundry | runtime import, score truth |
| QTI | future item compatibility | internal interfaces | premature full conformance |
| Caliper | bodyless event vocabulary | private metadata events | raw body analytics |
| PROV | lineage | exam/source/model graph | detached provenance docs |
| NIST | governance/TEVV | risk register and release gate | compliance theater |

## 7. 최종 권고

세계급 차이는 도구 수가 아니라 다음에서 발생한다.

1. 정확한 answer anchor
2. subject-specific deterministic/source/rubric trust
3. server-enforced tutor state machine
4. verified transfer item foundry
5. learner-private deduction lineage
6. evidence-driven daily command
7. honest abstention and escalation
8. exportable continuity
9. held-out efficacy and voluntary repurchase proof
