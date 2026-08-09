---
document_title: "답안길 V13.1 — 필수재 제품·감점 제거 증명 보강안"
document_subtitle: "Evidence-anchored diagnosis, verified gap elimination, personal deduction DNA, daily command and renewal proof"
document_role: "single proposed V13.1 product-value amendment; not a second active master plan"
status: "owner-strategy/proposed-amendment"
dated: "2026-08-09 KST"
repository: "chachathecat/inverge"
active_master_plan: "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md"
active_pointer_unchanged: "docs/strategy/ACTIVE-MASTER-PLAN.md"
linked_issue: "https://github.com/chachathecat/inverge/issues/695"
merge_dependency:
  - "PR #694 terminal exact-head automated review and terminal closeout"
strategy_scope: "감정평가사 2차 실무·이론·법규 only"
runtime_authorization: "none"
schema_authorization: "none"
provider_authorization: "none"
dependency_authorization: "none"
commercial_activation_authorization: "none"
production_authorization: "none"
execution_rule: "V13 remains the sole active master until a separate exact reconciliation and merge decision. This amendment authorizes no implementation or activation."
---

# 답안길 V13.1 — 필수재 제품·감점 제거 증명 보강안

## 기술적으로 강한 V13을, 수험생이 끊기 어려운 학습 인프라로 바꾸는 제품 계약

---

## 0. 최종 결정

V13은 폐기하거나 V14로 갈아엎지 않는다.

V13은 이미 다음에서 강하다.

- 공식범위·현행성·권리·출처를 지배하는 VESG Truth Kernel
- 가능한 복수 시험지에 대비하는 Exam World Twin
- 지식·회상·방법선택·실행·표현·검산·속도·전이를 분리하는 Learner Capability Twin
- 공식범위 floor와 Today 최대 3을 보존하는 Robust Curriculum Controller
- 문제·정답·rubric·단위·반올림·권리·계보를 함께 검증하는 Proof-Carrying Assessment Foundry
- 채점불일치와 불확실성을 숨기지 않는 Calibrated Scoring & Audit

그러나 **기술적 신뢰성**과 **사용자가 매일 돈을 내고 의존하는 제품가치**는 같은 것이 아니다.

V13.1은 V13 위에 다음 하나의 제품가치 층을 추가한다.

```text
내 답안의 정확한 감점 위치
→ 가장 큰 감점 원인 1개
→ 직접 교정
→ 다음 날 무도움 재현
→ 일주일 뒤 다른 검증 문제에서 전이
→ 제한시간 전체 답안에서 재발 여부 확인
→ 개인 반복 감점 DNA 갱신
→ 내일의 공부계획 자동 재편
→ 실제 유료 사용과 자발적 재구매로 가치 검증
```

답안길의 최종 제품 정의는 다음과 같다.

> **답안길은 내가 왜 점수를 잃는지 정확한 답안 위치에서 찾아내고, 오늘 직접 고치게 한 뒤, 다음 미사용 문제에서 그 감점 원인이 실제로 사라졌는지 증명하며, 그 증거로 시험일까지의 공부를 매일 다시 지휘하는 감정평가사 2차 합격관제 OS다.**

---

## 1. 왜 V13.1이 필요한가

V13의 기술 스택은 강하지만 learner-facing 필수재 경험은 여러 상속 문서에 흩어져 있다.

현재 다음 개념은 존재한다.

- Evidence Review
- one biggest gap
- one next action
- rewrite/recalculate
- Personal Concept State
- Review Queue
- Today max 3
- D+1/D+7
- timed integration
- Proof-Carrying Assessment

그러나 다음은 하나의 닫힌 acceptance contract로 묶여 있지 않다.

1. 사용자가 답안을 올린 뒤 **언제 첫 유의미한 가치**를 받는가.
2. 피드백이 답안의 **어느 문장·계산단계·목차 위치**에 붙는가.
3. 같은 감점이 여러 답안에서 반복될 때 어떻게 하나의 **개인 감점 DNA**로 합쳐지는가.
4. 교정한 감점이 **다른 문제에서 사라졌음**을 어떤 증거로 선언하는가.
5. 그 증거가 Today와 Full-Day의 우선순위를 어떻게 바꾸는가.
6. AI가 확신하지 못할 때 어떻게 억지 답 대신 **검토 필요**로 멈추는가.
7. 결제자가 실제로 사용하고 D+1을 수행한 뒤 **다시 구매하는가**를 어떻게 검증하는가.

V13.1은 새 기능 목록이 아니다. 위 일곱 항목을 **제품의 필수재 최소선**으로 고정한다.

---

## 2. Indispensable Product Minimum V1

다음 여덟 축은 서로 대체할 수 없다.

```text
A. First Meaningful Value
B. Evidence-Anchored Diagnosis
C. Verified Gap Closure
D. Personal Recurring Deduction DNA
E. Daily Command and Recovery
F. Trust, Abstention and Escalation
G. Learner-Owned Continuity
H. Paid Use and Renewal Proof
```

### 2.1 준비상태 분리

```ts
type IndispensableProductReadinessV1 = {
  runtimeReady: boolean;
  contentReady: boolean;
  qualityReady: boolean;
  gapClosureReady: boolean;
  continuityReady: boolean;
  externalUsabilityObserved: boolean;
  commercialReady: boolean;
  renewalSignalObserved: boolean;
  indispensableReady: boolean;
  reasonCodes: string[];
  evidenceRefs: string[];
  policyVersion: string;
};
```

불변식:

- 문서가 존재한다고 `indispensableReady`가 되지 않는다.
- Owner dogfood가 외부 사용성·지불의사·갱신을 대신하지 않는다.
- 결제만 했다고 renewal proof가 되지 않는다.
- 같은 문제의 교정 성공만으로 gap elimination을 주장하지 않는다.
- `indispensableReady`는 나머지 준비상태를 숨기는 단일 대체 boolean이 아니다.
- 각 상태는 exact feature manifest, cohort, head, model, prompt, source, rubric와 policy version에 결합한다.

---

## 3. 제품의 한 줄 약속과 첫 화면

### 3.1 한 줄 약속

```text
내 답안에서 반복되는 감점 원인을 찾아,
직접 고치게 하고,
다른 문제에서 사라졌는지 증명합니다.
```

### 3.2 첫 화면이 보여야 하는 것

```text
오늘은 이것만 고치면 됩니다.

가장 큰 감점 원인
사업인정의 처분성 자체를 모르는 것이 아니라,
수용권 설정이라는 법적 효과를 처분성 판단에 연결하지 못했습니다.

답안 위치
7쪽 3번째 문단, 2~3문장

지금 할 일
8분 안에 해당 문단만 다시 쓰기

다음 검증
내일 무도움 재현
7일 뒤 다른 사실관계 문제
```

점수·차트·AI 장문 설명은 첫 행동보다 앞서지 않는다.

---

## 4. First Meaningful Value 계약

### 4.1 정의

`FirstMeaningfulValue`는 단순 OCR 완료나 AI 응답 도착이 아니다.

다음을 모두 충족한 최초 상태다.

- 사용자가 확인한 문제·답안 revision이 존재한다.
- source/subject/task binding이 유효하다.
- 가장 큰 간극 하나가 exact answer anchor와 연결된다.
- 간극의 근거와 불확실성이 보인다.
- 한 개의 실행 가능한 repair action이 있다.
- 결과가 저장되어 다시 열 수 있다.
- 실패·conflict·low confidence를 성공처럼 표시하지 않는다.

### 4.2 시간 가설

초기 외부 베타 gate:

```text
Capture/confirmed text
→ trusted biggest gap + exact anchor + one next action
p50 ≤ 5 minutes
```

세계급 목표:

```text
p50 ≤ 3 minutes
```

추가 마찰 예산:

- OCR 결과는 저장 전 editable이다.
- app interaction + provider wait는 총 유효 공부시간의 5% 이하다.
- 한 화면의 primary CTA는 하나다.
- 재열람은 새 생성이나 새 사용량 차감 없이 즉시 가능해야 한다.
- 실패한 OCR·provider·저장·검증은 usable result나 차감으로 기록하지 않는다.

수치는 연구결과가 아니라 Owner-approved 제품 품질 가설이며 외부 사용에서 조정한다.

---

## 5. Evidence-Anchored Diagnosis

총평형 피드백은 필수재가 아니다.

답안길의 진단은 다음 연결을 보존해야 한다.

```text
문제 요구
→ 답안의 정확한 위치
→ 충족·누락·오류 기준
→ 예상 감점 위험
→ 원인 가설
→ 한 개의 교정 행동
→ 교정 성공 기준
```

### 5.1 AnswerEvidenceAnchorV1

```ts
type AnswerEvidenceAnchorV1 = {
  id: string;
  learnerScopeRef: string;
  learningDocumentRef: string;
  problemRevisionChecksum: string;
  answerRevisionChecksum: string;
  subject: "practice" | "theory" | "law";
  anchorKind:
    | "page_line_range"
    | "paragraph"
    | "outline_node"
    | "calculation_step"
    | "table_cell"
    | "conclusion"
    | "missing_required_slot";
  locatorRef: string;
  excerptBodyRef?: string;
  rubricOrRequirementRefs: string[];
  sourceAndVerificationRefs: string[];
  status: "usable" | "uncertain" | "blocked" | "stale";
  basisChecksum: string;
};
```

규칙:

- raw excerpt는 learner-private vault 밖으로 나가지 않는다.
- `missing_required_slot`은 존재하지 않는 내용을 꾸며낸 anchor가 아니라, 검증된 요구구조에서 누락된 slot을 가리킨다.
- OCR/problem/answer/rubric/source revision이 바뀌면 anchor는 stale이다.
- exact anchor가 불가능하면 위치를 아는 척하지 않고 `uncertain`으로 표시한다.
- 일반적인 “목차가 약함”, “포섭이 부족함”만으로 usable biggest gap을 만들지 않는다.

---

## 6. Gap Closure Case

### 6.1 목적

답안길의 핵심 자산은 피드백 목록이 아니라 **감점 원인이 발견되고, 교정되고, 다른 문제에서 사라졌는지 확인된 계보**다.

```ts
type GapClosureStatusV1 =
  | "detected"
  | "repair_pending"
  | "repair_verified_same_session"
  | "d1_pending"
  | "d1_reproduced"
  | "transfer_pending"
  | "d7_transfer_confirmed"
  | "timed_recurrence_check_pending"
  | "timed_recurrence_clear"
  | "recurred"
  | "blocked"
  | "stale";

type GapClosureCaseV1 = {
  id: string;
  learnerScopeRef: string;
  subject: "practice" | "theory" | "law";
  targetConceptRefs: string[];
  sourceAttemptRef: string;
  sourceAnswerRevisionRef: string;
  answerAnchorRefs: string[];
  gapKind: string;
  deductionRiskBand: "unknown" | "minor" | "major" | "blocking";
  diagnosticCauseHypothesisRefs: string[];
  supportingEvidenceRefs: string[];
  counterEvidenceRefs: string[];
  confidence: "low" | "medium" | "high";
  primaryRepairActionRef: string;
  sameSessionRepairEvidenceRef?: string;
  d1IndependentEvidenceRef?: string;
  d7VerifiedVariantEvidenceRef?: string;
  timedRecurrenceEvidenceRef?: string;
  currentStatus: GapClosureStatusV1;
  nextActionRef?: string;
  policyVersion: string;
  basisChecksum: string;
};
```

### 6.2 상태 규칙

| 사건 | 최대 허용 상태 |
|---|---|
| gap 탐지 | `detected` |
| AI 예시·힌트·full solution 열람 | 상태 개선 없음 |
| 같은 세션 직접 재작성·재계산 검증 | `repair_verified_same_session` |
| D+1 무도움 재현 성공 | `d1_reproduced` |
| D+7 verified non-same-surface variant 성공 | `d7_transfer_confirmed` |
| 제한시간 전체 답안에서 재발 없음 | `timed_recurrence_clear` |
| 이후 qualifying 독립 실패 | `recurred` |
| source/rubric/validator 충돌 | `blocked` |
| basis 변경 | `stale` |

사용자에게 “감점 원인이 사라졌습니다”라고 말하려면 최소:

```text
D+7 verified variant independent success
+ policy가 요구하는 timed recurrence evidence
+ unresolved conflict 0
```

가 필요하다.

같은 문제 재정답, guided 성공, AI 공동작성, 힌트 후 성공은 제거 증거가 아니다.

---

## 7. 과목별 감점 원인 해상도

### 7.1 실무

단순히 “수익환원법이 약함”으로 끝내지 않는다.

```text
방법 선택
→ 자료 역할과 기준시점
→ 산식 선택
→ 변수 대응
→ 계산 순서
→ 숫자 입력
→ 단위·부호·반올림
→ 검산
→ 답안지 전사
```

예:

```text
개념 지식은 있음
방법 선택 성공
산식 선택 성공
시간 압박 시 5.5를 0.055로 변환하지 않고 입력
검산 생략 답안에서만 재발
```

실무 숫자·단위·부호·반올림은 deterministic validator를 우선한다.

### 7.2 이론

```text
요구 동사
→ 목차 구조
→ 개념 정확성
→ 논거 연결
→ 비교축
→ 평가·비판
→ 실무 연결
→ 결론·압축
```

예:

```text
정의는 안정
비교 대상은 인식
차이의 원인을 논증하지 못함
평가 문단에서 단순 장단점 나열로 전환
```

이론은 한 모델의 자유형 숫자점수를 최종 truth로 사용하지 않는다.

### 7.3 법규

```text
쟁점
→ 법적 근거와 effective version
→ 요건·효과
→ 결정적 사실
→ 사실→요건 포섭
→ 반대 논거
→ 결론·구제수단
```

예:

```text
쟁점 포착 성공
조문 후보 성공
요건 배열 성공
사실을 다시 적었으나 요건에 대응시키지 못함
```

법규 source/effective-version/conflict가 닫히지 않으면 verified reference나 gap closure를 release하지 않는다.

---

## 8. Personal Recurring Deduction DNA

### 8.1 정체성

Personal Deduction DNA는 타고난 성향이나 고정된 능력 판정이 아니다.

> 여러 답안에서 반복되는 **관찰 가능한 감점 경로와 발생조건**을 learner-private로 묶은 재계산 가능한 projection이다.

Canonical MasteryState는 계속 하나뿐이다. Deduction DNA는 두 번째 mastery oracle이 아니다.

### 8.2 RecurringDeductionSignatureV1

```ts
type RecurringDeductionSignatureV1 = {
  id: string;
  learnerScopeRef: string;
  subjectScope: "practice" | "theory" | "law" | "cross_subject";
  causeCode:
    | "demand_misread"
    | "issue_or_requirement_omission"
    | "fact_rule_application_gap"
    | "method_selection_error"
    | "procedure_order_error"
    | "calculation_input_error"
    | "unit_sign_rounding_error"
    | "expression_structure_error"
    | "time_allocation_failure"
    | "verification_omission"
    | "confidence_miscalibration"
    | "assistance_dependence"
    | "integration_failure"
    | "insufficient_evidence";
  conditionProfile: {
    timedState: "timed" | "untimed" | "mixed";
    assistanceState: "independent" | "assisted" | "mixed";
    taskFamilyRefs: string[];
    representationRefs: string[];
  };
  eligibleOccurrenceRefs: string[];
  counterEvidenceRefs: string[];
  recurrenceCount: number;
  distinctEligibleItemFamilyCount: number;
  latestStatus:
    | "insufficient_evidence"
    | "candidate"
    | "repeating"
    | "recovery_watch"
    | "currently_clear"
    | "recurred"
    | "stale";
  nextBestActionRef?: string;
  inferencePolicyVersion: string;
  basisChecksum: string;
};
```

### 8.3 규칙

- 한 답안의 한 실패를 관련 concept 전체에 복제하지 않는다.
- attempt와 그 파생 gap은 독립 실패 1회만 기여한다.
- 다른 item family의 독립 evidence가 없으면 `repeating`으로 승격하지 않는다.
- assisted/guided/same-surface/unverified variant는 recurrence 분자에 넣지 않는다.
- counter-evidence를 보존하고 반증 가능해야 한다.
- raw 답안·OCR·메모·AI body는 graph label, analytics, cross-user training에 넣지 않는다.
- learner는 signature마다 근거 답안, anchor, 날짜, assistance와 전이 결과를 다시 열 수 있어야 한다.

### 8.4 사용자 화면

```text
반복 감점 DNA

법규 · 포섭 연결
최근 5개 독립 답안 중 서로 다른 3개 문제에서 반복
주로 제한시간 모드에서 발생
D+1 회복 2회
D+7 전이 1회 실패
현재 상태: 회복 관찰 중

다음 행동
조건이 바뀐 포섭 문단 1개를 10분 안에 작성
```

퍼센트형 “진짜 숙달률”이나 합격확률로 표시하지 않는다.

---

## 9. Verified Variant Bank

해설보다 복제하기 어려운 자산은 **교정한 gap이 사라졌는지 검사하는 문제**다.

각 핵심 skill/gap에는 필요 범위에서 다음을 준비한다.

```text
canonical case
near-miss
counterexample
flip-condition
D+7 verified variant
timed integration item
```

### 9.1 사용 자격

D+7/stable/closure에 쓰는 variant는 다음을 모두 요구한다.

- source 또는 author-created rights state
- exact target skill/gap
- answer/rubric/validator
- item-family and surface-distance policy
- pre-presentation unseen snapshot
- solution hidden
- independent attempt
- no disqualifying assistance
- proof bundle and release state
- current effective version where applicable

생성됐다는 이유만으로 verified variant가 되지 않는다.

### 9.2 해자

답안길의 장기 해자는 문제 수가 아니라 다음 결합이다.

```text
verified variant bank
+ source/rights/version graph
+ personal gap-closure lineage
+ recurring deduction signatures
+ delayed independent outcomes
```

---

## 10. Daily Command and Full-Day

Today는 일정 목록이 아니라 **감점 제거 우선순위의 learner-facing 명령면**이다.

### 10.1 Today CoreOutcome

항상 0~3개다.

각 task는 다음을 설명한다.

```text
왜 지금인가
어떤 반복 감점 또는 official-scope gap을 다루는가
어떤 prior evidence에서 왔는가
몇 분이 필요한가
무엇이 성공인가
무엇을 미루거나 버렸는가
```

### 10.2 전체 공부표

- CoreOutcome 최대 3
- ExecutionBlock 0..N
- available minutes 초과 금지
- 강의·기본서·답안·복습·모의·buffer를 함께 배치
- due review는 항목 수보다 minute budget으로 제한
- 병결·공백·피로에서는 backlog를 쌓지 않고 유지·축소·연기·버림을 설명
- block 완료는 mastery나 gap closure가 아님
- transfer-confirmed gap은 우선순위를 낮추고, recurrent gap은 다시 올린다
- plan은 app engagement가 아니라 independent evidence에 반응한다

### 10.3 아침·학습 후·주간 경험

```text
아침
→ 오늘 결과를 낼 핵심 3과 이유

학습 후
→ 답안 하나 업로드
→ exact biggest gap
→ 즉시 repair

다음 날
→ 어제 gap만 무도움 재현

일주일 뒤
→ 다른 verified variant

주간
→ 제거 확인 / 재발 / 미검증 gap
→ 다음 주 시간 재배분
```

사용자는 “무엇을 해야 하는지 모르겠다”는 불안을 줄이기 때문에 돌아와야 한다. shame, fake urgency, streak pressure, scarcity manipulation을 사용하지 않는다.

---

## 11. Trust, Abstention and Escalation

답안길이 필수재가 되려면 모든 답을 내는 것이 아니라 **틀릴 때 멈출 줄 알아야 한다.**

### 11.1 역할 분리

- deterministic validator: 숫자·단위·부호·반올림·closed rule
- source registry: 현행 법령·기준·공식자료·effective version
- subject validator: rubric·쟁점·방법·요구행위
- AI: 설명, 진단가설, 비교, 문장화, 다음 행동 후보
- release resolver: candidate, critic, consensus/conflict, final gate
- human: separately authorized Academy/instructor or exact review lane only

### 11.2 learner-facing 상태

```text
검증됨
근거 있음
추론
검토 필요
충돌
현재 근거 부족
stale
```

low confidence, unsupported assertion, calculation conflict, Law source conflict 또는 rubric disagreement가 있으면:

- exact gap을 확정하지 않는다.
- AI confidence를 근거처럼 사용하지 않는다.
- shell과 개인 메모는 저장할 수 있다.
- usable reference body를 억지로 release하지 않는다.
- 다음 안전행동을 제시한다.

### 11.3 인간 검토 경계

V13.1은 B2C 인간 첨삭 marketplace를 만들지 않는다.

인간 escalation은 다음 중 별도 승인된 경로만 허용한다.

- named Academy partner의 instructor approval
- Gold/external benchmark review
- separately authorized limited quality-review lane

사람에게 보냈다는 사실만으로 공식답안·공식채점이 되지 않는다.

---

## 12. Learner-Owned Continuity

필수재는 데이터를 인질로 잡아 만들어서는 안 된다.

### 12.1 정당한 continuity moat

```text
문제/답안 revision
→ exact gap anchor
→ repair
→ D+1
→ D+7
→ timed recurrence
→ recurring deduction signature
→ next-plan decision
```

이 계보가 길어질수록 다른 도구가 처음부터 학습자를 다시 파악해야 한다. 이것이 정당한 switching cost다.

### 12.2 사용자 권리

- 원문·답안·OCR·메모·AI 결과의 private ownership boundary
- reopen/search/resume
- version history
- export
- delete
- entitlement 종료 후 learning record 보존 정책의 명확한 고지
- 새 AI 생성과 기존 기록 열람 분리
- 계정·기기 변경 복원
- provider 변경 시 lineage 보존
- 탈퇴 방해, fake lock-in, export 제한 금지

서비스가 없어지면 곤란한 이유는 데이터가 갇혀서가 아니라 **현재 학습상태와 다음 교정이 이어지지 않기 때문**이어야 한다.

---

## 13. 제품 품질 Gate

아래는 외부 검증 전의 제품 가설이며 마케팅 claim이 아니다.

| 지표 | 초기 gate 가설 | 세계급 목표 |
|---|---:|---:|
| Capture→trusted gap/action p50 | ≤5분 | ≤3분 |
| biggest-gap top-1 외부 검토 일치 | ≥80% | 과목별 calibration 후 상향 |
| 학습을 해칠 severe misfeedback | <1% | Golden 핵심 0 |
| 실무 deterministic gold | 100% | 100% |
| Law unsupported verified release | 0 | 0 |
| result→direct repair | ≥60% | 지속 개선 |
| D+1 independent participation | ≥50% | 지속 개선 |
| 4주 동일 gap 재발 | baseline 대비 ≥25% 감소 | cohort별 개선 |
| app interaction+wait / study time | ≤5% | ≤5% |
| false mastery / false closure | 0 | 0 |
| active paid voluntary repurchase | ≥60% 가설 | cohort별 검증 |
| 핵심 활성자 “없어지면 매우 곤란” | ≥40% 가설 | 과반 지향 |

분모, cohort, exact offer, feature manifest와 evidence window를 고정하지 않은 수치는 보고하지 않는다.

---

## 14. North Star와 보조 지표

### 14.1 Primary North Star

```text
Verified Recurring-Gap Eliminations
per Active Learner per Effective Study Hour
```

정의:

- distinct recurring gap
- D+7 verified variant independent success
- required timed recurrence evidence
- unresolved conflict 0
- replay/same-family duplication 0

### 14.2 핵심 제품 지표

- first meaningful value
- exact-anchor usability
- gap→repair conversion
- repair→D+1
- D+1→D+7
- D+7→timed recurrence clear
- recurrence reopening
- plan acceptance/edit/reject
- reopened ledger success
- voluntary repurchase
- support minutes per active payer
- P50/P95 usable-result cost

### 14.3 금지 North Star

- messages
- time in app
- streak
- AI tokens
- answer length
- assisted score
- generated question count
- raw upload volume

---

## 15. 외부 유료 검증

### 15.1 Owner와 시장 증거 분리

Owner dogfood가 검증할 수 있는 것:

- 개인 가치
- UX friction
- gap accuracy 후보
- plan 납득성
- privacy/source failure
- 다시 쓰고 싶은지

Owner dogfood가 검증하지 못하는 것:

- 외부 사용성
- willingness to pay
- support load
- refund
- cohort retention
- renewal
- market size
- efficacy claim

### 15.2 현재 commercial dependency 보존

```text
S241A
→ O3C
→ S239A
→ S242C
→ O4F
→ S243C Wave A
→ S244C Wave B/C
→ S245C
→ S225 public self-serve
```

이 문서는 어떤 gate도 건너뛰지 않는다.

### 15.3 현재 가격 가설

현재 보존되는 유일한 Founding Beta 역사 가설:

```text
69,000 KRW VAT included
30 days
20 usable_review_unit_v1
no automatic renewal
invitation only
```

이 문서는 가격·결제·entitlement를 활성화하지 않는다.

### 15.4 staged validation

#### Wave A — 3~5명

검증:

- 실제 결제
- first meaningful value
- 최소 2개 usable review 사용
- direct repair
- D+1 참여
- severe misfeedback, false charge, cross-account, raw leak 0
- 지원시간과 원가

#### Wave B — 총 10~15명

검증:

- distinct subject/task coverage
- gap recurrence and transfer evidence
- reopen/resume
- support load
- refund reason
- exact offer 유지

#### Wave C — 총 20~30명

검증:

- capacity
- quality drift
- D+1/D+7 funnel
- voluntary next-pack purchase or explicit decline
- cohort renewal signal

### 15.5 진짜 사업 판정

다음은 충분하지 않다.

```text
결제만 함
데모를 좋아함
AI 설명이 신기함
한 번 업로드함
설문에서 구매 의향 표시
```

핵심 검증 event:

```text
실제 exact offer 결제
AND usable review를 2회 이상 사용
AND direct repair 수행
AND D+1 독립 복습 수행
AND 다음 30일 exact approved offer를 자발적으로 다시 구매
```

구매했지만 쓰지 않거나, D+1에 오지 않거나, 다시 사지 않으면 제품가치가 아니라 초기 호기심일 수 있다.

서로 다른 가격·기능 manifest·환불조건 cohort를 합산하지 않는다.

---

## 16. 개발 우선순위 재정렬 제안

현재 live roadmap과 권한을 이 문서만으로 변경하지 않는다. 다만 다음 source amendment에서 제품가치 critical path를 명시적으로 비교해야 한다.

### 16.1 제안 순서

```text
0. PR #694 terminal closeout
1. CPF/source-safety blocker closure
2. V13.1 source reconciliation and exact Owner decision
3. 한 개의 3과목 Gap-to-Transfer vertical slice
4. Answer anchor + GapClosureCase
5. Personal Recurring Deduction DNA
6. D+1/D+7/timed recurrence integration
7. Today/Full-Day evidence-driven replanning
8. Owner-private end-to-end acceptance
9. external paid canary and renewal proof
10. broader EDT/portable-core expansion that does not block the above
```

### 16.2 핵심 원칙

- broad infrastructure가 learner-facing gap-removal vertical을 무기한 늦추지 않는다.
- portable core는 감정평가사 2차에서 실제로 검증된 primitive만 승격한다.
- MCAL은 기억을 돕지만 exact definition, attempt, repair, transfer와 evidence보다 앞서지 않는다.
- 그래프·대시보드·게임화보다 하나의 감점 제거 계보가 우선이다.
- 실무·이론·법규 각각 한 개의 Golden vertical에서 완전한 loop를 먼저 증명한다.
- 외부 결제 전에 quality gate를 낮추지 않는다.
- 시장검증을 이유로 source/rights/privacy를 우회하지 않는다.

---

## 17. 구현 Slice 제안

이 절은 미래 roadmap 입력이며 현재 runtime authority가 아니다.

### IPM-0 — Source and Acceptance Contract

- V13.1 authority reconciliation
- exact glossary
- product metrics
- non-goals
- no runtime

### IPM-1 — Evidence-Anchored Biggest Gap

- exact answer anchor
- one primary gap
- source/rubric/validator evidence
- low-confidence abstention
- three-subject Golden fixtures

### IPM-2 — Repair Verification

- bounded rewrite/recalculate
- success criteria
- same-session verification
- false success 0

### IPM-3 — Delayed Gap Closure

- D+1 independent reconstruction
- D+7 verified variant
- timed recurrence check
- closure/reopen state machine
- replay and same-family protection

### IPM-4 — Personal Deduction DNA

- recurring signature projection
- condition profile
- evidence/counter-evidence
- learner-private UI model
- no second mastery oracle

### IPM-5 — Daily Command

- recurring gap and transfer into Today max 3
- full-day minute allocation
- defer/drop/recovery reason
- no engagement-based priority

### IPM-6 — External Proof

- exact cohort/offer manifest
- first value
- use→repair→D+1
- voluntary repurchase
- support/cost/refund

각 slice는 exact dependency, owned files, tests, rollback, data boundary와 Owner gate를 가진다.

---

## 18. Definition of Done

V13.1의 제품가치는 다음 다섯 story가 exact-head evidence로 통과할 때만 구현 후보가 된다.

### Story 1 — 실무

```text
사용자가 수익환원법 답안을 업로드
→ 0.055 입력단계 anchor
→ 방법/산식 지식과 실행 오류 분리
→ 계산기 루틴 직접 재계산
→ 숫자가 다른 D+7 verified variant
→ timed full solution에서 재발 없음
```

### Story 2 — 이론

```text
사용자가 비교·평가 답안을 업로드
→ 정의가 아니라 논증연결이 끊긴 문단 anchor
→ 8분 재작성
→ D+1 blank outline
→ 다른 요구동사 문제에서 transfer
```

### Story 3 — 법규

```text
사용자가 사업인정 답안을 업로드
→ 처분성-수용권 연결 누락 anchor
→ source/effective version 확인
→ 직접 포섭 문단 재작성
→ 다른 사실관계 D+7 variant
→ source conflict 시 fail closed
```

### Story 4 — 하루 관제

```text
반복 감점 DNA + due review + available minutes
→ 오늘 핵심 3
→ 이유·성공기준·미룬 일
→ 병결 시 bounded recovery
→ task completion만으로 mastery 변화 0
```

### Story 5 — 시장

```text
외부 learner가 exact offer 결제
→ 5분 안에 첫 가치
→ usable review 2회+
→ repair
→ D+1
→ 자발적 next-pack purchase 또는 explicit decline
→ exact cohort report
```

### 18.1 hard gates

```text
generic_unanchored_biggest_gap = 0
gap_closed_without_d7_verified_transfer = 0
closure_without_required_timed_recurrence = 0
guided_or_same_surface_as_independent = 0
raw_body_in_deduction_dna_or_analytics = 0
second_mastery_oracle_created = 0
law_source_conflict_released = 0
deterministic_calculation_conflict_hidden = 0
today_primary_tasks_over_three = 0
plan_priority_from_engagement_metric = 0
owner_dogfood_counted_as_market_or_renewal_proof = 0
purchase_only_counted_as_product_market_fit = 0
price_or_checkout_activated_by_this_document = 0
artificial_lock_in_or_export_block = 0
```

---

## 19. 명시적 Non-goals

- V14 또는 두 번째 active master plan
- first-stage learner runtime
- 다른 전문직 시험
- generic exam selector
- public problem archive
- B2C 인간첨삭 marketplace
- 합격확률·확정점수·공식채점
- raw user data 기반 online training
- 자유형 AI 채팅을 중심으로 한 제품
- 대형 커뮤니티
- leaderboard, streak, badge 중심 gamification
- 화려한 dashboard를 product value로 대체
- unverified variant를 transfer evidence로 사용
- unlimited high-cost AI
- CPF, source, rights, privacy, RLS, reference-answer release 또는 commercial gate 약화

---

## 20. 현재 GitHub 실행 경계

이 파일은 다음만 제안한다.

- V13의 제품가치 약점을 하나의 V13.1 amendment로 명문화
- future source reconciliation과 roadmap 비교의 입력 제공
- 외부 베타가 무엇을 검증해야 하는지 정의

이 파일은 다음을 하지 않는다.

- `ACTIVE-MASTER-PLAN.md` 변경
- V13 교체 또는 활성화
- `roadmap/active-program.yml` 변경
- AGENTS.md 변경
- machine contract 변경
- PR #694 변경
- runtime/schema/UI/provider/dependency/billing/Production 변경
- Ready/merge/auto-merge 승인
- 후속 Work 자동 시작

PR #694의 exact-head automated review와 terminal closeout이 끝나기 전에는 이 amendment를 active plan으로 reconciliation하거나 merge하지 않는다.

---

## 21. 최종 원칙

1. 정확한 답안 위치 없는 피드백은 필수재가 되기 어렵다.
2. 같은 문제에서 고쳤다는 사실은 독립 전이가 아니다.
3. 개인화의 핵심은 단원 약점이 아니라 반복되는 감점 경로다.
4. Today는 할 일 목록이 아니라 현재 가장 가치 있는 감점 제거 명령이다.
5. Trust가 낮으면 답을 만드는 대신 멈추고 이유를 보여준다.
6. 데이터는 사용자 소유이고, continuity는 인질이 아니라 학습계보에서 나온다.
7. 가격은 기능 수가 아니라 검증된 감점 감소와 운영가치에 붙는다.
8. 결제는 증거가 아니며 사용·D+1·자발적 재구매까지 이어져야 한다.
9. 감정평가사 2차에서 미친 완성도를 만든 뒤에만 공통 코어를 넓힌다.
10. 답안길의 최종 성공은 AI가 더 많이 도와주는 것이 아니라 사용자가 AI 없이 다음 문제를 더 잘 푸는 것이다.

> **V13이 답안길의 신뢰 가능한 두뇌라면, V13.1은 그 두뇌가 사용자의 반복 감점을 실제로 제거하고 매일의 공부를 지휘하며 돈을 다시 낼 만큼의 가치를 증명하게 만드는 제품 신경계다.**
