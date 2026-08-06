---
document_title: "답안길 Versioned Exam Scope & Evidence Graph v1"
document_subtitle: "V12 Official Coverage Compiler의 공식 범위·시험일 규범·기출 unit·버전 교차·우선순위를 연결하는 필수 공통 인프라"
document_role: "final master plan v12 and Official Coverage Compiler mandatory common-infrastructure annex"
status: "owner-strategy/non-authoritative"
dated: "2026-08-06 KST"
repository: "chachathecat/inverge"
integrates_with:
  - "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v12-2026-08-06.md"
  - "docs/strategy/dabangil-appraiser-coverage-compiler-and-original-question-engine-v1-2026-08-06.md"
  - "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v11-2026-08-05.md"
  - "docs/strategy/dabangil-professional-exam-reasoning-os-master-plan-v8-2026-08-05.md"
  - "docs/strategy/dabangil-adaptive-understanding-progression-recovery-master-plan-v9-2026-08-05.md"
owner_decision: "docs/decisions/2026-08-06-owner-versioned-exam-scope-evidence-graph.md"
machine_contract: "config/dabangil-versioned-exam-scope-evidence-graph-v1.json"
common_infrastructure_name: "Versioned Exam Scope & Evidence Graph"
common_infrastructure_short_name: "VESG"
first_build_order:
  - "감정평가실무 2013-2026, question/subquestion/points/procedure-step level"
  - "감정평가이론 및 감정평가·보상법규 2013-2026, question/subquestion/points/command-and-issue level"
  - "제1차 2016-2026, question/option/proposition/error-point level"
current_learner_facing_scope: "Dabangil Appraiser Second three subjects only"
runtime_authorization: "none"
schema_authorization: "none"
migration_authorization: "none"
production_authorization: "none"
real_content_authorization: "none"
first_stage_activation_authorization: "none"
execution_rule: "This annex defines the common graph, exact first-build order and release gates. It does not authorize implementation or activation."
---

# 답안길 Versioned Exam Scope & Evidence Graph v1

## V12 Coverage Compiler를 실제로 구축 가능한 버전형 근거 그래프로 고정하는 필수 부속 명세

V12는 다음 네 층을 이미 고정한다.

```text
Official Coverage Compiler
→ Original Concept Curriculum
→ Synthetic Question Engine
→ Private Ephemeral Book Tutor
```

VESG는 그중 첫 번째 층의 이름만 바꾸는 별도 제품이 아니다. 네 층이 같은
범위·같은 규범·같은 기출 unit을 참조하도록 만드는 **공통 데이터·근거
계층**이다.

```text
공식 시험권위 / 현행 규범 / 공식 기출 / 권리 manifest
                         ↓
       Versioned Exam Scope & Evidence Graph
                         ↓
Coverage Compiler / Original Curriculum / Question Engine
QuestionReference / Evidence Review / Today Plan / AUP rail
```

VESG가 없으면 다음 오류가 생긴다.

- 공식 범위와 기출빈도를 같은 값으로 취급
- 과거 기출의 당시 정답을 현재 정답으로 덮어쓰기
- 2차 문제 전체를 한 논점으로만 분류
- 1차 정답 번호만 저장하고 오답선지의 명제를 잃음
- 최근 출제되지 않은 공식 영역을 범위 밖으로 삭제
- 빈도를 출제확률처럼 표시
- 기출 mapper와 synthetic generator가 서로 다른 taxonomy 사용
- 개정법·K-IFRS·실무기준 변경 시 영향범위를 추적하지 못함

> **VESG는 `공식 출제경계 × 목표 시험일 규범 × 기출 관측 × 버전 교차 ×
> 공식 미출제·한 단계 변형 × 검증된 학습 우선순위`를 서로 덮어쓰지 않고
> 연결하는 immutable evidence graph다.**

이 문서는 runtime, API, UI, DB schema, migration, RLS, Storage, provider,
dependency, 실제 기출 ingest, 제1차 learner-facing activation 또는 Production을
승인하지 않는다.

---

## 1. 첨부 공식 출제영역의 정확한 역할

Owner가 제공한 과거 공식 출제영역은 다음 root를 제공한다.

### 제1차

- 민법: 총칙·물권
- 경제학: 미시 7영역, 거시 8영역
- 회계학: 중급·고급회계, 원가·관리회계
- 감정평가 관계법규: 법률별 범위
- 부동산학원론: 총론과 각론 10개 영역

### 제2차

```text
감정평가실무
- 기초
- 물건별: 토지·건물·권리 등
- 목적별: 담보·보상·경매/소송·가격공시 등
- 응용: 상담·자문·평가검토 등

감정평가이론
- 원리: 기초·응용이론
- 방식: 비교·원가·수익·기타
- 방식의 응용: 물건별·목적별

감정평가 및 보상법규
- 부동산 가격공시에 관한 법률
- 감정평가 및 감정평가사에 관한 법률
- 토지보상법
```

이 문서는 `HISTORICAL_OFFICIAL_SCOPE`로 보존한다. 오래된 법률명과 현재
법률체계를 동일시하지 않으며 다음 precedence를 적용한다.

```text
시험일 현재 시행 규범
→ 목표연도 시행령 시험과목 별표
→ 목표연도 Q-Net 시행계획·정정공고
→ 공식 세부 출제영역
→ 공식 기출과 당시 최종정답
→ 답안길 자체 prerequisite·misconception·transfer 설계
```

공식 자료가 직접 말하는 범위와 답안길이 교육을 위해 독립 설계한
prerequisite, 쉬운 비유, 오개념, bridge, 변형문제, D+7 gate를 구분한다.

---

## 2. 다섯 개의 orthogonal view

| View | 질문 | source of truth |
| --- | --- | --- |
| `OfficialScope` | 공식적으로 출제 가능한가 | 시행계획·시행령·공식 출제영역 |
| `TargetDateNorm` | 목표 시험일에 무엇이 유효한가 | 현행·연혁 법령, K-IFRS, 실무기준, 판례 |
| `ObservedExam` | 실제로 무엇이 어떻게 출제됐는가 | 공식 기출·최종정답·공개 채점평 |
| `AdjacentAndUnobserved` | 미출제·변형 방어범위는 무엇인가 | 공식 node와 reviewed one-hop edge |
| `LearningPriority` | 지금 무엇을 먼저 공부할까 | explainable corpus feature + learner evidence adapter |

다음 값은 분리한다.

```ts
type VESGDecisionAxesV1 = {
  scopeStatus: ScopeStatusV1;
  observationStatus: ObservationStatusV1;
  currentValidity: CurrentValidityV1;
  priorityTier: "A" | "B" | "C" | "D" | null;
  priorityScore: number | null;
  confidence: "low" | "medium" | "high";
  reviewStatus: "candidate" | "reviewed" | "conflict" | "released" | "held";
};
```

강제 invariant:

```text
priority low ≠ outside scope
not observed ≠ outside scope
recently tested ≠ excluded next year
long absent ≠ automatically likely next year
```

---

## 3. source authority를 세 축으로 평가

```ts
type SourceAuthorityV1 = {
  scopeAuthority: 0 | 1 | 2 | 3 | 4 | 5;
  answerAuthority: 0 | 1 | 2 | 3 | 4 | 5;
  examEvidence: 0 | 1 | 2 | 3 | 4 | 5;
};
```

예:

| Source | scope | answer | exam evidence |
| --- | ---: | ---: | ---: |
| 목표연도 시행계획·시행령 | 5 | 3 | 2 |
| 현행 법령·K-IFRS·실무기준 | 4 | 5 | 1 |
| Q-Net 공식 기출 | 2 | 2 | 5 |
| Q-Net 1차 최종정답 | 1 | 해당 회차 5 | 5 |
| 공개 2차 채점평 | 1 | 4 | 5 |
| 판례·공식 해석 | 2 | 4 | 2 |
| 사설 기본서·강의 | 0 | 0 | 0 |

사설 자료는 alias, 후보 논점, 학습순서 발견에만 사용한다. 공식 범위나
현재 정답을 단독 확정하지 않는다.

모든 판단 provenance:

```text
SOURCE_EXPLICIT
SOURCE_DERIVED
EXAM_OBSERVED
REVIEWED_INFERENCE
MODEL_CANDIDATE
```

`MODEL_CANDIDATE`는 learner-facing release, current answer 또는 official
coverage 계산에 사용하지 않는다.

---

## 4. 시간·규범·정답 버전 계약

### 4.1 두 정답 상태

```ts
type HistoricalAnswerBindingV1 = {
  answerAsExamined: AnswerStateV1;
  answerAsOfTargetDate: AnswerStateV1;
  changeType: NormChangeTypeV1;
  examNormSnapshotId: string;
  targetNormSnapshotId: string;
  evidenceRefs: string[];
};
```

- `answerAsExamined`: 실제 시험일 당시 규범과 공식 정답
- `answerAsOfTargetDate`: 목표 시험일에 같은 사실관계를 물었을 때의 정답

과거 정답을 현재 정답으로 overwrite하지 않는다.

```ts
type NormChangeTypeV1 =
  | "UNCHANGED"
  | "RENUMBERED"
  | "RENAMED"
  | "AMENDED_SAME_RESULT"
  | "ANSWER_CHANGED"
  | "SPLIT"
  | "MERGED"
  | "REPEALED"
  | "HISTORICAL_ONLY"
  | "OUTSIDE_CURRENT_SCOPE"
  | "REVIEW_REQUIRED";
```

### 4.2 effective interval

모든 법령·기준·판례상태에는 다음을 둔다.

```text
published_at
promulgated_at
valid_from
valid_to
retrieved_at
content_digest
```

공포일과 시행일을 분리한다. 목표 시험일 이후 시행되는 규범은
`FUTURE_WATCH`이며 현재 정답에 선반영하지 않는다.

### 4.3 Exam regime

```ts
type ExamRegimeV1 = {
  regimeId: string;
  stage: "first" | "second";
  subjectId: string;
  fromExamYear: number;
  toExamYear?: number;
  reason:
    | "subject_structure"
    | "statutory_framework"
    | "appraisal_rule_framework"
    | "accounting_standard_framework"
    | "format_or_scoring"
    | "reviewed_other";
  evidenceRefs: string[];
};
```

첫 구축 engineering window는 다음으로 고정한다.

```text
제2차: 2013-2026
제1차: 2016-2026
```

이는 그 이전 문제가 범위 밖이라는 뜻이 아니다. 먼저 modern-regime corpus를
완성하기 위한 bounded window이며 이전 기출은 historical regime으로 보존한다.

---

## 5. graph contract

### 5.1 node

```ts
type VESGNodeTypeV1 =
  | "EXAM"
  | "STAGE"
  | "SUBJECT"
  | "OFFICIAL_DOMAIN"
  | "CURRICULUM_FAMILY"
  | "ATOMIC_CONCEPT"
  | "ISSUE"
  | "FORMULA"
  | "PROCEDURE_STEP"
  | "MISCONCEPTION"
  | "QUESTION_ARCHETYPE"
  | "STATUTE"
  | "ARTICLE"
  | "STANDARD"
  | "CASE"
  | "NORM_VERSION"
  | "EXAM_REGIME"
  | "QUESTION"
  | "QUESTION_UNIT"
  | "OPTION_PROPOSITION"
  | "EVIDENCE_GATE";
```

### 5.2 edge

```ts
type VESGEdgeTypeV1 =
  | "IS_PART_OF"
  | "REQUIRES"
  | "APPLIES_TO"
  | "GOVERNED_BY"
  | "INTERPRETED_BY"
  | "CONTRASTS_WITH"
  | "EXCEPTION_TO"
  | "TESTED_BY"
  | "REQUIRED_TO_SOLVE"
  | "CO_OCCURS_WITH"
  | "CHANGED_TO"
  | "RENAMED_TO"
  | "SPLIT_INTO"
  | "MERGED_INTO"
  | "TRANSFORMS_TO"
  | "SUPPORTED_BY"
  | "RELATED_REFERENCE";
```

### 5.3 상태

```ts
type ScopeStatusV1 =
  | "OFFICIAL_EXPLICIT"
  | "OFFICIAL_DERIVED"
  | "OFFICIAL_UNOBSERVED"
  | "PRIVATE_CANDIDATE"
  | "OUTSIDE_CURRENT_SCOPE";

type ObservationStatusV1 =
  | "OBSERVED_DIRECT"
  | "OBSERVED_COMPONENT"
  | "ADJACENT_ONE_HOP"
  | "NOT_OBSERVED";

type CurrentValidityV1 =
  | "TARGET_CURRENT"
  | "FUTURE_WATCH"
  | "HISTORICAL_ONLY"
  | "ANSWER_CHANGED"
  | "REPEALED"
  | "REVIEW_REQUIRED";
```

### 5.4 canonical labels

official, historical, academy alias를 canonical node와 분리한다. 사설 표현을
alias로 연결할 수 있으나 official status를 부여하지 않는다.

---

## 6. logical storage model

구현 Work가 검토할 최소 record:

```text
source_document
source_locator
rights_manifest
norm_version
exam_regime
scope_node
scope_edge
scope_label
exam_question
question_unit
option_proposition
historical_answer_binding
version_crosswalk
priority_snapshot
review_log
graph_build_snapshot
```

필수 trace:

```text
scope node
→ source document
→ exact locator
→ norm version
→ question unit
→ review decision
→ immutable graph snapshot
```

기존 `QuestionReference`를 폐기하지 않는다. VESG adapter가 다음을 연결한다.

```ts
type QuestionReferenceVESGLinkV1 = {
  questionReferenceId: string;
  examQuestionId: string;
  questionUnitIds: string[];
  scopeNodeIds: string[];
  examRegimeId: string;
  examNormSnapshotId: string;
  targetNormSnapshotId: string;
  rightsManifestId: string;
  graphSnapshotId: string;
};
```

기존 free-text `topicTags`, `issueTags`, `conceptTags`는 검색 호환용이며 공식
범위·현행성·우선순위의 source of truth가 아니다.

---

## 7. 기출 최소 분석단위

## 7.1 제2차 감정평가실무

```text
exam
→ question
→ subquestion
→ points
→ required judgment/calculation
→ complete procedure step
→ object × purpose × method × condition
→ norm snapshot
→ result and verification state
```

최소 unit은 숫자 하나가 아니라 **하나의 판단 또는 계산결과를 만드는 완결된
처리단계**다.

필수 tag:

- 대상물건
- 평가목적
- 평가방식
- 평가절차
- 자료 사용·배제
- 평가조건·기준시점
- 특수쟁점
- 처리방침
- 계산순서·단위·반올림
- 다른 방식 합리성 검토
- 실무기준·법령
- 이론·법규 bridge

## 7.2 제2차 감정평가이론

```text
concept
× command verb
× comparison target
× theory family
× practical linkage
× criticism/limitation
× improvement/transfer
```

`설명`, `비교`, `논함`, `검토`, `비판`, `적용`, `개선`을 별도 observed
pattern으로 저장한다.

## 7.3 제2차 감정평가 및 보상법규

```text
statute/article
→ issue
→ administrative-law doctrine
→ decisive case facts
→ application
→ conclusion
→ remedy/action form
```

판례 결론만 저장하지 않고 결론을 바꾼 사실요소를 구조화한다.

## 7.4 제1차

```text
exam
→ question
→ option
→ independent proposition
→ truth as examined
→ exact error point
→ governing norm/formula
→ truth as target date
→ trap type
```

과목별 추가 축:

- 민법: 조문·요건·효과·판례·예외
- 경제학: 모형·가정·변수·그래프·수식·비교정태
- 회계학: K-IFRS 기준서·인식·측정·표시·공시·분개
- 관계법규: 법률·조문·주체·절차·기한·예외·제재
- 부동산학: 개념·모형·공식·정책·투자·금융·평가

---

## 8. 공식 미출제와 one-hop 변형

```text
OfficialUnobserved
= current official node with no verified question link

OneHopAdjacent
= one reviewed transformation from an observed unit
  that remains inside current official scope
```

변형축:

- 1차: 주체, 요건, 원칙/예외, 기간·비율, 사실관계, 계산변수
- 실무: 물건, 목적, 방식, 기준시점, 자료, 조건, 일부/일괄
- 이론: 설명/비교/비판/적용/개선
- 법규: 처분단계, 당사자, 소송형태, 하자, 구제수단, 결정적 사실

두 hop 이상은 공동출제, 동일 공식규정, 필수 prerequisite 또는 공식 판례 연결
중 하나가 없으면 생성하지 않는다.

Synthetic Question Engine은 검토된 VESG node와 one-hop policy만 입력으로
사용하며 기출 원문을 조금 바꾼 문제를 독창 문제로 취급하지 않는다.

---

## 9. explainable corpus priority

priority는 출제확률이 아니라 학습시간 배분 feature다.

```text
Priority
= 0.25F
+ 0.20M
+ 0.15R
+ 0.15C
+ 0.10G
+ 0.10Δ
+ 0.05T
```

- `F`: regime-adjusted frequency
- `M`: 제1차 option exposure 또는 제2차 배점
- `R`: recency
- `C`: prerequisite·cross-subject centrality
- `G`: 공식 최종정답·채점평 강조
- `Δ`: 개정·신설·drift 위험
- `T`: reviewed transformability

초기 후보:

```text
first-stage recency half-life: 5 years
second-stage recency half-life: 8 years
current regime weight: 1.00
transition regime: 0.65
historical regime: 0.25
```

실제 weight는 과목별 walk-forward backtest 후 확정한다.

tier:

```text
A recurrent/high-mark/central
B transformable/prerequisite
C official low-frequency or unobserved
D historical/private candidate
Excluded outside current official scope
```

`OFFICIAL_EXPLICIT`, `OFFICIAL_DERIVED`, `OFFICIAL_UNOBSERVED`는 C 아래로
내려가지 않는다.

learner-facing 금지:

```text
다음 시험 출제확률
올해 반드시 출제
작년에 나와서 올해 제외
오래 안 나와서 곧 출제
```

---

## 10. walk-forward backtest

미래연도 데이터 누출을 금지한다.

```text
data through year N
→ build snapshot
→ compare with exam N+1
→ repeat
```

baseline:

- 공식 목차만
- 단순 누적빈도
- 최근 5개년
- 최근 출제연도
- VESG model

평가:

### 제1차

- A/B node의 다음 해 문항·선지 포괄률
- official-unobserved 신작 방어율
- 신규 trap 포착률
- 동일 공부량의 놓친 문항수

### 제2차

- A/B node의 다음 해 배점 포괄률
- one-hop의 신규 세부물음 포착률
- 대분류만 맞고 요구행위를 놓친 비율
- 낡은 정답 사용 건수
- 범위 압축 시 놓친 배점

목적함수:

```text
minimize
  missed_actual_marks
+ stale_answer_risk × high_penalty
+ official_scope_omission × high_penalty
+ unnecessary_scope_expansion
```

---

## 11. ingestion and review

```text
official source discovery
→ source authority and rights gate
→ exact-byte/hash manifest
→ layout-aware extraction
→ question/subquestion/option segmentation
→ candidate node mapping
→ norm-version binding
→ Review A
→ blinded Review B
→ conflict resolution
→ deterministic graph validation
→ immutable snapshot
```

AI output starts as `MODEL_CANDIDATE`.

OCR is fallback. 표·수식·도면은 page image review가 필요하다. 원문,
normalized text, OCR candidate, manual correction을 덮어쓰지 않고 lineage로
보존한다.

rights unclear:

```text
metadata + locator + hash + deep link only
```

공식 공개와 재배포권을 동일시하지 않는다.

---

## 12. V12와 Original Question Engine 연결

VESG는 V12의 네 층을 다음처럼 연결한다.

```text
Official Coverage Compiler
= VESG official/norm/observed views + coverage audit

Original Concept Curriculum
= VESG official nodes + owned prerequisite/misconception/skill child nodes

Synthetic Question Engine
= validated VESG nodes + difficulty + one-hop policy + subject validator

Private Ephemeral Book Tutor
= private concept/error candidate → trusted VESG resolver
  → original transfer problem
```

강제 분리:

```text
question verification
≠ answer verification
≠ grading authority
≠ mastery evidence
```

Book Tutor의 transient source는 공용 VESG node로 자동 승격하지 않는다.

---

## 13. 정확한 첫 구축 순서 — 기존 ACC sequence amendment

V12의 ACC 전체 단계는 유지하되 첫 corpus build 순서를 다음으로 교체한다.

```text
VESG-0 / ACC-0A
Authority/source/rights contract
historical official scope root
current official root
ID/status/locator rules

VESG-1 / ACC-1P
감정평가실무 2013-2026
question → subquestion → points → procedure step
object/purpose/method/condition/norm mapping

VESG-2 / ACC-1TL
감정평가이론·감정평가 및 보상법규 2013-2026
theory command patterns
law issue/doctrine/case-fact/application/remedy

VESG-3 / ACC-1F
제1차 2016-2026
question → option → proposition → exact error point
official final answer + target-date review

VESG-4 / ACC-2
current law/K-IFRS/practice-standard closure
historical/current answer crosswalk
drift watcher

VESG-5 / ACC-5P
official-unobserved report
one-hop adjacency
priority features
walk-forward backtest

VESG-6
QuestionReference, Coverage Compiler, Curriculum,
Question Engine, Today Plan and AUP read adapters

VESG-7
hostile synthetic and Owner-private rights-cleared evaluation
```

이 순서가 기존 문서의 `ACC-3 First-stage seed → ACC-4 Second-stage seed →
ACC-5 past-question mapper`보다 우선한다.

원칙:

1. 첫 corpus source of structure는 2차 실무 기출 unit이다.
2. 실무에서 검증한 segmentation·norm binding을 이론·법규로 확장한다.
3. 그 뒤 제1차를 option proposition 수준으로 구축한다.
4. concept seed map은 기출 unit을 기다리느라 비워두지 않지만 release taxonomy로
   확정하지 않는다.
5. 제1차 corpus 완성은 제1차 learner-facing runtime 승인이 아니다.

---

## 14. hard gates

```text
orphan_exam_question = 0
unallocated_second_stage_points = 0
unsegmented_first_stage_option = 0
official_node_without_source = 0
current_answer_without_norm_version = 0
changed_answer_not_flagged = 0
future_norm_applied_early = 0
cross_regime_link_without_crosswalk = 0
official_node_below_C_floor = 0
unreviewed_model_candidate_visible = 0
future_data_leakage_in_backtest = 0
uncleared_raw_text_in_shared_graph = 0
priority_presented_as_probability = 0
```

release state:

```text
DRAFT
SOURCE_VERIFIED
SUBJECT_REVIEWED
NORM_BOUND
BACKTESTED
OWNER_PRIVATE_READY
BLOCKED
```

---

## 15. Definition of Done

### VESG-0

- source authority·rights·locator·ID contracts
- historical official root/current root crosswalk
- deterministic fixtures

### VESG-1

- 공식 확인 가능한 실무 2013-2026 inventory
- 모든 물음·배점·처리단계 연결
- norm-dependent unit binding
- orphan and unallocated points 0

### VESG-2

- 이론·법규 2013-2026 unit graph
- 이론 command patterns
- 법규 issue/doctrine/case facts/remedy
- changed/repealed result flags

### VESG-3

- 제1차 2016-2026 모든 문항·선지 명제화
- official final answer binding
- law/accounting target-date review
- learner-facing first-stage activation 0

### shared release

- source provenance 100%
- official node evidence 100%
- rights violation 0
- stale/future norm misapplication 0
- future-data leakage 0
- reproducible graph digest
- unreviewed candidate exposure 0
- Owner-private read evaluation pass

---

## 16. 최종 제품 문장

> **답안길 V12는 Versioned Exam Scope & Evidence Graph를 공통 인프라로
> 사용한다. 공식 출제영역은 외곽선, 시험일 현재 규범은 정답 기준, 역대
> 기출의 물음·선택지는 실제 관측, 공식 미출제와 한 단계 변형은 불의타
> 방어범위, 검증된 빈도·배점·최근성·중심성은 학습 우선순위로 분리한다.
> 첫 구축은 감정평가실무 2013-2026, 감정평가이론·법규 2013-2026,
> 제1차 2016-2026 선택지 명제 순으로 진행한다.**
