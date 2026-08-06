---
document_title: "답안길 / Professional Exam Reasoning OS 통합 마스터플랜 최종본 v12"
document_subtitle: "저작권 안전한 개인 Book Tutor와 감정평가사 1차·2차 Official Coverage Compiler·Original Question Engine을 결합한 단일 전략 통제본"
document_role: "single active strategy entry point and final control plane"
status: "owner-strategy/proposed-final-for-merge"
dated: "2026-08-06 KST"
repository: "chachathecat/inverge"
active_pointer: "docs/strategy/ACTIVE-MASTER-PLAN.md"
coverage_owner_decision: "docs/decisions/2026-08-06-owner-appraiser-coverage-and-original-question-engine.md"
source_safety_owner_decision: "docs/decisions/2026-08-05-owner-safe-ephemeral-study-finalization.md"
coverage_spec: "docs/strategy/dabangil-appraiser-coverage-compiler-and-original-question-engine-v1-2026-08-06.md"
coverage_machine_contract: "config/dabangil-appraiser-coverage-engine-v1.json"
source_safety_machine_contract: "config/dabangil-ephemeral-source-safety-contract-v1.json"
inherits_as_mandatory_annexes:
  - "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v11-2026-08-05.md"
  - "docs/strategy/dabangil-professional-exam-reasoning-os-master-plan-v8-2026-08-05.md"
  - "docs/strategy/dabangil-adaptive-understanding-progression-recovery-master-plan-v9-2026-08-05.md"
supersedes_for_strategy:
  - "v11 as the single active entry point; v11 remains the mandatory source-safety annex"
  - "any strategy that treats third-party textbook accumulation as the primary coverage strategy"
  - "any strategy that equates recent frequency with complete exam coverage"
  - "any strategy that releases unverified generated questions or labels generated references as official answers"
strategy_coverage_scope: "감정평가사 제1차 5개 과목 + 제2차 3개 과목"
current_learner_facing_runtime_scope: "Dabangil Appraiser Second three subjects only"
first_stage_runtime_authorization: "none"
real_third_party_content_authorization: "none"
runtime_authorization: "none"
schema_authorization: "none"
provider_authorization: "none"
dependency_authorization: "none"
deployment_authorization: "none"
production_authorization: "none"
external_learner_authorization: "none"
commercial_authorization: "none"
execution_rule: "Every Work must reconcile live repository/runtime, AGENTS.md, roadmap authority, current exam sources, exam-date law/accounting standards, provider contracts and rights. This document does not itself authorize implementation, merge or real-source processing."
research_checked_at: "2026-08-06 KST"
---

# 답안길 / Professional Exam Reasoning OS 통합 마스터플랜 최종본 v12

## 시험범위를 문제집으로 소유하지 않고, 공식 범위를 능력으로 컴파일하는 학습 OS

---

## 0. 최종 결론

답안길의 감정평가사 제품은 다음 두 개의 학습경로를 하나의 evidence kernel에
연결한다.

```text
A. Original Curriculum Path — 주력
공식 시험과목·출제영역·현행 기준·공식 기출
→ concept graph
→ 독창 문제
→ solver/validator
→ repair·transfer·D+7·timed evidence

B. Private Book Companion Path — 보조
사용자가 적법하게 가진 문제 한 건
→ 일회성 분석
→ 독립 설명·오답진단
→ source-scrubbed concept signature
→ A 경로의 새 변형문제
→ 동일 evidence kernel
```

답안길의 전범위 커버리지는 사용자가 올린 여러 문제집을 모아 만들지 않는다.
공식 범위와 현행 기준을 빠짐없이 versioned graph로 편성하고 그 graph에서
검증 가능한 독창 문제를 만든다.

사용자는 한 권 전체를 문제별로 공부할 수 있다. 그러나 무라이선스 문제집의
원문·OCR·표·해설·source-bound 전체풀이가 답안길 서버의 문제은행, cloud raw
vault, RAG, embedding, training/evaluation 또는 다른 사용자의 답변이 되지
않는다.

---

# PART I — Authority

## 1. 단일 active entry point

이 문서가 전략상 단일 진입점이다.

```text
ACTIVE-MASTER-PLAN.md
→ v12
   ├─ v11: source safety and legal operation annex
   ├─ coverage compiler/original question engine spec
   ├─ v8: reasoning OS, evidence, Full-Day, Lean Owner-private annex
   └─ v9: adaptive understanding, action rail, progression and ethical momentum annex
```

충돌 시 더 엄격한 privacy·rights·evidence·currentness·release rule을 따른다.

## 2. Authority precedence

```text
live law / accounting standard / official exam authority
→ live repository and runtime facts
→ current AGENTS.md and roadmap authority
→ final dated Owner decisions
→ machine-readable contracts
→ v12
→ mandatory annexes where non-conflicting
```

전략 문서의 URL·과거 SHA·연구일은 runtime 권위가 아니다. 구현·배포·실제
자료 처리 전 다시 읽는다.

## 3. 전략범위와 runtime 범위 분리

```text
strategy coverage:
  제1차 5과목 + 제2차 3과목

current learner-facing runtime:
  제2차 실무·이론·법규 only

not authorized by v12:
  제1차 navigation/API/persistence
  실제 generator runtime
  실제 third-party textbook processing
  provider change
  schema/RLS/Storage change
  external learner/payment/Production
```

제1차를 상세 설계했다고 현재 앱에 자동 활성화하지 않는다.

---

# PART II — Product identity

## 4. 답안길이 아닌 것

- 문제집 PDF 보관소
- 출판사별 AI 답지 검색기
- 모범답안 복제기
- 정답만 보여주는 챗봇
- 최근 기출 빈도만으로 범위를 잘라내는 예상문제 앱
- XP·streak만으로 성취를 꾸미는 게임
- 모델의 자신감을 공식 채점으로 표시하는 시스템
- 합격보장·출제확정·공식답안 서비스

## 5. 답안길인 것

> **공식 시험범위를 prerequisite와 transfer 단위로 컴파일하고, 사용자가 처음
> 보는 표현·수치·사실관계에서도 제한시간 안에 설명·계산·논증하도록 만드는
> evidence-gated Professional Exam Reasoning OS**

## 6. 제품가치의 우선순위

```text
1. 범위 누락 방지
2. 개념의 정확한 이해
3. 독립적 적용
4. 오개념 교정
5. 처음 보는 변형 전이
6. 간격 후 회복
7. 제한시간 통합
8. 학습경로의 지속성과 복귀
```

정답 생성속도나 답안의 화려함은 위 목표보다 우선하지 않는다.

---

# PART III — Content operating model

## 7. 네 개의 content plane

### Plane A — Authority plane

- 시험과목 별표
- Q-Net 시행계획·정정공고
- 공식 출제영역
- 시험일 현재 법률·시행령·시행규칙
- 시험일 현재 K-IFRS
- 감정평가에 관한 규칙·감정평가 실무기준
- 공식 기출·최종정답·공개 이용조건

### Plane B — Curriculum plane

- concept graph
- prerequisite graph
- 1차↔2차 bridge
- misconception registry
- skill operations
- question families
- mastery gates

### Plane C — Generation plane

- question planner
- subject generator
- deterministic solver
- rubric validator
- adversarial critic
- copyright non-reconstruction scanner
- release gateway

### Plane D — Learner evidence plane

- attempt
- assistance/exposure
- error cause
- repair
- near/far transfer
- D+1/D+7
- timed integration
- Review Queue
- next action ≤3

각 plane은 source raw body와 권한을 혼합하지 않는다.

## 8. 콘텐츠의 두 공급경로

### 8.1 Original path

```text
authority snapshot
→ validated concept
→ owned explanation
→ original question
→ verified solution/reference
→ learner attempt
```

### 8.2 Book path

```text
client-held source
→ ephemeral processor
→ client-only full explanation
→ source-scrubbed private projection
→ original concept resolver
→ original transfer question
```

Book path의 source는 Original path의 shared generation corpus로 들어가지 않는다.

---

# PART IV — Complete coverage

## 9. “완벽하게 커버”의 정의

미래 시험을 완벽하게 예측한다는 의미는 금지한다.

```text
Complete Coverage V1 =
  official subject completeness
× official detailed-scope completeness
× historical official-question mapping completeness
× current authority completeness
× prerequisite/bridge completeness
× question/evidence completeness
```

곱셈으로 보는 이유는 한 축이 0이면 전체가 실질적으로 0이기 때문이다.

## 10. 공식 범위 envelope

### 제1차

- 민법 중 총칙·물권
- 경제학원론
- 부동산학원론
- 감정평가 관계 법규
- 회계학
- 영어는 외부 성적으로 대체되는 행정 gate이며 curriculum subject가 아님

### 제2차

- 감정평가실무
- 감정평가이론
- 감정평가 및 보상법규

세부 family는 mandatory coverage spec에 따른다.

## 11. 범위 우선순위

```text
foundation
recurrent
rotation
bridge
watch
retired
```

- `foundation`: 다른 문제를 풀기 위한 전제
- `recurrent`: 여러 형식·연도에서 반복
- `rotation`: 공식 범위지만 최근 빈도가 낮을 수 있음
- `bridge`: 과목·1차·2차를 연결
- `watch`: 개정·새 기준·신출제 가능성 관찰
- `retired`: 과거기출 해석용

`최근 안 나왔다`는 이유로 rotation을 삭제하지 않는다.

## 12. Coverage release gate

```text
official leaf unmapped = 0
selected official past-question window unmapped = 0
active currentness unknown = 0
released concept without source = 0
released concept without question family = 0
released question without verifier = 0
bridge without transfer task = 0
```

---

# PART V — Concept graph

## 13. Node가 답해야 하는 질문

각 concept는 다음을 기계적으로 답해야 한다.

1. 무엇인가?
2. 왜 필요한가?
3. 어떤 요건·공식·절차인가?
4. 언제 적용되지 않는가?
5. 무엇과 헷갈리는가?
6. 문제에서는 어떻게 변형되는가?
7. 1차와 2차 어디로 이어지는가?
8. 무엇을 무도움으로 해야 통과인가?
9. 어떤 source와 effective date가 근거인가?
10. 변경되면 어떤 문제와 evidence가 hold되는가?

## 14. Atomic unit

```text
concept name alone ❌

claim
+ condition
+ operation
+ misconception
+ representation
+ transfer
+ evidence gate ✅
```

예를 들어 `효용적수`는 정의·면적곱·층/호 합성·전체분모·토지배분·반올림·표작성·
설명·변형 전이를 별도 atomic node로 갖는다.

## 15. 1차↔2차 bridge

- 민법 물권·등기·담보 → 권리평가·경매·보상
- 경제·부동산학 시장·지대 → 가치형성·시장분석
- 현재가치·투자·회계 현금흐름 → 수익환원·DCF
- 부동산학 가격원칙·3방식 → 이론·실무
- 관계법규 → 공법상 제한·공시·감정평가법·보상
- 회계 원가 → 원가방식, 회계 수익 → 수익방식

객관식 정답만으로 bridge를 통과시키지 않는다.

---

# PART VI — Original Question Engine

## 16. Generation is not free-form

```text
target contract
→ constrained generation
→ independent solve/validate
→ adversarial critique
→ rights scan
→ release
```

`AI가 답과 해설을 함께 한 번 생성`하는 방식은 production release가 아니다.

## 17. Source inputs

허용:

- validated concept graph
- 답안길 소유 curriculum
- 이용조건이 확인된 공식 calibration metadata
- current authority snapshot
- difficulty·misconception policy
- learner-private closed mastery state

금지:

- 무라이선스 교재 raw image/OCR
- 출판사 해설 표현
- user transient problem corpus
- unknown-rights 자료
- 다른 사용자의 source-bound answer cache

## 18. 문제형식

### 제1차

- 정의·구별
- 조문·규칙 OX
- 계산
- 그래프
- 요건·예외
- A-B-C 권리관계
- 2개념 통합
- 오개념 distractor
- 역문제
- 시간제한 mixed set

### 제2차 실무

- 단일 계산
- 표 채우기
- 오류교정
- 역산
- 방법선정
- 25·50·100점
- 조건변경 전이
- 시간압축

### 제2차 이론

- 정의
- why-chain
- 비교
- 한계·비판
- 물건·목적 적용
- 25·50·100점
- 재작성

### 제2차 법규

- 쟁점발견
- 조문·판례 구별
- timeline
- 원고적격·소송형식
- 목차
- 포섭
- 복수쟁점
- 개정 전후

## 19. Difficulty vector

난이도는 상·중·하 하나가 아니다.

```text
prerequisite depth
operation count
distractor similarity
data noise
representation shift
integration breadth
time pressure
```

사용자가 `같은 숫자만 바꾼 문제`를 풀었다고 far transfer로 인정하지 않는다.

## 20. Subject verifiers

- 민법 관계 solver
- 미시균형·거시항등식 solver
- 부동산 금융 solver
- 현행법 assertion solver
- K-IFRS roll-forward·분개·재무제표 연결 validator
- 실무 계산·단위·합계·반올림 solver
- 이론 요구동사·rubric coverage validator
- 법규 쟁점·소송형식·포섭 validator
- source-expression non-reconstruction validator

검증할 수 없는 문제는 learner에게 노출하지 않는다.

## 21. Generated reference answer

- 학습용 reference라고 표시
- 공식답안·공식채점기준 아님
- 불확실성·대안구성·근거상태 표시
- candidate→reviewer→release artifact
- learner answer와 reference를 혼동하지 않음

---

# PART VII — Official past questions

## 22. 역할

공식 기출은 전범위 정의가 아니라 calibration과 coverage audit 자료다.

```text
형식
배점
질문동사
개념조합
선택지 난도
자료량
답안분량
시간압박
```

을 학습한다.

## 23. Ingest rules

- Q-Net item별 이용조건 확인
- 정확한 출처표시
- historical effective date 고정
- 원문과 mapping metadata 분리
- current-law 재사용 시 정답 재검증
- 생성문제는 고유 문장·수치·표를 복원하지 않음

## 24. Gap report

- 공식 범위인데 기출 mapping이 없는 rotation
- 기출인데 concept가 없는 항목
- 현재 기준에서 정답이 바뀐 과거문항
- 문제형식이 하나뿐인 concept
- 2차 transfer가 없는 1차 bridge
- 오개념 data가 없는 고난도 family

---

# PART VIII — Private Ephemeral Book Tutor

## 25. 한 권 전체 학습의 정확한 허용선

```text
한 사용자 생애 한 문제만 ❌
한 책에서 한 문제만 ❌
한 ephemeral job당 한 문제 ✅
```

같은 사용자가 한 권 전체를 순서대로 공부할 수 있다. 단:

- PDF·batch·연속 페이지 ingest 금지
- 한 번에 한 문제, 같은 한 문제의 불가피한 2페이지 예외
- source raw persistence 0
- cross-user reuse 0
- book-level answer database 0
- book-wide answer export 0

## 26. Book Tutor output

유지할 기능:

- 문제 요구 파악
- 사용자의 선행답안 분석
- 중학생 수준 독립설명
- 비유·암기법
- 계산·표·검산
- 가장 큰 간극
- 다음 행동

서버 저장 금지:

- 문제 원문·OCR
- 출판사 표·해설·예시답안
- source-bound 전체 AI 풀이
- 문제번호별 answer cache

서버 저장 가능:

- scrubbed learner answer
- closed concept/error code
- assistance/exposure
- repair type
- Review Queue
- D+1/D+7
- bodyless receipt

## 27. Original transfer bridge

Book Tutor의 마지막은 같은 문제의 정답 재열람이 아니다.

```text
book problem
→ concept/error diagnosis
→ fresh owned problem
→ no-help transfer
```

새 문제는 다른 이름만 바꾼 복사본이 아니라 representation·숫자·구조·요구방식
중 필요한 축을 바꾼다.

---

# PART IX — Learning kernel

## 28. Canonical loop

```text
ORIENT
→ COMMIT
→ ATTEMPT
→ SCAFFOLD
→ REPAIR
→ TRANSFER
→ REVIEW
→ INTEGRATE
```

## 29. Evidence ladder

```text
exposed
→ recognized
→ explained
→ applied_assisted
→ applied_independent
→ transferred_near
→ transferred_far
→ recovered_d7
→ integrated_timed
```

`full reveal`, `guided success`, `reference answer seen`은 독립성취가 아니다.

## 30. Adaptive understanding

AI는 대화에서 열린 간극을 추적하고 하단 action rail에 다음 행동을 제안한다.

- 한 문장으로 설명
- 표로 다시 만들기
- 계산 한 단계 재시도
- 힌트 없이 새 숫자
- 목차만 재작성
- D+1 예약

버튼은 mastery를 올리지 않는다. 실제 learner action과 검증결과만 올린다.

## 31. Scheduler

오늘의 primary task는 최대 3개다.

우선순위:

```text
prerequisite blockage
× official priority
× forgetting risk
× error severity
× transfer deficit
× exam proximity
× time cost
× subject balance
```

무한 생성능력을 무한 과제로 바꾸지 않는다.

---

# PART X — Data and safety

## 32. Data classes

v11의 D0–D6 source-safety 분류를 유지한다. coverage plane에서는 다음을
추가 구분한다.

```text
C0 current authority
C1 official scope metadata
C2 official past-question mapping
C3 owned concept graph
C4 generated candidate
C5 validated release artifact
C6 learner-private evidence
C7 held/retired/drift artifact
```

C0–C5와 transient user source를 같은 corpus로 섞지 않는다.

## 33. Raw processor capability

v11 불변식을 그대로 적용한다.

- DB/Storage/object credential 없음
- durable cache·queue 없음
- body log·trace·replay 없음
- background/batch/retry raw path 없음
- exact provider route만
- stale/unknown retention route block
- client-only full transient output

## 34. Rights separation

```text
official permitted source
→ item-level manifest and attribution

owned original curriculum
→ shared generation allowed

licensed source
→ exact license capability only

commercial user source
→ transient personal study only
```

`개인에게만 보인다`는 사실은 shared corpus 권한이 아니다.

---

# PART XI — Currentness

## 35. Current law/accounting gate

법규·회계·실무기준 node는 다음을 가져야 한다.

```text
source identity
effective from/to
exam date
last checked at
change digest
affected concepts/questions
review status
```

unknown이면 release를 막는다.

## 36. Drift watcher

- 시행령 시험과목 별표
- Q-Net 시행계획·정정
- 법률·시행령·시행규칙
- 감정평가 실무기준
- K-IFRS
- 공식 최종정답
- 중요 판례상태

변경 severity에 따라 question·domain·subject를 hold한다.

---

# PART XII — Product surfaces

## 37. Learner-facing surfaces

### Coverage Map

과목→영역→현재 막힌 prerequisite→다음 관문만 보여준다.

### Concept Workbench

```text
정의
왜
쉬운 비유
정확한 요건/공식
오개념
시도
자기설명
새 변형
```

### Question Studio

- 취약부분 1문제
- 같은 개념 새 구조
- 한 단계 어렵게
- 시험시간으로
- 틀린 이유부터

### Review Queue

- due reason
- prior assistance
- required independent action
- D+1/D+7
- no full-source body

## 38. Provenance UI

- AI 생성 학습문제
- 공식 문제/공식답안 아님
- 범위 근거
- 현행 기준일
- 검증상태
- 공식 기출이면 출처·이용조건

---

# PART XIII — Measurement

## 39. Coverage dashboard

- official domain total/mapped
- atomic concept draft/validated
- past question total/mapped
- currentness unknown
- question-family gap
- verifier gap
- bridge transfer gap
- rights unknown

## 40. Learning metrics

- first-attempt performance
- misconception repair
- explanation→transfer conversion
- D+7 recovery
- timed integration
- false mastery
- generated item rejection
- drift remediation time

원문·OCR·source-bound output을 analytics에 넣지 않는다.

## 41. No unauthorized fitting

learner data로 BKT·추천모델·합격확률을 fitting하는 것은 별도 권위 없이는
수행하지 않는다. 초기 scheduling은 설명가능한 규칙 기반이다.

---

# PART XIV — Execution

## 42. Combined program order

```text
A. 기존 live authority와 PR #676 등 현재 blocker를 먼저 사실대로 유지

B. Strategy closeout
- v12 human legal/product review
- explicit merge decision

C. Source-safety implementation — CPF
- sink inventory
- on-device preprocessing
- no-credential processor
- provider firewall
- output firewall
- bodyless evidence
- hostile acceptance
- written Korean copyright/privacy review

D. Coverage implementation — ACC
- source registry
- official scope normalizer
- concept graph
- past-question mapper
- original generator
- subject solvers/validators
- mastery/scheduler adapter
- book-tutor concept resolver
- hostile acceptance

E. Activation
- rights-cleared synthetic Owner dogfood
- exact-head evidence
- separate first-stage decision
- separate external/commercial gate
```

이 순서는 문서 병합만으로 live 작업을 자동 선택하지 않는다.

## 43. Incremental deliverables

### ACC-1

현재 source universe와 official leaf registry. 문제 생성 없음.

### ACC-2

1차 concept graph seed와 currentness. learner runtime 없음.

### ACC-3

2차 concept graph·bridge. existing learner loop와 schema 변경 없음.

### ACC-4

공식 기출 mapping과 gap report. 공개원문 재배포 없음.

### ACC-5

한 과목의 original question family + deterministic verifier synthetic-only.

### ACC-6+

과목별 확장, evidence integration, private book bridge.

큰 한 번의 implementation PR로 만들지 않는다.

---

# PART XV — Acceptance

## 44. Strategy acceptance

- 단일 active pointer
- v11 source-safety 유지
- 1차/2차 strategy coverage 명확
- 현재 runtime 2차 only 명확
- official source hierarchy
- complete coverage 비예측 정의
- concept graph·generator·verifier·evidence 계약
- Book Tutor 비축적·비공용화
- currentness and rights gates

## 45. Runtime acceptance before any real launch

```text
coverage official leaves 100%
selected past questions mapped 100%
active currentness unknown 0
raw source persistent residue 0
user-source shared corpus 0
released question without verifier 0
generated answer official-label defect 0
source reconstruction 0
held-out contamination 0
```

자동화 통과만으로 법률승인이나 real-source authority가 생기지 않는다.

## 46. Hostile product review

권리자·출제자·수험생·악의적 사용자의 관점에서 시험한다.

- 특정 책 전체를 조립할 수 있는가
- 답지 페이지를 넣어 개작할 수 있는가
- 같은 source가 다른 사용자에게 나오는가
- 공식 문제와 생성문제가 혼동되는가
- 법 개정 후 과거 정답이 current로 남는가
- 두 정답 문제를 release하는가
- AI 답을 본 뒤 mastery가 올라가는가
- scheduler가 과제를 폭주시킬 수 있는가

---

# PART XVI — Governance

## 47. 책임

- Coverage authority owner
- Law/accounting currentness owner
- Subject curriculum reviewer
- Generator/solver owner
- Rights and source-safety owner
- Privacy/CPO owner
- Takedown owner
- Independent release reviewer

한 사람이 생성·검증·release를 모두 단독 승인하지 않는다.

## 48. Change control

다음은 high-risk change다.

- source precedence 변경
- official scope leaf 삭제
- currentness gate 완화
- generator source allowlist 확대
- user source shared reuse
- reference answer label 변경
- mastery gate 완화
- provider retention route 변경

별도 review와 rollback을 요구한다.

---

# PART XVII — Commercial strategy

## 49. 가장 강한 장기 모델

```text
답안길 Original Curriculum
+ 공식 기출 calibration
+ Private Book Tutor
+ 출판사별 licensed Companion Pass
```

license가 있는 교재만 full cloud history·검색·RAG·공식 companion 기능을 연다.
일반 교재는 개인 transient path를 유지한다.

## 50. 차별화

문제은행 수량 경쟁이 아니다.

- 공식 범위 누락 0
- 오개념까지 연결된 concept graph
- 검증 가능한 독창 문제
- 왜 틀렸는지
- 새 문제 전이
- D+7 회복
- 1차↔2차 연결
- 저작권 안전한 source boundary

---

# PART XVIII — Final invariants

1. v12는 단일 active strategy entry다.
2. v11의 더 엄격한 source-safety 불변식을 약화하지 않는다.
3. 전략 coverage는 1차 5과목과 2차 3과목이다.
4. 현재 runtime scope는 2차 3과목뿐이다.
5. complete coverage는 정의된 source universe mapping이지 미래 적중보장이 아니다.
6. 공식 범위의 최근 미출제 영역을 삭제하지 않는다.
7. 현행 기준이 unknown인 법규·회계 content를 release하지 않는다.
8. 기출은 calibration과 audit에 쓰며 무검토 verbatim generation seed가 아니다.
9. Original Question Engine은 validated graph에서만 shared content를 만든다.
10. 상업 교재 user source는 shared generator corpus에 들어가지 않는다.
11. 한 사용자는 책 전체를 문제별로 공부할 수 있으나 한 job당 한 문제다.
12. 원문·OCR·출판사 해설·source-bound full output은 persistent server data가 아니다.
13. Book Tutor는 concept/error signature 뒤 독창 transfer problem으로 끝난다.
14. 생성문제는 subject-specific solver/validator 없이 release하지 않는다.
15. generated reference는 공식답안·공식채점기준이 아니다.
16. 해설 열람과 guided success는 independent mastery가 아니다.
17. stable candidacy에는 D+7 unseen verified transfer가 필요하다.
18. 오늘의 primary task는 최대 3개다.
19. learner raw body는 shared graph·analytics·training에 들어가지 않는다.
20. runtime·schema·provider·Production은 별도 exact-scope Work와 승인으로만 바뀐다.

> **답안길의 장기 자산은 남의 문제집 원문도, AI가 만든 답안의 양도 아니다.
> 시험의 공식 범위를 빠짐없이 구조화하고 사용자가 처음 보는 문제를 스스로
> 풀 수 있게 된다는 재현 가능한 evidence다.**
