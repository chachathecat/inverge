---
document_title: "답안길 통합 마스터플랜 v6"
document_subtitle: "Owner-Private Study OS — 실무 학습법 보존·독립 전이·가격 가설"
status: "owner-strategy/non-authoritative"
dated: "2026-07-27 KST"
repository: "chachathecat/inverge"
production_authorization: "none"
supersedes_for_strategy_only:
  - "dabangil_master_plan_v5_post_s234r_extreme_2026-07-26"
  - "inverge_full_day_ai_notebook_source_addendum_v1_2026-07-22"
  - "dabangil_second_round_paid_beta_20_30_launch_plan_2026-07-23"
historical_inputs_do_not_execute:
  - "inverge_world_class_control_plane_v2_2026-07-16"
  - "04-inverge_execution_prompt_pack_2026-07-16"
  - "inverge_latest_handoff_2026-07-22"
does_not_supersede:
  - "live GitHub state and runtime"
  - "dated Owner decisions"
  - "AGENTS.md"
  - "canonical Markdown and machine-readable contracts"
  - "roadmap/active-program.yml"
execution_rule: "Reconcile live state before every Work; never reuse embedded SHA assumptions."
---

# 답안길 통합 마스터플랜 v6

## Owner-Private Study OS → 1차·동차·Academy 확장

이 문서는 답안길의 현재 전략과 실행 의도를 하나로 정리한
**비권위 Owner 전략 문서**다.

이 문서만으로 다음을 승인하지 않는다.

- runtime, schema, migration, RLS 또는 provider 변경
- 실제 Golden content 처리
- Owner 또는 외부 계정 activation
- 결제, entitlement, checkout, refund 또는 가격표 변경
- Production 배포
- 공개 판매, 광고 또는 효능 주장
- OR-Tools, 1차 또는 Academy runtime

실제 구현은 항상 live authority가 허용하는 별도 Work와 별도 승인으로
수행한다.

front matter의 `historical_inputs_do_not_execute` 문서는 배경 입력일
뿐이다. 그 안의 오래된 Work 프롬프트, SHA, 실행 순서와
69,000/79,000원 가격 문구를 현재 지시로 실행하지 않는다.

---

## 읽는 순서

- 지금 무엇을 해야 하는가: 0~2, 13
- 사용자의 실제 공부법을 어떻게 보존하는가: 3~7
- Full-Day와 확장 구조: 8~9
- Owner dogfood와 검증: 10
- 가격과 첫 매출: 11
- 개발 순서와 acceptance: 12~15

---

## 0. 한 페이지 결론

답안길의 핵심은 AI가 해설을 길게 보여주는 것이 아니다.

> **사용자가 실제 문제에서 막힌 이유를 이해하고, 다시 써 보고,
> 다음 미사용 문제를 AI 도움 없이 더 잘 풀게 만드는 것**이 핵심이다.

사용자가 감정평가실무를 공부하며 이미 사용하는 다음 방식은
틀리지 않았다.

```text
문제를 쉬운 상황으로 바꾸기
→ 왜 그런지 계속 묻기
→ 그림으로 구별하기
→ 비슷한 개념과 비교하기
→ 전체 체계에서 위치 찾기
→ 조건별 유형으로 일반화하기
→ 계산기 입력까지 절차화하기
```

이 방식은 답안길의 `guided_study`와 Explanation Workbench 안에
정식으로 보존한다.

다만 이 방식만 사용하면 “설명을 읽어서 안다”와 “시험장에서 혼자
푼다”가 섞일 수 있다. 따라서 앞뒤에 독립 수행을 붙인다.

```text
원문·OCR 확인
→ 3~8분 무도움 시도 또는 명시적 guided_study 선택
→ 필요하면 최소 힌트
→ 쉬운 풀이·왜·그림·비교·전체 체계·계산기 설명
→ 백지 재작성·재계산
→ 조건이 바뀐 대조·변형
→ D+1 무도움 회상
→ D+7 verified-variant 전이
→ 주기적 timed_full_solution
```

v6의 제품 보강은 정확히 다섯 가지다.

1. 완전한 `KeyConceptV2`
2. 여섯 개의 bounded explanation probe
3. `PracticalDecisionPathV1`
4. `ContrastSetV1`
5. `timed_full_solution`

가격은 다음 세 단계의 **새 가설**로 분리한다.

| 단계 | 가격 가설 | 범위 |
| --- | ---: | --- |
| Founder Canary | 39,000원 | 30일, 8단위, 최초 누적 3~5명 |
| Standard Starter | 49,000원 | 30일, 8단위 |
| Complete Study OS | 89,000원 | 30일, 20단위, 완성형 gate 뒤 |

위 가격은 canonical 가격을 자동으로 바꾸지 않는다. 실제 제안,
결제 또는 activation에는 별도 commercial source amendment와
commercial packet이 필요할 수 있지만, 그것과 generic Owner 승인만으로
외부 결제를 열 수는 없다. 현재 외부 상용화는
`S241A → O3C → S239A → S242C → O4F`를 선행 통과한 뒤 첫
external payment를 승인된 `S243C` 안에서만 실행한다.

Owner dogfood는 제품의 개인 가치와 안전성을 검증한다. 가격은 실제
타인의 실제 구매 결정으로만 검증한다. 두 evidence ledger와 readiness
분자는 서로 합치지 않는다.

---

## 1. 작성 시점 live checkpoint와 현재 금지선

2026-07-27 KST에 read-only로 관측한 상태:

| 대상 | 관측 상태 |
| --- | --- |
| `main` | `54011409d28e213951af05a2cc5eaa5229259abe` |
| `main` tree | `83e884f6b4cdf63d9a1e6b3ee7272fa637ac2ef8` |
| PR #662 | open, Draft, mergeable |
| PR #662 current head | `aeaf44628c1e83d4c4d74e7b74a05d8f1c0fe852` |
| PR #662 current tree | `b3b2bd8aa42004b8d6ef18e6ca68e94ea0cf2444` |
| PR #662 aggregate | 정확히 30 files, `+18,140/-258` |
| current corrective manifest | 승인된 정확히 6개 경로 |
| public/billing/external learner | OFF |

위 값은 역사 기록일 뿐 실행 입력이 아니다. 실제 Work는 GitHub,
`AGENTS.md`, dated Owner decision, canonical contracts,
`roadmap/active-program.yml`, CI와 review를 다시 확인한다.

### 1.1 지금 이 문서를 PR #662에 넣지 않는다

PR #662의 현재 post-Ready corrective도 다음 정확한 6개 경로만
소유한다.

1. `AGENTS.md`
2. `config/dabangil-full-day-scheduler-contract.json`
3. `docs/dabangil-unified-program-contract.md`
4. `docs/inverge-second-round-final-product-spec.md`
5. `docs/inverge-study-schedule-system.md`
6. `tests/s234r-owner-dogfood-private-plane-schedule-amendment.test.mjs`

이 마스터플랜을 같은 PR에 넣으면 일곱 번째 corrective path가 되고
aggregate manifest도 31개가 된다. 따라서 권한 위반이다.

### 1.2 안전한 소스 반영 순서

```text
PR #662 terminal merge
→ post-merge main·review·roadmap read-only reconciliation
→ 새 WIP-1 docs-only branch
→ 이 단일 파일을 non-authoritative strategy로 추가
→ Draft PR
→ 별도 검토와 명시적 merge
```

마스터플랜 PR은 다음을 건드리지 않는다.

- `AGENTS.md`
- dated Owner decision
- canonical contracts
- `roadmap/active-program.yml`
- app, API, DB, migration, tests, workflow
- 가격 config 또는 billing

학습 계약과 가격 계약을 실제 권위로 바꾸려면 뒤의 서로 다른
source-amendment Work가 필요하다.

---

## 2. 권위, 범위, 제품 정체성

충돌 시 현재 저장소의 live authority order를 따른다. 이 문서가
새 authority hierarchy를 만들지 않는다.

현재 learner-facing 범위는 감정평가사 2차 세 과목이다.

- 감정평가실무
- 감정평가이론
- 감정평가 및 보상법규

제품 한 문장:

> 답안길은 문제·답안·풀이·개념·오류·재작성·복습을 근거가 추적되는
> 개인 학습 문서로 묶고, 오늘 가장 중요한 결과 최대 3개를 실제
> 가용시간에 배치해, 다음 문제를 AI 없이 더 잘 풀게 만드는
> 감정평가사 2차 Study OS다.

답안길은 다음이 아니다.

- 공식 채점기
- 공식 모범답안 서비스
- 합격확률 또는 합격보장 제품
- 인간 전문가 첨삭 대행 B2C 서비스
- 공개 기출문제 원문 아카이브
- 범용 AI 채팅 wrapper
- generic dashboard, Notion clone 또는 streak 앱

허용 learner-facing 표현:

- Evidence Review
- 답안 검토 리포트
- 가장 큰 간극 1개
- 다음 행동 1개
- 연습점수 범위와 근거
- 재작성·재계산
- AI 학습용 기준안
- Trust와 불확실성

`AI 학습용 기준안` 라벨은 §4.1~§4.2의 required
learner-reference caveat 계약을 충족할 때만 허용한다. 이 절의 일반
제품 설명은 Workbench의 learner-visible notice를 대신하지 못한다.

---

## 3. 최종 학습 루프

### 3.1 두 개의 learning path

`attempt_first`가 기본이다.

1. 문제와 OCR을 확인한다.
2. 3~8분 또는 문제에 맞는 검증된 시간 동안 무도움으로 시도한다.
3. 막히면 최소 힌트를 단계적으로 선택한다.
4. 제출 뒤 Explanation Workbench를 본다.
5. 가장 큰 간극 하나를 다시 쓰거나 계산한다.
6. D+1과 D+7을 예약한다.

`guided_study`는 초학자나 완전히 낯선 유형에 명시적으로 허용한다.

1. full solution을 보기 전에 exposure를 원자적으로 기록한다.
2. 쉬운 상황, 왜, 그림, 비교, 체계, 조건 변화, 계산기 설명을 본다.
3. 바로 10초 회상과 백지 재현을 한다.
4. 다음 독립 ReviewUnit을 예약한다.

`guided_study` 열람은 다음을 만들지 못한다.

- independent attempt
- 개인 오답에서 추론한 biggest gap
- unseen 또는 held-out 자격
- stable mastery
- verified transfer

독립 시도 전에는 개인 gap을 꾸며내지 않고
`무도움 재현 목표`만 보여준다.

### 3.2 assistance, exposure, mastery 분리

Assistance event:

```ts
type AssistanceKindV1 =
  | "recall_cue"
  | "concept_hint"
  | "structural_hint"
  | "partial_example"
  | "full_solution_revealed";
```

Exposure:

```ts
type ExposureStateV1 = {
  itemExposureState: "unseen" | "presented";
  solutionRevealState: "hidden" | "partial_hint" | "full_revealed";
  itemRelation:
    | "original"
    | "same_surface"
    | "verified_variant"
    | "unverified_variant";
};
```

Mastery:

```ts
type MasteryStateV1 =
  | "unknown"
  | "confused"
  | "wrong"
  | "confident_wrong"
  | "recovering"
  | "stable";
```

전이 불변식:

| 사건 | 최대 허용 결과 |
| --- | --- |
| AI 풀이 생성·열람·저장 | mastery 변화 없음 |
| 힌트 또는 full solution 뒤 성공 | `recovering` 후보 |
| D+1 무도움 성공 | `recovering` 후보 |
| 같은 문제 재정답 | unseen readiness 아님 |
| D+7 이상 verified variant 무도움 성공 | 추가 조건 충족 시 `stable` 후보 |
| 후속 무도움 실패 | demote/reopen |

`stable`은 서버가 다음을 모두 확인한 첫 qualifying success에만
부여할 수 있다.

- D0 뒤 6~8일 window
- presentation 직전 해당 variant가 unseen이고 solution이 hidden인
  immutable eligibility snapshot
- `verified_variant`이면서 same-surface가 아닌 item relation
- current rights, source, answer와 effective-version binding
- disqualifying assistance 0
- subject validator pass
- 같은 evidence를 retry·replay로 중복 계산하지 않는 unique key

하나라도 없으면 최대 `recovering`이거나 ineligible evidence다.

### 3.3 attempt mode

`timed_full_solution`은 세 번째 learning path가 아니다.
`attempt_first` 안의 수행 모드다.

```ts
type AttemptModeV1 =
  | "component_practice"
  | "timed_full_solution"
  | "timed_set";
```

`component_practice`는 특정 산식·쟁점·문단·간극을 고친다.
`timed_full_solution`은 제한시간 안에 전체 출력을 통합할 수 있는지
검증한다. 둘은 서로 대체하지 않는다.

---

## 4. Explanation Workbench v3

### 4.1 화면 구조

데스크톱:

| 왼쪽 약 68% | 오른쪽 약 32% |
| --- | --- |
| AI 학습용 기준안 | 핵심개념 1~3개 |
| 한 줄 방향 | 한 줄 정의 |
| 단계별 풀이·답안 구조 | 이 문제에서의 적용 |
| 산식·근거·검산 | 10초 회상 |

아래 전체 너비:

1. 이 문제가 평가하는 능력
2. 자주 빠지는 함정
3. 개인 biggest gap 또는 무도움 재현 목표
4. 지금 다시 할 한 가지
5. 주 CTA 하나

모바일:

```text
AI 학습용 기준안
→ 필수 learner-reference notice
→ 풀이
→ 핵심개념
→ 평가 능력·함정
→ 보조 probe
→ 교정
→ 주 CTA
```

여섯 probe는 주 CTA가 아니다. 한 화면의 주 행동은 계속 하나다.

Workbench의 `AI 학습용 기준안` heading에는 데스크톱과 모바일 모두
다음 exact notice를 직접 인접하게 또는 바로 아래에 표시한다.

> AI가 생성한 풀이·기준안은 학습 참고자료이며, 시험기관의 공식 답안·공식 모범답안 또는 공식 채점기준이 아닙니다.

이 notice는 explanation, answer, scoring, `abilityAssessed`,
`inferredExamPoint`를 포함한 packet body보다 먼저 normal accessible
DOM과 screen-reader 읽기 순서에 있어야 한다. 최초 render와 reopen
모두 동일하게 보이며, packet이나 내부 evidence가 `usable`,
`supported` 또는 `verified`로 표시되어도 생략하지 않는다. tooltip,
modal, footer, 접힌 panel 또는 약관 link만으로 대체하지 않는다.
CSS의 시각 재배치도 heading → notice → body 순서를 뒤집지 못한다.

### 4.2 ExplanationPacketV2

```ts
type ContentScopeV1 =
  | "learner_private"
  | "tenant_private"
  | "cleared_shared";

type LearnerReferenceCaveatV1 = {
  kind: "learning_reference_not_official_answer_or_grading_criteria";
  noticeVersion: "ko-KR.v1";
};

type ExplanationPacketV2 = {
  id: string;
  contentScope: ContentScopeV1;
  scopeRef: string;
  rightsDecisionRef: string;
  cacheScopeRef: string;
  problemRevisionChecksum: string;
  sourceBundleChecksum?: string;
  subjectAdapter: string;
  status: "usable" | "partially_blocked" | "blocked" | "stale";
  learnerReferenceCaveat: LearnerReferenceCaveatV1;
  questionAsking: string;
  solutionDirection: string;
  steps: ExplanationStepV2[];
  keyConcepts: KeyConceptV2[]; // 1..3
  practicalDecisionPathRef?: string;
  abilityAssessed: string;
  inferredExamPoint?: string;
  commonTraps: TrapV2[];
  recallPrompt10s: string;
  claims: ClaimEvidenceV2[];
  verificationSummary: VerificationSummaryV2;
  uncertainty: string[];
  nextAction: NextActionV2;
  modelProfileVersion: string;
  promptVersion: string;
  schemaVersion: string;
};
```

`learnerReferenceCaveat`는 required, closed, non-optional field다.
`ko-KR.v1`은 위 exact notice를 trusted product copy registry에서
resolve하며 model-authored free text가 아니다. kind 또는 version이
missing, unknown 또는 mismatched면 generated reference-answer와
explanation body의 release와 rendering을 모두 차단한다.
`verificationSummary`, `uncertainty`, Trust status와 이 caveat는 서로
독립된 요구사항이며 어느 것도 다른 하나를 대체하지 않는다.

이 presentation-layer `kind`는 기존 S214/S215 release gate의
`requiredCaveatKey: "learning_reference_not_official_answer"`를 rename,
replace 또는 alias하지 않는다. 별도 승인된 source amendment가
구현할 trusted adapter는 upstream exact key를 먼저 요구한 뒤 그
release state와 `ko-KR.v1` copy policy를 위 presentation
kind/version tuple로 one-way deterministic mapping한다. 어느 값을
상대 namespace의 alias로 accept하거나 persistent migration하지
않는다. upstream key, presentation tuple 또는 trusted copy registry
중 하나라도 missing, unknown 또는 mismatched면 body를 차단한다. 이
전략 PR 자체는 기존 release-gate enum migration을 승인하지 않는다.

공통 reference와 개인 diagnosis는 물리적으로 분리한다.

- `ReferenceExplanationPacket`: 문제·source·공통 풀이·개념·claim,
  content scope, rights decision과 cache scope
- `DiagnosticProjection`: learner·attempt·assistance·gap·next action

`learner_private` reference는 같은 learner vault 안에서만,
`tenant_private` reference는 같은 tenant 안에서만 재사용한다.
`cleared_shared`만 rights promotion과 review가 완료된 scope에서
교차 계정 cache가 가능하다. 다른 learner의 diagnosis cache는 어떤
경우에도 공유하지 않는다.

답안, 문제, source, rights, content scope, model, prompt 또는 policy
basis가 바뀌면 해당 projection을 `stale`로 만든다.

### 4.3 KeyConceptV2

v5에서 이름만 참조한 `KeyConceptV2`를 실제 객체로 고정한다.

```ts
type EvidenceBoundTextV1 =
  | {
      text: string;
      claimRefs: string[];
      status: "verified" | "supported" | "inference";
    }
  | {
      text?: never;
      claimRefs: string[];
      status: "insufficient_evidence" | "blocked" | "stale";
      reasonCodes: string[];
    };

type KeyConceptV2 = {
  id: string;
  contentScope: ContentScopeV1;
  scopeRef: string;
  rightsDecisionRef: string;
  conceptNodeId: string;
  label: string;
  definition: EvidenceBoundTextV1;
  whyItMatters: EvidenceBoundTextV1;
  appliesWhen: EvidenceBoundTextV1[];
  doesNotApplyWhen: EvidenceBoundTextV1[];
  boundaryCases: EvidenceBoundTextV1[];
  applicationToThisProblem: EvidenceBoundTextV1;
  confusedWith: {
    conceptNodeId: string;
    distinction: EvidenceBoundTextV1;
  }[];
  recallPrompt10s: string;
  contrastSetRef?: string;
  claimRefs: string[];
  basisChecksum: string;
};
```

불변식:

- packet 하나당 1~3개
- 정의, 적용조건, 배제조건, 경계사례, 적용, 혼동구분에 claim reference
- 근거가 없으면 내용을 꾸미지 않고 `insufficient_evidence/blocked`
- problem/source revision 변경 시 `stale`
- `verified`는 model 입력값이 아니라 claim registry가 파생
- private concept는 private graph scope를 벗어나지 않음
- 독립 자유형 노트가 아니라 LearningDocument와 scope가 일치하는
  CurriculumGraph에 결합

### 4.4 여섯 explanation probe

```ts
type ExplanationProbeKindV1 =
  | "why_this"
  | "visualize"
  | "compare_adjacent"
  | "locate_in_system"
  | "change_condition"
  | "calculator_input";

type ExplanationProbeVisualOutputV1 = {
  structuredDiagramRef?: string;
  sourceNodeRefs: string[];
  textEquivalent: string;
  altText: string;
  claimRefs: string[];
  fallback: "diagram_and_text" | "text_only";
};

type ExplanationProbeCommonV1 = {
  id: string;
  learnerScopeRef: string;
  sessionRef: string;
  kind: ExplanationProbeKindV1;
  parentPacketRef: string;
  targetNodeRef: string;
  problemRevisionChecksum: string;
  sourceBundleChecksum?: string;
  parentBasisChecksum: string;
  assistanceKind: AssistanceKindV1;
  assistanceEventRef: string;
  deliveryIdempotencyKey: string;
  outputRef?: string;
  visualOutput?: ExplanationProbeVisualOutputV1;
  claimRefs: string[];
  status: "usable" | "blocked" | "stale";
  schemaVersion: string;
};

type ExplanationProbeV1 = ExplanationProbeCommonV1 &
  (
    | {
        deliveryMode: "projected";
        projectionRef: string;
      }
    | {
        deliveryMode: "generated";
        generationIdempotencyKey: string;
        usageReservationRef: string;
        modelProfileVersion: string;
        promptVersion: string;
      }
  );
```

고정 learner-facing 문구:

- 왜 이렇게 하나?
- 그림으로 보기
- 비슷한 개념과 비교
- 전체 체계에서 위치
- 조건이 바뀌면?
- 계산기 입력법

실행 원칙:

1. 가능한 경우 같은 `ExplanationPacketV2`에서 projection한다.
2. 추가 생성이 필요하면 target과 basis가 닫힌 child revision만 만든다.
3. 각 카드가 통제되지 않은 자유형 AI 호출을 만들지 않는다.
4. 모든 factual node는 claimRefs 또는 명시적 `inference` 상태를 가진다.
5. 열람은 assistance/exposure evidence이며 mastery를 올리지 않는다.
6. `calculator_input`은 관련 실무 계산과 승인된
   `casio_fx_9860giii` profile에서만 보인다.
7. 같은 transaction에서 assistance/exposure event를 먼저 commit한
   뒤 output을 반환한다. commit이 실패하면 direct API·retry·다중 탭
   모두 output을 받지 못한다.
8. generated mode는 reservation과 generation idempotency key가
   필수다. usable output에만 usage를 commit하고 실패하면 release한다.
9. `visualize`는 source-node binding, claimRefs, 동등한 text와 alt text를
   제공하고 정확한 그림을 만들 수 없으면 text-only로 fail-closed한다.
10. raw prompt/output body는 Personal Raw Vault 밖의 log·telemetry로
   보내지 않는다.

### 4.5 ContrastSetV1

핵심개념마다 최대 한 세트를 제공한다.

```ts
type ContrastCaseKindV1 =
  | "canonical"
  | "near_miss"
  | "counterexample"
  | "flip_condition";

type ContrastCaseV1 = {
  id: string;
  kind: ContrastCaseKindV1;
  contentScope: ContentScopeV1;
  scopeRef: string;
  situation: string;
  expectedJudgment: string;
  discriminatingCondition: string;
  itemRelation:
    | "original"
    | "same_surface"
    | "verified_variant"
    | "unverified_variant";
  sourceRefIds: string[];
  sourceChecksum: string;
  rightsState:
    | "verified_reuse_allowed"
    | "private_personal_use_only"
    | "unresolved"
    | "blocked";
  rightsDecisionRef: string;
  attributionVersion?: string;
  validatorRefs: string[];
  claimRefs: string[];
  verificationState: "verified" | "supported" | "unverified" | "blocked";
  status: "usable_for_learning" | "blocked" | "stale";
};

type ContrastSetV1 = {
  id: string;
  conceptNodeId: string;
  canonicalCase: ContrastCaseV1 & { kind: "canonical" };
  nearMissCase: ContrastCaseV1 & { kind: "near_miss" };
  counterexampleCase: ContrastCaseV1 & { kind: "counterexample" };
  flipConditionCase: ContrastCaseV1 & { kind: "flip_condition" };
  basisChecksum: string;
};
```

순서:

```text
정상사례 1
+ 가장 헷갈리는 near-miss 1
+ 반례 1
+ 조건 하나가 바뀌어 결론이 뒤집히는 사례 1
```

생성 사례는 기본적으로
`learner-private + unverified_variant`다. source, rights, 정답과
validator가 모두 확인되기 전에는 D+7 transfer, held-out, stable 또는
readiness evidence에 사용할 수 없다.

네 named field의 kind는 각각 고정되고 서로 바꿀 수 없다.
`verified_variant`로 D+7에 쓰려면 `verified_reuse_allowed`,
non-empty source·validator refs, current checksum과
`verificationState=verified`를 모두 요구한다. `original`,
`same_surface`와 private/unverified case는 설명 학습에만 쓸 수 있다.

### 4.6 claim-level Trust

생성 텍스트가 자기 자신을 `verified`로 승격하지 못한다.

Trust summary는 model output이 아니라 서버의 claim registry와
release matrix에서 계산한다.

- 실무: blocking 계산·source conflict면 해당 결과 release 금지
- 이론: unsupported assertion을 deterministic fact처럼 표시 금지
- 법규: 필수 source/effective date/쟁점/요건/결론 중
  `unresolved/conflict/unbound/stale`가 있으면 기준안 전체 block
- `partially_blocked`: 필수 결론과 독립적인 비필수 설명에만 허용

---

## 5. 과목별 adapter

### 5.1 실무 — PracticalDecisionPathV1

사용자가 실제로 묻는 “왜 이 방법인가?”를 별도 정답 원장으로 만들지
않고 기존 PracticalAdapter와 CalculationGraph의 projection으로
직렬화한다.

```text
문제 사실
→ 본건·사례·표준자료 역할
→ 기준시점·자료시점
→ 후보 방법
→ 채택·배제·조건부 이유
→ 산식·CalculationGraph
→ 단위·부호·반올림
→ 역산·상식·deterministic 검산
→ 필요한 경우 reset-safe 계산기 입력
```

```ts
type PracticalDecisionPathV1 = {
  id: string;
  problemRevisionChecksum: string;
  problemFactNodes: EvidenceNodeV1[];
  dataRoleNodes: DataRoleNodeV1[];
  dateBasisNodes: DateBasisNodeV1[];
  methodCandidates: {
    methodRef: string;
    decision: "adopted" | "rejected" | "conditional";
    reason: EvidenceBoundTextV1;
  }[];
  adoptedMethodRefs: string[];
  primaryMethodRef?: string;
  calculationGraphRef?: string;
  unitAndRoundingPolicyRef: string;
  validationRefs: string[];
  calculatorRoutineRef?: string;
  claimRefs: string[];
  basisChecksum: string;
};
```

`methodRef`는 candidate 안에서 unique다. `adoptedMethodRefs`는
`decision=adopted`인 candidate와 정확히 같아야 한다. primary가 있으면
adopted 집합의 member여야 한다. usable result는 지원되는 문제에서
최소 하나의 adopted method를 요구하고, 복수 방법 병용을 단수로
축약하지 않는다.

역할별 검증 책임:

- AI: 쉬운 설명, 방법 후보, 비교, 문장화
- deterministic validator: 숫자, 부호, 단위, 반올림, 역산
- source registry: 공식 문제·자료·기준일·권리

`usable`, `supported`, `verified`는 evidence, source와 계산 품질만
설명한다. 어떤 상태도 AI 학습 참고자료를 시험기관의 공식 답안,
공식 모범답안 또는 공식 채점기준으로 바꾸지 않는다.

AI 계산과 deterministic 결과가 충돌하면 숫자 결과를 release하지
않고 conflict를 표시한다. 설명 안에서 중간 숫자와 최종 숫자가
서로 다른 경우도 blocker다.

계산기 설명은 시험장 리셋 뒤 손으로 재현 가능한
`casio_fx_9860giii` routine만 허용하고 저장 프로그램 의존을
가르치지 않는다.

### 5.2 이론

- 요구 동사
- 쟁점과 목차 skeleton
- 개념 정의
- 논거 연결
- 비교·평가 축
- 반대·대안 관점
- 답안형 문단과 한 줄 압축
- 10초 목차 회상

숫자점수를 최종 판정처럼 사용하지 않는다. Evidence Review는
요구 대응, 목차, 개념, 논증, 비교·평가의 근거를 보여준다.

### 5.3 법규

- 쟁점
- 법적 근거 후보
- 요건·효과
- 포섭
- 결론
- 시험일 또는 문제 결합 effective date

`unresolved/conflict/unbound/stale`인 필수 근거가 있으면 verified
기준안을 release하지 않는다. 개인 note shell과 미확인 항목은
저장할 수 있지만 “검증 완료”로 표시하지 않는다.

### 5.4 혼합 문제

네 번째 엔진을 만들지 않는다.

- primary adapter 하나
- 필요한 supporting projection
- 내부 gap 후보 여러 개
- learner-facing biggest gap 하나

---

## 6. Gap → Repair → Verification

```ts
type GapFindingV2 = {
  id: string;
  sessionRef: string;
  kind: string;
  evidenceRefs: string[];
  affectedAnswerAnchors: string[];
  severity: "blocking" | "major" | "minor";
  confidence: "low" | "medium" | "high";
  primary: boolean;
  rootCauseCandidateRef?: string;
};

type RepairActionV2 = {
  gapFindingRef: string;
  kind: "rewrite" | "recalculate" | "recall" | "variant";
  scopeAnchors: string[];
  successCriteria: string[];
  estimatedMinutes: number;
  independentRequired: boolean;
};

type RepairVerificationV2 = {
  actionRef: string;
  gapResolved: boolean | "uncertain";
  newBlockingGap: boolean;
  deterministicChecks: string[];
  evidenceRefs: string[];
  nextReviewPolicy: string;
};
```

biggest gap은 자유형 model 선호가 아니라 versioned bounded ranking으로
고른다.

- 배점·시험 영향
- blocking 여부
- 반복 오류
- high-confidence wrong
- prerequisite
- 전이 가능성
- 교정 시간
- source/validator confidence

learner에게 보여주는 주 교정 CTA는 하나다. secondary 후보는 내부
감사와 다음 queue 후보로만 보존한다.

```text
Question Revision
→ Target Skill
→ Attempt Evidence
→ Primary Gap
→ Repair Action
→ Rewrite Verification
→ D+1 Recall
→ D+7 Verified Variant
```

---

## 7. timed_full_solution

### 7.1 목적

미세 repair만 반복하면 부분 기술은 좋아져도 시험장에서 문제 전체를
시간 안에 완성하는 능력은 검증되지 않는다.

`timed_full_solution`은 다음을 본다.

- 문제 전체 구조를 백지에서 세우는가
- 배점을 합리적으로 배분하는가
- 계산·목차·포섭을 시간 안에 연결하는가
- blank, partial, timeout을 숨기지 않는가
- 같은 gap이 전체 수행에서 다시 나타나는가

### 7.2 필수 계약

```ts
type TimedFullSolutionAttemptV1 = {
  id: string;
  learnerScopeRef: string;
  assignmentRef: string;
  attemptIdentityKey: string;
  problemRevisionChecksum: string;
  prePresentationEligibilitySnapshotRef: string;
  priorExposureSummaryChecksum: string;
  allowedMinutes: number;
  timerPolicyVersion: string;
  serverClockVersion: string;
  timerEvidenceRef: string;
  pausePolicyVersion: string;
  offlinePolicyVersion: string;
  startedAt: string;
  submittedAt?: string;
  completionState: "complete" | "partial" | "blank" | "timeout";
  assistanceHistoryRef: string;
  solutionRevealStateAtStart:
    | "hidden"
    | "partial_hint"
    | "full_revealed";
  calculatorProfile?: "casio_fx_9860giii";
  answerRevisionRef?: string;
  allocationEvidenceRef?: string;
  qualification: "independent" | "assisted" | "ineligible";
  qualificationBasisRef: string;
};
```

불변식:

- 시작 직전 exposure eligibility snapshot과 presentation을 한
  transaction에 기록
- 이전에 solution을 본 같은 item도 timed 연습으로 정직하게 저장하되
  `solutionRevealStateAtStart`를 숨김으로 되돌리지 않고 ineligible 처리
- 제출 또는 timeout 전 full solution 차단
- qualification은 client가 제출하지 않고 immutable exposure,
  assistance history와 server timer event에서 서버가 계산
- 같은 item의 direct API·다중 탭·probe·hint 사용은 제출 전이라도
  동일 attempt를 assisted/ineligible로 전이
- learner+assignment+problem revision+timer policy의 unique attempt와
  replay-safe identity key를 요구
- monotonic/server clock을 권위로 사용하고 late submit은 timeout;
  independent timed evidence의 pause·offline 허용 여부는 닫힌 policy로
  정하며 증거가 끊기면 ineligible
- 검증된 시험 registry 또는 assignment가 허용시간을 정함
- full-subject fixture가 공식 100분을 사용할 수 있지만 모든 문제에
  100분을 하드코딩하지 않음
- AI 점수보다 작성시간, blank/partial, 구조 누락,
  deterministic 오류와 biggest gap을 기록
- offer별 포함 여부는 비작동 가설이며 `S242C`의 exact manifest와
  `O4F`가 결정한다. 이 문구는 첫 결제 gate나 alternate path를 만들지
  않는다. `S241A → O3C → S239A → S242C → O4F`를 선행 통과한
  뒤 첫 external payment는 승인된 `S243C` 안에서만 실행한다.

감정평가사 2차 각 과목의 공식 시험시간 기준은 Q-Net registry에
versioned source로 결합한다.

---

## 8. Personal Study Ledger, Review Queue, Full-Day

### 8.1 LearningDocument 계보

```text
immutable source asset
→ editable OCR/problem revision
→ attempt 또는 guided exposure
→ ExplanationPacket revision
→ KeyConcept·DecisionPath·ContrastSet
→ gap/action
→ rewrite/recalculation revisions
→ D+1/D+7/timed evidence
→ current next action
```

규칙:

- 원본을 OCR 수정으로 덮어쓰지 않는다.
- AI output은 exact problem/source basis에 묶는다.
- problem/source/policy 변경 시 과거 판정을 `stale`로 만든다.
- 원본, 사용자 수정, AI output, 개인 메모를 구조적으로 분리한다.
- autosave, conflict recovery, version history, export, delete를 제공한다.

### 8.2 Review Queue

각 ReviewUnit은 다음을 가진다.

- source document/attempt/finding
- concept/error
- task kind
- dueAt
- estimated minutes
- priority reason
- independent requirement
- completion evidence
- `qualification: independent | assisted`

```ts
type ReviewTaskKindV1 =
  | "rewrite"
  | "recalculate"
  | "recall"
  | "verified_variant"
  | "timed_full_solution";

type ExecutionBlockKindV1 =
  | "learning_attempt"
  | "guided_study"
  | "repair"
  | "review"
  | "timed_full_solution";
```

assisted 완료는 학습 이력에는 남지만 independent due를 닫지 않는다.

`timed_full_solution`은 versioned cadence policy가 eligible source,
rights, prior exposure, 최근 component repair와 시험 phase를 읽어
ReviewUnit을 제안한다. cadence 수치는 future Owner packet의 가설이며
이 문서가 하드코딩하지 않는다.

### 8.3 Native Full-Day

Today에서 learner-facing 핵심 결과는 최대 3개다. 실제 하루 공부는
가용시간 안의 `ExecutionBlock 0..N`으로 운영한다.

```text
아침 가용시간·고정일정 확인
→ CoreOutcome 0..3
→ ExecutionBlock 0..N
→ 공부 중 실제 결과 저장
→ 일정 변화 시 native replan
→ 하루 마감
→ D+1/D+7 queue
```

완료 block 하나가 mastery를 올리지 않는다.

timed block은 registry-derived exact duration을 사용하고
`canShorten=false`, `canSplit=false`다. defer/drop 가능성은 cadence와
시험 phase policy가 명시하며, scheduler가 임의로 일반 review block으로
바꾸지 않는다.

### 8.4 OR-Tools

OR-Tools는 optional adapter다.

- 무엇을 공부할지는 native evidence policy가 정한다.
- OR-Tools는 선택된 candidate를 시간창에 배치하는 역할만 한다.
- native baseline을 막지 않는다.
- isolated benchmark, threshold decision, hidden shadow,
  visible comparison, limited activation을 순서대로 거친다.
- hard constraint 또는 trusted gateway 검증 실패 시 native fallback,
  그것도 실패하면 `blocked_manual_plan_required`.

---

## 9. 데이터, 권리, privacy, cost

### 9.1 다섯 plane

1. Personal Raw Vault
2. Academy Tenant Vault
3. Shared Signal Plane
4. Cleared Content Bank
5. Model/Eval Registry

```ts
type ConsentPurposeV1 =
  | "personal_service"
  | "optional_price_interview"
  | "pseudonymous_product_signal"
  | "academy_sharing"
  | "user_owned_content_contribution"
  | "offline_model_training";

type ConsentLedgerEntryV1 = {
  subjectScopeRef: string;
  purpose: ConsentPurposeV1;
  noticeVersion: string;
  consentState: "granted" | "declined" | "revoked";
  retentionPolicyRef: string;
  grantedAt?: string;
  revokedAt?: string;
  revocationAppliedThroughRef?: string;
};
```

private raw 문제, 답안, 필체, OCR, note와 AI body는 자동으로 shared
corpus나 학습 데이터가 되지 않는다.

기본 content scope는 private다. `cleared_shared` promotion은 별도의
rights decision, exact-purpose consent가 필요한 경우 그 consent,
quarantine, review, retention과 revocation 적용을 모두 요구한다.
한 목적의 consent를 다른 목적에 재사용하지 않는다.

### 9.2 금지

- raw body를 log, telemetry, issue, PR, CI artifact 또는 screenshot에 저장
- 개인 업로드에서 공용 variant를 자동 생성·승격
- global equality oracle
- online model-weight update
- consent 하나로 모든 목적을 포괄
- generated ContrastSet을 verified corpus로 자동 승격

### 9.3 probe 원가

여섯 probe와 ContrastSet은 기존 usable unit의 범위와 원가를 바꿀 수
있다. commercial amendment는 정확히 다음을 고정한다.

- 단위당 포함 probe 수
- projection과 추가 generation의 구분
- packet당 generated probe hard cap
- learner+packet당 동시 generation 최대 1
- idempotency, cancel, retry와 cache-hit 차감 규칙
- 재열람
- 재생성
- 실패와 retry
- 별도 차감 여부
- route별 p50/p95 원가
- reserve → usable commit / failure release

가격표나 model route가 바뀌면 이전 원가 evidence를 재사용하지 않는다.

---

## 10. Owner Dogfood와 evidence 분리

### 10.1 Owner 목적

```text
아침 계획
→ 실제 학습
→ attempt/guided
→ 풀이·probe·repair
→ 중간 replan
→ 하루 마감
→ D+1
→ D+7
→ timed full solution
```

Owner evidence가 검증할 수 있는 것:

- 개인 학습가치
- 잘못된 설명·계산·Law release
- UX friction
- Ledger reopen/resume
- native planner 적합성
- 제품을 자발적으로 다시 쓰는지

Owner evidence가 검증할 수 없는 것:

- external usability
- 시장 가격
- 다양한 필체·기기·학습수준 일반화
- commercial readiness
- observed efficacy
- causal claim

### 10.2 Owner gate

| Gate | 최소 가설 | 의미 |
| --- | --- | --- |
| Early Value | 서로 다른 5일, usable result 12+, D+1 6+ | 학습가치 방향 |
| Owner-Private Core | 14일+, review 25~30+, D+1 10+, D+7 6+ | core 후보 |
| Scheduler Extended | 공부일 20+, plan 40+, midday replan 10+ | native 일정 품질 |

추가 기록:

- 풀이 뒤 어떤 probe를 썼는가
- probe가 repair를 도왔는가
- guided 뒤 D+1 무도움 성공 여부
- component repair 뒤 timed full solution에서 재발했는가
- deterministic conflict와 blocked release

### 10.3 두 ledger를 합치지 않는다

| Ledger | 대상 | readiness에 사용할 수 있는 것 |
| --- | --- | --- |
| Owner-private evidence | Owner 1명 | Owner dogfood·private acceptance |
| External commercial evidence | 승인된 canary | 가격·사용성·지원·환불·원가 신호 |

Owner 일수·result·D+1은 외부 cohort 분자에 넣지 않는다.
Founder 구매·사용도 S238A/S240A Owner scheduler evidence 분자에 넣지
않는다.

---

## 11. 가격과 첫 매출

### 11.1 canonical과 v6 가설을 구분한다

작성 시점 live source에는 다음 historical/canonical 가격 가설이
존재한다.

- Founding Beta: 69,000원, 30일, 20 `usable_review_unit_v1`
- Basic: 59,000~69,000원/month 가설
- Pro: 119,000~149,000원/month 가설
- Premium: 249,000~299,000원/month 가설

v6는 이를 몰래 덮어쓰지 않는다. 다음은 별도 commercial amendment에서
검토할 **새 offer hypotheses**다.

| Offer version | 가격 | 기간·단위 | 조건 |
| --- | ---: | --- | --- |
| `founder_canary_v1` | 39,000원 | 30일·8단위 | 최초 누적 3~5명, 자동갱신 없음 |
| `starter_v1` | 49,000원 | 30일·8단위 | Founder 종료 뒤 exact manifest |
| `complete_study_os_v1` | 89,000원 | 30일·20단위 | D+7·timed·Full-Day acceptance 뒤 |

이 가설을 기록하거나 commercial source amendment, commercial packet
또는 generic Owner 승인을 마련하는 것만으로 외부 결제를 열 수 없다.
현재 `S241A → O3C → S239A → S242C → O4F`의 exact
prerequisite를 먼저 충족하고, 첫 external payment는 승인된
`S243C` 안에서만 실행한다.

무료 experience:

- 평생 1회
- 본인 시도 제출 뒤 full-value review
- usable result 실패 시 차감 없음
- verified account/participant dedupe와 abuse cap
- private upload rights·retention·export/delete 적용
- free-route p95 cost cap과 generation kill switch
- paid entitlement·refund ledger와 분리하며 결제 환불로 free quota를
  재생성하지 않음

`ReviewUnit`, `usable_review_unit_v1`, `deep_review_unit`은 서로 다른
계약이며 alias, balance sharing 또는 silent migration을 금지한다.

### 11.2 가격을 붙이는 가치

범용 AI로 대체하기 쉬운 것:

- 쉬운 설명
- 요약
- 자유형 질의응답

대체하기 어려운 것:

- deterministic 계산 검산
- source·rights·effective-version Trust
- PracticalDecisionPath
- 개인 오류 계보
- rewrite/recalculate verification
- D+1/D+7 독립 전이
- timed full solution
- Full-Day 운영과 safe replan

가격은 두 번째 묶음의 실제 가치와 지불의사에 붙인다.

시장 anchor는 가격 결정 증거가 아니다. 아래는
`retrievedAt=2026-07-27 KST`의 변동 가능한 비권위 표시가격
snapshot이다.

- [콴다 프리미엄](https://qanda.ai/ko): 월 18,500원 표시
- [Google AI Pro](https://one.google.com/intl/ko_kr/about/google-ai-plans/):
  월 29,000원 표시
- [박문각 감정평가사 첨삭형 상품 예시](https://mall.pmg.co.kr/user/ap/lecture/lecture_detail.asp?CrsCode=010220260036M&OpenCrsCode=010220260091O):
  365일 상품에 1,031,400원과 773,900원 표시

각 상품의 기능, 기간, 할인, VAT 표시와 인간 첨삭 포함 범위가 달라
직접 비교하지 않는다. commercial packet은 실제 제안 직전에 exact
plan, 표시가격, VAT, 기간과 retrievedAt을 다시 고정한다.

답안길은 범용 AI 구독과 인간 강의·첨삭 사이에서, 실제 검증된
기능 manifest에 맞춰 가격을 시험한다.

### 11.3 순차적 가격 검증

세 가격을 첫 3~5명에게 동시에 시험하지 않는다.

1. `founder_canary_v1` 39,000원은 수량이 명확한 초기 offer다.
2. 누적 cap에 도달하면 신규 판매를 멈추고 운영·원가·품질 gate를
   평가한다. 가격은 자동으로 오르지 않는다.
3. 새 commercial packet은 현재 canonical external-commercial gate를
   모두 통과한 `S243C` 안에서만 `starter_v1` 49,000원을 별도 exact
   offer로 시험할 수 있다. commercial packet과 generic Owner 승인은
   그 gate를 대체하지 않는다.
4. Founder가 review 2회와 D+1을 경험한 뒤 49,000원 다음 pack을
   실제 구매 또는 paid reservation하는지도 별도 `starter_v1`
   decision으로 기록한다.
5. 39,000원 구매자는 그 자체로 49,000원 지불의사 증거가 아니다.
6. 89,000원은 full product manifest가 완성된 뒤 별도 cohort에서
   시험한다.
7. 가짜 취소선 정가, 무기한 할인, 가짜 countdown을 금지한다.

### 11.4 QualifiedPriceDecisionV1

```ts
type PriceDecisionDeclineReasonV1 =
  | "price"
  | "missing_feature"
  | "timing"
  | "trust"
  | "other_closed_reason";

type PriceDecisionCommonV1 = {
  id: string;
  cohortScopeRef: string;
  participantScopeRef: string;
  eligibilitySnapshotRef: string;
  offerPresentationRef: string;
  truthfulDemoChecksum: string;
  offerVersion: string;
  featureManifestChecksum: string;
  priceKrwVatIncluded: number;
  durationDays: number;
  usableUnitCount: number;
  refundPolicyVersion: string;
  authorityRef: string;
  retentionPolicyRef: string;
  decisionWindowRef: string;
  decisionDedupeKey: string;
  experienceBasisRef?: string;
  decidedAt: string;
};

type QualifiedPriceDecisionV1 = PriceDecisionCommonV1 &
  (
    | {
        decision: "purchase";
        paymentReceiptRef: string;
      }
    | {
        decision: "paid_reservation";
        paymentReceiptRef: string;
        reservationKrw: number;
        reservationTermsVersion: string;
        settlementState: "held" | "applied_to_purchase" | "refunded";
      }
    | {
        decision: "decline";
        declineReason: PriceDecisionDeclineReasonV1;
      }
  );

type OptionalPriceInterviewMetadataV1 = {
  decisionRef: string;
  participantScopeRef: string;
  currentAlternativeSpendBand?:
    | "none"
    | "under_30000"
    | "30000_99999"
    | "100000_299999"
    | "300000_plus"
    | "not_disclosed";
  consentLedgerEntryRef: string;
  retentionPolicyRef: string;
  capturedAt: string;
};

type PriceEvidenceStateV1 = "insufficient" | "price_signal_observed";
```

qualified decision:

> 같은 truthful demo, 같은 exact feature manifest, 같은 가격·기간·단위와
> 환불조건을 본 적격 수험생 한 명이 정해진 기간 안에 실제 결제,
> 조건이 고정된 paid reservation 또는 거절 중 하나를 선택한 고유 결정.

규칙:

- eligibility snapshot이 부적격이면 qualified decision 분모에 넣지 않음
- event는 participant+offer+manifest+refund policy+decision window
  unique key로 retry·replay를 제거
- `price_signal_observed` 분모는
  participant+offer+manifest+refund policy별 고유 참가자 한 번만 계산
- 같은 참가자의 뒤이은 구매·재구매·갱신·결정변경은 별도
  longitudinal evidence로 보존하고 8~12명 분모에 재가산하지 않음
- paid reservation은 purchase와 별도로 보고하고 conversion으로 합산
  하지 않음
- reservation 최소금액·환불·정산조건은 commercial packet이 고정
- “얼마까지 낼 것 같다”는 보조 인터뷰일 뿐 WTP evidence가 아님
- 대체재 지출 band는 optional price-interview purpose consent와
  retention이 있을 때만 별도 metadata로 저장
- 서로 다른 가격·feature manifest·refund 조건의 결정을 합산하지 않음
- Founder 3~5명은 방향성 신호일 뿐 `market_validated`가 아님
- 동일 exact offer의 고유 참가자 decision 8~12개는
  `price_signal_observed`라는 초기 조정 신호일 뿐임
- 실제 시장 검증이나 효능 검증으로 과장하지 않음

### 11.5 외부 canary 시작 전

commercial source amendment, commercial packet과 generic Owner 승인은
필요할 수 있지만 외부 결제를 여는 충분조건은 아니다. 현재 controlling
path는 다음과 같다.

```text
S241A
→ O3C
→ S239A
→ S242C
→ O4F
→ S243C
```

다음을 모두 요구한다.

- merged commercial source amendment
- exact 상품 feature manifest
- completed `S241A`
- approved `O3C`
- completed `S239A`
- completed `S242C`
- exact-scope approved `O4F`
- first paid canary only within authorized `S243C`
- current-version Golden 3
- 실무 deterministic Gold 100%
- Law fail-closed 100%
- severe misfeedback 0
- A/B account denial과 raw leak 0
- false success/mastery/usage commit 0
- production auth path
- checkout→webhook→entitlement→quota→cancel→refund replay E2E
- terms, privacy, AI 고지, refund, VAT/세무
- export/delete
- cost cap과 kill switch
- production runtime acceptance

초기 상한:

- 동시 유효 paid entitlement 최대 3
- 누적 canary paid account 최대 5명
- 자동갱신 없음

상한 해제 전:

- 최소 14일
- paid entitlement 3개 이상
- external usable result 30+
- usable result success 90%+
- review→rewrite 50%+
- 사용자당 support 주 20분 이하를 연속 2개 rolling window에서 통과
- raw leak, unsupported Law, duplicate charge, refund mismatch,
  severity-1 misfeedback 0

20~30명 formal Wave는 개발 acceptance의 선행조건이 아니다. 그러나
외부 사용성과 가격 evidence 자체가 사라지는 것도 아니다.

---

## 12. 실행 로드맵

### 12.1 작성 시점 expected critical path

아래는 2026-07-27 관측 authority를 요약한 전략 projection이다.
실행 시점의 canonical path라고 주장하지 않으며, live roadmap과
applicable dated Owner decisions를 다시 읽는다.

```text
#662 terminal merge
├─→ O3A Golden 3 rights/source/version decision
└─→ O4V private-plane binding
    → S236P synthetic private-plane acceptance
O3A + S236P
→ S236A Owner-Private Golden 3
→ S237A Study OS Core
→ S237P Native Full-Day
→ O4A Owner-only activation
→ S238A Native baseline dogfood
→ S240A Native extended dogfood
→ S241A Owner-Private Authenticated Acceptance
```

OR-Tools는 별도 optional path이며 native path를 막지 않는다.

### 12.2 마스터플랜 소스 반영

PR #662 병합 뒤 첫 별도 docs-only Work:

- exact one new file
- non-authoritative strategy
- WIP 1
- runtime·contract·roadmap mutation 0
- Draft PR
- auto-merge OFF

### 12.3 S237A learning source amendment

S236A completion과 live roadmap authorization 뒤 별도 PR에서만 다음
계약을 operative하게 만든다.

| 내부 slice | 산출물 |
| --- | --- |
| S237A.0 | runtime·schema·RLS·flag 재조사 |
| S237A.1 | Ledger lineage·revision·autosave |
| S237A.2 | ExplanationPacket + 완전한 KeyConceptV2 |
| S237A.3 | 68/32 Workbench + 여섯 bounded probe |
| S237A.4 | PracticalDecisionPath + ContrastSet + gap/repair |
| S237A.5 | D+1/D+7 + timed qualification contract |
| S237A.6 | search/resume/offline/conflict |
| S237A.7 | exact-head integrated Owner acceptance |

`timed_full_solution` runtime은 독립된 첫 결제 gate도, 더 빠른
상용화 경로도 아니다. 계약과 future-safe state를 정의하되 외부
결제는 `S241A → O3C → S239A → S242C → O4F`를 선행 통과한 뒤
승인된 `S243C` 안에서만 실행한다.

### 12.4 commercial source amendment

학습 계약 PR에 가격·billing을 섞지 않는다.

별도 commercial amendment가 다음을 정한다.

- 어떤 offer hypothesis를 선택할지
- exact feature manifest
- unit 범위와 probe 원가
- VAT, 기간, 환불
- entitlement cap
- WTP evidence schema
- cost gate
- activation dependency
- kill switch와 rollback

이 amendment와 그 commercial packet은 offer 세부를 정할 뿐 외부
결제나 계정을 열지 못하며, generic Owner 승인과 함께 있어도
canonical gate를 대체하지 않는다.

### 12.5 외부 상용화 기본 경로와 비실행 대안

현재 controlling path:

```text
S241A
→ O3C
→ S239A
→ S242C
→ O4F
→ S243C
```

`S239A`는 External-Readiness Second-Round Golden 9,
`S242C`는 Invitation-Only External Commercial Beta Core Readiness,
`O4F`는 exact Owner External Commercial Beta Activation Approval,
`S243C`는 첫 external paid Wave A다.

현재 승인된 더 빠른 Starter bridge는 없다. `S236A`, `S237A`,
`O4A`, Owner dogfood와 Owner Early Value는 외부 readiness나 상용화
gate를 대체하지 않는다.

미래의 더 짧은 경로는 새로 merge된 explicit dated Owner decision이
`S241A`, `O3C`, `S239A`, `S242C`, `O4F`를 포함해 자신이
supersede하는 모든 exact gate와 dependency edge를 이름으로 명시한
뒤에만 재검토할 수 있다. 그 뒤에도 canonical Markdown, 그
machine-readable mirror와 live roadmap을 별도 승인된 Work에서
reconcile해야 한다. 그 모든 절차가 끝나기 전 alternate bridge는
non-executable이며, external account, invitation, payment, price
activation, refund, entitlement와 Production은 OFF다.

### 12.6 1차·동차·Academy

2차 Kernel을 재사용하되 acceptance와 state를 분리한다.

- 1차: official seed, rapid grid, five-choice correction,
  K/C/A/R/T/G, timed/OMR/held-out
- 동차: first/second state 분리, bridge concept, 시험 전후 phase 전환
- Academy: named partner, tenant RLS, AI draft→instructor approval→rewrite

2차 Owner critical path를 늦추는 shared schema·RLS mutation은
직렬화한다.

---

## 13. 바로 다음 Work

### 13.1 PR #662가 열려 있으면

새 PR, branch, issue 또는 source mutation을 시작하지 않는다.

1. PR #662의 exact live head와 manifest 확인
2. Draft/Ready/review/check 상태 확인
3. actionable P0/P1/P2가 있으면 좁게 fail-closed
4. terminal evidence 뒤 explicit squash merge
5. post-merge main과 #660 상태 재확인

### 13.2 #662 terminal merge 직후

첫 새 mutation Work는 이 문서 하나를 별도 docs-only Draft PR로
추가하는 일이다. 그것이 끝난 뒤 live roadmap의 next ready slice를
선택한다.

### 13.3 작성 시점 expected next sequence

이 순서는 live authority가 바뀌면 폐기하고 재계산한다.

1. O3A와 O4V decision packet
2. O4V 승인 뒤 S236P synthetic provisioning
3. O3A + S236P 뒤 S236A Golden 3
4. S237A learning contract와 vertical slice
5. S237P native planner
6. O4A 뒤 Owner dogfood
7. 외부 상용화는
   `S241A → O3C → S239A → S242C → O4F → S243C`

OR-Tools를 이 사이 critical path에 끼우지 않는다.

---

## 14. Acceptance matrix

### 14.1 학습 계약

| 영역 | 통과 기준 | Fail-closed |
| --- | --- | --- |
| KeyConcept | 필수 8영역과 claimRefs | 근거 없는 field는 blocked |
| Probe | closed enum·exact basis·version | mismatch·stale·교차계정 hit 0 |
| Practical | 방법 결정과 CalculationGraph | 무근거 방법·숫자 conflict 차단 |
| Contrast | 네 사례의 rights/source/validator 상태 | 생성 사례를 verified로 승격 금지 |
| Guided | reveal 전 exposure commit | commit 실패 시 full solution 반환 금지 |
| Mastery | view/save로 mastery 0, D+1 최대 recovering | verified D+7 전 stable 금지 |
| Timed | no-reveal·timer·exposure·실패상태 보존 | proof 손실 시 독립 evidence 제외 |
| Learner caveat | 기존 release key `learning_reference_not_official_answer`와 §4.1의 exact Korean copy를 `learning_reference_not_official_answer_or_grading_criteria` / `ko-KR.v1` presenter tuple로 one-way trusted mapping; desktop/mobile에서 heading 인접 또는 바로 아래, full packet body 전, first render/reopen과 normal DOM·screen-reader 순서 | upstream key, field·kind·version 또는 copy registry missing/unknown/mismatch면 generated reference-answer/explanation body release·render 차단 |

### 14.2 과목 품질

- 실무 숫자·단위·부호·반올림 Golden 100%
- AI 중간값과 deterministic 최종값 불일치 0
- 이론 unsupported fact의 verified 승격 0
- 법규 unknown/conflict/unbound/stale 기준안 release 0

### 14.3 privacy와 runtime

- raw body leak 0
- A/B·tenant cross-access 0
- probe free text analytics 0
- failed operation false success/mastery/usage commit 0
- stale propagation 누락 0
- export/delete/rollback 안전
- keyboard, screen reader, 200% reflow
- Axe serious/critical 0

### 14.4 가격

| 항목 | 통과 |
| --- | --- |
| offer | exact 가격·VAT·기간·unit·feature manifest |
| WTP | 같은 offer별 실제 purchase/paid reservation/decline |
| 원가 | route/version별 p50/p95와 support 포함 margin |
| 상업 | refund·entitlement·quota·kill switch·rollback |
| 표현 | price signal과 market validation 분리 |

하나라도 미정이면 checkout을 열지 않는다.

---

## 15. Definition of Done

### 15.1 2차 Owner 제품

- 세 과목 실제 사용
- attempt_first/guided_study 분리
- Explanation Workbench
- 완전한 KeyConceptV2
- 여섯 bounded probe
- PracticalDecisionPath
- ContrastSet
- claim-level Trust
- biggest gap 또는 무도움 재현 목표 하나
- rewrite/recalculate
- D+1/D+7
- timed full solution
- Ledger/search/resume
- Native Full-Day 30..720
- hard violation, raw leak, false mastery 0

### 15.2 사업

- 실제 제공 기능만 말함
- exact offer별 가격 evidence
- cost/support/refund/entitlement 안전
- Owner와 external evidence 분리
- 효능 수준에 맞는 claim
- generic AI가 아닌 검증·계보·전이에 가격을 붙임

---

## 16. 최종 원칙

1. AI 풀이를 잘 보여주는 데서 끝내지 않고, 다음 문제를 AI 없이 더
   잘 풀게 만든다.
2. 사용자가 지금 쓰는 “왜·그림·비교·체계·조건변화·계산기” 공부법을
   보존하되, 앞에는 독립 시도, 뒤에는 백지 재현과 지연 전이를 붙인다.
3. 오늘의 핵심은 최대 3개지만 실제 하루 공부는 가용시간 안의
   0..N개 실행 블록으로 운영한다.
4. 무엇을 공부할지는 native evidence policy가 정하고, OR-Tools는
   선택된 일을 시간 안에 배치하는 데만 쓴다.
5. Owner 한 명의 실제 사용은 제품을 강하게 만들 수 있지만 시장,
   외부 사용성, 가격 또는 효능을 대신 증명하지 않는다.
6. 가격은 싸게 시작해 고정하지도, 근거 없이 비싸게 확정하지도
   않는다. Exact offer별 실제 결제 결정으로 순차적으로 올린다.

---

## 17. 참고

- [Q-Net 감정평가사 자격상세정보](https://www.q-net.or.kr/crf005.do?gId=60&gSite=L&id=crf00503)
- [콴다 공식 요금 안내](https://qanda.ai/ko)
- [Google AI 요금제](https://one.google.com/intl/ko_kr/about/google-ai-plans/)
- [박문각 감정평가사 상품 예시](https://mall.pmg.co.kr/user/ap/lecture/lecture_detail.asp?CrsCode=010220260036M&OpenCrsCode=010220260091O)
- [Google OR-Tools CP-SAT](https://developers.google.com/optimization/cp/cp_solver)
- [1EdTech QTI 3](https://www.1edtech.org/standards/qti/index)
- [NIST AI RMF Generative AI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)
- [PR #662](https://github.com/chachathecat/inverge/pull/662)
