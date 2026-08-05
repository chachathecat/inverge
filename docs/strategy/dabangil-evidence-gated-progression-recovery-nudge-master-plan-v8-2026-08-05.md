---
document_title: "답안길 Evidence-Gated Progression & Recovery Nudge 통합 마스터플랜 v8"
document_subtitle: "증거 기반 공략·퀘스트·복구 알림·성취 표현·오픈소스 이식 계약"
status: "owner-strategy/non-authoritative"
dated: "2026-08-05 KST"
repository: "chachathecat/inverge"
strategy_scope:
  - "evidence-gated progression"
  - "quest and boss presentation"
  - "recovery-first nudges"
  - "functional achievements and knowledge relics"
  - "branching micro-cases"
  - "open-source adoption boundaries"
integrates_with:
  - "docs/strategy/dabangil-professional-exam-reasoning-os-master-plan-v7-2026-07-28.md"
amends_for_strategy_only:
  - "engagement, progression, nudge, achievement, quest-map and OSS-adoption guidance"
does_not_supersede:
  - "live GitHub state and runtime"
  - "dated Owner decisions"
  - "AGENTS.md"
  - "canonical Markdown and machine-readable contracts"
  - "roadmap/active-program.yml"
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

이 문서는 답안길을 RPG, 출석 앱, streak 앱 또는 포인트 앱으로 바꾸자는
계획이 아니다.

> **기존 독립 시도·간극·repair·D+1·D+7·timed evidence를 그대로 권위로
> 유지하면서, 그 학습 과정을 “어디까지 왔고, 무엇을 고치면 다음 관문이
> 열리는지” 이해하기 쉬운 공략·퀘스트·복구 경험으로 투영하는 계획**이다.

이 문서가 제안하는 핵심 이름은 다음과 같다.

```text
Evidence-Gated Progression & Recovery Layer
한국어 제품 표현: 증거 기반 공략·회복 레이어
```

이 레이어는 학습효과를 새로 판정하지 않는다. 기존 trusted evidence를
읽고 다음 네 가지로 표현한다.

1. 지금 열린 **공략 단계**
2. 지금 해야 할 **퀘스트 한 가지**
3. 다음에 검증할 **관문**
4. 쉬었다 돌아올 때의 **복구 루트**

이 문서만으로 다음을 승인하지 않는다.

- runtime, schema, migration, RLS, dependency 또는 provider 변경
- `roadmap/active-program.yml` 변경
- 실제 PWA push, 이메일, SMS 또는 외부 notification provider 사용
- React Flow, H5P, Oppia, Novu, Moodle plugin 또는 다른 OSS 설치
- production telemetry, experiment, randomization 또는 model fitting
- learner-facing XP, leaderboard, streak, badge 또는 public social feature
- 외부 학습자, 결제, entitlement, 가격, 공개 navigation 또는 Production
- canonical mastery, readiness, source, rights 또는 release gate 변경

실제 구현은 live authority가 허용하는 별도 Work, 별도 contract amendment,
focused test, exact-head review와 필요한 Owner 승인으로 수행한다.

---

## 0. 한 페이지 결론

### 0.1 최종 제품 결정

답안길에서 성취감은 다음 순서로 만들어야 한다.

```text
앱을 열었다
→ 포인트를 받았다
→ 레벨이 올랐다                         ❌

독립 시도에서 간극이 드러났다
→ 그 간극을 직접 수리했다
→ 다음 날 무도움으로 재현했다
→ 다른 verified variant에서도 해냈다
→ 실전 통합 관문을 통과했다              ✅
```

즉, **보상은 사용량이 아니라 독립 학습 증거의 가시화**여야 한다.

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

### 0.3 가장 중요한 설계 원칙

1. `MasteryStateV1`은 계속 유일한 canonical mastery다.
2. progression, quest, achievement, streak-like display는 모두 derived
   projection이다.
3. AI 설명 열람, 저장, 앱 접속, 반복 클릭으로 stage clear를 만들지 않는다.
4. `guided_study`와 assisted success는 독립 클리어가 아니다.
5. D+1은 최대 회복 중, D+7 verified variant는 stable 후보라는 기존 계약을
   그대로 유지한다.
6. nudge는 사용자를 겁주거나 죄책감을 주지 않고 **다음 작은 행동으로 바로
   연결**한다.
7. 알림 후보와 실제 외부 발송은 분리한다.
8. 모바일 canonical UI는 세로형 리스트다. 그래프는 보조 표현일 뿐이다.
9. 공개 leaderboard, HP 감소, loot box, streak 초기화는 사용하지 않는다.
10. 성공 지표는 체류시간이 아니라 독립 회복과 전이다.

### 0.4 제품 이름과 언어

내부 계약:

```text
ProgressionProjection
QuestCandidate
BossGate
RecoveryNudge
LearningContinuity
KnowledgeRelic
BranchingMicroCase
```

권장 learner-facing 표현:

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

피해야 할 표현:

```text
숙달률 87%
합격 레벨
오늘 안 하면 손실
연속 기록이 깨집니다
HP 감소
다른 수험생보다 뒤처졌습니다
```

---

## 1. 작성 시점 live checkpoint와 권위

2026-08-05 KST 작성 시 read-only 관측값:

| 대상 | 관측 상태 |
| --- | --- |
| default branch | `main` |
| observed main | `5d00cd84ec8ab44918ce47a49a0d71e9734cbea0` |
| observed strategy base | `docs/strategy/dabangil-professional-exam-reasoning-os-master-plan-v7-2026-07-28.md` |
| observed open high-risk path | PR #676, S236P Owner-private acceptance blocked |
| observed open runtime path | PR #678, Owner Alpha three-subject commit-repair parity |
| public learner/billing/Production | OFF |

위 값은 역사적 관측일 뿐 실행 입력이 아니다. 모든 Work는 live GitHub,
dated Owner decision, `AGENTS.md`, canonical contracts,
`roadmap/active-program.yml`, open PR, locks, reviews와 CI를 다시 읽는다.

### 1.1 현재 authority와의 관계

현재 `AGENTS.md`는 답안길이 다음이 아니라고 규정한다.

- motivation/streak app
- generic dashboard SaaS
- broad multi-exam platform

따라서 이 문서의 progression은 그 금지선을 우회하는 “게임화”가 아니다.
오히려 다음을 더 엄격하게 만든다.

```text
보이는 진행 상태
= canonical evidence의 read-only projection
```

새로운 점수 원장, 새로운 mastery, 새로운 readiness 또는 행동량 기반 rank를
만들지 않는다.

### 1.2 roadmap 배치 원칙

현재 queued critical path는 대략 다음이다.

```text
S236P
→ S236A Golden 3
→ S237A Owner-Private Study OS Core
→ S237P Full-Day
→ O4A
→ S238A/S240A dogfood
→ S241A authenticated acceptance
```

이 문서가 제안하는 progression contract는 `S237A`의 evidence contract가
존재한 뒤에만 runtime 후보가 된다.

실제 external notification, measurement, OSS shadow 또는 shared signal은
현재 `O2 → S270 → O4E → S271` 경계를 우회하지 않는다.

이 문서는 active roadmap을 수정하지 않는다. 정확한 Work ID와 dependency는
별도 canonical roadmap amendment가 정한다.

---

## 2. 왜 일반 gamification이 아니라 evidence-gated progression인가

### 2.1 일반 gamification의 구조적 문제

다음 행동은 측정하기 쉽지만 시험 실력과 동일하지 않다.

- 로그인
- 페이지 열람
- AI 답안 확인
- 노트 저장
- 반복 클릭
- 쉬운 항목 반복
- 앱 체류시간

이 행동에 XP를 주면 사용자는 시스템이 보상하는 일을 최적화한다.
그 결과:

- 쉬운 행동 farming
- 수동적 해설 소비
- 독립 시도 회피
- leaderboard 불안
- streak가 끊긴 뒤 이탈
- 실제 실력과 UI level의 불일치

가 생길 수 있다.

### 2.2 답안길에 맞는 성취의 단위

답안길에서 성취의 최소 단위는 다음 중 하나다.

```text
독립적으로 요구를 정확히 파악함
독립적으로 방법·목차를 commit함
가장 큰 간극을 직접 repair함
D+1 무도움으로 재현함
D+7 verified variant에서 전이함
timed full solution에서 동일 간극의 재발을 막음
```

모든 성취는 immutable evidence reference를 가져야 한다.

### 2.3 연구를 제품에 번역하는 방식

gamification 연구는 평균적으로 긍정적 효과를 보고하지만 효과 크기와
맥락 차이가 크다. 따라서 “게임 요소를 넣으면 성적이 오른다”가 아니라:

```text
성과 측정 + 개인 진행 + 맥락 있는 과제
→ bounded product hypothesis
→ owner-private dogfood
→ controlled external evaluation
```

순서로 다룬다.

nudge 연구도 평균 효과가 항상 양수가 아니다. 일반 reminder보다
개인화된 현재 위치·다음 행동이 더 유용할 수 있지만, 일부 실험은 평균
효과가 없거나 subgroup에만 효과가 있었다. 따라서 답안길은 알림 수를
늘리지 않고 **정확한 due evidence와 즉시 가능한 작은 행동**을 우선한다.

---

## 3. 전체 아키텍처

```text
기존 trusted evidence
- AttemptEvidence
- Exposure / Assistance
- GapFinding
- RepairVerification
- D+1 / D+7
- TimedFullSolution
- MasteryState
- PersonalWeaknessMap
- ReviewUnit
- CoreOutcome / ExecutionBlock

        ↓ read-only

Progression Projector
- stage state
- gate eligibility
- revalidation state
- evidence explanation

        ↓

Quest Composer
- 오늘의 핵심 3에 붙는 quest 표현
- 5~15분 micro quest
- boss candidate
- recovery route

        ↓

Nudge Candidate Engine
- trigger
- reason
- direct action
- suppression
- cooldown
- quiet hours
- preference

        ↓

Presentation / Delivery
- Today card
- vertical quest map
- optional desktop graph
- in-app brief
- future PWA push / email adapter
```

### 3.1 권위 경계

| 계층 | 할 수 있는 것 | 할 수 없는 것 |
| --- | --- | --- |
| Mastery/evidence | 실제 학습 상태 판정 | 게임 표현 결정 |
| Progression projector | evidence를 단계로 표시 | mastery 쓰기 |
| Quest composer | 작은 행동으로 표현 | task eligibility 창작 |
| Nudge engine | 발송 후보·억제 계산 | due evidence 창작 |
| UI | 상태와 행동 표시 | client-side clear 판정 |
| Notification adapter | 승인된 후보 전달 | 임의 메시지·임의 빈도 |

### 3.2 fail-closed

다음 중 하나면 stage clear, boss unlock, achievement 발급 또는 nudge 발송을
하지 않는다.

- evidence ref missing
- evidence stale
- source/right/effective-version conflict
- assistance qualification 불명
- replay/idempotency conflict
- cross-account scope mismatch
- mastery/progression contradiction
- policy version unknown
- notification preference unknown
- quiet-hours 계산 불가
- direct action route unavailable

---

## 4. Progression Projection 계약

### 4.1 stage state

```ts
type ProgressionStateV1 =
  | "locked"
  | "available"
  | "attempted"
  | "repair_required"
  | "repaired"
  | "d1_confirmed"
  | "transfer_cleared"
  | "integrated_cleared"
  | "revalidation_required";
```

의미:

| 상태 | 최소 근거 | learner-facing 표현 |
| --- | --- | --- |
| `locked` | prerequisite 부족 | 잠김 |
| `available` | 시작 eligibility | 시작 가능 |
| `attempted` | qualifying attempt | 첫 시도 완료 |
| `repair_required` | primary gap | 간극 수리 필요 |
| `repaired` | verified repair | 간극 수리 완료 |
| `d1_confirmed` | D+1 무도움 success | 무도움 확인 |
| `transfer_cleared` | D+7 verified variant success | 변형 클리어 |
| `integrated_cleared` | qualifying timed integration | 실전 관문 통과 |
| `revalidation_required` | source/policy/evidence stale | 재검증 필요 |

### 4.2 projection object

```ts
type ProgressionProjectionV1 = {
  projectionKey: string;
  learnerScopeRef: string;
  conceptNodeRef: string;
  stageRef: string;
  state: ProgressionStateV1;
  canonicalMasteryStateRef: string;
  evidenceThroughRef: string;
  qualifyingEvidenceRefs: string[];
  disqualifyingEvidenceRefs: string[];
  prerequisiteStateRefs: string[];
  nextGateRef?: string;
  revalidationReasonCodes: string[];
  policyVersion: string;
  basisChecksum: string;
  contentChecksum: string;
  generatedAt: string;
};
```

### 4.3 허용 조합

| canonical mastery | progression에서 허용되는 대표 상태 |
| --- | --- |
| `unknown` | locked, available, attempted |
| `confused` | attempted, repair_required |
| `wrong` | repair_required, repaired |
| `confident_wrong` | repair_required, repaired |
| `recovering` | repaired, d1_confirmed, transfer_cleared |
| `stable` | transfer_cleared, integrated_cleared, revalidation_required |

정확한 조합은 versioned policy로 닫는다. 표에 없는 조합을 UI에서 임의
보정하지 않는다.

### 4.4 절대 금지

- `viewed_explanation → repaired`
- `saved_note → d1_confirmed`
- `same_item_retry → transfer_cleared`
- `assisted_timed_attempt → integrated_cleared`
- `streak_count → any stage`
- `XP threshold → any stage`
- client payload로 state 제출
- LLM이 stage 선언

### 4.5 stale와 재검증

다음 변경은 관련 projection을 `revalidation_required`로 만든다.

- problem revision
- source bundle
- law effective version
- answer/rubric/validator
- curriculum mapping
- mastery policy
- progression policy
- evidence qualification
- verified variant family

사용자에게 과거 성취를 몰래 삭제하지 않는다.

```text
과거 기록: 유지
현재 상태: 재검증 필요
이유: 적용 법령 버전 변경
다음 행동: 8분 조건 변경 확인
```

---

## 5. Quest System

### 5.1 quest는 task의 새 권위가 아니다

`QuestCandidate`는 기존 `CoreOutcome`, `ReviewUnit`, `RepairAction`,
`InterventionDecision`을 learner-facing 행동으로 번역한 projection이다.

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
    | "intervention_decision";
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

| 유형 | 실제 학습 행동 | 대표 시간 |
| --- | --- | ---: |
| 정찰 퀘스트 | 요구 동사·자료 역할·쟁점 식별 | 2~5분 |
| 선택 퀘스트 | 방법·목차·답 방향 commit | 3~8분 |
| 수리 퀘스트 | biggest gap 문단·산식 재작성 | 5~15분 |
| 대조 퀘스트 | near-miss·반례·조건 뒤집기 | 5~12분 |
| 회복 퀘스트 | D+1 무도움 회상 | 3~10분 |
| 변형 퀘스트 | D+7 verified variant | 10~30분 |
| 실전 관문 | timed set/full solution | assignment 기준 |
| 복구 퀘스트 | 공백 뒤 가장 작은 재시작 | 5~15분 |

### 5.4 Today와의 결합

Today의 top-level `CoreOutcome` 최대 3 규칙을 보존한다.

```text
CoreOutcome 1개
→ 1개의 주 quest
→ 필요 시 subordinate execution steps 0..N
```

quest를 추가해 Today의 primary choice를 3개보다 늘리지 않는다.

### 5.5 quest 완료

quest completion은 두 층으로 나눈다.

```ts
type QuestCompletionStateV1 =
  | "activity_completed"
  | "evidence_qualified"
  | "evidence_failed"
  | "evidence_uncertain";
```

- 버튼을 눌렀거나 답안을 저장하면 `activity_completed`
- validator/evidence gate를 통과해야 `evidence_qualified`
- progression clear는 `evidence_qualified`만 읽는다
- 실패·불확실성을 성공 animation으로 덮지 않는다

---

## 6. Boss Gate

### 6.1 목적

보스는 큰 문제를 화려하게 포장하는 기능이 아니다.

> 여러 component repair가 실제 시험형 전체 수행으로 통합됐는지 확인하는
> **timed integration gate**다.

### 6.2 unlock 기준

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
- guided-only completion
- same-surface 반복
- unverified generated item
- source/right 불명
- client local progress

### 6.3 learner-facing 결과

```text
실전 관문 통과
- 방법 선택: 유지됨
- 산식 구조: 유지됨
- 검산: 유지됨

다음 수리
- 시간 배분
- 답안지 전사
```

단일 점수보다 **유지된 능력과 재발한 간극**을 우선한다.

### 6.4 실패 표현

```text
관문 실패 ❌
다음 공략 정보 확보 ✅
```

실패는 stage reset, HP 감소 또는 과거 성취 삭제를 만들지 않는다.
새 evidence로 canonical state와 progression을 재계산할 뿐이다.

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

### 7.3 권장 UI

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

### 7.4 recovery plan

공백 발생 시:

```text
overdue 전체 복사                       ❌
due evidence 재평가
→ expired/stale 제거
→ 가장 영향 큰 recovery 1개
→ today budget 안에서 최대 3 outcome
→ 나머지는 defer/drop 이유 표시         ✅
```

---

## 8. Recovery Nudge Engine

### 8.1 candidate와 delivery 분리

```text
Nudge Candidate 생성
≠ 실제 push/email 발송
```

초기 owner-private 단계에서는 in-app candidate만 만든다.
외부 delivery는 별도 승인, preference, consent, retention, provider,
cost와 kill switch가 필요하다.

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

### 8.4 억제 규칙

다음이면 발송하지 않는다.

- 이미 완료
- 같은 action의 더 최신 candidate 존재
- action stale/blocked
- learner가 snooze/dismiss
- channel opt-out
- quiet hours
- 하루 proactive cap 초과
- 같은 reason cooldown
- 앱을 열어 해당 action을 이미 보고 있음
- source route unavailable
- two consecutive ignores에 따른 frequency reduction
- session/identity uncertainty

### 8.5 기본 빈도 가설

초기 product hypothesis:

```text
proactive nudge: 하루 최대 1개
동일 source action: 24시간 이내 중복 0
동일 reason: cooldown 적용
두 번 연속 무반응: 빈도 자동 축소
quiet hours: learner 설정 우선
```

정확한 값은 canonical policy와 owner-private evaluation이 정한다.

### 8.6 좋은 copy

| trigger | copy |
| --- | --- |
| review due | `어제 수리한 처분성 문단, 6분 무도움 확인이 준비됐어요.` |
| unfinished repair | `마지막 문단 하나만 고치면 이 간극을 닫을 수 있어요.` |
| high-confidence wrong | `확신하고 틀린 환원이율 입력을 8분 대조 문제로 확인해요.` |
| boss ready | `이번 주 수리 3개가 연결됐습니다. 실전 관문이 열렸어요.` |
| inactive recovery | `밀린 과제는 쌓지 않았어요. 8분 복구 퀘스트 하나로 다시 시작합니다.` |
| revalidation | `법령 버전이 바뀌어 이 논점은 7분 재검증이 필요합니다.` |

### 8.7 금지 copy

```text
3일째 공부하지 않았습니다.
이대로는 합격이 어렵습니다.
연속 기록이 사라집니다.
다른 수험생보다 뒤처졌습니다.
오늘 반드시 완료하세요.
```

### 8.8 direct action

알림은 dashboard로만 보내지 않는다.

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

### 9.1 achievement의 역할

achievement는 외부 자격증이나 mastery 권위가 아니다.

```text
검증된 학습 사건을 알아보기 쉽게 요약한 개인 기록
```

### 9.2 achievement object

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

### 9.3 초기에는 숫자 XP를 쓰지 않는다

이유:

- 단위 간 가치 비교가 어렵고
- 쉬운 행동 farming을 만들며
- 실제 evidence와 별도 경제가 생기고
- 사용자에게 숫자 숙달 환상을 줄 수 있다.

필요한 것은:

```text
단계
근거
다음 관문
```

이다.

### 9.4 Knowledge Relic

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

카드는 장식이 아니다. 누르면 다음이 열린다.

- 관련 개념
- 최근 qualifying error
- 10초 확인
- 다음 review
- 적용 가능한 답안/계산 문서

---

## 10. Branching Micro-Case

### 10.1 목적

Oppia와 H5P Branching Scenario의 가치 있는 부분은 “플랫폼 전체”가 아니라:

```text
learner response
→ 오류 signature
→ 다른 질문 또는 최소 scaffold
→ 다시 commit
```

이라는 분기 패턴이다.

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

### 10.3 과목별 예

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
- node와 transition은 versioned closed contract다.
- unverified generated branch는 Learning Lane에만 사용한다.
- Measurement Lane과 stable evidence에는 verified item만 사용한다.
- branch completion 자체가 mastery를 올리지 않는다.

---

## 11. Quest Map

### 11.1 canonical mobile representation

모바일의 canonical UI는 세로형 리스트다.

```text
3방식 기본            변형 클리어
비교방식 자료 역할     무도움 확인
사정보정               간극 수리
시점수정               시작 가능
지역·개별요인          잠김
실전 통합 관문         잠김
```

### 11.2 desktop graph

React Flow 또는 동등 renderer는 선택적 desktop projection이다.

규칙:

- server-produced bounded view model만 표시
- graph가 없어도 canonical DOM list가 완전함
- graph-only action 없음
- client가 unlock/mastery 계산 금지
- node/edge cap
- progressive disclosure
- keyboard navigation
- visible focus
- screen-reader equivalent
- reduced motion
- 200% reflow
- raw learner text를 node label로 사용 금지

### 11.3 map object

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

### 11.4 map의 역할

map은 다음 질문에 답한다.

```text
지금 어디인가?
왜 여기인가?
무엇을 하면 다음이 열리는가?
근거는 무엇인가?
```

map은 다음 질문에 답하지 않는다.

```text
합격확률은 몇 %인가?
다른 수험생보다 몇 등인가?
AI가 보기에 나는 얼마나 똑똑한가?
```

---

## 12. 오픈소스 채택 원칙

### 12.1 기본 규칙

오픈소스는 제품 권위가 아니다.

도입 전 요구:

- exact repository와 version
- license와 NOTICE
- transitive dependency
- SBOM
- maintenance/release cadence
- vulnerability review
- bundle/runtime cost
- accessibility
- data egress
- self-hosting/hosted boundary
- rollback
- uninstallability
- native fallback
- no raw learner body leakage

### 12.2 채택 매트릭스

| 후보 | 가져올 것 | 방식 | 초기 결정 |
| --- | --- | --- | --- |
| React Flow / xyflow | desktop node map renderer | direct dependency candidate | 조건부 추천 |
| Oppia | response-based tutor branching | pattern/schema only | 강력 추천 |
| H5P Branching Scenario | answer-dependent scenario graph | pattern/native schema; runtime 격리 검토 | 선별 추천 |
| Moodle Reengagement | due reminder + completed suppression | pattern only | 즉시 설계 반영 |
| Moodle Level Up XP | level/unlock/anti-farming 아이디어 | pattern only | XP·leaderboard 제외 |
| Moodle Stash | collectable inventory | functional relic pattern | 추천 |
| Novu | multi-channel workflow, preference, digest | later adapter/open-core review | 외부 규모 이후 |
| Habitica | quest/boss framing | idea only | 코드·asset·HP 제외 |
| Open Badges 3.0 | evidence-bearing portable credential | distant future | 현재 제외 |

### 12.2a 조사 시점 license snapshot

| 후보 | 조사된 license/구조 | 본 계획의 사용 판단 |
| --- | --- | --- |
| React Flow / xyflow | MIT | renderer 후보 |
| Oppia | Apache-2.0 | 패턴과 schema 참고 |
| H5P Branching Scenario | MIT | component 범위 참고, runtime은 별도 검토 |
| Moodle Level Up XP | Moodle plugin/GPL 계열 | 코드 이식 없이 패턴만 |
| Moodle Reengagement/Stash | Moodle plugin 경계 별도 확인 | 코드 이식 없이 패턴만 |
| Novu | core MIT, 일부 enterprise 경로 별도 상용 license | multi-channel 필요가 증명된 뒤 검토 |
| Habitica | 코드·이미지·콘텐츠 경계가 분리될 수 있음 | 아이디어만, 코드·asset 0 |
| Open Badges | 1EdTech 표준 | 장기 credential interoperability 참고 |

license 표는 도입 시점의 exact commit/tag와 LICENSE/NOTICE를 다시
검증해야 하며, 이 문서의 snapshot만으로 dependency를 승인하지 않는다.

### 12.3 React Flow

허용:

- desktop quest map
- node/edge layout
- zoom/pan
- selected node details

금지:

- canonical state calculation
- client unlock write
- mobile-only interaction
- graph가 유일한 접근 경로

도입 순서:

```text
canonical vertical list
→ owner-private usability
→ dependency/license/SBOM review
→ desktop graph flag
→ parity/a11y acceptance
```

### 12.4 Oppia

Oppia 전체 플랫폼을 fork하지 않는다.

가져올 패턴:

- learner answer에 따른 feedback
- common error에 따른 추가 분기
- 다른 step으로 이동
- deeper question

답안길의 `TutorEpisodeStateMachineV1`, `DiagnosticCauseTaxonomyV1`,
`ScaffoldLadderV1` 안에 native schema로 구현한다.

### 12.5 H5P

H5P Branching Scenario는 다른 H5P content를 연결하는 runtime이므로
현재 답안길 커널과 중복 권위가 생길 수 있다.

기본 결정:

```text
H5P runtime 직접 결합: 보류
H5P branching schema/authoring UX 참고: 허용
격리된 authoring/import adapter: 향후 검토
```

H5P package를 도입하려면:

- MIT component 범위 확인
- surrounding runtime/license 경계 확인
- content import sanitation
- source/right mapping
- learner-private body boundary
- tutor evidence mapping
- uninstall fallback

을 별도 검토한다.

### 12.6 Moodle Reengagement

가져올 핵심:

```text
activity 완료
→ 일정 시간 뒤 target 예약
→ target 이미 완료했으면 reminder 억제
```

Moodle plugin 코드를 이식하지 않고 nudge eligibility/suppression pattern을
native하게 구현한다.

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
- 숫자 level이 mastery처럼 보이는 UX

### 12.8 Stash

아이템을 장식으로 수집하지 않고 `KnowledgeRelicV1`로 변환한다.
수집 조건은 evidence-gated이며 실제 review/action으로 연결된다.

### 12.9 Novu

Novu는 Inbox, push, email, SMS/chat workflow와 preference를 통합할 수
있지만 초기 답안길에는 과할 수 있다. 또한 repository가 open-core 구조이므로
MIT core와 enterprise 범위를 정확히 구분해야 한다.

도입 순서:

```text
native candidate/suppression engine
→ in-app brief
→ PWA Web Push bounded adapter
→ multi-channel 필요성 증명
→ Novu build-vs-buy/license/data-boundary review
```

### 12.10 Habitica

가져올 것:

- 주간 관문
- 장기 퀘스트
- 선택적 서사

버릴 것:

- 실패 시 HP 감소
- 연속 실패 벌점
- 장비/골드 경제
- random loot
- 타인 비교
- Habitica asset 재사용

### 12.11 Open Badges

Open Badges는 issuer, criteria와 evidence를 포함하는 portable credential에
적합하다. 하지만 개인 수험 진행을 외부 자격처럼 표현하면 오해가 크다.

현재:

```text
internal AchievementArtifactV1 only
```

향후 Academy/B2B에서 실제 issuer·criteria·evidence governance가 생긴 뒤
별도 검토한다.

---

## 13. UX 원칙

### 13.1 한 화면 하나의 주 행동

예:

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

### 13.3 상태는 색만으로 구분하지 않는다

```text
아이콘 + 문구 + 구조
```

상태 예:

- 시작 가능
- 간극 수리 필요
- 무도움 확인
- 변형 클리어
- 실전 관문 통과
- 재검증 필요

### 13.4 모바일

- table 금지
- sticky primary CTA
- 44px 이상 target
- 세로형 단계
- 한 카드 2~3줄
- graph는 optional
- offline/conflict/session expiry 명시
- progress skeleton이 성공처럼 보이지 않음

---

## 14. 데이터·privacy·보안

### 14.1 analytics에 허용되는 metadata

- opaque learner pseudonym, 승인 시에만
- concept ID
- quest kind
- progression state
- nudge reason
- suppression reason
- action duration bucket
- delivered/acted/dismissed
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

다음은 중복 생성·중복 clear·중복 발송이 0이어야 한다.

- multi-tab completion
- retry
- offline replay
- provider retry
- background job redelivery
- route refresh
- duplicate evidence event

### 14.5 deletion

raw learner data 삭제 시:

- related projection stale/revoked
- nudge suppressed
- achievement evidence inaccessible 상태 처리
- external delivery payload 삭제 가능 범위 기록
- shared signal이 있으면 approved lineage에 따라 propagation

---

## 15. Measurement와 실험

### 15.1 primary learning metrics

```text
D+1 무도움 회복률
D+7 verified transfer 성공률
같은 gap 재발률
time-to-independent-correct
timed full solution에서의 재발 감소
independently recovered gaps per effective learner hour
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
app interaction + provider wait: effective study time의 5% 이하 가설
notification opt-out 증가
dismiss/ignore 반복
anxiety complaint
```

### 15.4 실험 후보

O2와 별도 approval 전 production experiment를 하지 않는다.

후보:

1. plain task vs evidence-gated quest framing
2. generic reminder vs exact evidence + estimated minutes reminder
3. streak copy vs recovery continuity copy
4. vertical list vs optional map
5. boss gate preview vs no preview
6. knowledge relic review entry vs normal review entry

### 15.5 성공 판정

다음이면 출시 성공이 아니다.

```text
클릭률 증가
AND
D+7 transfer 감소
```

또는:

```text
체류시간 증가
AND
독립 수행 감소
```

primary learning metric이 나빠지면 engagement improvement를 채택하지 않는다.

---

## 16. 구현 순서

정확한 issue/roadmap ID는 별도 canonical amendment가 정한다.

### PGR0 — Source Contract

범위:

- 이 전략 문서
- glossary
- evidence/projection boundary
- prohibited-pattern tests 제안

runtime 0.

### PGR1 — Deterministic Progression Projector

선행:

- S237A가 필요한 evidence contract를 제공
- canonical mastery와 gap/repair/D+1/D+7 state usable

산출물:

- `ProgressionProjectionV1`
- stale/revalidation
- replay deterministic fixtures
- no new mastery store

### PGR2 — Quest Composer + Today Integration

산출물:

- existing CoreOutcome/ReviewUnit projection
- one primary quest per CoreOutcome
- max 3 preserved
- estimated minutes
- success criteria
- evidence pending/failure UX

### PGR3 — Recovery Continuity + In-App Nudge Candidate

산출물:

- `LearningContinuityProjectionV1`
- `NudgeCandidateV1`
- suppression/cooldown/quiet-hours contract
- in-app only
- external delivery OFF

### PGR4 — Vertical Quest Map

산출물:

- mobile canonical list
- desktop structured list
- no dependency required
- a11y and reflow acceptance

### PGR5 — Optional React Flow Renderer

선행:

- PGR4 accepted
- dependency/license/SBOM approval
- renderer parity tests

feature flag OFF by default.

### PGR6 — Boss Gate + Branching Micro-Case

산출물:

- timed boss eligibility
- 3-subject micro-case fixtures
- native branching schema
- measurement lane isolation

### PGR7 — Knowledge Relics

산출물:

- functional cards
- exact evidence provenance
- review/action deep-link
- no random collection

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
→ Novu review only if multi-channel complexity is proven
```

### PGR9 — External Evaluation

선행:

- owner-private dogfood
- quality gate
- external cohort authorization
- pre-registered metrics

평가:

- learning effect
- recovery
- anxiety/annoyance
- support load
- opt-out
- cost

---

## 17. PR 분할 원칙

한 PR에 모두 넣지 않는다.

권장:

1. docs/contracts only
2. projector + unit tests
3. Today quest UI
4. recovery/nudge candidate
5. vertical map
6. optional renderer dependency
7. boss/branching
8. relics
9. delivery adapter
10. measurement/evaluation

동시에 쓰면 안 되는 lock:

- canonical mastery/evidence
- Today/Review Queue
- notification outbox/preferences
- shared telemetry
- app shell/navigation
- dependency/lockfile

dependency PR과 feature PR을 가능하면 분리한다.

---

## 18. Acceptance Matrix

### 18.1 semantics

- `MasteryStateV1` 유일
- progression은 projection
- quest는 source action projection
- achievement는 evidence summary
- continuity는 streak가 아님
- map은 rank가 아님

### 18.2 evidence

- view/save/login clear 0
- same-item transfer 0
- assisted independent clear 0
- D+7 verified variant 전 stable 후보
- timed qualification server-derived
- stale propagation 100%
- replay duplicate contribution 0

### 18.3 nudge

- completed suppression 100%
- stale/blocked suppression 100%
- quiet hours
- preference/opt-out
- daily cap
- two-ignore frequency reduction
- direct action
- duplicate delivery 0
- shame copy 0

### 18.4 boss/branch

- boss item source/right/version current
- timer and exposure bound
- branching node/transition closed
- unverified branch measurement 사용 0
- full solution reveal 기록
- failure false success 0

### 18.5 OSS

- exact license
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
- signed URL boundary
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
- no engagement-only launch claim

---

## 19. 필수 테스트

### 19.1 projection

- same input → same canonical content/checksum
- mastery/progression valid matrix
- stale source → revalidation
- qualifying repair → repaired
- D+1 → d1_confirmed
- verified D+7 → transfer_cleared
- assisted D+7 → no clear
- timed eligible → integrated_cleared
- client spoof rejection

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
- two ignores
- exact direct route
- channel eligibility
- replay redelivery

### 19.4 continuity

- one missed day reset 없음
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
- large graph cap
- raw label canary

### 19.6 privacy

- Account A/B
- raw body leak canary
- notification payload canary
- export/delete
- delivery provider metadata
- log/telemetry screenshot artifact

---

## 20. Owner Gate

### Source/roadmap gate

Owner가 승인할 것:

- 이 전략을 canonical learning contract에 반영할지
- exact roadmap 위치
- runtime scope
- learner-facing naming

### Dependency gate

- React Flow exact package/version
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

다음 claim은 독립 evidence 전 금지:

- 성적 향상
- 공부시간 단축
- retention 향상 수치
- 합격 가능성
- “게임화로 더 잘 배운다”

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
```

---

## 22. Definition of Done

### Owner-private v1

- progression projector deterministic
- Today quest max 3
- repair/D+1/D+7/timed mapping
- recovery continuity
- in-app candidate/suppression
- mobile list
- false unlock 0
- raw leak 0
- A/B denial
- a11y acceptance
- owner dogfood에서 실제 다음 행동 이해 가능

### Advanced v1

- optional graph
- boss gate
- 3-subject branching micro-case
- knowledge relic
- stale/revalidation
- no dependency authority inversion

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

### Learning and gamification

- [The impact of different combinations of game elements for gamified learning in higher education on student learning outcomes (2024)](https://doi.org/10.1080/03075079.2024.2416498)
- [Gamification enhances student intrinsic motivation, perceptions of autonomy and relatedness, but minimal impact on competency (2024)](https://doi.org/10.1007/s11423-023-10337-7)
- [Microcommitments: The Effect of Small Commitments on Student Success (2021)](https://doi.org/10.1257/pandp.20211043)
- [A Test of Enhancing Learning in Economics through Nudges (2020)](https://doi.org/10.1257/pandp.20201050)
- [Effect of Personalized Email-Based Reminders on Participants' Timeliness in an Online Education Program (2023)](https://doi.org/10.2196/43977)

### Open-source patterns

- [React Flow / xyflow](https://github.com/xyflow/xyflow)
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
