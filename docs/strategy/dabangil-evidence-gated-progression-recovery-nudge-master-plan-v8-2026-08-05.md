---
document_title: "답안길 Evidence-Gated Progression & Recovery Nudge 통합 마스터플랜 v8"
document_subtitle: "증거 기반 공략·퀘스트·복구 알림·성취 표현·오픈소스 이식 계약"
status: "owner-strategy/non-authoritative"
dated: "2026-08-05 KST"
repository: "chachathecat/inverge"
integrates_with:
  - "docs/strategy/dabangil-professional-exam-reasoning-os-master-plan-v7-2026-07-28.md"
amends_for_strategy_only:
  - "progression, quest, recovery, nudge, achievement, map and OSS-adoption strategy"
does_not_supersede:
  - "live GitHub state and runtime"
  - "dated Owner decisions"
  - "AGENTS.md"
  - "canonical Markdown and machine-readable contracts"
  - "roadmap/active-program.yml"
current_learner_facing_scope: "Dabangil Appraiser Second three subjects only"
current_mastery_runtime_authorization: "none"
guided_study_runtime_authorization: "none"
production_authorization: "none"
runtime_authorization: "none"
schema_authorization: "none"
dependency_authorization: "none"
notification_delivery_authorization: "none"
measurement_authorization: "none"
execution_rule: "Reconcile live authority before every Work; this document proposes contracts and order only."
---

# 답안길 Evidence-Gated Progression & Recovery Nudge 통합 마스터플랜 v8

## 감정평가사 2차 학습 커널 위에 얹는 공략·성취·복귀 레이어

이 문서는 답안길을 RPG, 출석 앱, streak 앱, 포인트 앱 또는 generic
motivation product로 바꾸자는 계획이 아니다.

> **기존 독립 시도·간극·repair·D+1·D+7·timed evidence를 권위로
> 유지하면서, 그 학습 과정을 “어디까지 왔고 무엇을 고치면 다음 관문이
> 열리는지” 이해하기 쉬운 공략·퀘스트·복구 경험으로 투영하는 전략**이다.

내부 전략 이름:

```text
Evidence-Gated Progression & Recovery Layer
한국어 제품 표현: 증거 기반 공략·회복 레이어
```

이 레이어는 새로운 mastery, readiness, pass probability 또는 score를 만들지
않는다. 기존 trusted evidence와 현재 허용된 learner-private projection을
읽어 다음 네 가지로 표현한다.

1. 현재 확인된 **공략 단계**
2. 지금 실행할 **퀘스트 한 가지**
3. 다음 독립 검증 **관문**
4. 쉬었다 돌아올 때의 **복구 루트**

이 문서만으로 다음을 승인하지 않는다.

- runtime, schema, migration, RLS, API, UI, navigation 또는 provider 변경
- `roadmap/active-program.yml` 변경
- 실제 PWA push, 이메일, SMS 또는 외부 notification provider 사용
- React Flow, H5P, Oppia, Moodle plugin, Novu, Habitica 또는 다른 OSS 설치
- production telemetry, experiment, randomization, export 또는 model fitting
- learner-facing XP, leaderboard, streak, badge, social 또는 public feature
- `MasteryStateV1` persistence, transition 또는 learner-facing activation
- `guided_study` selector, route, API, event, scheduling 또는 runtime
- 외부 학습자, 결제, entitlement, 가격, 공개 navigation 또는 Production
- canonical source, rights, release, evidence 또는 commercial gate 변경

실제 구현은 live authority가 허용하는 별도 Work, exact scope, focused test,
exact-head review와 필요한 Owner 승인으로 수행한다.

---

## 0. 한 페이지 결론

### 0.1 최종 제품 결정

답안길의 성취감은 다음 방식으로 만들어야 한다.

```text
앱을 열었다
→ 포인트를 받았다
→ 레벨이 올랐다                         ❌

독립 시도에서 간극이 드러났다
→ 그 간극을 직접 수리했다
→ 다음 날 무도움으로 재현했다
→ 다른 verified variant에서도 해냈다
→ 실전형 전체 수행에서 재발을 막았다     ✅
```

**보상은 사용량이 아니라 독립 학습 증거의 가시화**여야 한다.

### 0.2 사용자에게 보이는 핵심 경험

```text
오늘의 공략 3개
1. 사업인정 처분성 — 문단 수리
2. 수익환원법 — 무도움 재계산
3. 가치다원성 — 조건 뒤집기

현재 단계
첫 시도 → 간극 수리 → D+1 확인 → D+7 변형 → 실전 관문

다음 관문
“어제 수리한 처분성 문단을 6분 동안 도움 없이 다시 쓰면 열립니다.”

복구 모드
“3일 쉬었습니다. 밀린 과제를 쌓지 않고 8분 복구 퀘스트 하나로
다시 시작합니다.”
```

### 0.3 절대 설계 원칙

1. 현재 authority에는 canonical mastery runtime이 없다.
2. progression은 현재 허용된 attempt·qualification·LearningGapRecord·S216·
   repair·D+1·D+7·timed evidence의 read-only projection이다.
3. future `MasteryStateV1`은 별도 dated Owner decision과 canonical/runtime
   gate 전에는 dependency, input, output 또는 consistency authority가 아니다.
4. AI 설명 열람, 저장, 로그인, 클릭, 반복 사용으로 stage clear를 만들지
   않는다.
5. full reveal, assisted success와 same-surface retry는 독립 클리어가 아니다.
6. `guided_study`는 현재 contract-only vocabulary이며 runtime으로 구현하지
   않는다.
7. nudge는 겁주거나 죄책감을 주지 않고 **다음 작은 행동으로 바로 연결**한다.
8. 알림 후보와 실제 외부 발송을 물리적으로 분리한다.
9. 모바일 canonical UI는 접근 가능한 세로형 리스트다. 그래프는 보조 표현이다.
10. 공개 leaderboard, HP 감소, loot box, streak 초기화는 사용하지 않는다.
11. 성공 지표는 체류시간이 아니라 독립 회복과 전이다.
12. Today/CoreOutcome 최대 3을 그대로 유지한다.

### 0.4 learner-facing 언어

권장:

```text
공략 단계
오늘의 퀘스트
간극 수리
무도움 확인
변형 클리어
실전 관문
복구 루트
전략 카드
재검증 필요
```

금지 또는 별도 evidence 전 비허용:

```text
숙달률 87%
합격 레벨
오늘 안 하면 손실
연속 기록이 깨집니다
HP 감소
다른 수험생보다 뒤처졌습니다
합격확률
예상점수
```

---

## 1. live authority reconciliation

### 1.1 작성 시점 관측

2026-08-05 KST 작성 시 read-only 관측값:

| 대상 | 관측 상태 |
| --- | --- |
| default branch | `main` |
| observed main | `5d00cd84ec8ab44918ce47a49a0d71e9734cbea0` |
| current strategy base | `docs/strategy/dabangil-professional-exam-reasoning-os-master-plan-v7-2026-07-28.md` |
| current learner scope | 감정평가사 2차 실무·이론·법규 |
| current mastery runtime | 미승인 |
| current guided-study runtime | 미승인 |
| public learner/billing/Production | OFF |

위 값은 역사적 관측일 뿐 실행 입력이 아니다. 모든 Work는 live GitHub,
dated Owner decision, `AGENTS.md`, canonical contracts,
`roadmap/active-program.yml`, open PR, locks, reviews와 CI를 다시 읽는다.

### 1.2 authority order

이 문서는 기존 권위를 바꾸지 않는다.

```text
dated Owner decisions
→ canonical Markdown and machine-readable contracts
→ product specifications
→ executable contract code/tests
→ roadmap/active-program.yml
→ AGENTS.md and risk policy
→ this non-authoritative strategy document
```

충돌 시 상위 authority를 따른다.

### 1.3 현재 evidence source

current implementation/source amendment가 progression을 계산할 때 사용할 수
있는 후보는 live audit를 통해 실제 존재와 contract version을 다시 확인한
다음 범위다.

- immutable attempt identity와 answer revision
- assistance/exposure qualification
- accepted feedback release state
- `LearningGapRecord`
- `s216.error_notebook_gap_taxonomy.v1` metadata projection
- repair/recalculate/rewrite verification
- canonical `ReviewUnit`
- D+1 independent evidence
- D+7 verified non-same-surface variant evidence
- timed set/full-solution qualification
- current rule-based `PersonalWeaknessMapV1`, authority가 허용하는 경우
- source/right/effective-version/validator/release state

존재하지 않거나 current authority가 승인하지 않은 state를 채우기 위해
추정·fallback·LLM self-declaration을 사용하지 않는다.

### 1.4 future-only vocabulary

다음은 별도 activation 전 현재 progression의 입력 또는 출력이 아니다.

- `MasteryStateV1`
- learner-facing mastery percentage
- pyBKT probability
- IRT/CAT readiness
- `guided_study` runtime evidence
- external Open Badges credential
- cross-exam progression

문서 안에 future compatibility를 언급하더라도 current runtime acceptance에
포함하지 않는다.

### 1.5 roadmap placement

작성 시점 critical path의 전략 projection:

```text
S236P
→ S236A Golden 3
→ S237A Owner-Private Study OS Core
→ S237P Native Full-Day
→ O4A
→ S238A/S240A dogfood
→ S241A authenticated acceptance
```

progression contract/runtime 후보는 필요한 closed evidence contract가
S237A에서 실제로 만들어진 뒤에만 시작한다.

external notification, pseudonymous product measurement, OSS-derived shared
signal 또는 external experiment는 current `O2 → S270 → O4E → S271` 계열의
controlling gates를 우회하지 않는다. 정확한 Work ID와 edge는 별도 canonical
roadmap amendment가 live state에서 정한다.

---

## 2. 왜 일반 gamification이 아닌가

### 2.1 쉽게 측정되지만 실력이 아닌 것

- 로그인
- 페이지 열람
- AI 답안 확인
- 노트 저장
- 반복 클릭
- 쉬운 항목 반복
- 앱 체류시간

이 행동에 XP를 주면 사용자는 시스템이 보상하는 일을 최적화한다.

- 쉬운 행동 farming
- 수동적 해설 소비
- 독립 시도 회피
- leaderboard 불안
- streak가 끊긴 뒤 이탈
- 실제 evidence와 UI level 불일치

가 생길 수 있다.

### 2.2 답안길 성취의 최소 단위

답안길에서 성취로 표현할 수 있는 사건은 다음처럼 closed evidence에
결합되어야 한다.

```text
독립적으로 요구를 파악함
독립적으로 방법·목차·답 방향을 commit함
가장 큰 간극을 직접 repair함
D+1 무도움으로 재현함
D+7 verified variant에서 전이함
timed 수행에서 동일 간극의 재발을 막음
공백 뒤 qualifying recovery action을 완료함
```

### 2.3 연구를 제품에 번역하는 방식

gamification 연구는 평균적인 긍정 효과를 보고하지만 맥락과 요소 조합에
따른 이질성이 크다. nudge 연구도 일부 personalized reminder에서 의미 있는
효과를 보였지만 다른 실험에서는 평균 효과가 없거나 subgroup 차이가 컸다.

따라서 답안길은 다음 순서를 따른다.

```text
연구 근거
→ bounded product hypothesis
→ deterministic contract
→ owner-private dogfood
→ approved external evaluation
→ learning metric 우선 판정
```

“게임 요소를 넣었으니 성적이 오른다”는 claim을 하지 않는다.

---

## 3. 전체 아키텍처

```text
Existing trusted evidence
- Attempt / answer revision
- Assistance / exposure
- LearningGapRecord + S216 metadata
- RepairVerification
- D+1 / D+7
- Timed evidence
- PersonalWeaknessMap, where authorized
- ReviewUnit / CoreOutcome / ExecutionBlock

        ↓ read-only

Progression Projector
- evidence lifecycle state
- gate eligibility
- stale/revalidation
- evidence explanation

        ↓

Quest Composer
- Today/CoreOutcome learner-facing framing
- 5~15분 micro quest
- timed boss candidate
- recovery route

        ↓

Nudge Candidate Engine
- trigger
- direct action
- suppression
- cooldown
- quiet hours
- preference

        ↓

Presentation / Delivery
- Today card
- vertical quest list
- optional desktop graph
- in-app brief
- future PWA/email adapter
```

### 3.1 권위 경계

| 계층 | 허용 | 금지 |
| --- | --- | --- |
| evidence | 실제 사건·qualification 기록 | 게임 표현 계산 |
| progression projector | evidence lifecycle 표시 | evidence·mastery 쓰기 |
| quest composer | approved action을 작은 행동으로 표현 | action eligibility 창작 |
| nudge engine | 후보·억제·빈도 계산 | due evidence 창작 |
| UI | 상태·근거·행동 표시 | client-side clear 판정 |
| delivery adapter | approved candidate 전달 | 임의 메시지·임의 발송 |

### 3.2 fail-closed

다음 중 하나면 stage clear, boss unlock, achievement 발급 또는 nudge 발송을
하지 않는다.

- evidence ref missing
- evidence stale
- source/right/effective-version conflict
- assistance qualification 불명
- replay/idempotency conflict
- cross-account scope mismatch
- projection/evidence contradiction
- policy version unknown
- notification preference unknown
- quiet-hours 계산 불가
- direct action route unavailable

---

## 4. Evidence Lifecycle Progression

### 4.1 progression state

```ts
type ProgressionStateV1 =
  | "locked"
  | "available"
  | "attempt_recorded"
  | "repair_due"
  | "repair_qualified"
  | "d1_independent_confirmed"
  | "d7_transfer_cleared"
  | "timed_integration_cleared"
  | "revalidation_required";
```

| 상태 | 최소 근거 | learner-facing 표현 |
| --- | --- | --- |
| `locked` | prerequisite/action eligibility 부족 | 잠김 |
| `available` | current action eligibility | 시작 가능 |
| `attempt_recorded` | qualifying attempt | 첫 시도 완료 |
| `repair_due` | accepted primary gap | 간극 수리 필요 |
| `repair_qualified` | independent-required repair verification | 간극 수리 완료 |
| `d1_independent_confirmed` | qualifying D+1 | 무도움 확인 |
| `d7_transfer_cleared` | verified non-same-surface D+7 transfer | 변형 클리어 |
| `timed_integration_cleared` | qualifying timed integration | 실전 관문 통과 |
| `revalidation_required` | source/policy/evidence stale | 재검증 필요 |

이 state는 mastery가 아니라 **증거 lifecycle UI projection**이다.

### 4.2 projection object

```ts
type FutureMasteryConsistencyStateV1 =
  | "not_authorized"
  | "not_applicable"
  | "consistent"
  | "conflict";

type ProgressionProjectionV1 = {
  projectionKey: string;
  learnerScopeRef: string;
  conceptNodeRef?: string;
  taskOrStageRef: string;
  state: ProgressionStateV1;
  evidenceThroughRef: string;
  attemptEvidenceRefs: string[];
  learningGapRecordRefs: string[];
  s216ProjectionRefs: string[];
  repairEvidenceRefs: string[];
  d1EvidenceRefs: string[];
  d7EvidenceRefs: string[];
  timedEvidenceRefs: string[];
  qualifyingEvidenceRefs: string[];
  disqualifyingEvidenceRefs: string[];
  prerequisiteStateRefs: string[];
  nextGateRef?: string;
  revalidationReasonCodes: string[];
  futureMasteryConsistency: FutureMasteryConsistencyStateV1;
  futureMasteryStateRef?: string;
  policyVersion: string;
  basisChecksum: string;
  contentChecksum: string;
  generatedAt: string;
};
```

current authority에서는:

```text
futureMasteryConsistency = "not_authorized"
futureMasteryStateRef = absent
```

가 필수다. client, model 또는 early implementation이 mastery ref를 공급하거나
required lookup으로 만들면 projection을 reject한다.

별도 future activation 뒤에도 mastery는 progression clear를 authorize하지
않고 same-cutoff contradiction을 검출하는 consistency input 후보일 뿐이다.
그 extension은 새 versioned contract를 요구한다.

### 4.3 state derivation

초기 deterministic rule 예:

```text
current eligible action, attempt 없음
→ available

qualifying attempt, accepted primary gap 없음
→ attempt_recorded

accepted primary gap, qualifying repair 없음
→ repair_due

qualifying repair verification
→ repair_qualified

qualifying D+1 independent evidence
→ d1_independent_confirmed

qualifying D+7 verified non-same-surface variant
→ d7_transfer_cleared

qualifying timed integration with required coverage
→ timed_integration_cleared
```

정확한 precedence, demotion과 reopening은 versioned policy와 current source
contract가 정한다.

### 4.4 절대 금지

- `viewed_explanation → repair_qualified`
- `saved_note → d1_independent_confirmed`
- `login_or_streak → any clear`
- `same_item_retry → d7_transfer_cleared`
- `assisted_timed_attempt → timed_integration_cleared`
- unverified generated item을 D+7/timed evidence로 사용
- client payload로 progression state 제출
- LLM이 state 또는 achievement 선언
- current runtime에서 mastery ref required

### 4.5 stale와 재검증

다음 변경은 관련 projection을 `revalidation_required`로 만든다.

- problem revision
- source bundle
- law effective version
- answer/rubric/validator
- release artifact
- curriculum mapping
- evidence qualification
- progression policy
- verified variant family

사용자에게 과거 학습 기록을 몰래 삭제하지 않는다.

```text
과거 기록: 유지
현재 상태: 재검증 필요
이유: 적용 법령 버전 변경
다음 행동: 8분 조건 변경 확인
```

---

## 5. Quest System

### 5.1 quest는 새 task authority가 아니다

`QuestCandidateV1`은 기존 `CoreOutcome`, `ReviewUnit`, repair 또는 approved
intervention을 learner-facing 행동으로 번역한 projection이다.

```ts
type QuestKindV1 =
  | "orient"
  | "commit"
  | "repair"
  | "contrast"
  | "independent_recall"
  | "verified_variant"
  | "timed_full_solution"
  | "recovery";
```

### 5.2 quest object

```ts
type QuestCandidateV1 = {
  id: string;
  learnerScopeRef: string;
  sourceActionRef: string;
  sourceActionKind:
    | "core_outcome"
    | "review_unit"
    | "repair_action"
    | "approved_intervention";
  questKind: QuestKindV1;
  title: string;
  oneLineReason: string;
  successCriteria: string[];
  estimatedMinutes: number;
  independenceRequired: boolean;
  allowedAssistanceRefs: string[];
  targetProgressionRefs: string[];
  evidenceOnCompletionPolicyRef: string;
  priorityReasonCodes: string[];
  policyVersion: string;
  basisChecksum: string;
  status: "candidate" | "selected" | "blocked" | "stale";
};
```

### 5.3 quest taxonomy

| 유형 | 실제 행동 | 대표 시간 |
| --- | --- | ---: |
| 정찰 퀘스트 | 요구 동사·자료 역할·쟁점 식별 | 2~5분 |
| 선택 퀘스트 | 방법·목차·답 방향 commit | 3~8분 |
| 수리 퀘스트 | biggest gap 문단·산식 재작성 | 5~15분 |
| 대조 퀘스트 | near-miss·반례·조건 뒤집기 | 5~12분 |
| 회복 퀘스트 | D+1 무도움 회상 | 3~10분 |
| 변형 퀘스트 | D+7 verified variant | 10~30분 |
| 실전 관문 | timed set/full solution | assignment 기준 |
| 복구 퀘스트 | 공백 뒤 가장 작은 재시작 | 5~15분 |

### 5.4 Today 결합

Today의 top-level `CoreOutcome` 최대 3 규칙을 보존한다.

```text
CoreOutcome 1개
→ 주 quest 1개
→ subordinate execution steps 0..N
```

quest를 추가해 primary choice를 3개보다 늘리지 않는다.

### 5.5 완료 상태

```ts
type QuestCompletionStateV1 =
  | "activity_completed"
  | "evidence_qualified"
  | "evidence_failed"
  | "evidence_uncertain";
```

- 저장·제출은 `activity_completed`
- validator/evidence gate 통과 후 `evidence_qualified`
- progression clear는 `evidence_qualified`만 읽음
- 실패·불확실성을 성공 animation으로 덮지 않음

---

## 6. Boss Gate

### 6.1 목적

보스는 큰 문제를 화려하게 포장하는 기능이 아니다.

> 여러 component repair가 실제 시험형 전체 수행으로 통합됐는지 확인하는
> **timed integration gate**다.

### 6.2 eligibility

```ts
type BossGateEligibilityV1 = {
  learnerScopeRef: string;
  bossDefinitionRef: string;
  requiredProgressionRefs: string[];
  eligibleSourceRefs: string[];
  rightsAndVersionRefs: string[];
  recentRepairRefs: string[];
  minimumIndependentEvidenceRefs: string[];
  priorExposureSummaryRef: string;
  timerPolicyRef: string;
  eligibility: "eligible" | "blocked" | "stale";
  reasonCodes: string[];
  policyVersion: string;
  basisChecksum: string;
};
```

unlock에 사용할 수 없는 것:

- explanation view
- note save
- full-reveal-only activity
- same-surface 반복
- unverified generated item
- source/right/version 불명
- client local progress

### 6.3 결과 표현

```text
실전 관문 통과
- 방법 선택: 유지됨
- 산식 구조: 유지됨
- 검산: 유지됨

다음 수리
- 시간 배분
- 답안지 전사
```

단일 점수보다 유지된 능력과 재발한 간극을 우선한다.

### 6.4 실패

실패는 과거 성취 삭제, stage reset, HP 감소를 만들지 않는다. 새 evidence로
projection을 재계산하고 다음 repair action을 제안한다.

---

## 7. Recovery-first Continuity

### 7.1 streak를 쓰지 않는 이유

하루 결석으로 30일 연속 기록이 0이 되면:

- 복귀 비용이 커지고
- 이미 한 학습이 무가치해 보이며
- 병결·생업·예측불가 일정에 불공정하고
- 수험 불안을 자극할 수 있다.

답안길은 연속 출석 대신 **학습 흐름과 복구 가능성**을 표시한다.

### 7.2 continuity contract

```ts
type LearningContinuityStateV1 =
  | "flowing"
  | "fragile"
  | "recovery_available"
  | "recovery_in_progress"
  | "stabilized"
  | "insufficient_evidence";

type LearningContinuityProjectionV1 = {
  learnerScopeRef: string;
  windowPolicyRef: string;
  state: LearningContinuityStateV1;
  activeStudyDayCount: number;
  qualifyingRecoveryCount: number;
  overdueMinuteBudget: number;
  smallestRecoveryActionRef?: string;
  reasonCodes: string[];
  evidenceThroughRef: string;
  policyVersion: string;
  basisChecksum: string;
};
```

### 7.3 UI

```text
최근 14일 학습 흐름: 안정
복구 필요: 1개
가장 작은 재시작: 7분
```

또는:

```text
3일 쉬었습니다.
밀린 계획을 모두 쌓지 않았습니다.
8분 복구 퀘스트 하나로 다시 시작합니다.
```

### 7.4 recovery planning

```text
overdue 전체 복사                       ❌

due evidence 재평가
→ expired/stale 제거
→ 가장 영향 큰 recovery 1개
→ Today budget 안의 CoreOutcome 최대 3
→ 나머지는 defer/drop 이유 표시         ✅
```

---

## 8. Recovery Nudge Engine

### 8.1 candidate와 delivery 분리

```text
Nudge Candidate 생성
≠ 실제 push/email 발송
```

초기 owner-private 단계에서는 in-app candidate만 만든다. 외부 delivery는
별도 approval, preference, consent/notice, retention, provider, cost와 kill
switch가 필요하다.

### 8.2 trigger

```ts
type NudgeReasonV1 =
  | "review_due"
  | "unfinished_repair"
  | "high_confidence_wrong"
  | "inactive_recovery"
  | "boss_ready"
  | "revalidation_required";
```

### 8.3 candidate object

```ts
type NudgeCandidateV1 = {
  id: string;
  learnerScopeRef: string;
  reason: NudgeReasonV1;
  sourceActionRef: string;
  directActionRouteRef: string;
  title: string;
  body: string;
  estimatedMinutes: number;
  createdFromEvidenceThroughRef: string;
  suppressionRefs: string[];
  cooldownUntil: string;
  expiresAt: string;
  quietHoursPolicyRef: string;
  preferenceSnapshotRef: string;
  channelEligibility:
    | "in_app_only"
    | "web_push_candidate"
    | "email_candidate"
    | "blocked";
  status:
    | "candidate"
    | "suppressed"
    | "expired"
    | "delivered"
    | "acted"
    | "dismissed"
    | "blocked";
  policyVersion: string;
  idempotencyKey: string;
  basisChecksum: string;
};
```

### 8.4 suppression

다음이면 발송하지 않는다.

- 이미 완료
- 같은 action의 더 최신 candidate 존재
- action stale/blocked
- learner snooze/dismiss
- channel opt-out
- quiet hours
- 하루 proactive cap 초과
- 같은 reason cooldown
- action 화면을 현재 보고 있음
- source route unavailable
- 반복 무반응에 따른 frequency reduction
- session/identity uncertainty

### 8.5 초기 빈도 가설

```text
proactive nudge: 하루 최대 1개
동일 source action: 24시간 이내 중복 0
동일 reason: cooldown
두 번 연속 무반응: 빈도 축소
quiet hours: learner 설정 우선
```

정확한 값은 canonical policy와 evaluation이 정한다.

### 8.6 copy

좋은 예:

| trigger | copy |
| --- | --- |
| review due | `어제 수리한 처분성 문단, 6분 무도움 확인이 준비됐어요.` |
| unfinished repair | `마지막 문단 하나만 고치면 이 간극을 닫을 수 있어요.` |
| high-confidence wrong | `확신하고 틀린 환원이율 입력을 8분 대조 문제로 확인해요.` |
| boss ready | `이번 주 수리 3개가 연결됐습니다. 실전 관문이 열렸어요.` |
| inactive recovery | `밀린 과제는 쌓지 않았어요. 8분 복구 퀘스트 하나로 다시 시작합니다.` |
| revalidation | `법령 버전이 바뀌어 이 논점은 7분 재검증이 필요합니다.` |

금지:

```text
3일째 공부하지 않았습니다.
이대로는 합격이 어렵습니다.
연속 기록이 사라집니다.
다른 수험생보다 뒤처졌습니다.
오늘 반드시 완료하세요.
```

### 8.7 direct action

```text
알림
→ exact source action
→ 필요한 context
→ 5~15분 수행
→ evidence result
```

route가 없으면 candidate를 만들지 않는다.

---

## 9. Achievement와 Knowledge Relic

### 9.1 achievement

achievement는 외부 자격증이나 mastery authority가 아니다.

```text
검증된 학습 사건을 알아보기 쉽게 요약한 개인 기록
```

```ts
type AchievementArtifactV1 = {
  id: string;
  learnerScopeRef: string;
  achievementKind:
    | "repair_completed"
    | "d1_independent_confirmed"
    | "verified_variant_cleared"
    | "timed_integration_cleared"
    | "recovery_completed";
  criterionVersion: string;
  evidenceRefs: string[];
  evidenceDigest: string;
  earnedAt: string;
  status: "active" | "revalidation_required" | "revoked";
  displayCopyRef: string;
  portability: "internal_only";
};
```

### 9.2 숫자 XP를 초기에는 사용하지 않는다

- 행동 가치 비교가 어렵다.
- 쉬운 행동 farming을 만든다.
- 실제 evidence와 별도 경제가 생긴다.
- 숫자 숙달 환상을 줄 수 있다.

필요한 것은:

```text
단계
근거
다음 관문
```

이다.

### 9.3 Knowledge Relic

Moodle Stash의 수집 개념을 답안길에서는 **재사용 가능한 전략 카드**로
번역한다.

```ts
type KnowledgeRelicKindV1 =
  | "calculation_check"
  | "issue_check"
  | "structure_check"
  | "contrast_axis"
  | "time_allocation_check";

type KnowledgeRelicV1 = {
  id: string;
  learnerScopeRef: string;
  kind: KnowledgeRelicKindV1;
  conceptNodeRef: string;
  sourceEvidenceRefs: string[];
  title: string;
  compactRule: string;
  actionChecklistRefs: string[];
  relatedLearningDocumentRefs: string[];
  nextReviewRef?: string;
  status: "usable" | "revalidation_required" | "stale";
  policyVersion: string;
  basisChecksum: string;
};
```

예:

```text
실무
- 환원이율 입력 검산 카드
- 단위 전사 체크 카드
- 기준시점 확인 카드

법규
- 처분성 판단 카드
- 원고적격 검토 카드
- 제소기간 확인 카드

이론
- 개념 비교축 카드
- 반대 관점 카드
- 최고최선이용 검토 카드
```

카드는 장식이 아니다. 누르면 관련 evidence, 10초 확인, 다음 review와
적용 가능한 학습 문서가 열린다.

---

## 10. Branching Micro-Case

### 10.1 목적

Oppia와 H5P Branching Scenario에서 가져올 핵심은 전체 LMS가 아니라:

```text
learner response
→ 오류 signature
→ 다른 질문 또는 최소 scaffold
→ 다시 commit
```

이라는 패턴이다.

### 10.2 native schema

```ts
type BranchingMicroCaseNodeKindV1 =
  | "prompt"
  | "commitment"
  | "diagnostic_choice"
  | "scaffold"
  | "contrast"
  | "repair"
  | "verification"
  | "exit";

type BranchingMicroCaseNodeV1 = {
  id: string;
  nodeKind: BranchingMicroCaseNodeKindV1;
  contentRef: string;
  sourceAndClaimRefs: string[];
  allowedResponseSchemaRef: string;
  transitionRuleRefs: string[];
  assistanceEffectRef?: string;
  status: "usable" | "blocked" | "stale";
};

type BranchingMicroCaseV1 = {
  id: string;
  subjectAdapterRef: string;
  conceptNodeRefs: string[];
  sourceRevisionChecksum: string;
  rightsDecisionRef: string;
  entryNodeRef: string;
  nodeRefs: string[];
  terminalNodeRefs: string[];
  validatorRefs: string[];
  policyVersion: string;
  basisChecksum: string;
};
```

### 10.3 과목 예

법규:

```text
왜 처분성이 없다고 판단했나요?
A. 수용재결 전이기 때문에
B. 고시는 사실행위라고 생각해서
C. 권리변동이 즉시 발생하지 않아서
D. 판단 근거를 모르겠다
```

- A: 절차 단계와 처분성 구분
- B: 고시 행위와 고시되는 처분 구분
- C: 직접 효과와 법적 지위 변화 구분
- D: 최소 개념 cue

실무:

```text
이 자료를 왜 비교사례로 선택했나요?
→ 자료 역할 오인
→ 기준시점 불일치
→ 사정보정 누락
→ 방법 선택 재commit
```

이론:

```text
이 개념과 가장 가까운 비교축은?
→ 정의
→ 적용범위
→ 반대 관점
→ 조건 변화
```

### 10.4 boundary

- branch는 free-form AI improvisation이 아니다.
- node와 transition은 closed, versioned contract다.
- unverified generated branch는 Learning Lane 참고에만 사용한다.
- current authority가 승인하지 않은 guided runtime을 만들지 않는다.
- Measurement Lane과 D+7/timed에는 verified item만 사용한다.
- branch completion 자체가 progression clear가 아니다.

---

## 11. Quest Map

### 11.1 canonical mobile representation

모바일 canonical UI는 세로형 리스트다.

```text
3방식 기본            변형 클리어
비교방식 자료 역할     무도움 확인
사정보정               간극 수리
시점수정               시작 가능
지역·개별요인          잠김
실전 통합 관문         잠김
```

### 11.2 desktop graph

graph renderer는 optional projection이다.

규칙:

- server-produced bounded view model만 표시
- graph가 없어도 canonical DOM list가 완전함
- graph-only action 없음
- client가 unlock, evidence, weakness 또는 ranking 계산 금지
- node/edge cap
- progressive disclosure
- keyboard navigation
- visible focus
- screen-reader equivalent
- reduced motion
- 200% reflow
- raw learner text를 node label로 사용 금지

### 11.3 view object

```ts
type QuestMapViewV1 = {
  learnerScopeRef: string;
  sourceProgressionDigest: string;
  nodeRefs: string[];
  edgeRefs: string[];
  selectedNextActionRef?: string;
  rendererPolicyVersion: string;
  viewChecksum: string;
};
```

### 11.4 map이 답하는 질문

```text
지금 어디인가?
왜 여기인가?
무엇을 하면 다음이 열리는가?
근거는 무엇인가?
```

map이 답하지 않는 질문:

```text
합격확률은 몇 %인가?
다른 수험생보다 몇 등인가?
AI가 보기에 나는 얼마나 똑똑한가?
```

---

## 12. 오픈소스 채택 계획

### 12.1 기본 gate

오픈소스는 제품 권위가 아니다. 도입 전 요구:

- exact repository, commit/tag와 version
- license, NOTICE와 asset/content license
- transitive dependency와 SBOM
- maintenance/release cadence
- vulnerability와 supply-chain review
- bundle/runtime cost
- accessibility
- data egress와 hosting region
- self-hosted/hosted boundary
- rollback과 uninstallability
- native fallback
- raw learner body leakage 0

### 12.2 matrix

| 후보 | 가져올 것 | 방식 | 초기 결정 |
| --- | --- | --- | --- |
| React Flow / xyflow | node map renderer | optional renderer candidate | 비교 검토 |
| Cytoscape.js | 기존 v7 graph renderer candidate | optional renderer candidate | 기존 후보 보존 |
| Oppia | response-based branching | pattern/schema only | 추천 |
| H5P Branching Scenario | answer-dependent scenario | pattern/native schema; runtime 격리 검토 | 선별 추천 |
| Moodle Reengagement | due reminder + completion suppression | pattern only | 즉시 설계 반영 |
| Moodle Level Up XP | unlock/anti-farming 아이디어 | pattern only | XP·leaderboard 제외 |
| Moodle Stash | collectable inventory | functional relic pattern | 추천 |
| Novu | multi-channel workflow/preferences/digest | later build-vs-buy | 규모 이후 |
| Habitica | quest/boss framing | idea only | 코드·asset·HP 제외 |
| Open Badges 3.0 | portable evidence credential | distant future | 현재 제외 |

### 12.3 renderer 결정

현재 v7에는 Cytoscape.js가 후보로 이미 기록돼 있다. 이 문서는 React Flow를
자동 대체 후보로 승격하지 않는다.

```text
canonical accessible list
→ owner-private usability
→ renderer requirements freeze
→ Cytoscape.js vs React Flow vs native 비교
→ license/SBOM/performance/a11y review
→ exact Owner dependency decision
→ one optional flag
```

renderer 선택은 projection authority를 바꾸지 않는다.

### 12.4 Oppia

Oppia 전체 플랫폼을 fork하지 않는다. 가져올 패턴:

- learner answer에 따른 feedback
- common error에 따른 분기
- 다른 step 또는 deeper question
- creator-defined exploration flow

답안길의 native tutor FSM, diagnosis, scaffold와 branching schema 안에
재구현한다.

### 12.5 H5P

기본 결정:

```text
H5P runtime 직접 결합: 보류
Branching Scenario schema/authoring UX 참고: 허용
격리된 import/authoring adapter: 향후 검토
```

도입 시 component license뿐 아니라 surrounding runtime, content sanitation,
source/right mapping, learner-private body, evidence mapping과 uninstall
fallback을 검증한다.

### 12.6 Moodle Reengagement

가져올 핵심:

```text
activity 완료
→ 일정 뒤 target 예약
→ target 이미 완료했으면 reminder 억제
```

plugin 코드는 이식하지 않고 native eligibility/suppression contract로
구현한다.

### 12.7 Level Up XP

가져올 것:

- 단계 가시화
- unlock
- 중복 행동 anti-farming
- 작은 축하

버릴 것:

- 행동량 XP
- 공개 leaderboard
- 경쟁 rank
- 쉬운 행동 farming
- 숫자 level을 mastery처럼 보이는 UX

### 12.8 Stash

아이템을 장식으로 수집하지 않고 `KnowledgeRelicV1`로 변환한다. 수집 조건은
evidence-gated이며 실제 review/action으로 연결된다.

### 12.9 Novu

초기에는 과하다.

```text
native candidate/suppression
→ in-app brief
→ bounded PWA push
→ multi-channel 필요성 증명
→ Novu core/enterprise license와 data-boundary review
```

### 12.10 Habitica

가져올 것:

- 주간 관문
- 장기 퀘스트
- 선택적 서사

버릴 것:

- HP 감소
- 연속 실패 벌점
- 장비/골드 경제
- random loot
- 타인 비교
- Habitica asset 재사용

### 12.11 Open Badges

현재는 internal `AchievementArtifactV1`만 사용한다. Academy/B2B에서 실제
issuer, criteria, evidence governance가 생긴 뒤 별도 검토한다.

---

## 13. UX 원칙

### 13.1 한 화면 하나의 주 행동

```text
사업인정의 처분성
현재: 간극 수리 필요
다음 관문: D+1 무도움 확인

[10분 문단 다시쓰기]
```

secondary:

```text
왜 이 퀘스트인가?
근거 보기
다른 날로 미루기
```

### 13.2 completion feedback

허용:

- 짧은 check animation
- `간극 수리 완료`
- `내일 무도움 확인이 열립니다`
- 작은 tactile/haptic feedback
- reduced-motion 대체

금지:

- 폭죽 과다
- random reward
- 무한 confetti
- autoplay sound
- 결과 불확실한데 성공 animation
- dark pattern

### 13.3 상태 표현

색만으로 구분하지 않는다.

```text
아이콘 + 문구 + 구조
```

### 13.4 모바일

- table 금지
- sticky primary CTA
- 44px 이상 target
- 세로형 단계
- 한 카드 2~3줄
- graph optional
- offline/conflict/session expiry 명시
- loading skeleton이 성공처럼 보이지 않음

---

## 14. 데이터·privacy·security

### 14.1 analytics 후보 metadata

exact O2와 별도 approval 전 production 수집은 OFF다.

- approved rotating pseudonym
- concept ID, 허용되는 경우
- quest kind
- progression state
- nudge reason/suppression reason
- action duration bucket
- delivered/acted/dismissed closed state
- policy/version
- assistance qualification
- evidence outcome closed enum

### 14.2 금지 body

- 문제 원문
- 답안
- OCR
- 필체
- AI 풀이
- 개인 메모
- 자유형 질문
- 법령 excerpt
- private item title
- KnowledgeRelic free text

### 14.3 RLS

Account A/B 차단:

- progression projection
- quest candidate
- continuity state
- nudge candidate
- achievement
- relic
- branching episode
- delivery preference
- event outbox
- export/delete

### 14.4 idempotency

다음 중복은 0이어야 한다.

- multi-tab completion
- retry
- offline replay
- provider retry
- background redelivery
- route refresh
- duplicate evidence event
- duplicate nudge delivery

### 14.5 delete/revocation

raw learner data 삭제 또는 authority stale 시:

- related projection stale/revoked
- nudge suppressed
- achievement evidence inaccessible/revalidation state
- downstream delivery payload 삭제 가능 범위 기록
- approved shared signal이 있으면 current canonical lineage로 propagation

이 문서가 새로운 shared-signal export 권한을 만들지 않는다.

---

## 15. Measurement와 실험

### 15.1 primary learning metrics

```text
D+1 무도움 회복률
D+7 verified transfer 성공률
같은 gap 재발률
time-to-independent-correct
timed 수행에서의 재발 감소
independently recovered gaps per effective learner hour
assistance dependence 감소
```

### 15.2 product metrics

```text
quest candidate → start
start → activity completion
activity completion → qualified evidence
nudge delivered → direct action
recovery mode → first meaningful action
map open → next action start
```

product metric은 learning metric을 대체하지 않는다.

### 15.3 guardrail

```text
false unlock: 0
false achievement: 0
duplicate nudge: 0
completed-action nudge: 0
raw-body leak: 0
cross-account access: 0
shame/fear copy: 0
notification opt-out 증가
dismiss/ignore 반복
anxiety complaint
app interaction + provider wait: effective study time의 5% 이하 가설
```

### 15.4 실험 후보

exact O2와 별도 experiment approval 전 production experiment를 하지 않는다.

1. plain task vs evidence-gated quest framing
2. generic reminder vs exact evidence + estimated minutes
3. streak copy vs recovery continuity copy
4. vertical list vs optional map
5. boss gate preview vs no preview
6. knowledge relic entry vs normal review entry

### 15.5 성공 판정

다음이면 채택하지 않는다.

```text
클릭률 증가 AND D+7 transfer 감소
체류시간 증가 AND 독립 수행 감소
알림 반응 증가 AND 불안/opt-out 증가
```

---

## 16. 구현 순서

정확한 issue/roadmap ID는 별도 canonical amendment가 정한다.

### PGR0 — Source Contract

- canonical source가 허용하는 evidence vocabulary 확정
- progression/quest/nudge projection boundary
- no-mastery/no-guided-runtime overlay
- prohibited-pattern tests
- runtime 0

### PGR1 — Deterministic Progression Projector

선행:

- S237A의 closed evidence contract
- current LearningGapRecord/S216/repair/D+1/D+7/timed path usable

산출물:

- `ProgressionProjectionV1`
- future mastery ref absent gate
- stale/revalidation
- deterministic replay fixtures
- new authority store 0

### PGR2 — Quest Composer + Today

- existing CoreOutcome/ReviewUnit projection
- one primary quest per CoreOutcome
- Today max 3
- estimated minutes
- success criteria
- evidence pending/failure UX

### PGR3 — Recovery Continuity + In-App Candidate

- `LearningContinuityProjectionV1`
- `NudgeCandidateV1`
- suppression/cooldown/quiet hours
- in-app only
- external delivery OFF

### PGR4 — Canonical Vertical Quest List

- mobile and desktop list
- dependency 0
- accessibility/reflow acceptance

### PGR5 — Optional Renderer Decision

선행:

- PGR4 accepted
- Cytoscape.js/React Flow/native comparison
- dependency/license/SBOM approval
- graph/list parity

feature flag OFF by default.

### PGR6 — Boss Gate + Branching Micro-Case

- timed boss eligibility
- three-subject micro-case fixtures
- native branching schema
- Measurement Lane isolation
- guided runtime 0

### PGR7 — Knowledge Relics

- functional cards
- evidence provenance
- review/action deep-link
- random collection 0

### PGR8 — External Delivery Adapter

선행:

- S241A
- exact O2 telemetry/retention/preferences approval
- current roadmap authorization
- PWA/native channel acceptance
- provider/data-boundary/cost approval

순서:

```text
in-app
→ bounded PWA push
→ need-based email
→ multi-channel complexity 증명 후 Novu 검토
```

### PGR9 — External Evaluation

선행:

- owner-private dogfood
- quality gate
- external cohort authorization
- preregistered metrics

평가:

- learning effect
- recovery
- anxiety/annoyance
- support load
- opt-out
- cost

---

## 17. PR 분할

1. docs/contracts only
2. projector + unit tests
3. Today quest UI
4. recovery/nudge candidate
5. canonical list
6. optional renderer dependency
7. boss/branching
8. relics
9. delivery adapter
10. measurement/evaluation

같은 lock의 동시 writer 금지:

- evidence/qualification
- Today/Review Queue
- notification outbox/preferences
- shared telemetry
- app shell/navigation
- dependency/lockfile

---

## 18. Acceptance Matrix

### 18.1 semantics

- current mastery runtime dependency 0
- `futureMasteryStateRef` absent
- progression은 evidence lifecycle projection
- quest는 source action projection
- achievement는 evidence summary
- continuity는 streak가 아님
- map은 rank가 아님
- guided runtime activation 0

### 18.2 evidence

- view/save/login clear 0
- same-item transfer 0
- assisted independent clear 0
- verified non-same-surface D+7만 transfer clear
- timed qualification server-derived
- stale propagation 100%
- replay duplicate contribution 0
- unverified generated branch의 Measurement 사용 0

### 18.3 nudge

- completed suppression 100%
- stale/blocked suppression 100%
- quiet hours
- preference/opt-out
- daily cap
- repeated-ignore frequency reduction
- direct action
- duplicate delivery 0
- shame copy 0

### 18.4 boss/branch

- source/right/version current
- timer/exposure bound
- branching node/transition closed
- full reveal 기록
- failure false success 0

### 18.5 OSS

- exact license/NOTICE
- SBOM
- vulnerability
- version pin
- accessibility
- bundle/performance budget
- no body egress
- feature flag
- native fallback
- uninstall test

### 18.6 privacy/security

- A/B denial
- raw body analytics 0
- event idempotency
- export/delete
- preference scope
- provider secret log 0

### 18.7 UX

- 390/768/1440
- 200% reflow
- keyboard/screen reader
- reduced motion
- color-independent state
- one primary CTA
- Today max 3
- graph/list parity
- offline/conflict/session false success 0

### 18.8 learning

- D+1
- D+7
- recurrence
- timed integration
- time-to-independent
- assistance dependence
- engagement-only launch claim 0

---

## 19. 필수 테스트

### 19.1 projector

- same input → same canonical content/checksum
- current mastery ref supplied → reject
- qualifying repair → repair_qualified
- D+1 → d1_independent_confirmed
- verified D+7 → d7_transfer_cleared
- assisted D+7 → no clear
- same-surface D+7 → no clear
- timed eligible → timed_integration_cleared
- stale source → revalidation
- client spoof → reject

### 19.2 quest

- source action 없는 quest 거부
- max 3
- activity completion과 qualified evidence 분리
- blocked action deep-link 금지
- estimated minutes required
- one primary CTA

### 19.3 nudge

- completed suppression
- duplicate key
- quiet hours
- opt-out
- snooze
- expiry
- stale action
- repeated ignore
- exact direct route
- channel eligibility
- replay redelivery

### 19.4 continuity

- missed day reset 없음
- long absence recovery
- illness/backlog bounded
- overdue minute budget
- stale queue removal
- smallest action selection

### 19.5 renderer

- graph off
- JS failure
- list parity
- keyboard traversal
- focus restoration
- reduced motion
- node cap
- raw label canary

### 19.6 authority/privacy

- guided symbol runtime acceptance reject
- mastery persistence/transition reject
- Account A/B
- raw body leak canary
- notification payload canary
- export/delete
- provider metadata boundary
- log/telemetry/screenshot artifact boundary

---

## 20. Owner Gates

### Source/roadmap gate

Owner가 승인할 것:

- 이 전략을 canonical contract에 반영할지
- exact roadmap 위치
- exact runtime scope
- learner-facing naming
- future mastery compatibility를 계속 제외할지

### Dependency gate

- renderer exact package/version
- H5P runtime 여부
- Novu build-vs-buy
- license/SBOM
- bundle/cost
- fallback

### O2 measurement gate

- exact events
- retention
- preference
- opt-out
- experiment
- pseudonymization
- deletion propagation

### Delivery gate

- channel
- quiet hours default
- cap
- provider
- secret
- data region
- kill switch
- production flag

### External claim gate

독립 evidence 전 금지:

- 성적 향상
- 공부시간 단축
- retention 향상 수치
- 합격 가능성
- 게임화로 더 잘 배운다는 claim

---

## 21. 금지 패턴

```text
로그인 XP
노트 저장 XP
AI 답안 열람 XP
공개 leaderboard
친구와 순위 경쟁
HP 감소
연속일 초기화
loot box
random reward
가짜 scarcity
missed-day shame
dark notification pattern
clickbait push
합격 레벨
mastery percentage
client unlock
LLM achievement self-declaration
current mastery state 조기 구현
guided-study runtime 우회 활성화
```

---

## 22. Definition of Done

### Owner-private progression v1

- deterministic evidence lifecycle projector
- current mastery dependency 0
- Today quest max 3
- repair/D+1/D+7/timed mapping
- recovery continuity
- in-app candidate/suppression
- mobile canonical list
- false unlock 0
- raw leak 0
- A/B denial
- accessibility acceptance
- owner가 “지금 어디고 무엇을 하면 다음이 열리는지” 이해 가능

### Advanced v1

- optional renderer
- boss gate
- three-subject branching micro-case
- knowledge relic
- stale/revalidation
- dependency authority inversion 0

### External delivery v1

- exact O2
- preference/quiet hours/cap
- PWA push
- duplicate 0
- provider failure false success 0
- opt-out/delete
- quality/support/cost evidence

### Product success

```text
사용자가 포인트를 얻어서 돌아오는 것이 아니라,
어제 수리한 간극을 오늘 혼자 확인하고,
다른 문제에서도 해내는 경험 때문에 돌아온다.
```

---

## 23. 연구·오픈소스 참고

아래는 설계 참고이며 답안길의 효능을 대신 입증하지 않는다.

### Learning, gamification and nudges

- [The impact of different combinations of game elements for gamified learning in higher education on student learning outcomes](https://doi.org/10.1080/03075079.2024.2416498)
- [Gamification enhances student intrinsic motivation, perceptions of autonomy and relatedness, but minimal impact on competency](https://doi.org/10.1007/s11423-023-10337-7)
- [Microcommitments: The Effect of Small Commitments on Student Success](https://doi.org/10.1257/pandp.20211043)
- [A Test of Enhancing Learning in Economics through Nudges](https://doi.org/10.1257/pandp.20201050)
- [Effect of Personalized Email-Based Reminders on Participants' Timeliness in an Online Education Program](https://doi.org/10.2196/43977)

### Open-source patterns

- [React Flow / xyflow](https://github.com/xyflow/xyflow)
- [Cytoscape.js](https://github.com/cytoscape/cytoscape.js)
- [Oppia](https://github.com/oppia/oppia)
- [H5P Branching Scenario](https://github.com/h5p/h5p-branching-scenario)
- [Moodle Reengagement](https://moodle.org/plugins/mod_reengagement)
- [Moodle Level Up XP](https://moodle.org/plugins/block_xp)
- [Moodle Stash](https://moodle.org/plugins/block_stash)
- [Novu](https://github.com/novuhq/novu)
- [Habitica](https://github.com/HabitRPG/habitica)
- [1EdTech Open Badges](https://www.1edtech.org/standards/open-badges)

---

## 24. 최종 원칙

> **게임처럼 보이게 만드는 것이 목표가 아니다. 실제로 해낸 학습의
> 구조가 게임처럼 명확하게 느껴지게 만드는 것이 목표다.**

> **알림의 목적은 사용자를 앱으로 끌어오는 것이 아니라, 가장 작은
> 독립 학습 행동으로 바로 데려가는 것이다.**

> **성취는 접속·소비·클릭이 아니라 repair·무도움 회복·verified transfer·
> timed integration의 근거로만 열린다.**

> **사용자가 쉬어도 과거 성취를 벌하지 않는다. 밀린 일을 쌓지 않고,
> 다시 시작할 수 있는 복구 루트를 제공한다.**

> **현재 존재하지 않는 mastery나 guided runtime을 progression을 위해
> 조기 구현하지 않는다. 현재 trusted evidence에서 직접 투영하고,
> authority가 바뀌면 새 versioned contract로 다시 검증한다.**
