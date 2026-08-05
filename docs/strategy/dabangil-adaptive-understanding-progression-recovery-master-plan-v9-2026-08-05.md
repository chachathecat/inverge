---
document_title: "답안길 Adaptive Understanding & Evidence-Gated Progression 통합 마스터플랜 v9"
document_subtitle: "집요한 이해 유도·대화 하단 맞춤 버튼·증거 기반 공략·복구 알림·오픈소스 이식 계약"
status: "owner-strategy/non-authoritative"
dated: "2026-08-05 KST"
repository: "chachathecat/inverge"
integrates_with:
  - "docs/strategy/dabangil-professional-exam-reasoning-os-master-plan-v7-2026-07-28.md"
supersedes_for_strategy_only:
  - "docs/strategy/dabangil-evidence-gated-progression-recovery-nudge-master-plan-v8-2026-08-05.md"
amends_for_strategy_only:
  - "persistent why-chain tutoring"
  - "adaptive understanding checks"
  - "learner-specific bottom action rail"
  - "evidence-gated progression, quests, recovery, nudges and OSS adoption"
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
execution_rule: "Reconcile live authority before every Work; this document proposes contracts and dependency order only."
---

# 답안길 Adaptive Understanding & Evidence-Gated Progression 통합 마스터플랜 v9

## 감정평가사 2차 학습 커널 위에 얹는 집요한 이해·공략·복귀 레이어

이 문서는 답안길을 일반 챗봇, RPG, 출석 앱, streak 앱, 포인트 앱 또는
generic motivation product로 바꾸자는 계획이 아니다.

> **사용자가 좋은 후속 질문을 스스로 만들어야만 깊이 이해할 수 있는 구조를
> 끝내고, AI가 대화에서 아직 닫히지 않은 개념을 추적해 다음에 물어볼 가장
> 유용한 질문과 행동을 화면 맨 아래에 맞춤형 버튼으로 제시하되, 실제 성취는
> repair·무도움 회복·verified transfer·timed integration의 증거로만
> 인정하는 전략**이다.

내부 전략 이름은 다음과 같다.

```text
Adaptive Understanding & Evidence-Gated Progression Layer
한국어 제품 표현: 집요한 이해·증거 기반 공략 레이어
```

이 레이어는 새로운 mastery, readiness, pass probability 또는 score를
만들지 않는다. 현재 권위가 허용하는 trusted evidence와 learner-private
projection을 읽어 다음을 제공한다.

1. 지금 대화에서 아직 닫히지 않은 **이해 간극 후보 1개**
2. 그 간극에 맞는 **다음 질문·표현·확인 행동**
3. 화면 맨 아래의 **한 개 주 버튼과 소수의 대안 버튼**
4. 실제 evidence가 보여주는 **공략 단계와 다음 관문**
5. 쉬었다 돌아왔을 때의 **복구 루트**

이 문서만으로 다음을 승인하지 않는다.

- runtime, schema, migration, RLS, API, UI, navigation 또는 provider 변경
- `roadmap/active-program.yml` 변경
- 실제 PWA push, 이메일, SMS 또는 외부 notification provider 사용
- React Flow, Cytoscape.js, H5P, Oppia, Moodle plugin, Novu, Habitica 또는
  다른 OSS 설치
- production telemetry, experiment, randomization, export 또는 model fitting
- learner-facing XP, leaderboard, punitive streak, social 또는 public feature
- `MasteryStateV1` persistence, transition 또는 learner-facing activation
- `guided_study` selector, route, API, event, scheduling 또는 runtime
- 외부 학습자, 결제, entitlement, 가격, 공개 navigation 또는 Production
- canonical source, rights, release, evidence 또는 commercial gate 변경

실제 구현은 live authority가 허용하는 별도 Work, exact scope, focused test,
exact-head review와 필요한 Owner 승인으로 수행한다.

---

## 0. 한 페이지 결론

### 0.1 최종 제품 결정

답안길은 사용자가 물을 때까지 수동적으로 기다리는 챗봇에서 멈추면 안 된다.

```text
사용자 질문
→ AI 답변
→ 빈 입력창
→ 사용자가 다음 좋은 질문을 직접 발명                  ❌

사용자 질문
→ AI 답변
→ 현재 남은 이해 간극 후보 1개 요약
→ 맞춤형 다음 행동 버튼
→ 자기 설명·비교·조건 변경·변형 확인
→ D+1/D+7 독립 검증                                  ✅
```

다만 AI가 `이해했어?`라고 묻고 사용자가 `네`를 누르는 것만으로는 학습을
증명할 수 없다.

```text
“이해했어” 클릭
= 자기보고·대화 진행 신호
≠ 숙달
≠ repair 완료
≠ 독립 회복
≠ verified transfer
```

### 0.2 새 핵심 경험 — 대화 하단 맞춤형 버튼

AI의 실질적인 설명이 끝난 뒤 화면 맨 아래에 다음과 같은 rail을 둔다.

```text
지금 남은 질문은 이것으로 보여요
“왜 건물 전체 효용적수를 토지가액 배분에 쓰는가”

[토지배분 원리 더 파고들기]        ← 주 버튼
[100×100·111·106 다시 보기]
[내 말로 설명해보기]
[숫자 바꿔 확인]

[다른 부분이 헷갈려요] [여기서 마치기]
```

버튼은 일반적인 `더 알아보기`가 아니라, 현재 learner와 현재 대화에서
남아 있는 정확한 간극을 이름으로 포함해야 한다.

나쁜 예:

```text
[더 보기]
[자세히]
[연습하기]
```

좋은 예:

```text
[층별효용비와 효용적수 다시 구별]
[토지가액 배분 논리 더 파고들기]
[사·시·지·개·면과 원가방식 비교]
[적산가액을 내 말로 설명]
```

### 0.3 답안길의 성취 구조

```text
앱을 열었다
→ 버튼을 눌렀다
→ 대화가 길어졌다                         ❌

이해 간극을 특정했다
→ 적절한 표현으로 다시 배웠다
→ 자기 말로 설명했다
→ 새 조건에서 판단했다
→ 다음 날 무도움으로 재현했다
→ verified variant에서도 해냈다             ✅
```

### 0.4 사용자에게 보이는 전체 경험

```text
오늘의 공략 3개
1. 사업인정 처분성 — 문단 수리
2. 수익환원법 — 무도움 재계산
3. 가치다원성 — 조건 뒤집기

대화 중
“지금 헷갈린 지점은 처분성의 결론보다
왜 수용권 발생이 처분성 근거가 되는지로 보여요.”

[수용권과 처분성 연결 더 파고들기]
[요건→효과→포섭 표로 보기]
[내 말로 20초 설명]

다음 관문
“내일 6분 동안 도움 없이 같은 연결을 다시 쓰면 확인됩니다.”

복구 모드
“3일 쉬었습니다. 밀린 과제를 쌓지 않고 8분 복구 퀘스트 하나로
다시 시작합니다.”
```

### 0.5 절대 설계 원칙

1. 현재 authority에는 canonical mastery runtime이 없다.
2. progression과 understanding 상태는 현재 허용된 attempt·qualification·
   `LearningGapRecord`·S216·repair·D+1·D+7·timed evidence에서 직접
   투영한다.
3. future `MasteryStateV1`은 별도 dated Owner decision과 canonical/runtime
   gate 전에는 dependency, input, output 또는 consistency authority가 아니다.
4. AI는 learner의 사적 내적 chain-of-thought를 요구하거나 저장하지 않는다.
5. 대화에서 관찰 가능한 질문, 답, 선택, 재설명, 계산, 표, outline과
   evidence만 사용한다.
6. AI가 추정한 `부족한 점`은 확정 진단이 아니라 반증 가능한 후보다.
7. 대화 하단 rail에는 주 행동 1개와 최대 3개의 subordinate 대안만 둔다.
8. rail은 사용자가 닫거나, 다른 간극을 선택하거나, 나중으로 미룰 수 있다.
9. 버튼 클릭·보기·저장만으로 stage clear나 recovery를 만들지 않는다.
10. `이해했어`는 active check 또는 다음 단계 선택으로 연결하며 mastery를
    직접 올리지 않는다.
11. 같은 질문을 무한 반복하지 않고 productive-struggle budget을 지킨다.
12. 답을 감추는 것이 목적이 아니다. 필요한 설명 뒤 learner reconstruction을
    만드는 것이 목적이다.
13. nudge는 겁주거나 죄책감을 주지 않고 다음 작은 행동으로 바로 연결한다.
14. 알림 후보와 실제 외부 발송을 물리적으로 분리한다.
15. 모바일 canonical UI는 접근 가능한 세로형 리스트와 button group이다.
16. 공개 leaderboard, HP 감소, loot box, streak 초기화는 사용하지 않는다.
17. 성공 지표는 체류시간과 버튼 클릭이 아니라 독립 회복과 전이다.
18. Today/CoreOutcome 최대 3을 그대로 유지한다.

### 0.6 구현 우선순위

```text
AUP0  source contract
AUP1  session-local confusion thread
AUP2  deterministic next-probe candidate
AUP3  bottom understanding rail UI
AUP4  active understanding check
AUP5  repair/D+1/D+7 연결
AUP6  recovery nudge와 resume
AUP7  branching micro-case·authoring
AUP8  optional OSS renderer/delivery
AUP9  approved external evaluation
```

진짜 첫 구현 가치는 `AUP1 → AUP4`에 있다. 그래프, badge, external push와
복잡한 게임 요소는 뒤로 둔다.

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

current implementation/source amendment가 understanding과 progression을
계산할 때 사용할 수 있는 후보는 live audit로 실제 존재와 version을 다시
확인한 다음 범위다.

- immutable attempt identity와 answer revision
- user question/message revision의 learner-private reference
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

존재하지 않거나 승인되지 않은 state를 채우기 위해 fallback, 임의 추정,
client spoof 또는 LLM self-declaration을 사용하지 않는다.

### 1.4 future-only vocabulary

다음은 별도 activation 전 current understanding/progression의 입력 또는
출력이 아니다.

- `MasteryStateV1`
- learner-facing mastery percentage
- pyBKT probability
- IRT/CAT readiness
- `guided_study` runtime evidence
- external Open Badges credential
- cross-exam progression
- model-fitted confusion probability

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

Adaptive Understanding runtime 후보는 필요한 closed evidence와 tutor-state
contract가 S237A 계열에서 실제로 만들어진 뒤에만 시작한다.

external notification, pseudonymous measurement, OSS-derived shared signal 또는
external experiment는 current `O2 → S270 → O4E → S271` 계열의 controlling
gates를 우회하지 않는다. 정확한 Work ID와 edge는 별도 canonical roadmap
amendment가 live state에서 정한다.

---

## 2. 사용자의 실제 공부법과 제품 목표

### 2.1 관찰된 공부 패턴

사용자는 답을 한 번 읽고 끝내지 않는다.

```text
교재 용어가 다른데?
→ 층별효용비와 효용적수 차이는?
→ 표로 풀면 더 쉽지 않아?
→ 비교방식과 원가방식의 큰 틀은?
→ 왜 100×100·111·106을 곱해?
→ 왜 건물 전체 효용적수를 토지가액 배분에 써?
→ 적산가액은 쉽게 말하면 뭐야?
```

이 학습법의 본질은 질문 개수가 아니다.

> **머릿속에서 걸리는 마지막 연결고리가 사라질 때까지 정의·표·비유·수식·
> 비교·조건 변경 사이를 오가며 같은 개념을 다시 구성하는 것**이다.

### 2.2 현재 generic chat의 한계

일반 챗봇은 보통 다음처럼 끝난다.

```text
AI가 답한다
→ 사용자가 이해했는지 정확히 모름
→ 다음 질문 후보를 구조화하지 않음
→ 사용자가 좋은 후속 질문을 스스로 만들어야 함
→ 질문력이 낮은 사용자는 얕은 이해에서 종료
```

답안길은 이 부담을 사용자에게 남기지 않는다.

### 2.3 제품 목표

```text
사용자 발화·시도·오류·질문 연결
→ 아직 닫히지 않은 confusion thread 후보
→ 가장 정보가치 높은 next probe
→ 사용자에게 보이는 맞춤형 버튼
→ 선택한 bounded tutoring episode
→ 자기 설명·repair·contrast
→ delayed independent evidence
```

### 2.4 AI가 해야 할 일과 하지 말아야 할 일

AI가 해야 할 일:

- 현재 질문이 어떤 concept·reasoning step과 연결되는지 후보를 만든다.
- 직전 답변으로 해결됐을 가능성과 남은 간극을 구분한다.
- 아직 사용하지 않은 표현 방식을 고른다.
- 주 버튼 하나를 추천하고 대안 1~3개를 제시한다.
- learner가 직접 설명·판단·재계산하게 한다.
- 잘못 추정했을 때 쉽게 수정·종료하게 한다.

AI가 하지 말아야 할 일:

- 사람의 머릿속을 안다고 단정한다.
- `당신은 이 개념을 모릅니다`라고 낙인찍는다.
- 모든 답변 뒤 기계적으로 같은 버튼을 붙인다.
- 질문을 계속 던져 직접 설명을 회피한다.
- click-through를 학습효과로 포장한다.
- 사용자가 종료하려는데 죄책감을 준다.

---

## 3. 연구와 오픈소스 패턴을 제품에 번역

### 3.1 구조화된 scaffold

구조화된 AI tutor의 효과는 모델이 말을 잘하는 것만으로 설명되지 않는다.
문제·학습 순서·scaffold·feedback을 명시적으로 통제하는 설계가 필요하다.

답안길 번역:

```text
좋은 tutor가 되어라                         ❌

current state
+ exact target gap
+ allowed assistance
+ next probe candidates
+ answer-reveal policy
+ verification policy                         ✅
```

### 3.2 guardrail과 능동적 probing

정답을 바로 주는 AI는 assisted performance를 높여도 독립 학습을 해칠 수
있다. 반대로 hint와 문제별 guardrail은 피해를 줄일 수 있다. 더 나은 tutor는
사용자가 물을 때만 반응하지 않고 probing question으로 misconception을
찾아야 한다.

답안길 번역:

- 정답 제공보다 next useful question을 우선한다.
- 질문 하나가 끝날 때마다 남은 confusion thread를 평가한다.
- passive `무엇이든 물어보세요` 대신 specific action rail을 제공한다.
- answer reveal은 current policy와 assistance/exposure 기록을 따른다.

### 3.3 guiding question

현장 tutoring 연구에서 AI 지원을 받은 tutor는 정답을 덜 직접 제공하고
더 많은 guiding question을 사용했다.

답안길 번역:

- AI가 learner 대신 답안을 완성하지 않는다.
- 현재 learner가 할 수 있는 가장 작은 판단을 요구한다.
- 완전히 막혔으면 직접 설명한 뒤 빈칸·재구성을 요구한다.

### 3.4 scaffolded self-explanation

단순히 `설명해보세요`라고 말하는 것보다 오류의 정확한 부분을 지정한
scaffolded self-explanation이 더 유용할 수 있다.

답안길 번역:

```text
이해했는지 설명해보세요                       ❌

“건물가액은 면적비로 나누는데 토지가액은
효용적수로 나누는 이유”를 한 문장으로 말해보세요  ✅
```

### 3.5 prompt overload 경계

질문과 metacognitive prompt가 많다고 항상 좋은 것은 아니다. 과도한 prompt는
인지부하와 짜증을 만들 수 있다.

답안길 번역:

- 모든 답변에 rail을 강제하지 않는다.
- primary 1개, subordinate 최대 3개만 표시한다.
- 반복 무시·dismiss가 있으면 rail 빈도를 낮춘다.
- 사용자가 피곤하거나 시간이 부족하면 `핵심만 다시`와 D+1 예약을 우선한다.

### 3.6 Oppia 패턴

Oppia는 흔한 오답을 식별해 맞춤 피드백을 제공하고, 필요하면 다른 step으로
보내거나 더 깊은 질문을 할 수 있다.

답안길은 Oppia 전체를 이식하지 않고 다음 패턴만 native contract로 재구현한다.

```text
response signature
→ tailored feedback
→ go deeper / switch path / verify
```

### 3.7 H5P Branching Scenario 패턴

H5P Branching Scenario는 learner의 선택이 다음에 보게 될 content를
결정한다.

답안길 번역:

- 버튼은 정적인 marketing CTA가 아니라 learning branch selector다.
- branch는 현재 source, rights, assistance와 evidence policy를 우회하지 않는다.
- branch 종료 자체는 stage clear가 아니다.

---

## 4. 전체 아키텍처

```text
Existing trusted evidence and learner-private interaction refs
- Attempt / answer revision
- User question / selected action
- Assistance / exposure
- LearningGapRecord + S216 metadata
- RepairVerification
- D+1 / D+7
- Timed evidence
- PersonalWeaknessMap, where authorized
- ReviewUnit / CoreOutcome / ExecutionBlock

        ↓ read-only

Persistent Why-Chain Resolver
- target concept
- unresolved relation
- representations tried
- learner corrections
- thread state

        ↓

Understanding Hypothesis Engine
- candidate gap
- confidence / uncertainty
- supporting and counter evidence
- disconfirmation path

        ↓

Next-Probe Composer
- deepen why
- switch representation
- compare adjacent
- self-explain
- changed condition
- recalculate
- defer

        ↓

Understanding Closure Rail
- one primary action
- up to three secondary actions
- other-gap / dismiss / defer

        ↓

Progression Projector and Quest Composer
- evidence lifecycle state
- gate eligibility
- micro quest
- boss candidate
- recovery route

        ↓

Nudge Candidate Engine
- due thread / repair / review
- suppression
- cooldown
- preference

        ↓

Presentation / Delivery
- response-bottom rail
- Today card
- vertical quest list
- optional desktop graph
- in-app brief
- future PWA/email adapter
```

### 4.1 권위 경계

| 계층 | 허용 | 금지 |
| --- | --- | --- |
| interaction refs | learner 발화·선택의 private lineage | mastery 선언 |
| why-chain resolver | unresolved relation 후보 유지 | 사람의 내적 사고 단정 |
| hypothesis engine | gap 후보·근거·반증 가능성 | learner trait 진단 |
| next-probe composer | 다음 행동 후보 생성 | answer/source 권위 |
| closure rail | 선택지 표시 | click로 evidence 승격 |
| evidence layer | qualification과 outcome 판정 | 게임 표현 결정 |
| progression projector | evidence를 단계로 표시 | canonical state 쓰기 |
| nudge engine | 후보와 suppression 계산 | 임의 발송 |
| UI | action과 이유 표시 | client-side clear 판정 |

### 4.2 fail-closed

다음 중 하나면 personalized rail의 확정형 문구, stage clear, boss unlock,
achievement 또는 external nudge를 만들지 않는다.

- target concept 또는 answer anchor missing
- current response basis missing
- source/right/effective-version conflict
- learner scope mismatch
- stale problem/answer/source revision
- assistance qualification unknown
- duplicate/replay conflict
- policy version unknown
- unsupported action kind
- target gap confidence가 threshold 미만인데 확정형 문구 사용

low-confidence일 때 허용되는 fallback:

```text
“제가 놓친 부분이 있을 수 있어요. 다음 중 어디를 더 보고 싶나요?”
```

---

## 5. Persistent Why-Chain Tutor

### 5.1 정의

`Persistent Why-Chain Tutor`는 한 대화에서 사용자가 연속으로 던진 질문을
독립 message로만 보지 않고, 어떤 연결고리가 아직 닫히지 않았는지를
learner-private thread로 추적한다.

```text
용어 정의
→ 계산 절차
→ 큰 틀
→ 곱셈의 의미
→ 배분 원리
→ 시험용 개념명
```

각 질문은 새 topic이 될 수도 있고, 같은 confusion thread의 깊어진 단계일
수도 있다.

### 5.2 thread 상태

```ts
type ConfusionThreadStateV1 =
  | "open"
  | "partially_resolved"
  | "restatement_due"
  | "contrast_due"
  | "independently_explained"
  | "transfer_due"
  | "transfer_confirmed"
  | "deferred"
  | "stale"
  | "blocked";
```

current authority 아래에서 이 상태는 tutor-session projection일 뿐
canonical mastery가 아니다.

### 5.3 thread가 추적하는 것

- target concept refs
- target reasoning relation
- first observed question ref
- latest learner question ref
- representations already tried
- learner restatement 또는 calculation refs
- answered and unresolved subquestions
- counter-evidence
- source/answer revision basis
- next probe candidates
- defer/resume state

### 5.4 representations tried

```ts
type ExplanationRepresentationV1 =
  | "definition"
  | "plain_language"
  | "analogy"
  | "table"
  | "diagram"
  | "worked_example"
  | "formula_decomposition"
  | "system_location"
  | "adjacent_concept_comparison"
  | "counterexample"
  | "changed_condition"
  | "calculator_routine"
  | "learner_restatement";
```

같은 representation에서 두 번 이상 막히면 기본적으로 다른 representation을
우선한다.

### 5.5 thread 병합과 분리

병합:

- 같은 concept와 같은 unresolved relation
- 직전 답변의 표현만 바꾸어 요구
- 후속 질문이 앞 질문의 `왜`를 더 깊게 팜

분리:

- 새 과목·새 문제·새 source revision
- 계산 절차와 법적 근거처럼 validator가 다른 target
- 기존 thread와 독립적으로 닫을 수 있는 질문

모호하면 병합하지 않고 `related thread candidate`로 둔다.

### 5.6 thread 종료

다음만으로 종료하지 않는다.

- AI 답변 완료
- `이해했어` 클릭
- rail dismiss
- 설명 저장

종료 후보:

- learner가 target relation을 자기 말로 정확히 재구성
- bounded check 통과
- repair verification
- 이후 D+1/D+7 evidence

session에서는 `independently_explained`까지 표시할 수 있으나, durable
independent recovery는 existing evidence policy를 따른다.

---

## 6. Adaptive Understanding Closure Rail

### 6.1 정의

`Understanding Closure Rail`은 substantive tutor response 바로 아래에
붙는 learner-specific next-action component다.

learner-facing 후보 이름:

```text
이해 이어가기
다음 질문
여기서 더 파고들기
지금 확인할 것
```

권장 기본 label:

```text
이해 이어가기
```

### 6.2 rail 구조

```text
[epistemic prefix]
지금 남은 질문은 이것으로 보여요

[target gap]
왜 전체 효용적수를 토지가액 배분에 쓰는가

[primary]
토지배분 원리 더 파고들기

[secondary]
100×100·111·106 다시 보기
내 말로 설명해보기
숫자 바꿔 확인

[control]
다른 부분이 헷갈려요 · 나중에 · 여기서 마치기
```

### 6.3 primary와 secondary

- primary는 1개만 시각적으로 강하게 표시한다.
- secondary는 0~3개의 chip 또는 quiet button이다.
- `다른 부분이 헷갈려요`, `나중에`, `여기서 마치기`는 control이며
  learning action count에 포함하지 않는다.
- 한 rail에서 서로 무관한 concept를 섞지 않는다.

### 6.4 rail을 표시하는 조건

표시 후보:

- learner가 `왜`, `차이`, `잘 모르겠어`, `이해 안돼`를 표현
- 동일 concept에 후속 질문 2회 이상
- high-confidence wrong 또는 repeated major gap
- 답변이 explanation/repair/contrast를 포함
- learner가 explicit deeper learning mode 선택

기본 미표시:

- 단순 일정·가격·navigation 질문
- factual lookup 한 번으로 닫힌 요청
- source가 blocked/stale하여 안전한 next action이 없음
- 사용자가 rail을 잠시 중지
- 같은 rail을 최근 반복 dismiss
- 현재 화면에서 주 CTA가 충돌하고 대체 불가능

### 6.5 rail copy의 epistemic 상태

high confidence:

```text
“지금 남은 질문은 이것으로 보여요.”
```

medium confidence:

```text
“아직 이 부분이 남아 있을 가능성이 커 보여요.”
```

low confidence:

```text
“제가 놓친 부분이 있을 수 있어요. 다음 중 어디를 더 볼까요?”
```

금지:

```text
당신은 토지배분 원리를 모릅니다.
이 개념을 완전히 이해하지 못했습니다.
```

### 6.6 action label 규칙

모든 learning button은 다음 중 하나 이상을 포함한다.

- exact concept label
- exact relation 또는 distinction
- action verb
- expected output

예:

```text
층별효용비·효용적수 다시 구별
토지배분 원리를 표로 보기
비교방식·원가방식 큰 틀 비교
적산가액을 한 문장으로 설명
환원이율 5.5와 0.055 다시 입력
```

character budget은 한국어 모바일 기준 28자를 우선하고, screen reader에는
full accessible label을 제공한다.

### 6.7 rail 위치

모바일:

- response body 직후 inline card
- 긴 대화에서는 viewport 하단 sticky suggestion tray를 선택적으로 사용
- composer를 가리지 않음
- keyboard open 시 rail collapse
- horizontal scroll에 의존하지 않는 wrap 또는 vertical stack

데스크톱:

- response body 아래 full-width rail
- optional right-side thread summary
- 모든 action은 DOM 순서와 keyboard order가 시각 순서와 일치

### 6.8 user control

사용자는 언제든 다음을 할 수 있다.

- 다른 gap 선택
- 직접 질문 입력
- rail 숨기기
- 오늘은 그만하기
- 나중에 이어가기
- AI의 추정을 틀렸다고 표시

`AI가 잘못 짚었어요`는 negative feedback이 아니라 thread correction input이다.

---

## 7. Next-Probe Action Taxonomy

```ts
type SuggestedProbeActionKindV1 =
  | "deepen_why"
  | "switch_to_plain_language"
  | "switch_to_table"
  | "switch_to_diagram"
  | "decompose_formula"
  | "compare_adjacent"
  | "locate_in_system"
  | "self_explain"
  | "complete_missing_step"
  | "choose_near_miss"
  | "predict_changed_condition"
  | "find_contradiction"
  | "recalculate_variant"
  | "calculator_routine"
  | "independent_micro_check"
  | "schedule_delayed_check"
  | "defer_thread";
```

### 7.1 `deepen_why`

현재 설명의 한 단계 아래 causal 또는 allocation rationale을 묻는다.

```text
왜 효용 차이를 건물이 아니라 토지에 배분하는가
```

### 7.2 representation switch

같은 내용을 다른 표상으로 바꾼다.

```text
수식 → 표
법규 문단 → 요건·효과 표
이론 정의 → 인접 개념 비교
```

### 7.3 `self_explain`

generic 설명 요청이 아니라 exact target relation을 지정한다.

```text
“건물가액은 면적비, 토지가액은 효용적수비”인 이유를
한 문장으로 설명해보세요.
```

### 7.4 `choose_near_miss`

가장 가까운 오개념 사이를 구별한다.

```text
A. 효용적수는 건물 시공비 차이를 나타낸다.
B. 효용적수는 위치·조망 등 토지 이용효용 차이를 배분한다.
```

### 7.5 `predict_changed_condition`

조건 하나를 바꿔 결론을 예측한다.

```text
2층 면적이 두 배면 단가가 절반이어도 전체 효용적수는 어떻게 되는가
```

### 7.6 `recalculate_variant`

같은 surface를 복사하지 않고 changed-number 또는 changed-fact task를
사용한다. independent evidence 자격은 variant verification policy를 따른다.

### 7.7 `schedule_delayed_check`

피로, 시간 부족 또는 session saturation에서 rail을 D+1 ReviewUnit로
전환한다.

---

## 8. “이해했어?”의 올바른 구현

### 8.1 왜 단순 확인만으로 부족한가

사람은 설명을 읽는 동안 이해한 것처럼 느낄 수 있고, 자기보고와 실제
독립 수행은 다를 수 있다.

따라서 다음은 금지한다.

```text
이해했어요 클릭
→ concept clear
→ quest 완료
→ stable
```

### 8.2 권장 closure question

```text
여기까지 이해됐나요?

[네, 20초 확인해볼게요]
[아직 토지배분 원리가 헷갈려요]
[100×100·111·106이 헷갈려요]
[나중에 다시 볼게요]
```

`네`는 micro check의 시작이다.

### 8.3 active check 종류

- one-sentence restatement
- missing-step completion
- near-miss choice
- changed-condition prediction
- small recalculation
- blank outline
- formula rebuild

### 8.4 check 결과

```ts
type UnderstandingCheckResultV1 =
  | "qualifying_session_success"
  | "partial"
  | "incorrect"
  | "abstained"
  | "ineligible"
  | "blocked";
```

session success도 durable mastery가 아니다. existing repair/review policy에
따라 D+1 또는 D+7을 예약한다.

### 8.5 실패 뒤 행동

```text
same prompt 반복                        ❌

오류 signature 확인
→ 다른 representation
→ 직접 설명 강도 증가
→ smaller check
→ 필요하면 defer/D+1                  ✅
```

### 8.6 성공 뒤 행동

```text
잘했습니다.
오늘은 “토지배분 원리”를 자기 말로 설명했습니다.
내일 6분 무도움 확인이 준비됩니다.
```

공식 숙달률 또는 확정 표현을 쓰지 않는다.

---

## 9. Next-Probe Selection Policy

### 9.1 초기 rule baseline

```text
probe_priority =
  unresolved_gap_severity
× evidence_confidence
× exam_impact
× expected_information_gain
× representation_novelty
× immediate_actionability
÷ (estimated_seconds + cognitive_load + answer_leakage_risk)
```

### 9.2 hard gates

- target concept/anchor resolvable
- source/right/effective-version eligible
- current response releaseable
- learner scope authorized
- action kind allowlisted
- assistance effect known
- no measurement-lane leakage
- estimated effort inside current budget
- no recent identical dismissed rail

### 9.3 model과 server 역할

LLM 후보:

- likely unresolved relation
- human-readable label
- possible probes
- representation suggestion

trusted server:

- current thread/basis resolution
- action kind validation
- assistance/exposure effect
- source and rights gate
- button count and priority
- idempotency
- analytics projection
- evidence effect

model output이 직접 rail을 authoritative하게 쓰지 않는다.

### 9.4 novelty rule

같은 representation을 반복 선택하지 않는다.

```text
plain language 실패
→ table 또는 worked example

table 이해 but application 실패
→ changed condition

말로 설명 성공 but 계산 실패
→ small recalculation
```

### 9.5 user preference

learner가 선호하는 설명 방식은 bounded preference로 사용할 수 있다.

- 표 선호
- 그림 선호
- 짧은 설명
- 계산 먼저
- 사례 먼저

선호는 source/validator/evidence gate를 우회하지 않는다.

### 9.6 saturation과 종료

기본 정책 가설:

- 같은 thread에서 proactive rail 연속 최대 3회
- 같은 action kind 연속 최대 1회
- 두 번 연속 dismiss면 session 동안 빈도 축소
- 세 번 막히면 더 직접적인 설명 또는 defer 후보 우선
- 사용자가 `여기서 마치기`를 누르면 즉시 종료

정확한 수치는 Owner dogfood 뒤 versioned policy로 고정한다.

---

## 10. 핵심 데이터 계약

### 10.1 ConfusionThreadV1

```ts
type ConfusionThreadV1 = {
  id: string;
  learnerScopeRef: string;
  tutorEpisodeRef: string;
  targetConceptRefs: string[];
  targetRelationCode: string;
  originatingQuestionRef: string;
  latestQuestionRef: string;
  answerAnchorRefs: string[];
  unresolvedReasonCodes: string[];
  representationsTried: ExplanationRepresentationV1[];
  learnerRestatementRefs: string[];
  supportingEvidenceRefs: string[];
  counterEvidenceRefs: string[];
  sourceBasisChecksum: string;
  status: ConfusionThreadStateV1;
  threadPolicyVersion: string;
  threadChecksum: string;
  updatedAt: string;
  derivationAuthority: "trusted_server";
};
```

### 10.2 UnderstandingHypothesisV1

```ts
type UnderstandingHypothesisV1 = {
  id: string;
  learnerScopeRef: string;
  confusionThreadRef: string;
  candidateGapLabel: string;
  candidateGapCode: string;
  supportingEvidenceRefs: string[];
  counterEvidenceRefs: string[];
  confidence: "low" | "medium" | "high";
  status:
    | "candidate"
    | "strengthened"
    | "weakened"
    | "rejected"
    | "stale";
  disconfirmationActionKinds: SuggestedProbeActionKindV1[];
  policyVersion: string;
  basisChecksum: string;
};
```

### 10.3 SuggestedProbeActionV1

```ts
type SuggestedProbeActionV1 = {
  id: string;
  learnerScopeRef: string;
  confusionThreadRef: string;
  understandingHypothesisRef: string;
  kind: SuggestedProbeActionKindV1;
  learnerFacingLabel: string;
  accessibleLabel: string;
  targetConceptRefs: string[];
  targetRelationCode: string;
  estimatedSeconds: number;
  assistanceKind?: string;
  expectedLearnerArtifactKind?: string;
  sourceAndRightsBasisRefs: string[];
  directActionRef: string;
  priority: "primary" | "secondary" | "control";
  eligibility: "eligible" | "blocked" | "stale";
  reasonCodes: string[];
  actionPolicyVersion: string;
  actionChecksum: string;
};
```

### 10.4 UnderstandingClosureRailV1

```ts
type UnderstandingClosureRailV1 = {
  id: string;
  learnerScopeRef: string;
  tutorEpisodeRef: string;
  parentResponseRevisionRef: string;
  confusionThreadRef: string;
  understandingHypothesisRef: string;
  epistemicPrefix:
    | "high_confidence_candidate"
    | "medium_confidence_candidate"
    | "learner_choice_needed";
  candidateGapLabel: string;
  primaryActionRef?: string;
  secondaryActionRefs: string[]; // 0..3
  controlActionRefs: string[];
  status: "usable" | "suppressed" | "blocked" | "stale";
  suppressionReasonCodes: string[];
  renderPolicyVersion: string;
  basisChecksum: string;
  generatedAt: string;
  derivationAuthority: "trusted_server";
};
```

### 10.5 UnderstandingCheckV1

```ts
type UnderstandingCheckV1 = {
  id: string;
  learnerScopeRef: string;
  confusionThreadRef: string;
  actionRef: string;
  taskKind:
    | "one_sentence_restatement"
    | "missing_step"
    | "near_miss_choice"
    | "changed_condition"
    | "small_recalculation"
    | "blank_outline"
    | "formula_rebuild";
  promptRef: string;
  responseArtifactRef?: string;
  assistanceSnapshotRef: string;
  exposureSnapshotRef: string;
  verificationRefs: string[];
  result: UnderstandingCheckResultV1;
  evidenceEffectRef: string;
  checkPolicyVersion: string;
  idempotencyKey: string;
};
```

### 10.6 interaction event

```ts
type UnderstandingRailInteractionV1 = {
  id: string;
  learnerScopeRef: string;
  railRef: string;
  actionRef: string;
  interaction:
    | "selected"
    | "dismissed"
    | "deferred"
    | "other_gap_selected"
    | "ai_target_rejected";
  occurredAt: string;
  idempotencyKey: string;
};
```

이 event 자체는 mastery, recovery 또는 queue completion을 만들지 않는다.

---

## 11. 대화 상태와 tutor FSM 통합

### 11.1 response lifecycle

```text
learner input
→ current state and source gate
→ answer/scaffold generation
→ output verification
→ response release
→ why-chain update
→ understanding hypothesis
→ next-probe candidates
→ closure rail render
```

response와 rail은 같은 parent response revision에 묶인다.

### 11.2 state별 rail

| Tutor state | rail 후보 |
| --- | --- |
| orient | 요구·제약을 다시 구별 |
| commit | 방법·목차 선택 이유 확인 |
| attempt | 기본 미표시; neutral tool만 |
| diagnose | gap 후보와 확인 행동 |
| scaffold | 다음 작은 step 또는 representation switch |
| reconstruct | self-explain·missing step |
| repair | repair 범위와 성공 기준 |
| contrast | near-miss·changed condition |
| verify | 검산·source conflict 확인 |
| transfer | 기본 rail 최소화; 독립 task 우선 |
| reflect | calibration question |
| schedule | D+1/D+7·defer |

### 11.3 Measurement Lane

Measurement Lane에서는 rail이 answer-bearing hint를 포함하지 않는다.

허용:

- timer/status
- neutral navigation
- 제출 여부
- accessibility control

금지:

- gap 추정 노출
- 정답 방향 button
- formula decomposition
- near-miss answer cue
- source answer body

제출·timeout 뒤 Learning Lane으로 전환한 다음 rail을 생성한다.

### 11.4 current guided runtime 금지

이 문서의 `deepen`, `representation`, `self-explain` action은 future
compatibility contract다. 현재 authority가 `guided_study` runtime을 승인하지
않는 한, guided selector/route/API/event/scheduling을 조기 구현하지 않는다.

현재 구현 Work가 허용되는 경우에도 approved `attempt_first` tutor flow 안의
post-attempt explanation/repair surface에서만 시작한다.

---

## 12. 증거 기반 progression과 quest 통합

### 12.1 ProgressionStateV1

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

### 12.2 understanding action과 progression

| 사건 | progression 최대 효과 |
| --- | --- |
| rail render | 없음 |
| button click | 없음 |
| AI 설명 열람 | 없음 |
| self-report `이해됨` | 없음 |
| session micro-check success | attempt/learning evidence 후보 |
| verified repair | `repair_qualified` 후보 |
| D+1 independent success | `d1_independent_confirmed` 후보 |
| D+7 verified non-same-surface success | `d7_transfer_cleared` 후보 |
| qualifying timed evidence | `timed_integration_cleared` 후보 |

### 12.3 QuestKindV1

```ts
type QuestKindV1 =
  | "orient"
  | "commit"
  | "deepen_understanding"
  | "switch_representation"
  | "self_explain"
  | "repair"
  | "contrast"
  | "independent_recall"
  | "verified_variant"
  | "timed_full_solution"
  | "recovery";
```

### 12.4 Today max three

bottom rail action이 새 top-level Today task를 무제한 생성하면 안 된다.

```text
CoreOutcome 1개
→ conversation micro actions 0..N
→ rail-selected subordinate action
→ evidence-bearing repair/review
```

Today/CoreOutcome는 계속 0..3이다. rail action은 현재 episode 안의 subordinate
action이거나 이후 eligible `ReviewUnit` 후보다.

### 12.5 Boss Gate

주간 boss는 여러 micro repair가 전체 수행으로 통합됐는지 확인한다.

- 방법 선택
- 산식 구조
- 검산
- 답안 구성
- 시간 배분
- 동일 gap 재발

boss 실패는 과거 achievement를 삭제하지 않고 새 repair 후보를 만든다.

---

## 13. Recovery-first continuity와 nudge

### 13.1 punitive streak 금지

```text
연속 출석 37일                       ❌
최근 14일 중 의미 있는 학습 흐름 10일   ✅
```

쉬었다고 과거 성취를 삭제하지 않는다.

### 13.2 open confusion thread 복구

사용자가 conversation을 닫아도 unresolved thread는 learner-private resume
후보가 될 수 있다.

```text
어제 남은 질문
“왜 효용적수로 토지가액을 배분하는가”

[3분 핵심 다시 보기]
[한 문장으로 설명]
[나중에]
```

### 13.3 nudge trigger

```ts
type NudgeReasonV1 =
  | "review_due"
  | "unfinished_repair"
  | "open_confusion_thread"
  | "high_confidence_wrong"
  | "inactive_recovery"
  | "boss_ready"
  | "revalidation_required";
```

### 13.4 nudge 규칙

- proactive external nudge 하루 최대 1개 가설
- 이미 완료하면 즉시 suppress
- 동일 thread 반복 독촉 금지
- 두 번 연속 무시하면 빈도 축소
- quiet hours
- user preference와 opt-out
- direct action route 필수
- 죄책감·공포 copy 금지

나쁜 copy:

```text
아직도 토지배분을 이해하지 못했습니다.
```

좋은 copy:

```text
어제 남은 토지배분 연결을 4분 한 문장 확인으로 이어갈 수 있어요.
```

실제 external delivery는 별도 authority 전 OFF다.

---

## 14. 과목별 Adaptive Understanding Adapter

### 14.1 실무

주요 target relation:

- 자료 역할
- 방법 선택과 배제
- 산식의 의미
- 변수·단위·부호
- 효용비·효용적수
- 토지/건물 배분
- 비교방식·원가방식 큰 틀
- 계산기 입력
- 검산

rail 예:

```text
지금 남은 질문은 이것으로 보여요
“왜 301호 효용적수에 층별효용비와 호별효용비를 함께 곱하는가”

[프리미엄 중첩 원리 더 파고들기]
[분배법칙으로 표 다시 보기]
[내가 301호 점수를 계산]
```

### 14.2 이론

주요 target relation:

- 정의와 의의
- 상위 체계에서 위치
- 인접 개념 구별
- 논거 연결
- 비교·평가 축
- 반대 관점
- 결론 압축

rail 예:

```text
“시장가치와 투자가치의 차이를 정의가 아니라
판단 주체와 전제 조건으로 구별할 수 있나요?”

[판단 주체 기준으로 비교]
[조건이 바뀌는 사례 보기]
[내 말로 두 문장 설명]
```

### 14.3 법규

주요 target relation:

- 쟁점
- source/effective date
- 요건·효과
- 처분성
- 원고적격
- 포섭
- 불복 수단

rail은 source 상태를 숨기지 않는다.

```text
현재 법적 근거의 유효 버전이 확인되지 않아
처분성 결론을 확정형으로 더 파고들 수 없습니다.

[확인된 요건 구조만 보기]
[근거 확인 뒤 이어가기]
```

unknown/conflict/unbound/stale이면 generated legal conclusion button을
release하지 않는다.

### 14.4 혼합 문제

primary adapter 하나를 정하고 supporting action을 subordinate하게 둔다.

예:

```text
primary: 실무 토지가액 배분
supporting: 이론상 토지 위치효용
```

learner-facing main gap은 하나다.

---

## 15. 구체적인 사용자 시나리오

### 15.1 층별효용비·효용적수

AI 설명 뒤:

```text
이해 이어가기

아직 “단가 점수”와 “층 전체 점수”의 차이가 남아 있을 수 있어요.

[층별효용비·효용적수 표로 구별]
[면적이 두 배인 예로 확인]
[내 말로 한 문장 설명]
```

### 15.2 100×100·111·106

```text
이해 이어가기

지금 헷갈린 지점은 숫자 자체보다
층 프리미엄과 호 프리미엄을 왜 곱하는지로 보여요.

[프리미엄 중첩 원리 더 파고들기]
[29,708×111을 분배법칙으로 풀기]
[3층 301호 점수 직접 계산]
```

### 15.3 토지가액 배분

```text
이해 이어가기

건물가액은 면적비, 토지가액은 효용적수비로 나누는 이유를
확인하면 전체 원가방식이 닫힙니다.

[토지 위치효용 원리 더 파고들기]
[건물·토지 배분표 비교]
[내 말로 한 문장 설명]
[조건 바꾼 세대 비교]
```

### 15.4 적산가액

```text
이해 이어가기

적산가액이라는 이름과 계산 구조를 연결해볼까요?

[쌓을 적·계산할 산으로 외우기]
[토지 배분액+건물 배분액 직접 합산]
[비준가액과 적산가액 비교]
```

### 15.5 법규 처분성

```text
이해 이어가기

지금 남은 연결은 “사업인정 고시”라는 형식보다
수용권 발생이 법적 지위를 바꾸는 이유입니다.

[수용권과 처분성 연결 더 파고들기]
[사실행위와 행정처분 비교]
[내 말로 20초 포섭]
```

---

## 16. 기능성 전략 카드와 Knowledge Relic

수집품은 장식이 아니라 반복 사용하는 사고 도구다.

### 실무

- 효용비·효용적수 구별 카드
- 토지/건물 배분 카드
- 단위 전사 체크 카드
- 기준시점 확인 카드
- 환원이율 입력 카드

### 이론

- 개념 비교축 카드
- 전체 체계 위치 카드
- 반대 관점 카드
- 조건 변경 카드

### 법규

- 처분성 판단 카드
- 원고적격 검토 카드
- 제소기간 확인 카드
- 요건→효과→포섭 카드

rail에서 `전략 카드로 보기`를 선택할 수 있으나 카드 열람만으로 stage clear를
만들지 않는다.

---

## 17. 시각적 Quest Map

### 17.1 canonical representation

모바일 canonical은 accessible vertical list다.

```text
3방식 기본                변형 클리어
비교방식 자료 역할         무도움 확인
효용비·효용적수            간극 수리
토지·건물 배분             시작 가능
적산가액                   잠김
실전 통합 관문             잠김
```

### 17.2 thread overlay

quest node에 unresolved why-chain이 있으면 다음처럼 표시한다.

```text
토지·건물 배분
현재 남은 질문 1개
“왜 토지는 효용적수로 배분하는가”
```

### 17.3 graph renderer

Cytoscape.js, React Flow 또는 native SVG/DOM을 adoption Work에서 비교한다.

renderer는 authority가 아니다.

- server-projected view only
- no client mastery/progression calculation
- list parity
- graph-only action 0
- raw learner text label 0

---

## 18. 오픈소스 채택 전략

| 후보 | 가져올 것 | 현재 결정 |
| --- | --- | --- |
| Oppia | common error→tailored feedback→go deeper | 패턴만 native 구현 |
| H5P Branching Scenario | learner choice→다음 content branch | schema/authoring 참고 |
| Moodle Reengagement | due 후 reminder, 완료 시 suppression | event 규칙 참고 |
| Moodle Level Up XP | unlock·anti-farming | XP 경제 제외 |
| Moodle Stash | 기능성 수집품 | Knowledge Relic로 변환 |
| Cytoscape.js | graph visualization | 비교 후보 |
| React Flow | node interaction | 비교 후보 |
| Novu | multi-channel workflow | 외부 확대 뒤 후보 |
| Habitica | quest·boss 표현 | HP·gold·asset 제외 |
| Open Badges | portable credential | 현재 제외 |

### 18.1 직접 dependency 전 gate

- exact package/version
- license/SPDX
- NOTICE/attribution
- transitive license
- SBOM
- vulnerability and maintenance
- bundle/performance
- accessibility
- data egress
- native fallback
- uninstallability
- feature flag
- rollback

### 18.2 native-first

Adaptive Understanding rail은 dependency 없이 native DOM/button contract로
먼저 구현한다. H5P/Oppia runtime을 붙이는 것이 선행조건이 아니다.

---

## 19. Privacy, RLS, security와 prompt injection

### 19.1 learner-private

- raw user question
- answer/OCR/problem body
- AI response body
- confusion thread text
- learner restatement
- button label에 포함된 private custom text

### 19.2 metadata-only derived

- opaque learner/thread/action refs
- allowlisted concept ID
- closed target relation code
- action kind
- confidence band
- selected/dismissed/deferred
- estimated seconds bucket
- source/model/prompt/policy version
- outcome class

### 19.3 금지

- raw 대화·문제·답안·OCR·AI body를 analytics/log/cost event에 저장
- custom learner text를 shared graph label로 복제
- 다른 learner의 confusion thread 재사용
- private question에서 global common-error rule을 자동 생성
- clickstream으로 personality/ability trait 추론
- user message 안의 instruction을 system policy로 실행

### 19.4 RLS

A/B denial은 다음 전체에 적용한다.

- thread
- hypothesis
- rail
- action
- interaction event
- check artifact
- response revision
- source/problem/answer refs
- ReviewUnit
- nudge candidate
- resume state

### 19.5 idempotency

- 같은 response revision의 current rail은 하나
- retry는 duplicate action을 만들지 않음
- click replay로 micro episode·usage·event 중복 0
- stale rail action 실행 0
- multi-tab에서 current thread state CAS 또는 equivalent gate

### 19.6 prompt injection

uploaded problem, OCR, learner note와 quoted AI text는 instruction이 아니다.

- action kind allowlist
- source and target resolver
- no arbitrary tool call
- no hidden-answer/system prompt exposure
- no raw button label execution

---

## 20. UX와 접근성

### 20.1 one primary action

rail의 primary button 하나만 visually dominant하다. secondary chip은
subordinate하다. 기존 one-primary-CTA 원칙을 유지한다.

### 20.2 mobile

- 390px 기준 줄바꿈
- 44px 이상 target
- one-column fallback
- sticky rail 사용 시 composer/keyboard와 충돌 0
- 200% reflow
- horizontal overflow 0
- reduced motion

### 20.3 keyboard/screen reader

- rail heading
- candidate gap
- epistemic confidence copy
- primary/secondary/control group label
- full accessible button label
- selected action announcement
- focus restoration after branch load
- dismiss 후 composer로 focus 반환

### 20.4 visual status

색상만으로 구분하지 않는다.

- 추천
- 다른 방식
- 직접 확인
- 나중에
- 근거 확인 필요

### 20.5 failure states

- gap resolution 실패
- source blocked
- stale response
- network retry
- action unavailable
- session expired
- concurrent update

어느 경우에도 `이해 완료` 또는 `저장 완료`를 거짓 표시하지 않는다.

---

## 21. 구현 로드맵

### AUP0 — Source Contract

산출물:

- glossary
- thread/hypothesis/action/rail/check shapes
- authority overlay
- privacy/RLS/idempotency
- acceptance and hostile fixtures

runtime 없음.

### AUP1 — Session-local Why-Chain

산출물:

- current episode 안의 thread projection
- deterministic merge/split
- representations-tried ledger
- stale/revision handling

### AUP2 — Static Next-Probe Baseline

산출물:

- rule-based action candidates
- fixed subject action catalog
- no adaptive model
- one primary + up to three secondary

### AUP3 — Bottom Rail UI

산출물:

- mobile/desktop component
- learner control
- keyboard/screen reader
- suppressed/blocked/stale states

### AUP4 — Active Understanding Check

산출물:

- self-report→micro-check transition
- self-explain/missing-step/near-miss/changed-condition
- deterministic practical checks where possible
- no click-based evidence

### AUP5 — Repair and Delayed Evidence

산출물:

- rail action→repair action
- D+1 ReviewUnit
- D+7 verified variant eligibility
- thread resume

### AUP6 — Recovery Nudge

산출물:

- in-app candidate only first
- suppression/cooldown/preferences
- external delivery remains separately gated

### AUP7 — Branching Micro-Case

산출물:

- authoring schema
- law/practical/theory branches
- source/right/validator binding
- H5P/Oppia import 없음 by default

### AUP8 — Optional Renderer and OSS

산출물:

- native vs Cytoscape.js vs React Flow comparison
- exact license/SBOM/performance/a11y gate

### AUP9 — Evaluation

산출물:

- owner-private baseline
- approved external comparison only after authority
- learning metrics before engagement metrics

이 순서는 strategy projection이다. exact Work ID와 dependency는 live
roadmap amendment가 정한다.

---

## 22. 평가 지표

### 22.1 primary learning

- targeted gap의 independent restatement 성공률
- error correction
- D+1 independent recovery
- D+7 verified transfer
- same-gap recurrence 감소
- time-to-independent-correct
- timed integration quality

### 22.2 rail quality

- recommended action relevance
- `AI가 잘못 짚었어요` 비율
- other-gap 선택률
- primary action completion
- representation-switch success
- repeated prompt/dismiss rate
- time to thread resolution

### 22.3 safety

- answer leakage
- false gap assertion
- false understanding completion
- false progression/recovery
- source/version violation
- raw data leak
- cross-account leak
- duplicate event/usage

### 22.4 secondary only

- button click-through
- session length
- message count
- time in app
- rail impressions

다음 상황은 실패다.

```text
button click 증가 AND D+1 독립 수행 감소
session length 증가 AND false gap 증가
rail impression 증가 AND dismiss/불쾌감 증가
```

### 22.5 owner dogfood

Owner-private에서 최소 기록:

- rail이 실제 남은 질문을 잘 짚었는가
- 추천 버튼을 자발적으로 눌렀는가
- 직접 질문보다 시간이 줄었는가
- 설명 방식 전환이 유용했는가
- 질문 과다로 피곤했는가
- 다음 날 혼자 재현됐는가

Owner evidence는 external efficacy를 증명하지 않는다.

---

## 23. Acceptance Matrix

### 23.1 why-chain

- same relation follow-up은 thread lineage 보존
- 새 topic은 안전하게 분리
- ambiguous merge는 candidate로 유지
- source/answer revision 변경 시 stale
- raw chain-of-thought 수집 0

### 23.2 hypothesis

- supporting/counter evidence
- confidence band
- disconfirmation action
- low confidence에서 확정형 copy 0
- learner trait/ability 낙인 0

### 23.3 rail

- substantive response에만 candidate
- primary exactly 0..1
- secondary 0..3
- exact target label
- generic `더 보기` only button 0
- other-gap/dismiss/defer 가능
- repeated dismissal suppression
- one-primary visual hierarchy

### 23.4 understanding check

- self-report click만으로 qualification 0
- active artifact 요구
- practical deterministic check 우선
- law source fail-closed
- session success와 durable recovery 분리
- failed check 뒤 same prompt loop 0

### 23.5 progression

- render/click/view/save로 stage clear 0
- repair/D+1/D+7/timed exact evidence
- same-surface/assisted transfer 0
- current authority에서 mastery ref dependency 0

### 23.6 privacy/security

- A/B denial
- raw body analytics/log leak 0
- direct API action-kind spoof 0
- stale rail replay 0
- duplicate selection side effect 0
- multi-tab race false success 0
- uploaded prompt injection 0

### 23.7 UX/accessibility

- 390/768/1440
- 200% reflow
- keyboard
- screen reader
- visible focus
- reduced motion
- color-independent meaning
- composer/keyboard overlap 0
- horizontal overflow 0

### 23.8 OSS

- native fallback
- exact version/license/SBOM
- optional renderer cannot alter meaning
- uninstallability
- data egress 0 unless separately approved

---

## 24. Hostile Fixtures

1. AI가 낮은 confidence인데 `당신은 X를 모릅니다`라고 단정
2. response마다 동일한 generic rail 생성
3. `이해했어요` 클릭으로 stage clear
4. button click으로 mastery/recovery 증가
5. rail render로 ReviewUnit 완료
6. same prompt를 세 번 반복
7. 사용자가 종료했는데 rail 재노출
8. rail primary가 두 개
9. secondary가 네 개 초과
10. button label이 `더 보기`
11. button label에 다른 learner raw text 포함
12. 다른 problem revision의 thread attach
13. stale source의 law deep-dive release
14. Measurement Lane에서 answer-bearing button
15. direct API가 `qualifying_session_success` 제출
16. client가 action kind를 arbitrary string으로 주입
17. model이 source eligibility를 self-declare
18. click replay가 episode/event를 두 번 생성
19. multi-tab이 서로 다른 current rail을 둘 다 consume
20. dismissed rail을 cooldown 없이 반복
21. `AI가 잘못 짚었어요`를 negative learner trait로 기록
22. raw user question이 analytics에 저장
23. raw AI response가 cost event에 저장
24. confusion thread가 shared graph로 승격
25. custom concept label이 다른 learner에게 노출
26. private thread가 Academy tenant에 자동 공유
27. rail action이 external notification으로 자동 발송
28. source blocked인데 generic model answer로 fallback
29. assisted self-explanation을 independent transfer로 계산
30. same-surface changed wording을 D+7 verified variant로 계산
31. primary action이 현재 CoreOutcome와 무관한 새 top-level task 생성
32. rail action이 Today를 4개로 증가
33. user가 피로를 표시했는데 더 긴 probing만 추천
34. repeated failure 뒤 직접 설명 없이 질문만 반복
35. answer reveal 뒤 hidden exposure로 되돌림
36. screen reader에 candidate gap이 읽히지 않음
37. keyboard focus가 branch load 뒤 유실
38. mobile rail이 composer를 가림
39. 200% zoom에서 button 접근 불가
40. color만으로 primary/secondary 구분
41. optional graph에서만 action 가능
42. renderer가 client-side progression 계산
43. external OSS가 raw conversation을 받음
44. user preference가 source gate를 우회
45. `이해 완료`가 self-report만으로 표시
46. session success가 durable stable로 노출
47. nudge가 shame copy 사용
48. two ignored nudges 뒤 frequency 유지
49. stale thread가 next day resume에서 current로 표시
50. delete/export에서 thread/action/check 누락

모든 actionable P0/P1/P2는 0/0/0이어야 한다.

---

## 25. Definition of Done

### 25.1 Adaptive Understanding Core

- user question chain을 session-local learner-private thread로 추적
- exact target relation과 representation history
- 반증 가능한 understanding hypothesis
- one-primary bottom rail
- learner-specific action labels
- other-gap/dismiss/defer
- active check
- repeated probing cap
- answer-reveal/assistance/exposure safety
- raw body leak 0
- A/B denial
- accessibility

### 25.2 Evidence-Gated Progression

- current evidence lifecycle에서 직접 projection
- rail click/view/save credit 0
- repair/D+1/D+7/timed gate
- Today max three
- boss and recovery semantics
- punitive streak/leaderboard/loot 0

### 25.3 Nudge and Continuity

- open thread resume
- completion suppression
- quiet hours/preferences/cooldown
- external delivery separately gated
- no shame copy

### 25.4 OSS

- Oppia/H5P patterns documented
- native-first
- exact future adoption gate
- renderer fallback/list parity

### 25.5 Measurement

- relevance, false-gap, dismiss and burden measured
- independent recovery and transfer primary
- click/session metrics secondary
- Owner and external evidence separated
- efficacy claim before evidence 0

---

## 26. 연구·오픈소스 참고

아래는 설계 참고이며 답안길의 감정평가사 학습효과를 대신 입증하지 않는다.

### AI tutoring and learning safeguards

- [AI tutoring outperforms in-class active learning: a randomized controlled trial](https://www.nature.com/articles/s41598-025-97652-6)
- [Generative AI without guardrails can harm learning: Evidence from high school mathematics](https://doi.org/10.1073/pnas.2422633122)
- [Tutor CoPilot: A Human-AI Approach for Scaling Real-Time Expertise](https://arxiv.org/abs/2410.03017)
- [Effects of self-explaining feedback on learning from problem-solving errors](https://doi.org/10.1016/j.cedpsych.2024.102326)
- [Metacognitive Overload: Positive and Negative Effects of Metacognitive Prompts in an Intelligent Tutoring System](https://doi.org/10.1007/s40593-018-0164-5)

### Open-source patterns

- [Oppia](https://github.com/oppia/oppia)
- [Oppia Get Started — tailored feedback and go deeper](https://www.oppia.org/get-started)
- [H5P Branching Scenario](https://h5p.org/branching-scenario)
- [React Flow / xyflow](https://github.com/xyflow/xyflow)
- [Cytoscape.js](https://github.com/cytoscape/cytoscape.js)
- [Moodle Reengagement](https://moodle.org/plugins/mod_reengagement)
- [Moodle Level Up XP](https://moodle.org/plugins/block_xp)
- [Moodle Stash](https://moodle.org/plugins/block_stash)
- [Novu](https://github.com/novuhq/novu)
- [Habitica](https://github.com/HabitRPG/habitica)
- [1EdTech Open Badges](https://www.1edtech.org/standards/open-badges)

---

## 27. 최종 원칙

> **사용자가 좋은 질문을 스스로 떠올려야만 깊이 배울 수 있게 두지 않는다.
> AI가 현재 남은 연결고리를 조심스럽게 추정하고, 다음에 가장 유용한 질문과
> 행동을 구체적인 버튼으로 제시한다.**

> **그러나 AI가 짚은 부족한 점은 확정 진단이 아니다. learner가 수정할 수
> 있는 반증 가능한 후보이며, 버튼 클릭이나 자기보고는 숙달 증거가 아니다.**

> **게임처럼 보이게 만드는 것이 목표가 아니다. 실제로 해낸 학습의 구조와
> 아직 닫히지 않은 질문이 게임처럼 명확하게 느껴지게 만드는 것이 목표다.**

> **알림과 버튼의 목적은 앱 체류시간을 늘리는 것이 아니라, 가장 작은
> 독립 학습 행동으로 바로 데려가는 것이다.**

> **성취는 접속·소비·클릭이 아니라 repair·무도움 회복·verified transfer·
> timed integration의 근거로만 열린다.**

> **사용자가 쉬어도 과거 성취를 벌하지 않는다. 밀린 일을 쌓지 않고,
> 마지막으로 남은 질문에서 다시 시작할 수 있는 복구 루트를 제공한다.**

> **현재 존재하지 않는 mastery나 guided runtime을 이 기능을 위해 조기
> 구현하지 않는다. 현재 trusted evidence와 tutor state에서 직접 투영하고,
> authority가 바뀌면 새 versioned contract로 다시 검증한다.**
