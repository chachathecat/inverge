---
document_title: "답안길 / Professional Exam Reasoning OS 통합 마스터플랜 v7"
document_subtitle: "구조화된 사고 강제 튜터·시험 컴파일러·독립 전이·개인 약점 지도"
status: "owner-strategy/non-authoritative"
dated: "2026-07-28 KST"
repository: "chachathecat/inverge"
production_authorization: "none"
platform_architecture:
  internal_platform: "Professional Exam Reasoning OS"
  first_certification_vertical: "Dabangil Appraiser Second"
  expansion_rule: "vertical-first, adapter-gated, evidence-promoted"
current_learner_facing_scope: "Dabangil Appraiser Second three subjects only"
expansion_candidate_status: "internal contract candidate only until separately authorized"
guided_study_runtime_authorization: "none"
supersedes_for_strategy_only:
  - "dabangil-master-plan-v6-study-method-pricing-2026-07-27"
  - "dabangil-master-plan-v6-1-study-method-pricing-weakness-map-2026-07-27"
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

# 답안길 / Professional Exam Reasoning OS 통합 마스터플랜 v7

## Internal vertical-first, kernel-driven Professional Exam Coaching Platform

이 문서는 답안길의 감정평가사 2차 제품을 버리고 범용 서비스를 새로
만들자는 문서가 아니다.

> **답안길 감정평가사 2차를 첫 번째 완성 vertical로 유지하면서, 그 안의
> 검증 가능한 학습 원리를 범용 `Professional Exam Reasoning OS` 커널로
> 분리해 다른 전문직 시험을 안전하게 컴파일할 수 있게 만드는 전략**이다.

이 문서는 비권위 Owner 전략 문서다. 이 문서만으로 다음을 승인하지
않는다.

- runtime, schema, migration, RLS, dependency 또는 provider 변경
- 실제 Golden/private learner content 처리
- Owner 또는 외부 계정 activation
- 결제, entitlement, checkout, refund 또는 가격표 변경
- Production 배포, 공개 판매, 광고 또는 효능 주장
- 새 시험 adapter의 learner-facing 공개
- OR-Tools, ts-fsrs, pyBKT, IRT, QTI, xAPI 또는 Cytoscape.js 설치·활성
- online reinforcement learning, 자동 model fine-tuning 또는 learner-facing
  합격확률

실제 구현은 live authority가 허용하는 별도 Work, exact scope, test,
review와 명시적 Owner 승인으로 수행한다.

---

## 읽는 순서

- 한 페이지 결론과 무엇이 달라지는가: 0~2
- 범용 사고 커널과 구조화된 튜터: 3~6
- 시험을 추가하는 compiler/adapter와 측정 체계: 7~8
- 감정평가사 2차 vertical의 보존된 상세 계약: 9~17
- 다른 전문직 시험 확장·기술·평가·UX: 18~21
- 실제 실행 순서와 acceptance: 22~25
- 최종 원칙과 참고: 26~27

---

## 0. 한 페이지 결론

### 0.1 최종 제품 정의

답안길의 목표는 AI가 답을 대신 잘 쓰는 것이 아니다.

> **감정평가사 2차 사용자가 AI 없이 처음 보는 문제를 제한시간 안에 더
> 정확하게 해결하도록, 관찰 가능한 사고 행동을 순서대로 요구하고,
> 필요한 만큼만 돕고, 지연된 독립 전이로 실제 학습을 검증하는 코칭
> OS**다.

내부 플랫폼 후보 이름은 `Professional Exam Reasoning OS`다. 현재
learner-facing 제품은 **감정평가사 2차 세 과목의 답안길 하나뿐**이다.
아래 확장 항목은 제품, 브랜드, route, navigation, pricing 또는 learner
promise가 아니라 별도 승인을 기다리는 내부 contract candidate다.

```text
Professional Exam Reasoning OS — internal platform candidate
├─ Universal Reasoning Kernel
├─ Structured Tutor Protocol
├─ Exam Compiler + Adapter SDK
├─ Learner Evidence / Weakness / Intervention Engine
├─ Measurement & Evaluation Platform
└─ Current learner product projection
   └─ 답안길 감정평가사 2차        ← 유일한 learner-facing scope

Internal non-product contract candidates — all OFF
├─ candidate/appraiser-first
├─ candidate/both-track
├─ candidate/academy
└─ candidate/future-profession
```

후보 이름을 learner-facing `답안길` vertical로 선점하지 않는다. 각 후보는
해당 live roadmap 의존성, exact dated Owner scope decision, canonical
Markdown와 machine-readable mirror reconciliation을 모두 통과하기 전까지
internal-only이며 구현·노출·판매할 수 없다.

### 0.2 “사고를 강제한다”의 정확한 뜻

시스템은 사람 머릿속의 사적 사고를 완벽히 읽거나 강제할 수 없다. 대신
시험 성공에 필요한 **외현화 가능한 최소 사고 산출물**과 순서를 강제할
수 있다.

- 문제 요구를 먼저 식별한다.
- 답, 목차, 방법 또는 첫 계산 방향을 feedback 전에 commit한다.
- learner confidence를 feedback 전에 immutable하게 기록한다.
- AI는 최소 힌트부터 단계적으로 제공한다.
- full solution을 보면 독립 수행 자격을 잃었다는 사실을 숨기지 않는다.
- 사용자가 직접 재작성·재계산·재설명한다.
- near-miss, 반례, 조건 변화로 경계를 구별한다.
- 다른 verified variant를 D+7 이상 AI 도움 없이 풀어야 stable 후보가 된다.
- 제한시간 전체 문제에서 통합 수행을 다시 검증한다.

자유형 장문 “생각 과정”을 강제로 수집하지 않는다. 그것은 진짜 이해의
보증도 아니고 privacy·허위 서술·인지부하 위험을 만든다. 대신 adapter가
요구하는 bounded artifact를 수집한다.

```text
요구 동사 / 목표
→ 관련 사실·자료
→ 적용할 규칙·개념
→ 방법 선택과 배제 이유
→ 적용·계산·논증
→ 결론 또는 출력
→ 검산·반례·시간 확인
```

### 0.3 최종 학습 loop

```text
source/rights/version 확인
→ ORIENT: 문제 요구와 제약 식별
→ COMMIT: 답·방법·목차·confidence 선제 제출
→ ATTEMPT: 무도움 수행
→ DIAGNOSE: 오류 원인과 uncertainty 판정
→ SCAFFOLD: 최소 필요 힌트
→ RECONSTRUCT: 사용자가 원리·절차를 다시 설명
→ REPAIR: 다시 쓰기·계산하기·말하기
→ CONTRAST: near-miss·반례·조건 뒤집기
→ VERIFY: deterministic/rubric/source 검증
→ TRANSFER: 미사용 verified variant 무도움 수행
→ RETAIN: D+1·D+7·D+30
→ INTEGRATE: timed set/full solution/mock
→ SCHEDULE: 다음 최적 행동 1개, Today 최대 3개
```

### 0.4 v7이 v6.1에 추가하는 핵심

v6.1의 강점은 그대로 보존한다.

- `KeyConceptV2`
- 여섯 bounded explanation probe
- `PracticalDecisionPathV1`
- `ContrastSetV1`
- `timed_full_solution`
- 규칙 기반 `PersonalWeaknessMapV1`
- D+1/D+7, Trust, privacy, Owner/external evidence 분리
- pyBKT benchmark/shadow gate, OR-Tools optional boundary
- 39,000/49,000/89,000원 비운영 가격 가설

v7은 그 위에 다음을 새로 고정한다.

1. `ProfessionalExamReasoningKernelV1`
2. `TutorEpisodeStateMachineV1`
3. `ObservableReasoningArtifactV1`
4. `ProductiveStruggleBudgetV1`
5. `ScaffoldLadderV1`과 `AnswerRevealPolicyV1`
6. `DiagnosticCauseTaxonomyV1`
7. `InterventionPolicyV1`과 next-best-action objective
8. `ExamPackageManifestV1`과 Exam Compiler
9. 객관식·계산·법률·논술·구술·simulation modality adapter
10. Learning Lane과 Measurement Lane의 물리적 분리
11. assistance dependence·confidence calibration·far transfer 측정
12. `ReadinessEvidenceEnvelopeV1`과 learner-facing 합격확률 금지선
13. state→intervention→delayed outcome을 축적하는 Intervention Outcome Graph
14. cross-exam adapter isolation, promotion, rollback과 certification gate
15. 범용 커널을 현재 감정평가사 2차 critical path보다 먼저 과대 추상화하지
    않는 vertical-first 실행 원칙
16. exact learner-visible `LearnerReferenceCaveatV1`과 body-before placement gate
17. 독립 후보군·과목 validator·critic review·합의/충돌 해결·최종 release
    gate를 통과한 upstream `ReferenceAnswerReleaseArtifact`와의 exact binding
18. 외부 상용화의 현재 canonical path
    `S241A → O3C → S239A → S242C → O4F → S243C` 보존
19. Shared Signal 첫 write와 exact O2·consent authorization generation,
    reconstructiveness reservation/ledger를 하나의 linearizable commit
    boundary로 묶는 vault-only `VaultSharedSignalCommitGrantV2`
20. 이미 저장된 Shared Signal row부터 cache·materialization·dataset·
    Model/Eval descendant까지 철회가 전파되는 vault-only downstream
    lineage와 fail-conservative tombstone/quarantine
21. guided runtime과 분리된 learner-confirmed
    `confirmed_pre_attempt_learning_reveal` Learning Lane override
22. 기존 `LearningGapRecord`와
    `s216.error_notebook_gap_taxonomy.v1`을 유일한 metadata authority로
    사용하는 다섯 필드 learner-visible automatic error-note projection
23. self-containing envelope를 hash하지 않는 closed
    `SharedSignalExportBatchDigestPayloadV2`, versioned RFC 8785 payload
    digest와 vault-only final-envelope commitment
24. shadow와 intervention outcome이 함께 사용하는 하나의 immutable
    `SharedSignalExportValueRegistryV1`, closed value/opaque-ID/numeric
    domain과 common `SharedSignalExportBatchV2` profile
25. exact candidate payload와 prior/split/concurrent/cross-schema release
    composition을 함께 평가하고 single-use grant에 bind하는 vault-only
    reconstructiveness assessment·reservation·ledger gateway

### 0.5 제품 최적화 목적함수

제품은 사용시간, 대화량, AI 답안 품질 또는 assisted score를 최대화하지
않는다.

```text
Primary objective:
expected unassisted held-out transfer gain
────────────────────────────────────────────
effective learner minutes + fatigue cost + error risk
```

실제 정책에서는 다음을 함께 고려한다.

- 시험 중요도와 과락 위험
- current evidence의 신뢰도와 충분성
- 지연 망각 위험
- error recurrence
- assistance dependence
- transfer 가능성
- 예상 교정시간
- 법령·기준·source effective version
- learner 가용시간과 피로
- privacy·rights·cost eligibility

모델이 이 값을 직접 지어내지 않는다. 초기에는 versioned deterministic
rule baseline으로 고르고, adaptive policy는 별도 shadow 평가 뒤에만 후보가
된다.

### 0.6 절대 불변식

1. AI output 열람은 mastery가 아니다.
2. full solution을 본 성공은 독립 성공이 아니다.
3. 같은 문제·same-surface retry는 transfer가 아니다.
4. stable은 지연된 미사용 verified variant의 무도움 성공 없이는 부여하지
   않는다.
5. source·rights·effective version이 닫히지 않은 결과를 verified로
   release하지 않는다.
6. 모델은 qualification, outcome, verified, mastery 또는 pass readiness를
   자기 선언하지 못한다.
7. client는 tutor state, assistance, exposure, timer 또는 confidence를
   위조하지 못한다.
8. learner raw body를 shared graph, analytics, shadow dataset 또는 cross-exam
   training으로 자동 승격하지 않는다.
9. 새 시험은 prompt만 바꿔 출시하지 않는다. signed adapter package와
   certification gate를 통과한다.
10. 무엇을 공부할지는 evidence policy가 정하고, FSRS/OR-Tools는 허용된
    후보의 시점·배치만 보조한다.
11. 학습 효과는 unassisted held-out outcome으로 평가한다.
12. Owner dogfood는 제품을 강하게 만들 수 있지만 외부 효능·시장·가격을
    증명하지 않는다.

### 0.7 현재 PR #667 처리 결론

2026-07-28 KST의 exact head
`7a529a728f5690e9e2349d16e8c814213e3a93da`에 대한 fresh exact-head
review는 terminal `COMMENTED`였지만 clean하지 않았고,
`P0/P1/P2 = 0/0/2`의 신규 finding 두 건을 만들었다. PR #667은 계속
Draft다.

이 corrective는 그 두 건만 live source-of-truth에 맞춘 하나의 coherent
release contract다.

1. shadow observation과 intervention outcome의 exported/shared semantic
   value를 exact O2 purpose·approval class·horizon에 scoped된 하나의
   immutable `SharedSignalExportValueRegistryV1`에서 value-by-value
   resolve한다. bucket, adapter, taxonomy/mapping/label, skill, 모든
   policy/version ref, opaque ID와 bounded number를 닫고 exact timestamp,
   free text, custom/unknown/cross-version value를 거부한다.
2. real-learner Shared Signal writer를 common
   `SharedSignalExportBatchV2` gateway 하나로 통합하고, exact candidate
   payload와 completed envelope를 current visible population, prior
   irreversible disclosure history, split/retry release와 모든 concurrent
   prepared reservation에 대해 fail-closed reconstructiveness 평가한다.
3. current `pass`, authority-selected joinability component,
   composition-ledger generation과 reservation을 single-use grant에 묶고,
   first/all row write에서 grant/reservation consume, disclosure append,
   rows, lineage와 idempotent result를 하나의 CAS linearization으로
   commit한다. revocation은 disclosure budget을 되돌리지 않으며 residual
   surface를 recertify하거나 all-consumer deny한다.

허용 범위는 기존 v7 경로 한 파일의 sole-child docs-only corrective다.
Ready, merge, auto-merge, runtime/schema/RLS, canonical contract, roadmap,
billing, activation, 다른 시험 또는 후속 Work는 이 corrective가 승인하지
않는다. 이 문서의 confirmed reveal은 guided-study runtime이나 mastery를
활성화하지 않는다. 특히 product-signal consent나 O2는 fitting 권한이 아니며,
`offline_model_training` exact-purpose consent와 별도 future exact-scope
O5 없이 learner-derived fitting·training·refit·parameter update·dataset
refresh를 수행하지 않는다.

---

## 1. 작성 시점 live checkpoint와 현재 금지선

2026-07-28 fresh exact-head review fail-closed terminal report 기준
read-only 관측:

| 대상 | 관측 상태 |
| --- | --- |
| `main` | `a454c5154df23e66f7a7434cec5b60ff8bd76c1f` |
| `main` tree | `2403f1f90de0fd8260fdd7485eee9b726cc0471c` |
| PR #662 | terminal squash-merged |
| PR #662 final corrected tree | `2403f1f90de0fd8260fdd7485eee9b726cc0471c` |
| PR #667 | open Draft, mergeable, unmerged, unlocked, auto-merge OFF |
| PR #667 corrective parent head | `7a529a728f5690e9e2349d16e8c814213e3a93da` |
| PR #667 corrective parent tree | `0cd6ea96e83d24ffa30a76a18b9bab3db1551a7a` |
| PR #667 corrective parent sole parent | `afc229bbac57fb282fd1ce66f6cae145613d8089` |
| PR #667 branch | `agent/dabangil-master-plan-v6-strategy` |
| PR #667 corrective parent aggregate | v7 단일 added file, `+5804/-0`, main보다 8 commits ahead / 0 behind |
| corrective parent artifact | SHA-256 `ac9e081f618c87541dab225693ae1646c966a0672e64e1bbbe5f6d2d56e636ae`, 230,189 bytes, 5,804 lines, blob `621cdf825d908852c3adbe7956ef9da700e8d835` |
| required corrective-parent checks | PR Contract 516, Risk Gate 516, Runtime Gate 516, Fast CI 643, Full CI 516, Learner Loop Health 1027, Vercel 7/7 success |
| resolved findings | known thread 20개 중 prior 18개 resolved |
| fresh exact-head review | `7a529a728f…`, terminal `COMMENTED`, `P0/P1/P2 = 0/0/2` |
| exact unresolved findings | Shared Signal value-domain closure P2 + reconstructiveness/composition gate P2 |
| PR #660 | open Draft at historical observation `4c5694e4c65a110aede39762421abb49afd653f5` |
| public/billing/external learner | OFF |

위 값은 expected historical observation일 뿐 mutation 입력이 아니다. 모든
Work는 GitHub, `AGENTS.md`, dated Owner decisions, canonical Markdown와
machine-readable contracts, `roadmap/active-program.yml`, locks, CI, reviews와
exact auto-merge state를 다시 읽는다.

### 1.1 corrected v6, v6.1 candidate와 v7을 동시에 남기지 않는다

전략 원장은 하나여야 한다.

- main에는 corrected v6도 v6.1도 v7도 없다.
- PR #667 parent에는 v7 경로 하나만 aggregate에 있다.
- 첨부 v6.1은 repository source가 아니다.
- v7이 v6·v6.1의 전략상 내용과 PR #667 corrective에서 확정된 caveat,
  canonical commercial path 및 새 release-artifact binding을 모두 승계한다.

따라서 corrective aggregate는 정확히 v7 단일 added file이어야 한다.
corrected v6, v6.1, installer prompt 또는 이 Work prompt를 repository 전략
문서로 동시에 추가하지 않는다.

### 1.2 현재 금지선

이 전략 교정과 이후 구현을 섞지 않는다.

- PR #667: docs-only strategy correction
- learning authority amendment: 별도 Work
- runtime/schema/RLS: 별도 Work
- model/dependency installation: 별도 Work
- commercial/billing: 별도 Work
- Owner activation: 별도 Work
- external canary: 별도 Work
- 다른 전문직 adapter: 감정평가사 2차 acceptance 뒤 별도 Work

---

## 2. 왜 범용 챗봇이 아니라 구조화된 Tutor OS인가

### 2.1 task performance와 learning은 분리한다

연습 중 AI가 답을 만들어 성적을 올리는 것과, AI가 사라진 시험장에서
사용자가 혼자 푸는 능력은 다르다.

2025년 고교 수학 대규모 무작위 실험에서는 일반적인 GPT형 도구가 연습
성능을 높였지만 AI를 제거한 시험 성적은 control보다 낮아질 수 있었고,
교사가 설계한 힌트와 answer-withholding guardrail이 그 손상을 크게
완화했다. 따라서 답안길의 primary metric은 assisted correctness가 아니라
unassisted exam-like performance다.

2025년 Harvard 물리 수업 RCT의 custom tutor도 system prompt만으로는
복수 단계 문제를 안정적인 순서로 scaffold하지 못해, 플랫폼이 각 단계를
순차적으로 통제했다. 즉 “좋은 tutor가 되어라”라는 prompt보다 state
machine과 problem-specific structure가 중요하다.

OECD Digital Education Outlook 2026도 범용 GenAI가 task performance를
높여도 자동으로 학습으로 이어지지 않으며, 명확한 교육 원리와 curriculum
alignment가 필요하다고 정리한다. 2026년 OECD 고등교육 정책 문서 역시
reliability, data protection, skill development와 pilot evaluation을 함께
요구한다.

Tutor CoPilot RCT에서는 AI가 답을 대신 주는 것보다 사람 tutor에게 guiding
question과 pedagogical strategy를 제시했을 때 mastery가 개선되었다. 답안길도
모델의 지식을 전면에 내세우기보다 **좋은 질문, 최소 scaffold, learner의
재수행**을 전면에 둔다.

다만 이 연구들은 물리·수학·학교 tutoring 중심이며 한국 전문직 시험의
장기 합격률을 직접 증명하지 않는다. v7은 그 결과를 **설계 원리의 근거**로
사용할 뿐, 답안길의 효능 주장은 감정평가사·각 신규 adapter에서 별도의
unassisted held-out 및 전향적 external evidence로 검증한다.

### 2.2 연구 근거를 제품 요구사항으로 번역한다

| 관찰 | v7 설계 요구 |
| --- | --- |
| 범용 AI는 assisted task를 대신할 수 있음 | COMMIT 전 full answer 차단 |
| prompt만으로 순차 scaffold가 흔들림 | server-enforced tutor FSM |
| 학생은 copying이 학습을 해친다는 것을 체감하지 못할 수 있음 | pre-feedback confidence와 delayed test |
| 정답을 주지 않는 hint가 피해를 완화 | bounded scaffold ladder |
| 고품질 tutor는 guiding question을 사용 | diagnostic probe와 learner reconstruction |
| 과목마다 오류·채점 구조가 다름 | Exam Compiler와 modality adapter |
| AI가 항상 정확하지 않음 | source registry, deterministic validator, verifier |
| learning gain은 즉시 만족도와 다름 | D+1/D+7/D+30/held-out metric |

### 2.3 v7의 비목표

- 인간의 내적 chain-of-thought를 감시하는 제품
- 답을 절대 보여주지 않아 사용자를 가두는 제품
- 모든 문제에서 긴 설명을 의무 입력하게 하는 제품
- AI가 학생의 성격·지능을 추정하는 제품
- “합격확률 83.7%” 같은 근거 없는 숫자를 파는 제품
- 하나의 거대한 prompt로 모든 시험을 처리하는 wrapper
- 여러 agent가 서로 말하는 것 자체를 가치로 포장하는 system
- 학습량·streak·화려한 graph를 실제 transfer 대신 최적화하는 앱

---

## 3. Professional Exam Reasoning OS 아키텍처

### 3.1 여섯 층

```text
Layer 1  Trust & Authority
         official source · rights · effective version · rubric · validator

Layer 2  Universal Reasoning Kernel
         task decomposition · commitment · attempt · verify · transfer

Layer 3  Structured Tutor Protocol
         state machine · scaffold ladder · reveal/fading policy

Layer 4  Exam Compiler & Adapter SDK
         blueprint · skill graph · item family · modality · measurement

Layer 5  Learner Evidence & Intervention
         mastery · weakness · calibration · assistance dependence · next action

Layer 6  Current Product Projection
         답안길 감정평가사 2차 only

Candidate registry — internal/non-product/OFF
         appraiser-first · both-track · Academy · future professions
```

상위 layer는 하위 layer의 권위를 역전하지 않는다.

- LLM은 source registry를 override하지 못한다.
- adapter는 universal evidence 불변식을 약화하지 못한다.
- product UI는 tutor state를 client에서 재계산하지 않는다.
- adaptive model은 canonical mastery 또는 release gate를 직접 쓰지 못한다.

### 3.2 vertical-first, kernel-driven

범용화를 먼저 끝내고 감정평가사 2차를 나중에 만드는 순서는 금지한다.
그렇게 하면 실제 시험 evidence 없이 추상화만 커진다.

실행 규칙:

1. 감정평가사 2차 vertical에서 실제로 필요한 contract를 먼저 완성한다.
2. 두 개 이상 subject adapter에서 동일하게 검증된 primitive만 universal
   kernel로 승격한다.
3. 시험별 rule, source, rubric와 validator는 adapter에 남긴다.
4. 공통 코드로 승격해도 기존 vertical fixture를 모두 재통과한다.
5. 새 시험은 kernel을 수정하기보다 adapter package를 추가하는 것이
   기본이다.
6. kernel 변경이 필요하면 모든 certified adapter compatibility test를
   통과한다.

### 3.3 제품과 플랫폼의 이름

- `답안길`: 현재 감정평가사 2차 세 과목에만 쓰는 learner-facing brand
- `답안길 감정평가사 2차`: 현재 유일한 learner product projection
- `Professional Exam Reasoning OS`: 내부 platform/kernel 명칭
- `ExamAdapterPackage`: 시험별 versioned package
- `TutorProtocolProfile`: 시험·task type에 맞는 tutor behavior

`candidate/appraiser-first`, `candidate/both-track`, `candidate/academy`와
`candidate/future-profession`은 내부 식별자일 뿐 제품명이나 출시 약속이
아니다. 별도 exact-scope Owner decision 전에는 `답안길 1차`, `답안길
동차`, 다른 전문직용 답안길 같은 learner-facing 이름을 만들거나 route,
navigation, pricing, copy에 노출하지 않는다. 공통 kernel 재사용도 현재
감정평가사 2차 제품 범위를 넓히지 않는다.

### 3.4 공통과 시험별 경계

| 공통 kernel | 시험 adapter |
| --- | --- |
| assistance/exposure/attempt identity | 공식 시험 규칙·시간·배점 |
| tutor episode state machine | 과목·세부 skill taxonomy |
| confidence capture | source hierarchy/effective date |
| scaffold/reveal/fading mechanism | rubric와 accepted answer range |
| repair/D+1/D+7/timed evidence | problem modality와 calculator/tool policy |
| privacy·RLS·idempotency | common traps·misconception taxonomy |
| rule baseline interface | deterministic validators |
| eval and promotion framework | item/variant bank와 rights |

### 3.5 capability maturity

```text
C0  described_only
C1  contract_defined
C2  synthetic_validated
C3  owner_private_validated
C4  limited_external_validated
C5  certified_vertical
C6  cross_vertical_shared
```

- C0/C1 기능을 마케팅하지 않는다.
- 다른 시험에서 재사용 가능하다는 이유만으로 C6가 되지 않는다.
- C6는 적어도 두 certified vertical의 같은 invariant와 regression fixture를
  통과해야 한다.

---

## 4. Universal Reasoning Kernel

### 4.1 kernel 목적

`ProfessionalExamReasoningKernelV1`은 과목 내용을 답하는 모델이 아니다.
전문직 문제를 해결할 때 필요한 공통 행위를 versioned artifact와 state로
만드는 orchestration kernel이다.

```ts
type ReasoningPrimitiveKindV1 =
  | "parse_demand"
  | "extract_relevant_facts"
  | "retrieve_rule_or_concept"
  | "classify_pattern"
  | "select_method"
  | "sequence_steps"
  | "apply_rule_or_formula"
  | "compute"
  | "construct_response"
  | "compare_alternatives"
  | "test_boundary_or_counterexample"
  | "verify_result"
  | "allocate_time";
```

모든 문제에 모든 primitive를 강요하지 않는다. adapter의
`ReasoningTaskProfileV1`이 필요한 subset, 순서, input 형식과 success
criteria를 닫는다.

### 4.2 task profile

```ts
type ReasoningTaskProfileV1 = {
  id: string;
  examAdapterRef: string;
  taskTypeRef: string;
  profileVersion: string;
  requiredPrimitives: ReasoningPrimitiveKindV1[];
  optionalPrimitives: ReasoningPrimitiveKindV1[];
  transitionGraphRef: string;
  artifactSchemaRefs: string[];
  productiveStrugglePolicyRef: string;
  scaffoldPolicyRef: string;
  revealPolicyRef: string;
  verificationPolicyRef: string;
  measurementPolicyRef: string;
  accessibilityProfileRef: string;
  sourceBundleChecksum: string;
  basisChecksum: string;
};
```

### 4.3 observable reasoning artifact

내적 chain-of-thought 대신 시험 수행에 직접 필요한 bounded artifact를
저장한다.

```ts
type ObservableReasoningArtifactKindV1 =
  | "demand_parse"
  | "fact_map"
  | "rule_or_concept_selection"
  | "method_selection"
  | "outline_or_plan"
  | "calculation_structure"
  | "application_map"
  | "provisional_answer"
  | "verification_check"
  | "time_allocation";

type ObservableReasoningArtifactV1 = {
  id: string;
  learnerScopeRef: string;
  tutorEpisodeRef: string;
  taskProfileRef: string;
  kind: ObservableReasoningArtifactKindV1;
  schemaVersion: string;
  structuredValueRef: string;
  answerAnchorRefs: string[];
  createdBeforeFeedback: boolean;
  assistanceSnapshotRef: string;
  sourceRevisionChecksum: string;
  artifactChecksum: string;
  status: "usable" | "incomplete" | "invalid" | "stale";
};
```

불변식:

- `structuredValueRef`는 allowlisted closed schema 또는 learner-private body
  reference다.
- raw free text를 analytics, graph label 또는 cross-learner corpus에 복제하지
  않는다.
- feedback 뒤 작성된 artifact를 pre-feedback commitment로 바꾸지 않는다.
- adapter가 요구하지 않는 장문 설명을 강제하지 않는다.
- voice, handwriting, keyboard, selection UI 등 접근 가능한 대체 입력은 같은
  semantic schema로 정규화한다.

### 4.4 commitment

```ts
type CommitmentKindV1 =
  | "answer_choice"
  | "numeric_direction"
  | "method_choice"
  | "issue_list"
  | "outline"
  | "thesis"
  | "oral_structure"
  | "cannot_start";

type LearnerCommitmentV1 = {
  id: string;
  learnerScopeRef: string;
  tutorEpisodeRef: string;
  kind: CommitmentKindV1;
  artifactRefs: string[];
  preFeedbackConfidenceBand:
    | "not_captured"
    | "low"
    | "medium"
    | "high";
  confidenceEvidenceRef?: string;
  committedAt: string;
  assistanceSnapshotRef: string;
  exposureSnapshotRef: string;
  immutableCommitmentKey: string;
};
```

`cannot_start`도 유효한 진단이다. 이 경우 AI가 답부터 보여주지 않고,
adapter가 허용하는 가장 작은 orientation 또는 retrieval cue를 제공한다.

### 4.5 kernel output

kernel의 primary output은 긴 AI 설명이 아니다.

```ts
type KernelDecisionV1 = {
  tutorEpisodeRef: string;
  currentState: TutorEpisodeStateV1;
  requiredLearnerActionRef?: string;
  allowedAssistanceKinds: AssistanceKindV1[];
  answerRevealAllowed: boolean;
  releaseableOutputRefs: string[];
  evidenceEffectsRef: string;
  nextTransitionCandidates: string[];
  decisionPolicyVersion: string;
  decisionBasisChecksum: string;
};
```

모델은 후보 설명·진단·힌트를 만들 수 있지만, `KernelDecisionV1`은 trusted
server가 state, policy, evidence와 authority를 보고 계산한다.

---

## 5. Structured Tutor Protocol

### 5.0 현재 authority overlay

이 절의 `guided_study`, `guided_exit`, `guided_reference`와 관련 transition은
미래 호환을 위한 **contract/test vocabulary일 뿐 현재 learner runtime이
아니다**. 현재 authority는 guided-study runtime을 명시적으로 승인하지
않는다.

- S237A가 live dependency를 충족해 시작되더라도 source amendment와
  `attempt_first` runtime 범위만으로 guided path를 활성화할 수 없다.
- 현재 authority 아래의 구현 범위는 guided mode selector, guided
  route/API, guided `ExecutionBlock`, guided event persistence 또는 guided
  scheduling을 추가·수락할 수 없고 authority gate에서 fail closed해야
  한다. 이 strategy 문서는 deployed enforcement evidence를 주장하지 않는다.
- contract fixture는 비작동 schema semantics를 검증할 수 있지만 learner
  account에 episode/event/credit/mastery를 만들지 않는다.
- learner-facing guided runtime은 현재 제한을 exact하게 supersede하는
  별도 dated Owner decision, canonical Markdown와 machine-readable mirror,
  roadmap reconciliation, 필요한 runtime/schema/RLS/flag 검증과 exact O4
  activation을 모두 요구한다.

뒤 절의 “선택한다”, “보여준다”, “예약한다”는 guided symbol에 대해서는
그 미래 승인 뒤의 contract semantics로만 읽는다. 이 overlay가 충돌하는
문장보다 우선한다.

### 5.1 tutor episode state machine

```ts
type TutorEpisodeStateV1 =
  | "intake"
  | "orient"
  | "commit"
  | "attempt"
  | "diagnose"
  | "scaffold"
  | "reconstruct"
  | "repair"
  | "contrast"
  | "verify"
  | "transfer"
  | "reflect"
  | "schedule"
  | "completed"
  | "guided_exit"
  | "abandoned_for_learning_reveal"
  | "blocked"
  | "stale";
```

정상 흐름:

```text
intake
→ orient
→ commit
→ attempt
→ diagnose
├─ correct-but-unverified → verify
├─ repairable gap         → scaffold → reconstruct → repair → verify
├─ boundary confusion     → contrast → repair → verify
└─ future contract-only guided exit
                         → guided_exit → reconstruct → schedule

verify
→ same-session near transfer when appropriate
→ delayed transfer ReviewUnit
→ reflect
→ schedule
→ completed
```

attempt 전 learner가 정답을 명시적으로 요구하는 현재-authority 예외는
guided exit가 아니다. confirmation 화면을 보거나 요청·취소한 것만으로는
state가 바뀌지 않는다. learner가 결과를 명확히 고지받고 affirmative
confirmation한 뒤에만 하나의 trusted-server transaction이 active
Measurement Lane episode를 `abandoned_for_learning_reveal`로 닫아
ineligible·unresumable하게 만들고, **별도** Learning Lane episode를 열어
`scaffold`의 `full_solution` output 전에 confirmation·assistance·exposure·
no-credit qualification을 함께 commit한다. transaction 실패 시 state와
output은 모두 0이다.

### 5.2 상태별 계약

| State | learner가 해야 할 일 | AI가 보여줄 수 있는 것 | 금지 | evidence 최대 효과 |
| --- | --- | --- | --- | --- |
| intake | 문제·OCR·source 확인 | source/rights 상태 | 정답·핵심 풀이 | 없음 |
| orient | 요구 동사·제약 식별 | 문구 해석, 형식 안내 | 해결 핵심 누설 | orientation |
| commit | 답·방법·목차·confidence | 입력 form | 정답성 피드백 | commitment |
| attempt | 실제 풀이/답안 | timer, neutral tools | full solution | independent attempt 후보 |
| diagnose | 제출 대기 | 결과 상태·불확실성 | model의 확정 원인 | gap 후보 |
| scaffold | 다음 작은 단계 수행 | 허용된 최소 hint | 단계 건너뛴 답 | assisted evidence |
| reconstruct | 원리·절차 재현 | 질문·빈칸 | copy 가능한 완성답 | learning evidence |
| repair | 다시 쓰기·계산 | bounded feedback | AI 자동 교체 | recovery 후보 |
| contrast | 경계 판단 | near-miss·반례 | unverified case를 held-out 사용 | discrimination evidence |
| verify | 검산·rubric check | deterministic/source result | conflict 숨김 | verified repair 후보 |
| transfer | 새 variant 무도움 수행 | timer only | hint·답 | independent transfer 후보 |
| reflect | confidence 재평가·한 줄 교훈 | calibration 비교 | 성격 추론 | metacognitive evidence |
| schedule | 다음 행동 확인 | due/priority reason | mastery 직접 승격 | queue candidate |
| abandoned_for_learning_reveal | confirmed override 뒤 별도 Learning Lane으로 이동 | 결과 고지와 새 episode ref | resume·measurement/독립 credit | 없음 |

### 5.3 state transition event

```ts
type TutorStateTransitionEventV1 = {
  id: string;
  tutorEpisodeRef: string;
  learnerScopeRef: string;
  fromState: TutorEpisodeStateV1;
  toState: TutorEpisodeStateV1;
  triggerKind:
    | "learner_submission"
    | "server_timer"
    | "validator_result"
    | "policy_decision"
    | "explicit_guided_exit"
    | "confirmed_pre_attempt_learning_reveal"
    | "source_stale"
    | "authority_block";
  triggerEvidenceRefs: string[];
  assistanceSnapshotRef: string;
  exposureSnapshotRef: string;
  lane: "learning" | "measurement";
  relatedEpisodeRef?: string;
  confirmedLearningAnswerRevealOverrideRef?: string;
  transactionRef: string;
  transitionPolicyVersion: string;
  transitionIdempotencyKey: string;
  occurredAt: string;
  derivationAuthority: "trusted_server";
};
```

client나 model이 `fromState/toState`, independent qualification 또는
answer reveal eligibility를 직접 제출하지 않는다.

### 5.4 productive struggle budget

무조건 오래 고민하게 하는 것도 좋은 tutoring이 아니다. task difficulty,
learner history와 시간 제약에 따라 적정한 독립 시도 budget을 둔다.

```ts
type ProductiveStruggleBudgetV1 = {
  policyVersion: string;
  taskProfileRef: string;
  minimumIndependentSeconds: number;
  targetIndependentSeconds: number;
  maximumIndependentSeconds: number;
  maximumFailedMicroAttempts: number;
  overrideReasons:
    | "accessibility_accommodation"
    | "exam_timed_mode"
    | "cold_start"
    | "repeated_same_gap"
    | "confirmed_pre_attempt_learning_reveal"
    | "learner_explicit_guided_exit";
  budgetBasisRefs: string[];
};
```

규칙:

- 너무 빠른 answer request에는 먼저 commitment 또는 smallest cue를 요구한다.
- budget 초과 뒤에도 무한 반복시키지 않는다.
- 감정적 압박·수치심·강제 체류를 사용하지 않는다.
- `confirmed_pre_attempt_learning_reveal`은 §5.6의 명확한 결과 고지와
  affirmative confirmation이 끝난 Learning Lane에만 적용하는 별도
  non-guided override reason이다. request, confirmation 화면 열람, cancel,
  preselected/implicit state는 override가 아니며 어떤 episode·exposure·
  credit도 바꾸지 않는다.
- 미래 §5.0 승인이 끝난 guided runtime에서만 사용자가 guided exit를
  선택할 수 있으며, 그 경우에도 independent credit를 얻지 못한다. 현재
  authority 아래의 implementation은 이 transition을 거부해야 한다.
- timed measurement에서는 budget이 공식/assignment timer로 대체된다.

### 5.5 scaffold ladder

```ts
type ScaffoldLevelV1 =
  | "neutral_reprompt"
  | "recall_cue"
  | "representation_cue"
  | "discrimination_question"
  | "concept_hint"
  | "structural_hint"
  | "partial_example"
  | "worked_step"
  | "full_solution";

type ScaffoldDecisionV1 = {
  tutorEpisodeRef: string;
  targetPrimitive: ReasoningPrimitiveKindV1;
  level: ScaffoldLevelV1;
  reasonCode: string;
  targetArtifactRef?: string;
  contentRef: string;
  assistanceKind: AssistanceKindV1;
  assistanceEventRef: string;
  policyVersion: string;
  deliveryIdempotencyKey: string;
};
```

원칙:

1. ladder는 최소 수준에서 시작한다.
2. 같은 수준의 무의미한 반복을 하지 않는다.
3. hint가 answer를 사실상 노출하면 실제 높은 assistance level로 분류한다.
4. learner가 성공하면 다음 문제에서 scaffold를 한 단계 이상 fade한다.
5. full solution은 현재 `attempt_first` reveal policy의 최종 수단이다.
   explicit guided path 의미는 §5.0 승인 전 contract-only다.
6. full solution 뒤에는 즉시 copy가 아니라 closed-book reconstruction을
   요구한다.
7. full solution 뒤 같은 item 성공은 transfer가 아니다.

### 5.6 answer reveal policy

```ts
type AnswerRevealBasisV1 =
  | "post_attempt"
  | "confirmed_pre_attempt_learning_reveal"
  | "future_guided_exit_contract_only";

type AnswerRevealEligibilityV1 = {
  tutorEpisodeRef: string;
  state: TutorEpisodeStateV1;
  lane: "learning" | "measurement";
  revealBasis: AnswerRevealBasisV1;
  learnerCommitmentRef?: string;
  independentAttemptRef?: string;
  immutablePreRevealAttemptSnapshotRef: string;
  confirmedLearningAnswerRevealOverrideRef?: string;
  struggleBudgetRef: string;
  explicitGuidedExit: boolean;
  measurementLane: boolean;
  timerClosed: boolean;
  sourceAndRightsUsable: boolean;
  revealLevelAllowed: ScaffoldLevelV1;
  reasonCodes: string[];
  eligibilityChecksum: string;
};

type ConfirmedLearningAnswerRevealOverrideV1 = {
  id: string;
  learnerScopeRef: string;
  tutorEpisodeRef: string;
  itemRef: string;
  problemRevisionChecksum: string;
  lane: "learning";
  basis: "confirmed_pre_attempt_learning_reveal";
  requestIntentCode: "answer_before_attempt";
  confirmationEventRef: string;
  confirmationOutcome: "affirmed";
  confirmationCopyVersion: string;
  confirmedAt: string;
  preRevealAttemptState: "no_submitted_attempt";
  preRevealEligibilitySnapshotRef: string;
  referenceAnswerReleaseArtifactRef: string;
  assistanceKind: "full_solution_revealed";
  assistanceEventRef: string;
  exposureEventRef: string;
  resultingSolutionRevealState: "full_revealed";
  guidedStudyCreditEligible: false;
  independentAttemptEligible: false;
  masteryCreditEligible: false;
  weaknessCreditEligible: false;
  recoveryCreditEligible: false;
  measurementQualificationEligible: false;
  policyVersion: string;
  transactionRef: string;
  transactionIdempotencyKey: string;
  derivationAuthority: "trusted_server";
};
```

- Measurement Lane에서 제출·timeout 전 full answer는 항상 금지한다.
- `post_attempt`는 exact submitted attempt와 commitment를 요구한다.
- `confirmed_pre_attempt_learning_reveal`은 별도 현재-authority
  Learning Lane path다. learner가 attempt 전에 answer를 deliberate하게
  요청하고, `이 문항은 노출됨으로 기록되며 독립 시도나 숙달 근거로
  계산되지 않습니다`라는 versioned learner-visible 결과 고지를
  preselected·implicit하지 않은 방식으로 affirmative confirmation한
  경우에만 허용한다.
- `future_guided_exit_contract_only`는 §5.0의 비작동 fixture다.
  confirmed override는 guided onboarding, `explicit_guided_exit`,
  guided-study credit 또는 guided metric으로 분류하지 않는다.
- `ConfirmedLearningAnswerRevealOverrideV1`은 기존 trusted-server
  `AnswerRevealEligibilityV1`과 state transition이 소비하는 subordinate
  evidence다. self-authorizing token이나 두 번째 reveal authority가 아니며
  source/right/effective-version, exact upstream release artifact, caveat,
  struggle와 release gateway를 우회하지 못한다.
- request, confirmation UI 열람, cancel 또는 affirmative confirmation
  실패는 authoritative lane, attempt, Measurement episode, exposure,
  assistance, weakness, credit와 mastery를 전혀 바꾸지 않는다.
- affirmative confirmation 뒤 answer body, cache entry, prefetch,
  stream token 또는 동등 output을 하나라도 반환하기 전에 한
  trusted-server transaction이 다음을 모두 commit한다.
  1. active Measurement Lane episode가 있으면
     `abandoned_for_learning_reveal`, measurement-ineligible,
     unresumable로 닫는다.
  2. 별도 Learning Lane episode를 연다.
  3. exact confirmation record와 immutable
     `no_submitted_attempt` snapshot을 묶는다.
  4. `AssistanceKindV1 = "full_solution_revealed"`와 exact item 및 실제
     노출된 surface/relation의
     `solutionRevealState = "full_revealed"`를 기록한다.
  5. guided, independent-attempt, mastery, weakness, recovery,
     measurement qualification을 모두 false로 고정한다.
- answer endpoint, probe endpoint, cache, prefetch, source map, telemetry와
  error message 어디에서도 우회 누설하지 않는다.
- direct API, retry, multi-tab, client flag와 model output은 confirmation
  또는 fixed-false qualification을 만들거나 바꾸지 못한다.
- reveal 전에 confirmation·lane transition·assistance·exposure·no-credit
  event를 같은 transaction에서 commit한다. commit 실패 시 answer와
  state mutation을 반환하지 않는다.
- 이 override 자체는 submitted wrong/partial answer가 아니므로
  diagnostic cause, biggest gap, repair 또는 automatic error note를
  만들지 않는다. answer 열람·저장·복사·acknowledge도 recovery나
  mastery를 만들지 않는다.
- closed-book reconstruction과 future independent ReviewUnit은 예약할 수
  있다. 이후 credit는 기존 immutable pre-presentation/exposure policy를
  통과한 previously unseen, verified, non-same-surface variant의
  no-assistance evidence에서만 생긴다. revealed item, retry와 실제 노출된
  same-surface variant는 D+1/D+7/timed/transfer 독립 자격이 없다.
- 현재 Owner dogfood와 canonical day/result/D+1/D+7 numerator는 계속
  `attempt_first` only다. 이 override는 guided runtime activation이나
  새 guided metric이 아니다.

### 5.7 reconstruct before consume

설명을 본 뒤 “이해했습니다” 버튼을 누르는 것으로 끝내지 않는다.

```ts
type ReconstructionTaskKindV1 =
  | "ten_second_recall"
  | "blank_outline"
  | "restate_rule"
  | "rebuild_formula"
  | "redo_calculation"
  | "explain_discriminating_condition"
  | "oral_summary";
```

reconstruction success도 최대 recovering 후보다. stable은 delayed
independent transfer가 필요하다.

### 5.8 tutor personality와 language

AI는 친절하지만 답을 쉽게 넘겨주지 않는다.

- 짧고 명확한 질문 한 번
- 사용자가 막힌 정확한 단계만 다룸
- 잘못을 사람의 능력이나 성격으로 일반화하지 않음
- “왜 이걸 모르세요?” 같은 shame language 금지
- 정답을 알면서도 애매하게 유도하는 manipulation 금지
- 불확실하면 질문하거나 block하고 아는 척하지 않음
- 한 화면의 주 CTA는 하나

### 5.9 자유 질문도 state를 우회하지 않는다

사용자는 언제든 “왜?”, “다른 방법은?”, “정답만 알려줘”라고 물을 수 있다.
질문 자체를 막지는 않지만 response policy는 현재 episode state를 따른다.

- 현재 문제의 정답을 우회해 요구하면 허용된 scaffold level까지만 답한다.
- 현재 authority 아래에서 full solution을 명시적으로 원하면 submitted
  attempt 뒤의 `post_attempt` 또는 §5.6의 명확히 확인된
  `confirmed_pre_attempt_learning_reveal` Learning Lane basis에서만
  처리한다. 후자는 guided path가 아니며 answer보다 먼저 confirmation,
  active Measurement abandonment, full assistance/exposure와 모든
  no-credit state가 원자적으로 기록돼야 한다. 미래 §5.0 승인 뒤의
  `explicit_guided_exit`도 이 current override와 합치지 않고 별도
  contract로 assistance/exposure를 먼저 기록한다.
- `guided_reference` episode는 §5.0 승인 전 contract-only다. 현재 문제와
  무관한 개념 질문을 별도 허용 surface에서 처리하더라도 원래
  Measurement Lane의 independence를 보존하고 guided episode를 만들지
  않는다.
- 다른 learner·private source·system prompt·hidden answer를 요구하면 거부한다.
- 자유 질문의 raw text는 기본 learner-private이며 shared analytics에는 closed
  intent code만 보낸다.

---

## 6. 진단, 교정과 개입 정책

### 6.1 diagnostic cause taxonomy

오답 하나를 곧바로 “개념 부족”으로 처리하지 않는다.

```ts
type DiagnosticCauseCodeV1 =
  | "demand_misread"
  | "relevant_fact_omission"
  | "knowledge_absent"
  | "retrieval_failure"
  | "concept_boundary_confusion"
  | "pattern_misclassification"
  | "method_selection_error"
  | "sequence_or_strategy_error"
  | "application_error"
  | "calculation_execution_error"
  | "unit_sign_rounding_error"
  | "source_or_effective_version_error"
  | "rubric_coverage_error"
  | "expression_or_structure_error"
  | "time_allocation_error"
  | "confidence_calibration_error"
  | "assistance_dependence"
  | "integration_failure"
  | "insufficient_evidence";
```

### 6.2 hypothesis, not oracle

```ts
type DiagnosticCauseHypothesisV1 = {
  id: string;
  learnerScopeRef: string;
  tutorEpisodeRef: string;
  targetConceptRefs: string[];
  causeCode: DiagnosticCauseCodeV1;
  supportingEvidenceRefs: string[];
  counterEvidenceRefs: string[];
  confidence: "low" | "medium" | "high";
  status: "candidate" | "strengthened" | "weakened" | "rejected" | "stale";
  disconfirmationPolicyVersion: string;
  modelSuggestionRef?: string;
  serverDecisionRef: string;
  basisChecksum: string;
};
```

LLM은 hypothesis 후보를 제시할 수 있다. learner-facing 확정 원인으로
보이려면 bounded policy와 evidence가 필요하다. 새 counter-evidence가 생기면
reopen 또는 reject한다.

### 6.3 intervention catalog

| cause | 첫 개입 후보 | 독립 검증 |
| --- | --- | --- |
| demand misread | 요구 동사·제약 표시 | 새 문항의 요구만 분류 |
| knowledge absent | 최소 concept + example | 빈칸 회상 + variant |
| retrieval failure | cue then recall | D+1 무도움 회상 |
| boundary confusion | near-miss/반례 | flip-condition 판단 |
| method selection | 후보 비교·배제 | 새 사실에서 방법 선택 |
| application error | fact→rule mapping | 새 case 포섭 |
| calculation error | step/unit validator | 숫자 바뀐 재계산 |
| expression error | bounded rubric rewrite | 새 prompt outline |
| time error | allocation rehearsal | timed set/full solution |
| overconfidence | confidence contrast | 다음 pre-feedback calibration |
| assistance dependence | faster fading | no-hint transfer |

### 6.4 next-best-action objective

초기 정책은 versioned deterministic rule이다.

```text
priority(action) =
  exam_impact
× evidence_confidence
× recurrence_or_forgetting_risk
× expected_transferability
× expected_information_gain
× urgency
÷ (estimated_minutes + fatigue_penalty + error_release_risk)
```

하드 gate:

- source/right/effective-version eligible
- learner scope authorized
- required content/validator usable
- no unresolved conflict
- action fits available modality and accessibility
- no same-family leakage for measurement
- cost reservation within cap

### 6.5 intervention decision

```ts
type InterventionDecisionV1 = {
  id: string;
  learnerScopeRef: string;
  evidenceThroughRef: string;
  targetConceptRefs: string[];
  targetCauseHypothesisRefs: string[];
  interventionKind:
    | "orient"
    | "recall"
    | "contrast"
    | "rewrite"
    | "recalculate"
    | "verified_variant"
    | "timed_set"
    | "timed_full_solution"
    | "guided_reconstruction";
  expectedMinutes: number;
  priorityComponentsRef: string;
  eligibilityRefs: string[];
  policyVersion: string;
  decisionChecksum: string;
  status: "candidate" | "selected" | "blocked" | "stale";
};
```

PersonalWeaknessMap, pyBKT, FSRS 또는 OR-Tools가 이 decision을 직접 쓰지
않는다. 모두 bounded input 후보일 뿐이며 canonical native policy가 최종
eligibility와 selection을 계산한다.

### 6.6 learner-visible automatic error note

accepted wrong 또는 partially correct feedback state가 learner release에
eligible하면 **하나의 learner-private, learner-visible automatic error
note**가 필수다. score, gap badge, weakness node 또는 repair CTA만으로
대체할 수 없다.

이 note는 두 번째 error-note 원장이나 mastery state가 아니다.

- canonical learning authority는 기존 `LearningGapRecord`다.
- metadata contract authority는 기존
  `s216.error_notebook_gap_taxonomy.v1`이다.
- S216 entry는 safe ref, taxonomy, blocker, recurrence, recovery와
  next-review metadata만 저장한다.
- learner answer/OCR body, official question/answer body, generated
  reference-answer prose, source excerpt, formula, extracted value와
  calculation trace를 S216에 새로 저장하지 않는다.
- learner-visible text는 existing record와 이미 release가 허용된
  feedback/source artifact에서 만드는 bounded versioned view projection다.
- save/reopen/resume는 prohibited body를 S216에 복제하지 않고 같은 safe
  refs와 released artifact로 동일 projection을 재계산할 수 있다.
- projection은 source `LearningGapRecord`, S216 entry, mastery, weakness,
  recovery 또는 queue-completion authority를 mutate하지 않는다.

learner-visible label과 순서는 다음 다섯 개로 고정한다.

1. `왜 틀렸는지`
2. `정확한 원리`
3. `지금 바로 고칠 것`
4. `재발`
5. `다음 복습`

```ts
type ErrorNoteFieldV1<T> =
  | {
      status: "usable";
      value: T;
      basisRefs: string[];
    }
  | {
      status: "blocked" | "stale";
      reasonCodes: string[];
    };

type LearnerVisibleAutomaticErrorNoteProjectionV1 = {
  id: string;
  learnerScopeRef: string;
  tutorEpisodeRef: string;
  sourceLearningGapRecordRef: string;
  sourceS216EntryRef: string;
  sourceContractVersion: "s216.error_notebook_gap_taxonomy.v1";
  sourceEvidenceUnitRef: string;
  acceptedFeedbackRevisionRef: string;
  answerRevisionRef: string;
  problemRevisionChecksum: string;
  sourceBundleChecksum?: string;
  feedbackReleaseArtifactRef: string;
  sourceQualification: "usable" | "blocked" | "stale";
  primaryGapRef: string;
  causeHypothesisRef?: string;
  assistanceQualification: "independent" | "assisted";
  whyWrong: ErrorNoteFieldV1<{
    learnerVisibleText: string;
    evidenceRefs: string[];
    causeEpistemicStatus:
      | "supported_hypothesis"
      | "insufficient_evidence";
  }>;
  correctPrinciple: ErrorNoteFieldV1<{
    learnerVisibleText: string;
    claimRefs: string[];
    sourceBundleRef: string;
    effectiveVersionBinding: EffectiveVersionBindingV1;
    referenceAnswerReleaseArtifactRef: string;
  }>;
  immediateFix: ErrorNoteFieldV1<{
    learnerVisibleText: string;
    taskKind:
      | "rewrite"
      | "recalculate"
      | "recall"
      | "contrast"
      | "diagnostic";
    interventionRef: string;
    requiredLearnerActionRef: string;
  }>;
  recurrence: ErrorNoteFieldV1<{
    learnerVisibleText: string;
    recurrenceCount: number;
    recurrenceState: "first_observed" | "repeated" | "unknown";
    recoveryState:
      | "new"
      | "repeated"
      | "improving"
      | "recovered"
      | "relapsed";
    s216RecurrenceStatus:
      | "first_seen"
      | "recurring"
      | "resolved_in_latest_attempt"
      | "not_compared_yet"
      | "withheld";
    recurrenceEvidenceRefs: string[];
    preventionCue: {
      policyOrCueRef: string;
      trigger: string;
      ifThenCheck: string;
    };
  }>;
  nextReview: ErrorNoteFieldV1<{
    learnerVisibleText: string;
    reviewQueueItemRef: string;
    dueAt: string;
    taskKind: ReviewTaskKindV1;
    priorityReason: string;
    independentRequired: boolean;
  }>;
  status: "usable" | "blocked" | "stale";
  primaryCtaRef: string;
  noteVersion: string;
  basisChecksum: string;
  idempotencyKey: string;
  derivationAuthority: "trusted_server";
};
```

다섯 field는 같은 exact learner, episode, accepted feedback revision,
answer revision, problem/source version와 하나의 primary biggest gap에
묶인다.

- `왜 틀렸는지`는 learner answer와 요구 reasoning, calculation,
  source/effective version, coverage 또는 structure 사이의
  evidence-grounded mismatch를 설명한다.
- `정확한 원리`는 usable current source/claim과 exact upstream
  reference-answer release artifact에 묶인 원리·규칙·방법·구별 조건이다.
- `지금 바로 고칠 것`은 learner가 지금 실행할 하나의 rewrite,
  recalculation, recall, contrast 또는 bounded diagnostic action이다.
- `재발`은 관찰된 recurrence state/count/evidence 또는
  `아직 재발 여부가 확인되지 않았습니다`라는 explicit unknown을 보여주고,
  그 truth와 분리된 nested prevention cue를 제공한다.
- `다음 복습`은 learner-scope의 실제 canonical `ReviewUnit`과
  task/due state로 resolve돼야 한다.

recurrence는 두 authority를 임의로 섞지 않고 결정론적으로 reconcile한다.

1. `recurrenceCount`와 `recoveryState`는 canonical
   `LearningGapRecord`에서 온다.
2. recurrence truth/status와 evidence refs는 S216 comparison metadata에서
   온다.
3. `recurringDeductionCandidateIds.length`를 occurrence count로
   사용하지 않는다.
4. S216 `recurring`은 matching qualifying recurrence evidence가 있을
   때만 learner-visible `repeated`가 된다.
5. `not_compared_yet`는 `unknown/not yet established`다.
6. S216 `withheld`는 recurrence field를 `blocked`로 만든다.
7. `resolved_in_latest_attempt`는 projected
   `LearningGapRecord.recoveryState`와 일치해야 한다.
8. count, state, evidence 또는 recovery가 충돌하면 한 source를 조용히
   선택하지 않고 note를 fail closed한다.

S216의 `reviewQueueCandidate`는 후보일 뿐이다.
`nextReview.value.reviewQueueItemRef`는 exact learner scope의 실제
canonical `ReviewUnit`을 resolve하고 task와 due state를 가져야 한다.
missing, cross-learner, candidate-only 또는 존재하지 않는 target은
field와 note의 usable state를 block한다. `ReviewTaskKindV1` 밖의 task를
새로 만들지 않는다.

trusted server가 assistance qualification, 각 field status, note
`usable | blocked | stale`, next-review eligibility와 `primaryCtaRef`를
파생한다. client와 model 값은 비권위다. usable note는 다섯 field가 모두
non-empty, distinct, resolvable한 `usable`이어야 한다. generic·duplicated·
score-only text, missing release artifact, stale basis 또는 unresolved
source conflict를 숨긴 채 usable render하지 않는다.

diagnostic uncertainty와 principle/source failure는 별도다.

- supported answer mismatch가 있어도 root cause evidence가 부족하면
  `whyWrong.causeEpistemicStatus = "insufficient_evidence"`로 표시하고
  immediate fix를 bounded diagnostic action으로 만들 수 있다.
- 그 status는 referenced `DiagnosticCauseHypothesisV1`과 일치해야 하며
  note 안에 두 번째 모순된 uncertainty를 만들지 않는다.
- correct principle의 source, `EffectiveVersionBindingV1` 또는 release
  evidence가 missing/conflict/stale이면 uncertainty 뒤에 숨기지 않고
  principle body와 note usable state를 block한다.

추가 불변식:

- one accepted feedback revision에는 current usable projection이 하나다.
  retry는 source lineage를 append하지만 duplicate current note를 만들지
  않는다.
- generation/recompute는 versioned basis와 idempotency key로 결정론적이다.
- save, Ledger, learner-scope search, resume와 reopen에서 같은 current
  note revision을 복구한다.
- projection access는 learner-private, learner-scope RLS와 purpose-scoped
  retention/delete를 따른다. Shared Signal, Academy, Cleared Content 또는
  model training으로 자동 promotion하지 않고 S216 body store를 늘리지
  않는다.
- generated reference-answer content가 포함되면 exact learner-visible
  learning-reference caveat와 trusted release order를 그대로 적용한다.
- pre-attempt confirmed answer reveal처럼 submitted wrong/partial answer가
  없는 event에서 cause, biggest gap 또는 error note를 꾸며내지 않는다.
- recurrence가 확정되지 않으면 bounded prevention cue는 줄 수 있지만
  반복 pattern이나 learner trait를 발명하지 않는다.
- immediate fix는 learner action을 요구하며 AI generation, note render,
  view 또는 save만으로 complete하지 않는다.
- immediate fix가 due인 동안 sole primary CTA는
  `immediateFix.value.requiredLearnerActionRef`다. next review는 due 전에는
  scheduled/informational이며 다섯 field가 다섯 competing CTA를 만들지
  않는다.
- note 생성·render·view·save만으로 mastery, recovery, weakness,
  independent qualification 또는 queue completion을 바꾸지 않는다.
- desktop/mobile과 screen reader에서 위 다섯 semantic field 순서를
  보존한다.

### 6.7 assistance dependence

AI를 많이 썼다는 사실 자체가 나쁘지는 않지만, support가 사라졌을 때
성능이 유지되는지 별도로 측정한다.

```ts
type AssistanceDependenceSnapshotV1 = {
  learnerScopeRef: string;
  conceptNodeRef: string;
  evidenceThroughRef: string;
  independentAttemptCount: number;
  assistedAttemptCount: number;
  fullRevealCount: number;
  hintEscalationCount: number;
  assistedSuccessWithoutLaterTransferCount: number;
  qualifyingNoHintTransferCount: number;
  status:
    | "insufficient_evidence"
    | "support_expected"
    | "fading_needed"
    | "independent_confirmed";
  reasonCodes: string[];
  policyVersion: string;
};
```

이 snapshot은 mastery를 대체하지 않고, scaffold fading과 next action의
bounded factor로만 사용한다.

---

## 7. Exam Compiler와 Adapter SDK

### 7.1 목표

새 시험을 추가할 때 다음처럼 하면 안 된다.

```text
시험 이름 변경
+ prompt에 과목명 입력
+ 문제 업로드
= 출시
```

대신 공식 규칙, source, skill, item, rubric, validator, tutor protocol과
measurement를 하나의 versioned package로 compile한다.

### 7.2 ExamPackageManifestV1

```ts
type ExamPackageManifestV1 = {
  packageId: string;
  examIdentityRef: string;
  jurisdictionRef: string;
  languageProfileRef: string;
  packageVersion: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  examRuleRegistryRef: string;
  sourceRegistrySnapshotRef: string;
  rightsManifestRef: string;
  examBlueprintRef: string;
  curriculumGraphRef: string;
  misconceptionTaxonomyRef: string;
  taskTypeProfileRefs: string[];
  itemBankManifestRef: string;
  rubricRegistryRef: string;
  validatorRegistryRef: string;
  tutorProtocolProfileRefs: string[];
  measurementPolicyRef: string;
  schedulerProfileRef: string;
  accessibilityProfileRef: string;
  privacyAndRetentionProfileRef: string;
  costPolicyRef: string;
  certificationEvidenceRef?: string;
  packageDigest: string;
  status:
    | "draft"
    | "synthetic_validated"
    | "owner_private"
    | "limited_external"
    | "certified"
    | "deprecated"
    | "revoked";
};
```

### 7.3 compiler inputs

#### Exam identity and rules

- 시험명, 시행기관, jurisdiction
- 시험 단계, 과목, 배점, 과락·합격 기준
- 시험시간, 허용도구, 답안 형식
- 적용 기준일·법령·회계기준·공식 공고
- 변경 감지·stale·rollback policy

#### Curriculum and skill graph

- domain → concept → skill → observable behavior
- prerequisite와 confused-with
- task type별 required reasoning primitives
- shared skill과 exam-private skill 분리
- taxonomy version과 migration

#### Item and variant bank

- source, rights, revision, answer/rubric
- item family, variant family, surface similarity
- exposure state와 held-out eligibility
- difficulty는 초기 expert/rule estimate, 이후 calibrated evidence
- generated item은 기본 unverified/private

#### Rubric and validator

- deterministic check가 가능한 영역
- expert rubric이 필요한 영역
- accepted answer range와 ambiguity
- mandatory source/effective-version binding
- abstain/block 조건

#### Tutor profile

- state sequence
- commitment kind
- struggle budget
- scaffold ladder
- reveal/fading
- transfer criterion
- accessibility accommodation

각 item 또는 validated item template는 필요할 때 question-specific scaffold
plan을 가진다. system prompt 하나가 임의로 문제 순서를 만들게 하지 않는다.

```ts
type ItemTutorPlanV1 = {
  itemRevisionRef: string;
  taskProfileRef: string;
  intendedReasoningStepRefs: string[];
  requiredCommitmentKinds: CommitmentKindV1[];
  commonErrorSignatureRefs: string[];
  scaffoldUnitRefs: string[];
  discriminationProbeRefs: string[];
  revealCheckpointRefs: string[];
  validatorRefs: string[];
  sourceAndRightsRefs: string[];
  planVersion: string;
  planDigest: string;
  status: "draft" | "validated" | "stale" | "blocked";
};
```

plan은 expert-authored, template-compiled 또는 model-drafted일 수 있지만,
learner-facing measurement/verified tutoring에 사용하려면 source·validator와
순서 검증을 통과해야 한다. plan이 없거나 stale이면 generic full-answer tutor로
fallback하지 않고 허용된 neutral/guided mode로 제한한다.

### 7.4 modality adapter

```ts
type ExamModalityV1 =
  | "selected_response"
  | "short_numeric"
  | "worked_calculation"
  | "legal_case_analysis"
  | "theory_essay"
  | "oral_response"
  | "practical_simulation"
  | "mixed";
```

#### selected_response

- rapid answer mode에서는 매 문항 장문 이유를 강제하지 않는다.
- answer, time, confidence를 먼저 기록한다.
- diagnostic item이나 오답에는 가장 가까운 distractor와의 구별을 묻는다.
- item response interchange는 필요할 때 QTI 3-compatible representation을
  검토한다.
- IRT/CAT는 충분한 calibrated item evidence 뒤 shadow부터 시작한다.

#### worked_calculation

- method choice
- variable/fact mapping
- formula graph
- unit·sign·rounding
- deterministic recomputation
- calculator profile
- changed-number transfer

#### legal_case_analysis

- issue
- controlling source/effective date
- elements/test
- fact application
- counterargument
- conclusion
- unresolved source면 verified answer block

#### theory_essay

- demand verb
- thesis/outline
- concept accuracy
- argument relation
- comparison/evaluation
- counter-position
- conclusion and compression
- rubric-based double review

서술형 점수는 단일 LLM의 자유형 숫자로 확정하지 않는다.

```ts
type OpenResponseReviewConsensusV1 = {
  answerRevisionRef: string;
  rubricVersion: string;
  primaryReviewRef: string;
  independentVerifierRef: string;
  deterministicCheckRefs: string[];
  sourceVerificationRefs: string[];
  disagreementState: "within_policy" | "material" | "blocking";
  releaseState:
    | "feedback_only"
    | "range_with_evidence"
    | "human_review_required"
    | "blocked";
  consensusPolicyVersion: string;
};
```

material disagreement, unsupported source 또는 blocking rubric omission은
억지 평균점수로 숨기지 않는다. 초기 learner-facing 결과는 exact score보다
dimension별 충족·근거·uncertainty를 우선한다.

#### oral_response

- preparation time와 response time
- claim structure
- key point coverage
- fluency보다 substantive rubric 우선
- transcript/audio privacy와 delete
- voice model bias audit

#### practical_simulation

- step sequence
- tool/action log
- safety or procedural constraints
- result validation
- replayable scenario version

### 7.5 shared skill과 private skill

```ts
type SkillScopeV1 =
  | "universal_reasoning"
  | "profession_shared"
  | "exam_specific"
  | "learner_private";
```

- `universal_reasoning`: 요구 파악, 검산, 시간배분 같은 검증된 공통 skill
- `profession_shared`: 회계 계산, 법률 포섭처럼 여러 시험에서 공유 가능하지만
  별도 governance가 필요한 skill
- `exam_specific`: 시험 고유 source, rubric, 표현
- `learner_private`: 개인 note·custom misconception

exam-private evidence를 다른 adapter의 mastery로 자동 이전하지 않는다.
bridge mapping은 versioned, explainable, reversible해야 한다.

### 7.6 adapter certification gate

새 adapter가 learner-facing이 되려면 최소 다음을 통과한다.

1. official rule/source/effective-version coverage
2. rights manifest와 attribution
3. curriculum/skill mapping expert review
4. task profile과 tutor FSM completeness
5. item-family leakage audit
6. modality별 Golden fixture
7. deterministic validator pass
8. rubric inter-rater/reviewer agreement 기준
9. severe misfeedback 0 또는 승인된 매우 낮은 threshold
10. source conflict fail-closed 100%
11. privacy/RLS/export/delete
12. accessibility
13. cost cap와 model route fallback
14. synthetic acceptance
15. owner/domain-expert private acceptance
16. limited external canary
17. exact package digest, rollback와 deprecation

### 7.7 adapter가 kernel을 오염시키지 않는 법

- adapter package는 kernel public interface만 사용한다.
- 시험별 prompt를 kernel system policy에 직접 concatenate하지 않는다.
- uploaded problem text는 untrusted content이며 instruction으로 실행하지
  않는다.
- adapter validator가 unavailable이면 generic model answer로 silently
  fallback하지 않는다.
- package version이 stale/revoked면 new episode를 시작하지 않는다.
- cross-adapter cache key에는 exact package, source, rights와 learner scope를
  포함한다.

---

## 8. Learning Lane, Measurement Lane과 learner model

### 8.1 두 lane의 물리적 분리

```text
Learning Lane
- scaffold 허용
- explanation/contrast/repair
- same item 재사용 가능
- 목표: 이해와 교정

Measurement Lane
- answer/hint 차단
- pre-presentation unseen snapshot
- held-out item family
- server timer
- 목표: 독립 수행과 전이 검증
```

한 UI 안에서 전환할 수 있어도 event, cache, route와 qualification을 분리한다.
Learning Lane output이 Measurement Lane prefetch/cache에 나타나지 않게 한다.

attempt 전 deliberate answer request는 Measurement Lane reveal 예외가
아니다. confirmation screen의 request/view/cancel 동안 active
Measurement episode를 그대로 두고 어떤 evidence도 만들지 않는다.
affirmative confirmation 뒤 §5.6 transaction이 먼저 그 episode를
abandoned·ineligible·unresumable하게 닫은 다음 distinct Learning Lane
episode를 열어야 한다. 그 transaction이 full assistance, exact exposure와
fixed no-credit qualification까지 모두 commit하기 전에는 어떤
answer-bearing byte도 Learning Lane 또는 Measurement Lane에 release하지
않는다.

### 8.2 measurement ladder

```text
D0  immediate reconstruction
D+1 delayed recall
D+7 verified near transfer
D+30 retention or far transfer when policy requires
Timed set
Timed full solution
Full mock / exam simulation
```

시험·skill마다 모든 단계를 하드코딩하지 않는다. adapter measurement policy가
necessary evidence를 정의한다.

### 8.3 canonical mastery와 derived dimensions

`MasteryStateV1` 하나만 canonical mastery다. 다음은 별도 projection이다.

- retrieval stability
- transfer breadth
- response speed
- timed integration
- confidence calibration
- assistance dependence
- PersonalWeaknessMap priority
- source/effective-version freshness

projection끼리 모순이 생기면 mastery를 임의로 바꾸지 않고 stale/recompute한다.

### 8.4 LearnerCapabilitySnapshotV1

```ts
type LearnerCapabilitySnapshotV1 = {
  learnerScopeRef: string;
  conceptNodeRef: string;
  evidenceThroughRef: string;
  canonicalMasteryStateRef: string;
  retrievalStabilityState:
    | "unknown"
    | "fragile"
    | "retaining"
    | "delayed_confirmed";
  transferState:
    | "unknown"
    | "same_surface_only"
    | "near_transfer"
    | "far_transfer_candidate";
  speedState:
    | "not_measured"
    | "below_target"
    | "within_target"
    | "unstable";
  confidenceCalibrationState:
    | "not_measured"
    | "underconfident"
    | "calibrated_candidate"
    | "overconfident";
  assistanceDependenceRef: string;
  weaknessSnapshotRef?: string;
  staleReasonCodes: string[];
  snapshotPolicyVersion: string;
  snapshotChecksum: string;
};
```

percentage를 learner에게 보여주기 위한 객체가 아니다. closed state와 근거를
통해 다음 action을 설명하기 위한 projection이다.

### 8.5 readiness evidence, not pass oracle

초기 제품은 합격확률을 계산하거나 노출하지 않는다. 대신 시험 coverage와
실패 경로를 근거 범위 안에서 보여준다.

```ts
type ReadinessEvidenceEnvelopeV1 = {
  learnerScopeRef: string;
  examPackageRef: string;
  evidenceThroughRef: string;
  blueprintCoverageState:
    | "insufficient"
    | "partial"
    | "broad_but_unverified"
    | "exam_like_evidence_available";
  subjectEvidenceRefs: string[];
  timedEvidenceRefs: string[];
  failurePathCandidateRefs: string[];
  uncertaintyReasonCodes: string[];
  staleReasonCodes: string[];
  learnerFacingSummaryRef: string;
  policyVersion: string;
};
```

허용 표현:

- `이 영역은 아직 무도움 검증이 부족합니다`
- `최근 timed set에서 반복된 실패 경로입니다`
- `공식 blueprint의 이 범위는 아직 evidence가 없습니다`
- `현재 근거로는 판단을 보류합니다`

금지 표현:

- `합격확률 78%`
- `예상 점수 62.3점`
- `반드시 합격`
- validation 전 mastery probability

장기적으로 pass model을 연구하더라도 learner-hidden shadow, time-forward
held-out, cohort shift, calibration, abstention, confidence interval와 별도
Owner decision이 먼저다. marketing claim과 자동 연결하지 않는다.

### 8.6 confidence calibration

feedback 전 confidence와 실제 outcome의 차이를 기록한다.

- high-confidence wrong은 높은 priority 후보
- low-confidence correct는 fragile retrieval 후보
- feedback 뒤 confidence 수정은 pre-feedback metric에 사용하지 않음
- raw 0~100 자유형 수치보다 초기에는 closed band 사용
- calibration은 사람의 가치·지능이 아니라 특정 skill×context의 상태

### 8.7 knowledge tracing, IRT, FSRS, OR-Tools의 자리

| 도구 | 허용 역할 | 금지 역할 |
| --- | --- | --- |
| rule baseline | canonical 초기 판단·next action | 근거 없는 확정 |
| pyBKT | gated benchmark/hidden shadow | learner-facing mastery, direct scheduler write |
| IRT/CAT | calibrated objective item selection | 미검증 item의 난도 진실화 |
| ts-fsrs | eligible recall due 후보 | weakness/mastery 판정 |
| OR-Tools CP-SAT | 승인된 task의 시간 배치 | 무엇을 공부할지 결정 |
| LLM | 설명·분류 후보·rubric draft | source/validator/mastery 권위 |

### 8.8 primary evaluation metric

```text
Primary:
- unassisted held-out transfer gain
- delayed retention
- time-to-independent-correct
- timed completion quality
- recurrence reduction
- calibration improvement
- assistance dependence reduction

Safety:
- severe misfeedback
- unsupported source/law release
- false mastery/recovery
- answer leakage
- raw data/cross-tenant leak
- duplicate charge/usage

Secondary only:
- session count
- time in app
- messages
- streak
- satisfaction
```

---

## 9. 답안길 감정평가사 2차 vertical — 최종 학습 루프

이 절부터 17절까지는 `ProfessionalExamReasoningKernelV1`의 첫 번째
인증 vertical projection이다. 공통 tutor state machine, evidence,
assistance, measurement와 privacy 불변식을 약화하지 않고 감정평가사
2차의 실무·이론·법규에 구체화한다.


### 9.1 두 개의 learning path

`attempt_first`가 기본이다.

1. 문제와 OCR을 확인한다.
2. 3~8분 또는 문제에 맞는 검증된 시간 동안 무도움으로 시도한다.
3. 막히면 최소 힌트를 단계적으로 선택한다.
4. 제출 뒤 Explanation Workbench를 본다.
5. 가장 큰 간극 하나를 다시 쓰거나 계산한다.
6. D+1과 D+7을 예약한다.

learner가 attempt 전에 정답을 deliberate하게 요구할 때의
`confirmed_pre_attempt_learning_reveal`은 세 번째 learning path나
guided onboarding이 아니다. §5.6의 learner-visible 결과 고지를
affirmative confirmation한 뒤 별도 Learning Lane에서만 열리는 좁은
override다. full solution보다 먼저 assistance/exposure/no-credit와 active
Measurement abandonment를 원자적으로 기록하고, revealed item·retry·실제
노출된 same-surface variant에는 independent, mastery, weakness, recovery,
D+1/D+7/timed/transfer credit를 주지 않는다. submitted wrong/partial answer가
없으므로 개인 gap·cause·automatic error note를 생성하지 않는다. 이후
eligible한 unseen verified variant의 별도 독립 evidence만 기존 policy로
평가한다.

`guided_study`는 초학자나 완전히 낯선 유형을 위한 future contract
candidate로만 정의한다. **현재 learner runtime에서는 선택·실행할 수
없다.** 아래 순서는 §5.0의 별도 dated Owner supersession과 후속 gate가
모두 충족된 뒤에만 사용할 수 있는 비작동 semantics다.

1. full solution을 보기 전에 exposure를 원자적으로 기록한다.
2. 쉬운 상황, 왜, 그림, 비교, 체계, 조건 변화, 계산기 설명을 본다.
3. 바로 10초 회상과 백지 재현을 한다.
4. 다음 독립 ReviewUnit을 예약한다.

미래 승인 뒤의 `guided_study` 열람도 다음을 만들지 못한다.

- independent attempt
- 개인 오답에서 추론한 biggest gap
- unseen 또는 held-out 자격
- stable mastery
- verified transfer

독립 시도 전에는 개인 gap을 꾸며내지 않고
`무도움 재현 목표`만 보여준다.

### 9.2 assistance, exposure, mastery 분리

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
| confirmed pre-attempt Learning Lane full reveal | exposure·assistance history와 future independent review만; gap/error note/credit 없음 |
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

### 9.3 attempt mode

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

## 10. Explanation Workbench v3

### 10.1 화면 구조와 필수 learner-visible caveat

데스크톱:

| 왼쪽 약 68% | 오른쪽 약 32% |
| --- | --- |
| AI 학습용 풀이 | 핵심개념 1~3개 |
| 필수 learner-visible caveat | caveat 이후에만 한 줄 정의 |
| 한 줄 방향·단계별 풀이 | 이 문제에서의 적용 |
| 산식·근거·검산 | 10초 회상 |

허용 heading `AI 학습용 기준안` 또는 `AI 학습용 풀이` 바로 아래에는 다음
정확한 문구를 표시한다.

> AI가 생성한 풀이·기준안은 학습 참고자료이며, 시험기관의 공식 답안·공식 모범답안 또는 공식 채점기준이 아닙니다.

필수 배치 규칙:

- desktop과 mobile 모두 표시
- heading에 직접 인접하거나 바로 아래
- 설명, 답안, 점수, 평가 능력 또는 inferred exam point body보다 먼저
- normal DOM과 screen-reader 순서에서 먼저
- first render와 reopen 모두 표시
- `usable`, `supported`, `verified` 품질 상태 모두 표시
- tooltip, modal, footer, collapsed panel, terms link만으로 대체 금지
- CSS visual reordering으로 body 뒤에 숨기는 방식 금지

아래 전체 너비:

1. 이 문제가 평가하는 능력
2. 자주 빠지는 함정
3. 개인 biggest gap 또는 무도움 재현 목표
4. 지금 다시 할 한 가지
5. 주 CTA 하나

모바일:

```text
AI 학습용 풀이 heading
→ 필수 caveat
→ 풀이
→ 핵심개념
→ 평가 능력·함정
→ 보조 probe
→ 교정
→ 주 CTA
```

여섯 probe는 주 CTA가 아니다. 한 화면의 주 행동은 계속 하나다.

### 10.2 ExplanationPacketV2

```ts
type ContentScopeV1 =
  | "learner_private"
  | "tenant_private"
  | "cleared_shared";

type LearnerReferenceCaveatV1 = {
  kind: "learning_reference_not_official_answer_or_grading_criteria";
  noticeVersion: "ko-KR.v1";
};

type ReferenceAnswerReleaseArtifactBindingV1 = {
  artifactRef: string;
  artifactDigest: string;
  resolutionState:
    | "resolved_released"
    | "missing"
    | "blocked"
    | "conflict"
    | "stale";
  resolverPolicyVersion: string;
  resolvedBasisChecksum: string;
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
  referenceAnswerReleaseBinding: ReferenceAnswerReleaseArtifactBindingV1;
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

`LearnerReferenceCaveatV1` copy는 model-authored free text가 아니라 trusted,
versioned registry에서 resolve한다. kind/version 누락, unknown 또는 mismatch면
생성 reference body 전체를 release·render하지 않는다. caveat,
`verificationSummary`, uncertainty와 Trust status는 서로 독립된 필수조건이며
하나가 다른 하나를 대체하지 못한다.

`referenceAnswerReleaseBinding`은 단순 문자열 포인터가 아니다. trusted server
resolver는 exact upstream release artifact와 digest를 열어 다음을 모두
확인해야 한다.

1. 독립적으로 생성된 candidate set이 존재한다.
2. 현재 subject adapter의 validator result가 pass다.
3. critic review가 terminal이고 blocker가 없다.
4. candidate disagreement와 source/calculation conflict가 versioned consensus
   또는 conflict-resolution policy로 닫혔다.
5. final release gate가 exact problem/source/model/prompt/schema basis에 대해
   pass했다.
6. release artifact의 basis checksum이 현재 packet basis와 정확히 일치한다.

하나라도 missing, blocked, conflict 또는 stale이면 packet을 `usable`로 만들지
못하고 생성 explanation/reference body를 learner에게 render하지 않는다.
단일 모델 output, `claims`, `verificationSummary` 또는 model consensus만으로
release artifact를 대체하지 못한다. shell, 개인 메모와 blocker metadata는
저장할 수 있지만 검증된 학습 기준안처럼 노출하지 않는다.

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

### 10.3 KeyConceptV2

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

### 10.4 여섯 explanation probe

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

### 10.5 ContrastSetV1

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

### 10.6 claim-level Trust

생성 텍스트가 자기 자신을 `verified`로 승격하지 못한다.

Trust summary는 model output이 아니라 서버의 claim registry와
release matrix에서 계산한다.

- 실무: blocking 계산·source conflict면 해당 결과 release 금지
- 이론: unsupported assertion을 deterministic fact처럼 표시 금지
- 법규: 필수 source/effective date/쟁점/요건/결론 중
  `unresolved/conflict/unbound/stale`가 있으면 기준안 전체 block
- `partially_blocked`: 필수 결론과 독립적인 비필수 설명에만 허용

---

## 11. 과목별 adapter

### 11.1 실무 — PracticalDecisionPathV1

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
- release resolver: candidate set, subject validator, critic review,
  consensus/conflict resolution과 final release gate의 exact upstream artifact
  성공 여부

`usable`, `supported`, `verified`는 evidence/source/calculation 품질 상태일 뿐,
AI 학습용 풀이를 시험기관의 공식 답안·공식 모범답안 또는 공식
채점기준으로 바꾸지 않는다.

AI 계산과 deterministic 결과가 충돌하면 숫자 결과를 release하지
않고 conflict를 표시한다. 설명 안에서 중간 숫자와 최종 숫자가
서로 다른 경우도 blocker다.

계산기 설명은 시험장 리셋 뒤 손으로 재현 가능한
`casio_fx_9860giii` routine만 허용하고 저장 프로그램 의존을
가르치지 않는다.

### 11.2 이론

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

### 11.3 법규

- 쟁점
- 법적 근거 후보
- 요건·효과
- 포섭
- 결론
- 시험일 또는 문제 결합 effective date

`unresolved/conflict/unbound/stale`인 필수 근거가 있으면 verified
기준안을 release하지 않는다. 개인 note shell과 미확인 항목은
저장할 수 있지만 “검증 완료”로 표시하지 않는다.

### 11.4 혼합 문제

네 번째 엔진을 만들지 않는다.

- primary adapter 하나
- 필요한 supporting projection
- 내부 gap 후보 여러 개
- learner-facing biggest gap 하나

---

## 12. Gap → Repair → Verification

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

### 12.1 Personal Weakness Map v1

#### 목적과 경계

`PersonalWeaknessMapV1`은 답안길을 사용할수록 독립 시도, 반복 오류,
힌트, repair, D+1, D+7과 timed evidence를 개념별로 묶어 지금
확인해야 할 취약 후보와 다음 행동을 보여주는 learner-private
projection이다.

다음 기존 기반을 재사용한다.

```text
CurriculumGraph
+ Personal Concept State / MasteryStateV1
+ Question Chain
+ GapFindingV2
+ Misconception Graph
+ Root Cause Candidate
+ RepairVerificationV2
+ D+1 / D+7 / timed evidence
→ PersonalWeaknessMapV1
```

이 지도는 다음이 아니다.

- 두 번째 mastery state machine
- 개인의 참된 지식상태를 확정하는 oracle
- 공식 채점, 점수 예측, 합격확률 또는 합격보장
- graph adjacency만으로 원인을 확정하는 인과모형
- pyBKT 확률을 보기 좋게 포장한 화면
- 개인 edge를 shared `CurriculumGraph`로 역승격하는 수단

`MasteryStateV1`이 유일한 canonical mastery 상태다.
`PersonalWeaknessStatusV1`은 현재 evidence의 충분성과 교정 우선순위를
표현할 뿐이다. snapshot은 같은 event와 version에서 재생 가능한
cache/projection이며 별도의 권위 원장이 아니다.

#### closed evidence

```ts
type WeaknessEvidenceQualificationV1 =
  | "independent_eligible"
  | "assisted"
  | "guided_only"
  | "same_surface"
  | "unverified_variant"
  | "stale"
  | "ineligible";

type WeaknessEvidenceOutcomeV1 =
  | "qualifying_success"
  | "qualifying_failure"
  | "needs_independent_check"
  | "ineligible";

type PreFeedbackConfidenceBandV1 =
  | "not_captured"
  | "low"
  | "medium"
  | "high";

type EffectiveVersionBindingV1 =
  | {
      state: "not_applicable";
    }
  | {
      state: "bound";
      effectiveVersionRef: string;
    }
  | {
      state: "missing" | "conflict" | "stale";
      effectiveVersionRef?: string;
      reasonCodes: string[];
    };

type WeaknessConceptEligibilityBasisV1 = {
  sourceBindingRef: string;
  rightsDecisionRef: string;
  validatorRefs: string[];
  effectiveVersionBinding: EffectiveVersionBindingV1;
  eligibility: "eligible" | "ineligible";
  reasonCodes: string[];
  basisChecksum: string;
};

type WeaknessConceptObservationV1 = {
  observationId: string;
  sourceEvidenceUnitRef: string;
  observationIdentityKey: string;
  parentObservationRef?: string;
  conceptNodeRef: string;
  answerAnchorRefs: string[];
  attributionUnitRefs: string[];
  mappingRole:
    | "primary_target"
    | "supporting_target"
    | "prerequisite_context";
  mappingBasisRefs: string[];
  mappingAdapterVersion: string;
  allocationPolicyVersion: string;
  allocationDedupeKey: string;
  metricContributionRefs: {
    independentOutcomeRef?: string;
    gapOccurrenceRef?: string;
    recoveryOutcomeRef?: string;
  };
  eligibilityBasis: WeaknessConceptEligibilityBasisV1;
  qualification: WeaknessEvidenceQualificationV1;
  outcome: WeaknessEvidenceOutcomeV1;
  preFeedbackConfidenceBand: PreFeedbackConfidenceBandV1;
  answerConfidenceEvidenceRef?: string;
  gapFindingRefs: string[];
  rootCauseCandidateRefs: string[];
  staleReasonCodes: string[];
};

type WeaknessEvidenceEventCommonV1 = {
  id: string;
  learnerScopeRef: string;
  sessionRef: string;
  attemptIdentityKey: string;
  answerRevisionRef: string;
  problemRevisionChecksum: string;
  itemRef: string;
  variantFamilyRef: string;
  variantRef: string;
  prePresentationEligibilitySnapshotRef: string;
  curriculumGraphVersion: string;
  conceptMappingPolicyVersion: string;
  occurredAt: string;
  assistanceSnapshotRef: string;
  exposureSnapshotRef: string;
  itemRelation:
    | "original"
    | "same_surface"
    | "verified_variant"
    | "unverified_variant";
  eventSourceBundleRef: string;
  modelProfileVersion?: string;
  promptVersion?: string;
  rubricVersion?: string;
  inferencePolicyVersion: string;
  derivationAuthority: "trusted_server";
  derivationPolicyVersion: string;
  conceptObservations: WeaknessConceptObservationV1[];
  allocationConservationRef: string;
  evidenceIdempotencyKey: string;
};

type WeaknessEvidenceEventV1 = WeaknessEvidenceEventCommonV1 &
  (
    | {
        eventKind: "attempt";
        attemptRef: string;
      }
    | {
        eventKind: "gap";
        gapFindingRefs: string[];
      }
    | {
        eventKind: "repair";
        repairVerificationRef: string;
      }
    | {
        eventKind: "d1_recall" | "d7_transfer";
        reviewUnitRef: string;
        completionEvidenceRef: string;
      }
    | {
        eventKind: "timed_full_solution";
        timedAttemptRef: string;
      }
  );
```

한 open-response 답안을 여러 concept에 mapping할 때는 versioned
adapter가 per-concept observation, 답안 anchor와 attribution unit을
닫는다. `allocationConservationRef`는 같은 attribution unit이 중복
배정되지 않았고 mapping policy의 총량·dedupe 규칙을 만족함을
증명한다. 한 문항의 단일 실패를 모든 관련 concept의 완전한 실패로
복제하지 않는다.

`sourceEvidenceUnitRef`와 `observationIdentityKey`는 같은
concept×attempt×attribution unit에서 나온 attempt, derived gap,
repair projection과 retry가 공유한다. metric별 contribution ref는
learner+concept+source evidence unit+metric class에서 unique다.

- parent attempt observation은 independent outcome을 최대 한 번 계산
- derived gap은 parent를 참조하고 gap characterization을 최대 한 번
  추가하지만 independent attempt, distinct item 또는
  high-confidence-wrong을 다시 늘리지 않음
- 단순 repair projection은 parent outcome을 다시 계산하지 않음
- 새 독립 repair/rewrite 결과가 recovery evidence가 되려면 새 immutable
  attempt identity와 source evidence unit이 필요
- attempt + derived gap + retry 하나는 독립 실패 1회와 gap
  characterization 1회만 기여

각 concept observation은 자체 `eligibilityBasis`를 가진다. 한 mixed
answer에서 실무 concept의 current source/validator가 유효하고 법규
concept의 effective version이 unbound라면 실무 observation만 독립적으로
eligible할 수 있고 법규 observation은 ineligible이다. 한 concept의
binding을 다른 concept에 빌려 주거나 event-wide로 전파하지 않는다.

`mappingRole=prerequisite_context`는
`outcome=needs_independent_check | ineligible`만 허용하고 weakness,
failure, recovery 또는 mastery evidence에 기여하지 않는다. 직접
anchor가 있는 새 observation이 versioned mapping policy 아래
`primary_target | supporting_target`으로 분류되고 독립 자격을
통과해야만 prerequisite concept의 weakness evidence가 될 수 있다.

`qualification`, `outcome`, `itemRelation`, mapping, effective-version
eligibility와 stale state는 client나 model이 제출하는 값이 아니라
trusted server가 immutable attempt/exposure/validator evidence에서
파생한다. direct API가 이를 주입하거나 event kind와 불가능한 조합을
제출하면 거부한다.

`highConfidenceWrongCount`의 confidence는 GapFinding의 진단 confidence가
아니다. full feedback이나 solution reveal 전 learner가 제출한
closed pre-feedback confidence band가 `high`이고, 그 concept observation이
`independent_eligible + qualifying_failure`일 때만 계산한다.
`not_captured`가 아니면 immutable `answerConfidenceEvidenceRef`를
요구하고 client의 사후 confidence 수정은 계산에 쓰지 않는다.
raw LLM 점수나 자유형 confidence를 ground truth로 사용하지 않는다.

distinct independent item 수는 `itemRef` 개수가 아니라 versioned
variant-family dedupe policy로 계산한다. 같은 family, retry,
same-surface 또는 이미 exposed된 variant는 별도 unseen evidence로
늘리지 않는다. verified variant는 immutable pre-presentation snapshot,
current source, rights와 validator binding을 모두 요구한다.

법규와 version-sensitive concept observation은 자체
`eligibilityBasis.effectiveVersionBinding.state=bound`가 아니면
`ineligible`이다. 다른 과목도 binding이 필요한 adapter에서
missing/conflict/stale observation을 candidate, recovery 또는
calibration evidence로 사용할 수 없다.

raw 문제, 답안, 필체, OCR, note와 AI 본문은 weakness analytics,
graph label, shadow dataset, log 또는 model artifact에 넣지 않는다.
이벤트는 opaque reference, closed outcome, version과 bodyless evidence만
가진다.

#### deterministic snapshot

```ts
type PersonalWeaknessStatusV1 =
  | "insufficient_evidence"
  | "watch"
  | "priority_candidate"
  | "recovery_watch"
  | "no_current_signal";

type PersonalWeaknessConceptSnapshotV1 = {
  conceptNodeId: string;
  masteryStateRef: string;
  masteryPolicyVersion: string;
  masteryEvidenceThroughRef: string;
  weaknessStatus: PersonalWeaknessStatusV1;
  classificationConfidence: "not_estimated" | "low" | "medium" | "high";
  reasonCodes: string[];
  evidenceRefs: string[];
  distinctIndependentAttemptCount: number;
  distinctEligibleItemCount: number;
  verifiedVariantCount: number;
  highConfidenceWrongCount: number;
  blockingOrMajorGapRecurrenceCount: number;
  d1FailureCount: number;
  d7TransferFailureCount: number;
  timedRecurrenceCount: number;
  staleEvidenceCount: number;
  rootCauseCandidateRefs: string[];
  nextActionRef?: string;
};

type PersonalWeaknessMapContentV1 = {
  learnerScopeRef: string;
  curriculumGraphVersion: string;
  conceptMappingPolicyVersion: string;
  weaknessInferencePolicyVersion: string;
  evidenceThroughRef: string;
  evidenceDigest: string;
  conceptSnapshots: PersonalWeaknessConceptSnapshotV1[];
  status: "usable" | "insufficient_evidence" | "stale";
};

type PersonalWeaknessMapV1 = {
  projectionKey: string;
  content: PersonalWeaknessMapContentV1;
  contentChecksum: string;
  basisChecksum: string;
  generatedAt: string;
};
```

exact threshold와 weight는 prose나 client에 흩어 놓지 않고
`WeaknessInferencePolicyV1`로 version한다. 동일한 eligible event,
taxonomy, mapping과 policy는 동일한 canonical content와 checksum을
만들어야 한다.
`projectionKey`, `contentChecksum`과 `basisChecksum`은 volatile
`generatedAt`을 제외한 canonical content와 exact input basis에서
결정론적으로 계산한다.

map은 같은 `evidenceThroughRef`에서 canonical mastery state를
`masteryStateRef`로 resolve한다. mastery transition이 생기면 관련 map
cache는 즉시 stale/recompute 대상이다. 허용 조합을 policy로 닫는다.

| same-cutoff canonical mastery | 허용 weakness status |
| --- | --- |
| `unknown` | `insufficient_evidence`, `watch` |
| `confused` | `watch`, `priority_candidate` |
| `wrong` | `watch`, `priority_candidate` |
| `confident_wrong` | `watch`, `priority_candidate` |
| `recovering` | `watch`, `recovery_watch` |
| `stable` | `watch`, `no_current_signal` |

- `insufficient_evidence`는 `unknown`과
  `classificationConfidence=not_estimated` 조합만 허용
- 다른 weakness status는 `not_estimated`를 허용하지 않고,
  classification confidence는 rule 분류의 근거 수준일 뿐 숙달률이 아님
- canonical mastery state를 같은 cutoff에서 resolve하지 못하면 usable
  concept snapshot을 release하지 않고 top-level map을
  `stale | insufficient_evidence`로 처리
- `wrong/confident_wrong + no_current_signal/recovery_watch`를 포함해
  표에 없는 모든 조합 금지
- 새 qualifying failure가 stable concept를 reopen하면 canonical mastery
  전이를 먼저 commit한 뒤 같은 cutoff에서 map을 재계산
- mastery와 weakness projection contradiction release 0

root cause와 graph edge도 닫힌 계약을 가진다.

```ts
type RootCauseHypothesisV1 = {
  id: string;
  learnerScopeRef: string;
  hypothesisVersion: string;
  targetConceptNodeRef: string;
  causeCodeRef: string;
  supportingEvidenceRefs: string[];
  counterEvidenceRefs: string[];
  status: "candidate" | "weakened" | "rejected" | "stale";
  disconfirmationPolicyVersion: string;
  parentHypothesisRef?: string;
  basisChecksum: string;
};

type PersonalWeaknessEdgeV1 = {
  edgeId: string;
  scopeRef: string;
  fromConceptNodeRef: string;
  toConceptNodeRef: string;
  relation:
    | "verified_prerequisite"
    | "verified_confused_with"
    | "verified_transfer"
    | "personal_cooccurrence"
    | "root_cause_candidate";
  direction: "directed" | "undirected";
  scope: "shared_verified_structure" | "learner_private_projection";
  curriculumEdgeRef?: string;
  curriculumGraphVersion: string;
  evidenceRefs: string[];
  rootCauseHypothesisRef?: string;
  status: "verified" | "candidate" | "weakened" | "rejected" | "stale";
  basisChecksum: string;
};

type PersonalWeaknessMapViewV1 = {
  projectionKey: string;
  learnerScopeRef: string;
  sourceMapContentChecksum: string;
  nodeRefs: string[];
  edges: PersonalWeaknessEdgeV1[];
  topCandidateConceptRefs: string[]; // 0..3
  primaryNextActionRef?: string;
  rendererPolicyVersion: string;
  viewChecksum: string;
};
```

verified prerequisite/confused-with/transfer edge는 current CurriculumGraph의
검증된 구조만 투영한다. personal co-occurrence와 root-cause edge는
인과 사실이 아니며 learner-private candidate다. supporting evidence가
있어도 counter evidence와 disconfirmation rule을 적용하고
`weakened/rejected/stale`로 되돌릴 수 있어야 한다. graph label에는
allowlisted taxonomy display label과 closed reason code만 쓰며
사용자가 작성한 free text를 복제하지 않는다.

structural relation은 `shared_verified_structure + verified` 조합만
허용한다. personal relation은 `learner_private_projection`만 허용하고
shared graph write 권한을 갖지 않는다. invalid relation/scope/status
조합은 release하지 않는다. structural edge는 exact
`curriculumEdgeRef/curriculumGraphVersion`을, personal edge는 exact
learner `scopeRef`를 요구한다.

view는 learner scope와 source map content checksum에 결합한다.
`viewChecksum`은 ordered node refs, 각 edge ID/checksum, top candidates,
primary action과 renderer policy의 canonical representation에서
계산한다. swapped private edge, 다른 learner/map version attachment,
top-3/action tampering과 scope/version/checksum mismatch는 release하지
않는다.

초기 rule priority는 다음 evidence만 bounded하게 조합한다.

1. 독립 시도의 high-confidence wrong
2. 서로 다른 eligible item에서 반복된 blocking/major gap
3. D+1 무도움 실패
4. D+7 verified-variant 무도움 실패
5. timed full solution에서의 재발
6. 검증된 prerequisite 영향
7. 최근 qualifying recovery 또는 후속 실패

불변식:

- guided/view/save만으로 개인 gap, weakness 또는 recovery를 만들지 않음
- assisted 성공과 same-item 재정답은 독립 recovery가 아님
- unattempted prerequisite를 adjacency만으로 weak로 추론하지 않음
- unknown 또는 unmapped concept는 weak가 아니라 unknown
- root cause는 supporting/counter evidence를 가진 반증 가능한 후보
- qualifying independent D+7/timed success만 recovery evidence를 강화
- qualifying failure/recurrence는 demote/reopen하며 ineligible event는
  state에 영향 0
- retry, replay와 다중 탭은 같은 idempotency key로 한 번만 계산
- multi-concept attribution unit의 중복·초과 배정 0
- client/model의 qualification·outcome·mapping·confidence spoof release 0
- taxonomy, mapping, source, rights, answer, rubric 또는 policy 변경 시
  관련 snapshot을 `stale`로 만들고 재계산
- Law effective-version missing/conflict/stale evidence의 candidate,
  recovery와 shadow 편입 0
- weakness projection 자체는 `stable`을 부여하거나 Today를 직접
  확정하지 못함

`ts-fsrs`는 별도 승인된 shadow/adapter에서 eligible ReviewUnit의
복습 시점 후보를 비교할 수 있을 뿐, weakness를 판정하거나 map,
mastery, queue 또는 Today를 직접 바꾸지 않는다.

#### cold start와 learner-facing UI

근거가 부족하면 약점을 꾸며내지 않는다.

허용 문구:

- `아직 판단할 기록이 부족합니다`
- `무도움 검증이 더 필요합니다`
- `취약 후보`
- `회복 중`
- `현재 뚜렷한 취약 신호 없음`

금지 문구:

- `당신의 진짜 숙달률`
- `합격확률`
- `예상 점수`
- `이 개념은 확실히 약합니다`
- 검증 전 BKT percentage

홈에는 evidence-backed 취약 후보 최대 3개와 다음 행동 하나만 보인다.
각 후보는 최소한 다음을 다시 열 수 있어야 한다.

- distinct eligible evidence 수
- 최근 evidence 시점
- independent/assisted qualification
- top reason code
- 관련 gap·repair·D+1/D+7/timed evidence

전체 graph는 별도 상세 화면의 progressive disclosure다.
`Cytoscape.js` 또는 동등 renderer는 서버가 만든 bounded view model만
표시한다. client에서 weakness, mastery, ranking을 계산하거나 쓰지
않는다.

renderer 불변식:

- graph를 꺼도 canonical DOM list/table과 다음 행동이 유지됨
- canonical DOM view가 표시된 모든 node와 edge의 relation type,
  direction, state, reason, evidence와 next action을 동등하게 제공
- graph-only action 없음
- 색상만으로 상태를 구분하지 않음
- canvas가 보조 장식이면 `aria-hidden`; interactive면 모든 node/edge의
  label, keyboard navigation, visible focus, focus restoration을 제공
- prefers-reduced-motion, zoom/pan control, keyboard, screen reader,
  200% reflow와 mobile collapsed view
- node 수 cap과 주변 node 단계적 펼치기
- allowlisted taxonomy display label 외 raw learner text 없음
- dependency version, license, SBOM과 공급망 검토

#### pyBKT 경계

pyBKT는 현재 canonical boundary대로 `benchmark_only`다.
다음을 모두 통과하기 전 learner-hidden shadow도 시작하지 않는다.

1. stable concept taxonomy와 versioned skill mapping
2. learner data를 쓰지 않는 synthetic/local adapter benchmark
3. open-response를
   `qualifying_success | qualifying_failure | ineligible`로 바꾸는
   검증된 adapter
4. exact O2 measurement purpose, consent/privacy와 export approval
5. exact active value registry에 대한 closed value-domain 및
   event-sufficiency validation
6. exact candidate payload와 cumulative release composition에 대한
   deterministic fail-closed reconstructiveness assessment
7. fixed/rule baseline과 pre-registered time-forward held-out target
8. leakage, version, rollback, retention, deletion과 drift policy

real learner event의 extraction, export, frozen/versioned prediction·inference
또는 evaluation은 exact O2와 approved export 전에 금지한다. O2 전
`benchmark_only`는 synthetic/local non-personal fixture만 뜻한다.

O2와 approved export는 fitting 권한이 아니다. real-learner-derived
observation을 사용한 parameter fitting, training, refit, parameter update
또는 dataset refresh는 **별도 future exact-scope O5**를 추가로 요구한다.
O2, export approval와 어떤 O4도 O5를 대체하지 않는다. O5 전에는
learner-derived observation을 train 또는 calibration-fitting partition에
넣을 수 없고, 승인된 frozen/versioned inference·evaluation partition에서만
사용할 수 있다. 이 문서는 그 경계만 기록하며 O5를 부여하지 않는다.

production event를 Shared Signal dataset으로 직접 복사하지 않는다. 기존
draft `ShadowObservationV1`, `ShadowExportBatchV1`,
`VaultShadowExportPreflightV1`, `VaultShadowCommitGrantV1`과
`InterventionOutcomeEventV1`은 value domain과 reconstructiveness
composition을 닫지 못했으므로 real-learner release에서
**unsupported/non-releaseable**이다. V1 golden vector는 과거 byte
재현을 확인하는 preservation evidence일 뿐 grant, writer, fallback,
automatic conversion 또는 mixed-version authority가 아니다.
이 docs-only correction에는 runtime migration, data migration 또는
activation이 없다.

지원되는 real-learner profile은 아래 common V2 family 하나다.

```ts
type SharedSignalExportValueDomainV1 =
  | "exact_o2_purpose"
  | "global_o2_approval_ref"
  | "global_o2_approval_class"
  | "evaluation_horizon"
  | "subject_adapter"
  | "exam_package"
  | "shared_skill"
  | "pre_state_class"
  | "intervention_policy"
  | "time_bucket_policy_version"
  | "time_bucket_value"
  | "taxonomy_version"
  | "mapping_adapter_version"
  | "label_policy_version"
  | "subject_pseudonym_policy_version"
  | "item_family_pseudonym_policy_version"
  | "pseudonym_rotation_policy_version"
  | "pseudonym_rotation_scope"
  | "shared_skill_allowlist_version"
  | "source_eligibility_allowlist_version"
  | "shadow_source_eligibility_class"
  | "shadow_event_class"
  | "shadow_outcome_class"
  | "shadow_qualification_class"
  | "intervention_kind"
  | "assistance_level"
  | "intervention_outcome_class"
  | "reconstructiveness_policy_version"
  | "risk_projection_manifest_version"
  | "observation_ordering_policy_version"
  | "batch_partition_policy_version"
  | "retention_policy"
  | "authorization_policy_version"
  | "revocation_policy_version"
  | "delete_propagation_policy_version"
  | "artifact_revocation_policy_version";

type ApprovedSharedSignalValueRefV2<
  TDomain extends SharedSignalExportValueDomainV1,
> = string & {
  readonly __approvedSharedSignalValueDomainV2: TDomain;
};

type ExactO2PurposeRefV2 =
  ApprovedSharedSignalValueRefV2<"exact_o2_purpose">;
type GlobalO2ApprovalRefV2 =
  ApprovedSharedSignalValueRefV2<"global_o2_approval_ref">;
type GlobalO2ApprovalClassV2 =
  ApprovedSharedSignalValueRefV2<"global_o2_approval_class">;
type EvaluationHorizonRefV2 =
  ApprovedSharedSignalValueRefV2<"evaluation_horizon">;
type SubjectAdapterRefV2 =
  ApprovedSharedSignalValueRefV2<"subject_adapter">;
type ExamPackageRefV2 =
  ApprovedSharedSignalValueRefV2<"exam_package">;
type SharedSkillRefV2 =
  ApprovedSharedSignalValueRefV2<"shared_skill">;
type PreStateClassRefV2 =
  ApprovedSharedSignalValueRefV2<"pre_state_class">;
type InterventionPolicyRefV2 =
  ApprovedSharedSignalValueRefV2<"intervention_policy">;
type TimeBucketPolicyVersionRefV2 =
  ApprovedSharedSignalValueRefV2<"time_bucket_policy_version">;
type ApprovedCoarseTimeBucketRefV2 =
  ApprovedSharedSignalValueRefV2<"time_bucket_value">;
type TaxonomyVersionRefV2 =
  ApprovedSharedSignalValueRefV2<"taxonomy_version">;
type MappingAdapterVersionRefV2 =
  ApprovedSharedSignalValueRefV2<"mapping_adapter_version">;
type LabelPolicyVersionRefV2 =
  ApprovedSharedSignalValueRefV2<"label_policy_version">;
type SubjectPseudonymPolicyVersionRefV2 =
  ApprovedSharedSignalValueRefV2<"subject_pseudonym_policy_version">;
type ItemFamilyPseudonymPolicyVersionRefV2 =
  ApprovedSharedSignalValueRefV2<"item_family_pseudonym_policy_version">;
type PseudonymRotationPolicyVersionRefV2 =
  ApprovedSharedSignalValueRefV2<"pseudonym_rotation_policy_version">;
type PseudonymRotationScopeRefV2 =
  ApprovedSharedSignalValueRefV2<"pseudonym_rotation_scope">;
type SharedSkillAllowlistVersionRefV2 =
  ApprovedSharedSignalValueRefV2<"shared_skill_allowlist_version">;
type SourceEligibilityAllowlistVersionRefV2 =
  ApprovedSharedSignalValueRefV2<
    "source_eligibility_allowlist_version"
  >;
type ReconstructivenessPolicyVersionRefV2 =
  ApprovedSharedSignalValueRefV2<"reconstructiveness_policy_version">;
type RiskProjectionManifestVersionRefV2 =
  ApprovedSharedSignalValueRefV2<"risk_projection_manifest_version">;
type ObservationOrderingPolicyVersionRefV2 =
  ApprovedSharedSignalValueRefV2<
    "observation_ordering_policy_version"
  >;
type BatchPartitionPolicyVersionRefV2 =
  ApprovedSharedSignalValueRefV2<"batch_partition_policy_version">;
type RetentionPolicyRefV2 =
  ApprovedSharedSignalValueRefV2<"retention_policy">;
type AuthorizationPolicyVersionRefV2 =
  ApprovedSharedSignalValueRefV2<"authorization_policy_version">;
type RevocationPolicyVersionRefV2 =
  ApprovedSharedSignalValueRefV2<"revocation_policy_version">;
type DeletePropagationPolicyVersionRefV2 =
  ApprovedSharedSignalValueRefV2<
    "delete_propagation_policy_version"
  >;
type ArtifactRevocationPolicyVersionRefV2 =
  ApprovedSharedSignalValueRefV2<
    "artifact_revocation_policy_version"
  >;

type SharedSignalExportRegistryContractIdV1 =
  "shared_signal_export_value_registry.v1";
type SharedSignalExportRegistryContractVersionV1 = "1";
type SharedSignalExportRegistrySnapshotIdV1 =
  string & { readonly __brand: "shared_signal_registry_snapshot_id_v1" };
type SharedSignalExportRegistrySnapshotVersionV1 =
  string & {
    readonly __brand: "shared_signal_registry_snapshot_version_v1";
  };
type NonPrivateRegistryBasisChecksumV1 =
  string & { readonly __brand: "non_private_registry_basis_sha256_v1" };
type TrustedRegistryControlTimeV1 =
  string & { readonly __brand: "trusted_registry_control_rfc3339_utc_v1" };
type FiniteNonNegativeSafeIntegerV2 =
  number & { readonly __brand: "finite_non_negative_safe_integer_v2" };
type PositiveSafeIntegerV2 =
  number & { readonly __brand: "positive_safe_integer_v2" };
type SharedSignalSequenceIndexV2 =
  number & { readonly __brand: "zero_based_contiguous_sequence_index_v2" };

type ShadowSourceEligibilityClassV2 =
  | "verified_practical"
  | "supported_theory"
  | "effective_version_bound_law";
type ShadowEventClassV2 =
  | "attempt"
  | "repair"
  | "d1_recall"
  | "d7_transfer"
  | "timed_full_solution";
type ShadowOutcomeClassV2 =
  | "qualifying_success"
  | "qualifying_failure";
type ShadowQualificationClassV2 = "independent_eligible";
type SharedInterventionKindV2 =
  | "orient"
  | "recall"
  | "contrast"
  | "rewrite"
  | "recalculate"
  | "verified_variant"
  | "timed_set"
  | "timed_full_solution";
type SharedAssistanceLevelV2 =
  | "none"
  | "recall_cue"
  | "concept_hint"
  | "structural_hint"
  | "partial_example"
  | "full_solution_revealed";
type InterventionOutcomeClassV2 =
  | "qualifying_success"
  | "qualifying_failure"
  | "abstained"
  | "ineligible";

type SharedSignalExportValueRegistryV1 = {
  registryContractId: SharedSignalExportRegistryContractIdV1;
  registryContractVersion:
    SharedSignalExportRegistryContractVersionV1;
  snapshotId: SharedSignalExportRegistrySnapshotIdV1;
  snapshotVersion: SharedSignalExportRegistrySnapshotVersionV1;
  exactPurposeRef: ExactO2PurposeRefV2;
  globalO2ApprovalRef: GlobalO2ApprovalRefV2;
  globalO2ApprovalClass: GlobalO2ApprovalClassV2;
  evaluationHorizonRef: EvaluationHorizonRefV2;
  approvedSubjectAdapterRefs: readonly SubjectAdapterRefV2[];
  approvedExamPackageRefs: readonly ExamPackageRefV2[];
  approvedSharedSkillRefs: readonly SharedSkillRefV2[];
  approvedPreStateClassRefs: readonly PreStateClassRefV2[];
  approvedInterventionPolicyRefs:
    readonly InterventionPolicyRefV2[];
  approvedTimeBucketPolicyVersionRefs:
    readonly TimeBucketPolicyVersionRefV2[];
  approvedCoarseTimeBucketRefs:
    readonly ApprovedCoarseTimeBucketRefV2[];
  approvedTaxonomyVersionRefs: readonly TaxonomyVersionRefV2[];
  approvedMappingAdapterVersionRefs:
    readonly MappingAdapterVersionRefV2[];
  approvedLabelPolicyVersionRefs:
    readonly LabelPolicyVersionRefV2[];
  approvedSubjectPseudonymPolicyVersionRefs:
    readonly SubjectPseudonymPolicyVersionRefV2[];
  approvedItemFamilyPseudonymPolicyVersionRefs:
    readonly ItemFamilyPseudonymPolicyVersionRefV2[];
  approvedPseudonymRotationPolicyVersionRefs:
    readonly PseudonymRotationPolicyVersionRefV2[];
  approvedPseudonymRotationScopeRefs:
    readonly PseudonymRotationScopeRefV2[];
  approvedSharedSkillAllowlistVersionRefs:
    readonly SharedSkillAllowlistVersionRefV2[];
  approvedSourceEligibilityAllowlistVersionRefs:
    readonly SourceEligibilityAllowlistVersionRefV2[];
  approvedReconstructivenessPolicyVersionRefs:
    readonly ReconstructivenessPolicyVersionRefV2[];
  approvedRiskProjectionManifestVersionRefs:
    readonly RiskProjectionManifestVersionRefV2[];
  approvedObservationOrderingPolicyVersionRefs:
    readonly ObservationOrderingPolicyVersionRefV2[];
  approvedBatchPartitionPolicyVersionRefs:
    readonly BatchPartitionPolicyVersionRefV2[];
  approvedRetentionPolicyRefs: readonly RetentionPolicyRefV2[];
  approvedAuthorizationPolicyVersionRefs:
    readonly AuthorizationPolicyVersionRefV2[];
  approvedRevocationPolicyVersionRefs:
    readonly RevocationPolicyVersionRefV2[];
  approvedDeletePropagationPolicyVersionRefs:
    readonly DeletePropagationPolicyVersionRefV2[];
  approvedArtifactRevocationPolicyVersionRefs:
    readonly ArtifactRevocationPolicyVersionRefV2[];
  approvedSourceEligibilityClasses:
    readonly ShadowSourceEligibilityClassV2[];
  approvedShadowEventClasses: readonly ShadowEventClassV2[];
  approvedShadowOutcomeClasses: readonly ShadowOutcomeClassV2[];
  approvedShadowQualificationClasses:
    readonly ShadowQualificationClassV2[];
  approvedInterventionKinds: readonly SharedInterventionKindV2[];
  approvedAssistanceLevels: readonly SharedAssistanceLevelV2[];
  approvedInterventionOutcomeClasses:
    readonly InterventionOutcomeClassV2[];
  timeBucketDerivationPolicy: {
    authority: "trusted_server";
    source: "vault_authoritative_event_time";
    output: "approved_coarse_time_bucket_ref_only";
    rejectedTransportClasses: readonly [
      "rfc3339_or_iso_timestamp",
      "epoch_seconds_or_milliseconds",
      "timezone_or_locale_date",
      "exact_event_time",
      "arbitrary_calendar_text",
      "client_or_model_label",
      "unknown_or_custom_bucket",
      "finer_than_o2_approved_granularity",
    ];
  };
  numericLimits: {
    domainCardinalityLimits: {
      [TDomain in SharedSignalExportValueDomainV1]:
        PositiveSafeIntegerV2;
    };
    maximumEventsPerBatch: PositiveSafeIntegerV2;
    maximumEventsPerSubjectPerBatch: PositiveSafeIntegerV2;
    maximumCumulativeEventsPerSubjectLinkabilityWindow:
      PositiveSafeIntegerV2;
    maximumDistinctSubjectsPerBatch: PositiveSafeIntegerV2;
  };
  effectiveAt: TrustedRegistryControlTimeV1;
  expiresAt: TrustedRegistryControlTimeV1;
  status: "approved" | "expired" | "revoked";
  trustedBasisChecksum: NonPrivateRegistryBasisChecksumV1;
};

type SharedSignalLocalRowIdV2 =
  string & { readonly __brand: "shared_signal_local_row_id_v2" };
type SharedSignalLogicalBatchIdV2 =
  string & { readonly __brand: "shared_signal_logical_batch_id_v2" };
type O2PseudonymousSubjectKeyV2 =
  string & { readonly __brand: "o2_pseudonymous_subject_key_v2" };
type SharedItemFamilyPseudonymV2 =
  string & { readonly __brand: "shared_item_family_pseudonym_v2" };
type O2DomainSeparatedDedupeKeyV2 =
  string & { readonly __brand: "o2_domain_separated_dedupe_key_v2" };

type SharedSignalExportEventKindV2 =
  | "shadow_observation"
  | "intervention_outcome";
type SharedSignalExportEventHeaderV2<
  TEventKind extends SharedSignalExportEventKindV2,
> = {
  eventKind: TEventKind;
  sharedSignalRowId: SharedSignalLocalRowIdV2;
  pseudonymousSubjectKey: O2PseudonymousSubjectKeyV2;
  sequenceIndex: SharedSignalSequenceIndexV2;
  dedupeKey: O2DomainSeparatedDedupeKeyV2;
};

type ShadowObservationV2 =
  SharedSignalExportEventHeaderV2<"shadow_observation"> & {
  sharedSkillRef: SharedSkillRefV2;
  sharedItemFamilyPseudonym: SharedItemFamilyPseudonymV2;
  shadowEventClass: ShadowEventClassV2;
  outcomeClass: ShadowOutcomeClassV2;
  qualificationClass: ShadowQualificationClassV2;
  occurredAtBucketRef: ApprovedCoarseTimeBucketRefV2;
  subjectAdapterRef: SubjectAdapterRefV2;
  sourceEligibilityClass: ShadowSourceEligibilityClassV2;
};

type InterventionOutcomeEventV2 =
  SharedSignalExportEventHeaderV2<"intervention_outcome"> & {
  examPackageRef: ExamPackageRefV2;
  sharedSkillRef: SharedSkillRefV2;
  sharedItemFamilyPseudonym: SharedItemFamilyPseudonymV2;
  preStateClassRef: PreStateClassRefV2;
  interventionPolicyRef: InterventionPolicyRefV2;
  interventionKind: SharedInterventionKindV2;
  assistanceLevel: SharedAssistanceLevelV2;
  outcomeClass: InterventionOutcomeClassV2;
  occurredAtBucketRef: ApprovedCoarseTimeBucketRefV2;
  subjectAdapterRef: SubjectAdapterRefV2;
  sourceEligibilityClass: ShadowSourceEligibilityClassV2;
};

type SharedSignalExportEventV2 =
  | ShadowObservationV2
  | InterventionOutcomeEventV2;

type SharedSignalExportPayloadDigestProfileV2 =
  "shared_signal_export_payload_rfc8785_sha256.v2";
type SharedSignalExportPayloadDigestV2 =
  string & { readonly __brand: "shared_signal_export_payload_digest_v2" };
type SharedSignalExportEnvelopeCommitmentV2 =
  string & {
    readonly __brand: "shared_signal_export_envelope_commitment_v2";
  };

type SharedSignalExportBatchDigestPayloadV2 = {
  id: SharedSignalLogicalBatchIdV2;
  digestProfileVersion: SharedSignalExportPayloadDigestProfileV2;
  registryContractId: SharedSignalExportRegistryContractIdV1;
  registryContractVersion:
    SharedSignalExportRegistryContractVersionV1;
  registrySnapshotId: SharedSignalExportRegistrySnapshotIdV1;
  registrySnapshotVersion:
    SharedSignalExportRegistrySnapshotVersionV1;
  registryBasisChecksum: NonPrivateRegistryBasisChecksumV1;
  exactPurposeRef: ExactO2PurposeRefV2;
  globalO2ApprovalRef: GlobalO2ApprovalRefV2;
  globalO2ApprovalClass: GlobalO2ApprovalClassV2;
  consentPurpose: "pseudonymous_product_signal";
  authorizationClass:
    "o2_plus_active_exact_purpose_product_signal_consent";
  authorizationDecision: "authorized";
  evaluationHorizonRef: EvaluationHorizonRefV2;
  timeBucketPolicyVersionRef: TimeBucketPolicyVersionRefV2;
  taxonomyVersionRef: TaxonomyVersionRefV2;
  mappingAdapterVersionRef: MappingAdapterVersionRefV2;
  labelPolicyVersionRef: LabelPolicyVersionRefV2;
  subjectPseudonymPolicyVersionRef:
    SubjectPseudonymPolicyVersionRefV2;
  itemFamilyPseudonymPolicyVersionRef:
    ItemFamilyPseudonymPolicyVersionRefV2;
  pseudonymRotationPolicyVersionRef:
    PseudonymRotationPolicyVersionRefV2;
  pseudonymRotationScopeRef: PseudonymRotationScopeRefV2;
  sharedSkillAllowlistVersionRef:
    SharedSkillAllowlistVersionRefV2;
  sourceEligibilityAllowlistVersionRef:
    SourceEligibilityAllowlistVersionRefV2;
  reconstructivenessPolicyVersionRef:
    ReconstructivenessPolicyVersionRefV2;
  riskProjectionManifestVersionRef:
    RiskProjectionManifestVersionRefV2;
  observationOrderingPolicyVersionRef:
    ObservationOrderingPolicyVersionRefV2;
  batchPartitionPolicyVersionRef:
    BatchPartitionPolicyVersionRefV2;
  retentionPolicyRef: RetentionPolicyRefV2;
  authorizationPolicyVersionRef:
    AuthorizationPolicyVersionRefV2;
  revocationPolicyVersionRef: RevocationPolicyVersionRefV2;
  deletePropagationPolicyVersionRef:
    DeletePropagationPolicyVersionRefV2;
  artifactRevocationPolicyVersionRef:
    ArtifactRevocationPolicyVersionRefV2;
  events: readonly SharedSignalExportEventV2[];
};

type SharedSignalExportBatchV2 =
  SharedSignalExportBatchDigestPayloadV2 & {
    exportDigest: SharedSignalExportPayloadDigestV2;
  };

type VaultOnlyRefV2<TName extends string> =
  string & { readonly __vaultOnlyRefV2: TName };
type VaultOnlyCommitmentV2<TName extends string> =
  string & { readonly __vaultOnlyCommitmentV2: TName };
type VaultAuditTimeV2 =
  string & { readonly __brand: "vault_audit_rfc3339_utc_v2" };

type VaultSharedSignalReconstructivenessPolicyV2 = {
  vaultOnly: true;
  reconstructivenessPolicyVersionRef:
    ReconstructivenessPolicyVersionRefV2;
  riskProjectionManifestVersionRef:
    RiskProjectionManifestVersionRefV2;
  kMin: PositiveSafeIntegerV2;
  maximumEventsPerBatch: PositiveSafeIntegerV2;
  maximumEventsPerSubjectPerBatch: PositiveSafeIntegerV2;
  maximumCumulativeEventsPerSubjectLinkabilityWindow:
    PositiveSafeIntegerV2;
  allowedTimeBucketPolicyVersionRef:
    TimeBucketPolicyVersionRefV2;
  exactQuasiIdentifierProjectionCatalogRef:
    VaultOnlyRefV2<"exact_quasi_identifier_projection_catalog">;
  exactAuxiliaryKnowledgeFixtureVersionRef:
    VaultOnlyRefV2<"auxiliary_knowledge_fixture_version">;
  exactJoinableSurfacePolicyRef:
    VaultOnlyRefV2<"cross_domain_joinable_surface_policy">;
  exactUniquenessAndCompositionLimitSetRef:
    VaultOnlyRefV2<"uniqueness_linkability_composition_limits">;
  exactAcceptedPreFreezeMitigationSetRef:
    VaultOnlyRefV2<"accepted_pre_freeze_mitigation_set">;
};

type VaultSharedSignalReconstructivenessDecisionV2 =
  | "pass"
  | "reject"
  | "indeterminate";
type VaultSharedSignalReconstructivenessReasonCodeV2 =
  | "all_required_projections_supported"
  | "rare_or_unique_trace"
  | "projection_support_below_k_min"
  | "population_missing_or_insufficient"
  | "joinable_surface_unknown"
  | "composition_budget_exceeded"
  | "prior_release_differencing_risk"
  | "concurrent_reservation_conflict"
  | "policy_or_registry_mismatch"
  | "stale_generation"
  | "evaluator_timeout_or_unavailable"
  | "coverage_incomplete";

type VaultSharedSignalReconstructivenessAssessmentV2 = {
  vaultOnly: true;
  assessmentRef:
    VaultOnlyRefV2<"shared_signal_reconstructiveness_assessment">;
  candidateBatchId: SharedSignalLogicalBatchIdV2;
  payloadDigestProfileVersion:
    SharedSignalExportPayloadDigestProfileV2;
  recomputedPayloadDigest: SharedSignalExportPayloadDigestV2;
  canonicalEnvelopeCommitment:
    SharedSignalExportEnvelopeCommitmentV2;
  canonicalEnvelopeOctetLength: PositiveSafeIntegerV2;
  registryContractId: SharedSignalExportRegistryContractIdV1;
  registryContractVersion:
    SharedSignalExportRegistryContractVersionV1;
  registrySnapshotId: SharedSignalExportRegistrySnapshotIdV1;
  registrySnapshotVersion:
    SharedSignalExportRegistrySnapshotVersionV1;
  registryBasisChecksum: NonPrivateRegistryBasisChecksumV1;
  reconstructivenessPolicyVersionRef:
    ReconstructivenessPolicyVersionRefV2;
  riskProjectionManifestVersionRef:
    RiskProjectionManifestVersionRefV2;
  observationOrderingPolicyVersionRef:
    ObservationOrderingPolicyVersionRefV2;
  batchPartitionPolicyVersionRef:
    BatchPartitionPolicyVersionRefV2;
  exactPurposeRef: ExactO2PurposeRefV2;
  evaluationHorizonRef: EvaluationHorizonRefV2;
  pseudonymRotationPolicyVersionRef:
    PseudonymRotationPolicyVersionRefV2;
  pseudonymRotationScopeRef: PseudonymRotationScopeRefV2;
  pseudonymRotationGenerationRef:
    VaultOnlyRefV2<"pseudonym_rotation_generation">;
  eligibleReferencePopulationSnapshotRef:
    VaultOnlyRefV2<"eligible_reference_population_snapshot">;
  eligibleReferencePopulationSnapshotCommitment:
    VaultOnlyCommitmentV2<"eligible_reference_population_snapshot">;
  eligibleReferencePopulationGeneration:
    FiniteNonNegativeSafeIntegerV2;
  joinableDisclosureSurfaceScopeRef:
    VaultOnlyRefV2<"authority_selected_joinable_surface_scope">;
  joinableDisclosureSurfaceCommitment:
    VaultOnlyCommitmentV2<"joinable_disclosure_surface">;
  compositionLedgerScopeRef:
    VaultOnlyRefV2<"release_composition_ledger_scope">;
  compositionLedgerGeneration: FiniteNonNegativeSafeIntegerV2;
  compositionLedgerCommitment:
    VaultOnlyCommitmentV2<"release_composition_ledger">;
  preparedReservationRef:
    VaultOnlyRefV2<"shared_signal_release_reservation">;
  preparedReservationGeneration:
    FiniteNonNegativeSafeIntegerV2;
  preparedReservationState: "prepared";
  includedHumanSubjectScopeRef:
    VaultOnlyRefV2<"included_distinct_human_subject_scope">;
  includedHumanSubjectScopeCommitment:
    VaultOnlyCommitmentV2<"included_distinct_human_subject_scope">;
  includedObservationScopeRef:
    VaultOnlyRefV2<"included_observation_scope">;
  includedObservationScopeCommitment:
    VaultOnlyCommitmentV2<"included_observation_scope">;
  assessedAt: VaultAuditTimeV2;
  expiresAt: VaultAuditTimeV2;
  decision: VaultSharedSignalReconstructivenessDecisionV2;
  reasonCodes:
    readonly VaultSharedSignalReconstructivenessReasonCodeV2[];
  coverageEvidenceRef:
    VaultOnlyRefV2<"complete_risk_projection_coverage_evidence">;
  evaluatorIdentityRef:
    VaultOnlyRefV2<"trusted_reconstructiveness_evaluator">;
  evaluatorVersionRef:
    VaultOnlyRefV2<"trusted_reconstructiveness_evaluator_version">;
};

type VaultSharedSignalReleaseCompositionLedgerV2 = {
  vaultOnly: true;
  componentScopeRef:
    VaultOnlyRefV2<"authority_selected_joinability_component">;
  exactPurposeRef: ExactO2PurposeRefV2;
  includedEvaluationHorizonRefs:
    readonly EvaluationHorizonRefV2[];
  includedPseudonymRotationPolicyVersionRefs:
    readonly PseudonymRotationPolicyVersionRefV2[];
  includedPseudonymRotationScopeRefs:
    readonly PseudonymRotationScopeRefV2[];
  includedPseudonymRotationGenerationRefs:
    readonly VaultOnlyRefV2<"pseudonym_rotation_generation">[];
  generation: FiniteNonNegativeSafeIntegerV2;
  commitment: VaultOnlyCommitmentV2<"release_composition_ledger">;
  irreversibleDisclosureHistoryRef:
    VaultOnlyRefV2<"irreversible_disclosure_history">;
  activeReleaseSurfaceRef:
    VaultOnlyRefV2<"active_release_surface">;
  activeSurfaceGeneration: FiniteNonNegativeSafeIntegerV2;
  preparedReservationSetRef:
    VaultOnlyRefV2<"prepared_release_reservation_set">;
  historySufficiency:
    | "sufficient"
    | "missing"
    | "damaged"
    | "unsafe_to_reconcile";
};

type VaultSharedSignalReleaseReservationV2 = {
  vaultOnly: true;
  reservationRef:
    VaultOnlyRefV2<"shared_signal_release_reservation">;
  reservationGeneration: FiniteNonNegativeSafeIntegerV2;
  candidateBatchId: SharedSignalLogicalBatchIdV2;
  registrySnapshotVersion:
    SharedSignalExportRegistrySnapshotVersionV1;
  registryBasisChecksum: NonPrivateRegistryBasisChecksumV1;
  reconstructivenessPolicyVersionRef:
    ReconstructivenessPolicyVersionRefV2;
  riskProjectionManifestVersionRef:
    RiskProjectionManifestVersionRefV2;
  observationOrderingPolicyVersionRef:
    ObservationOrderingPolicyVersionRefV2;
  batchPartitionPolicyVersionRef:
    BatchPartitionPolicyVersionRefV2;
  exactPurposeRef: ExactO2PurposeRefV2;
  evaluationHorizonRef: EvaluationHorizonRefV2;
  pseudonymRotationPolicyVersionRef:
    PseudonymRotationPolicyVersionRefV2;
  pseudonymRotationScopeRef: PseudonymRotationScopeRefV2;
  pseudonymRotationGenerationRef:
    VaultOnlyRefV2<"pseudonym_rotation_generation">;
  componentScopeRef:
    VaultOnlyRefV2<"authority_selected_joinability_component">;
  compositionLedgerGeneration: FiniteNonNegativeSafeIntegerV2;
  payloadDigest: SharedSignalExportPayloadDigestV2;
  canonicalEnvelopeCommitment:
    SharedSignalExportEnvelopeCommitmentV2;
  canonicalEnvelopeOctetLength: PositiveSafeIntegerV2;
  proposedSharedSignalRowIds: readonly SharedSignalLocalRowIdV2[];
  state: "prepared" | "consumed" | "invalidated" | "expired";
  expiresAt: VaultAuditTimeV2;
};

type VaultSharedSignalExportPreflightV2 = {
  vaultOnly: true;
  proposedBatchId: SharedSignalLogicalBatchIdV2;
  payloadDigestProfileVersion:
    SharedSignalExportPayloadDigestProfileV2;
  exactPurposeRef: ExactO2PurposeRefV2;
  globalO2ApprovalRef: GlobalO2ApprovalRefV2;
  globalO2ApprovalClass: GlobalO2ApprovalClassV2;
  consentPurpose: "pseudonymous_product_signal";
  registryContractId: SharedSignalExportRegistryContractIdV1;
  registryContractVersion:
    SharedSignalExportRegistryContractVersionV1;
  registrySnapshotId: SharedSignalExportRegistrySnapshotIdV1;
  registrySnapshotVersion:
    SharedSignalExportRegistrySnapshotVersionV1;
  registryBasisChecksum: NonPrivateRegistryBasisChecksumV1;
  reconstructivenessAssessmentRef:
    VaultOnlyRefV2<"shared_signal_reconstructiveness_assessment">;
  reconstructivenessAssessmentCommitment:
    VaultOnlyCommitmentV2<"shared_signal_reconstructiveness_assessment">;
  reconstructivenessDecision: "pass";
  reconstructivenessPolicyVersionRef:
    ReconstructivenessPolicyVersionRefV2;
  riskProjectionManifestVersionRef:
    RiskProjectionManifestVersionRefV2;
  observationOrderingPolicyVersionRef:
    ObservationOrderingPolicyVersionRefV2;
  batchPartitionPolicyVersionRef:
    BatchPartitionPolicyVersionRefV2;
  eligibleReferencePopulationGeneration:
    FiniteNonNegativeSafeIntegerV2;
  joinableDisclosureSurfaceScopeRef:
    VaultOnlyRefV2<"authority_selected_joinable_surface_scope">;
  joinableDisclosureSurfaceCommitment:
    VaultOnlyCommitmentV2<"joinable_disclosure_surface">;
  compositionLedgerScopeRef:
    VaultOnlyRefV2<"release_composition_ledger_scope">;
  compositionLedgerGeneration: FiniteNonNegativeSafeIntegerV2;
  compositionLedgerCommitment:
    VaultOnlyCommitmentV2<"release_composition_ledger">;
  preparedReservationRef:
    VaultOnlyRefV2<"shared_signal_release_reservation">;
  preparedReservationGeneration:
    FiniteNonNegativeSafeIntegerV2;
  preparedReservationState: "prepared";
  proposedPayloadDigest: SharedSignalExportPayloadDigestV2;
  proposedCanonicalEnvelopeCommitment:
    SharedSignalExportEnvelopeCommitmentV2;
  proposedCanonicalEnvelopeOctetLength: PositiveSafeIntegerV2;
  proposedSharedSignalRowIds: readonly SharedSignalLocalRowIdV2[];
  subjectAuthorizationManifestRef:
    VaultOnlyRefV2<"subject_authorization_manifest">;
  subjectAuthorizationManifestCommitment:
    VaultOnlyCommitmentV2<"subject_authorization_manifest">;
  consentLedgerResolutionRef:
    VaultOnlyRefV2<"exact_consent_ledger_resolution">;
  consentLedgerResolutionCommitment:
    VaultOnlyCommitmentV2<"exact_consent_ledger_resolution">;
  includedSubjectConsentGenerationSetDigest:
    VaultOnlyCommitmentV2<"included_subject_consent_generation_set">;
  vaultScopedSourceEventSetCommitment:
    VaultOnlyCommitmentV2<"vault_scoped_source_event_set">;
  authorizationGenerationRef:
    VaultOnlyRefV2<"shared_signal_authorization_generation">;
  exactO2ApprovalGeneration:
    VaultOnlyRefV2<"exact_o2_approval_generation">;
  consentNoticeAndPolicyVersionRef:
    VaultOnlyRefV2<"consent_notice_and_policy_version">;
  retentionPolicyRef: RetentionPolicyRefV2;
  retentionStateRef: VaultOnlyRefV2<"current_retention_state">;
  evaluationHorizonRef: EvaluationHorizonRefV2;
  pseudonymRotationPolicyVersionRef:
    PseudonymRotationPolicyVersionRefV2;
  pseudonymRotationScopeRef: PseudonymRotationScopeRefV2;
  pseudonymRotationGenerationRef:
    VaultOnlyRefV2<"pseudonym_rotation_generation">;
  authorizationPolicyVersionRef:
    AuthorizationPolicyVersionRefV2;
  downstreamLineageRef:
    VaultOnlyRefV2<"shared_signal_downstream_lineage">;
  downstreamLineageCommitment:
    VaultOnlyCommitmentV2<"shared_signal_downstream_lineage">;
  affectedDownstreamArtifactSetRef:
    VaultOnlyRefV2<"affected_downstream_artifact_set">;
  affectedDownstreamArtifactSetCommitment:
    VaultOnlyCommitmentV2<"affected_downstream_artifact_set">;
  preparedCommitGrantRef:
    VaultOnlyRefV2<"shared_signal_single_use_commit_grant">;
  preparedCommitGrantCommitment:
    VaultOnlyCommitmentV2<"shared_signal_single_use_commit_grant">;
  preparedCommitGrantState: "prepared";
  preflightExpiresAt: VaultAuditTimeV2;
  preparedCommitGrantExpiresAt: VaultAuditTimeV2;
  replayProtectionRef:
    VaultOnlyRefV2<"single_use_replay_protection">;
  extractionAuthorizationCheckedAt: VaultAuditTimeV2;
  releaseAuthorizationCheckedAt: VaultAuditTimeV2;
  checkedAtAuthority: "audit_evidence_only";
  authorizationInvariant: "verified_preflight_not_commit_authority";
};

type VaultSharedSignalCommitGrantV2 = {
  vaultOnly: true;
  grantRef: VaultOnlyRefV2<"shared_signal_single_use_commit_grant">;
  proposedBatchId: SharedSignalLogicalBatchIdV2;
  payloadDigestProfileVersion:
    SharedSignalExportPayloadDigestProfileV2;
  payloadDigest: SharedSignalExportPayloadDigestV2;
  canonicalEnvelopeCommitment:
    SharedSignalExportEnvelopeCommitmentV2;
  canonicalEnvelopeOctetLength: PositiveSafeIntegerV2;
  proposedSharedSignalRowIds: readonly SharedSignalLocalRowIdV2[];
  registryContractId: SharedSignalExportRegistryContractIdV1;
  registryContractVersion:
    SharedSignalExportRegistryContractVersionV1;
  registrySnapshotId: SharedSignalExportRegistrySnapshotIdV1;
  registrySnapshotVersion:
    SharedSignalExportRegistrySnapshotVersionV1;
  registryBasisChecksum: NonPrivateRegistryBasisChecksumV1;
  reconstructivenessAssessmentRef:
    VaultOnlyRefV2<"shared_signal_reconstructiveness_assessment">;
  reconstructivenessAssessmentCommitment:
    VaultOnlyCommitmentV2<"shared_signal_reconstructiveness_assessment">;
  reconstructivenessDecision: "pass";
  reconstructivenessPolicyVersionRef:
    ReconstructivenessPolicyVersionRefV2;
  riskProjectionManifestVersionRef:
    RiskProjectionManifestVersionRefV2;
  observationOrderingPolicyVersionRef:
    ObservationOrderingPolicyVersionRefV2;
  batchPartitionPolicyVersionRef:
    BatchPartitionPolicyVersionRefV2;
  eligibleReferencePopulationGeneration:
    FiniteNonNegativeSafeIntegerV2;
  joinableDisclosureSurfaceScopeRef:
    VaultOnlyRefV2<"authority_selected_joinable_surface_scope">;
  joinableDisclosureSurfaceCommitment:
    VaultOnlyCommitmentV2<"joinable_disclosure_surface">;
  compositionLedgerScopeRef:
    VaultOnlyRefV2<"release_composition_ledger_scope">;
  compositionLedgerGeneration: FiniteNonNegativeSafeIntegerV2;
  compositionLedgerCommitment:
    VaultOnlyCommitmentV2<"release_composition_ledger">;
  preparedReservationRef:
    VaultOnlyRefV2<"shared_signal_release_reservation">;
  preparedReservationGeneration:
    FiniteNonNegativeSafeIntegerV2;
  preparedReservationState: "prepared";
  authorizationGenerationRef:
    VaultOnlyRefV2<"shared_signal_authorization_generation">;
  exactPurposeRef: ExactO2PurposeRefV2;
  globalO2ApprovalRef: GlobalO2ApprovalRefV2;
  globalO2ApprovalClass: GlobalO2ApprovalClassV2;
  exactO2ApprovalGeneration:
    VaultOnlyRefV2<"exact_o2_approval_generation">;
  consentPurpose: "pseudonymous_product_signal";
  includedSubjectConsentGenerationSetDigest:
    VaultOnlyCommitmentV2<"included_subject_consent_generation_set">;
  subjectAuthorizationManifestRef:
    VaultOnlyRefV2<"subject_authorization_manifest">;
  subjectAuthorizationManifestCommitment:
    VaultOnlyCommitmentV2<"subject_authorization_manifest">;
  consentLedgerResolutionRef:
    VaultOnlyRefV2<"exact_consent_ledger_resolution">;
  consentLedgerResolutionCommitment:
    VaultOnlyCommitmentV2<"exact_consent_ledger_resolution">;
  vaultScopedSourceEventSetCommitment:
    VaultOnlyCommitmentV2<"vault_scoped_source_event_set">;
  consentNoticeAndPolicyVersionRef:
    VaultOnlyRefV2<"consent_notice_and_policy_version">;
  retentionPolicyRef: RetentionPolicyRefV2;
  retentionStateRef: VaultOnlyRefV2<"current_retention_state">;
  evaluationHorizonRef: EvaluationHorizonRefV2;
  pseudonymRotationPolicyVersionRef:
    PseudonymRotationPolicyVersionRefV2;
  pseudonymRotationScopeRef: PseudonymRotationScopeRefV2;
  pseudonymRotationGenerationRef:
    VaultOnlyRefV2<"pseudonym_rotation_generation">;
  authorizationPolicyVersionRef:
    AuthorizationPolicyVersionRefV2;
  downstreamLineageRef:
    VaultOnlyRefV2<"shared_signal_downstream_lineage">;
  downstreamLineageCommitment:
    VaultOnlyCommitmentV2<"shared_signal_downstream_lineage">;
  affectedDownstreamArtifactSetRef:
    VaultOnlyRefV2<"affected_downstream_artifact_set">;
  affectedDownstreamArtifactSetCommitment:
    VaultOnlyCommitmentV2<"affected_downstream_artifact_set">;
  state: "prepared" | "consumed" | "invalidated" | "expired";
  expiresAt: VaultAuditTimeV2;
  replayProtectionRef:
    VaultOnlyRefV2<"single_use_replay_protection">;
};

type VaultSharedSignalDownstreamLineageV2 = {
  vaultOnly: true;
  schemaVersion: "shared_signal_export_batch.v2";
  payloadDigestProfileVersion:
    SharedSignalExportPayloadDigestProfileV2;
  registryContractId: SharedSignalExportRegistryContractIdV1;
  registryContractVersion:
    SharedSignalExportRegistryContractVersionV1;
  registrySnapshotId: SharedSignalExportRegistrySnapshotIdV1;
  registrySnapshotVersion:
    SharedSignalExportRegistrySnapshotVersionV1;
  registryBasisChecksum: NonPrivateRegistryBasisChecksumV1;
  authorizationGenerationRef:
    VaultOnlyRefV2<"shared_signal_authorization_generation">;
  distinctHumanSubjectScopeRef:
    VaultOnlyRefV2<"distinct_human_subject_scope">;
  batchId: SharedSignalLogicalBatchIdV2;
  exactPurposeRef: ExactO2PurposeRefV2;
  evaluationHorizonRef: EvaluationHorizonRefV2;
  pseudonymRotationPolicyVersionRef:
    PseudonymRotationPolicyVersionRefV2;
  pseudonymRotationScopeRef: PseudonymRotationScopeRefV2;
  pseudonymRotationGenerationRef:
    VaultOnlyRefV2<"pseudonym_rotation_generation">;
  payloadDigest: SharedSignalExportPayloadDigestV2;
  canonicalEnvelopeCommitment:
    SharedSignalExportEnvelopeCommitmentV2;
  eventTargets: readonly {
    vaultObservationRef:
      VaultOnlyRefV2<"vault_source_observation">;
    sharedSignalRowId: SharedSignalLocalRowIdV2;
    descendantRowIds: readonly SharedSignalLocalRowIdV2[];
  }[];
  downstreamArtifactSetRef:
    VaultOnlyRefV2<"all_provenance_descendant_artifacts">;
  lineageState: "pending" | "committed" | "quarantined" | "retired";
};

type SharedSignalRowTombstoneV2 = {
  schemaVersion: "shared_signal_export_batch.v2";
  eventKind: "shadow_observation" | "intervention_outcome";
  sourceBatchId: SharedSignalLogicalBatchIdV2;
  sourcePayloadDigest: SharedSignalExportPayloadDigestV2;
  sharedSignalRowId: SharedSignalLocalRowIdV2;
  state: "quarantined" | "tombstoned";
  revocationPolicyVersionRef: RevocationPolicyVersionRefV2;
  deletePropagationPolicyVersionRef:
    DeletePropagationPolicyVersionRefV2;
};

type SharedSignalActiveSurfaceCertificationV2 = {
  registrySnapshotVersion:
    SharedSignalExportRegistrySnapshotVersionV1;
  exactPurposeRef: ExactO2PurposeRefV2;
  evaluationHorizonRef: EvaluationHorizonRefV2;
  pseudonymRotationPolicyVersionRef:
    PseudonymRotationPolicyVersionRefV2;
  pseudonymRotationScopeRef: PseudonymRotationScopeRefV2;
  reconstructivenessPolicyVersionRef:
    ReconstructivenessPolicyVersionRefV2;
  riskProjectionManifestVersionRef:
    RiskProjectionManifestVersionRefV2;
  activeSurfaceGeneration: FiniteNonNegativeSafeIntegerV2;
  certificationState: "current_pass" | "invalidated";
};

type SharedSignalDenyBarrierV2 = {
  schemaVersion: "shared_signal_export_batch.v2";
  payloadDigestProfileVersion:
    SharedSignalExportPayloadDigestProfileV2;
  registrySnapshotVersion:
    SharedSignalExportRegistrySnapshotVersionV1;
  exactPurposeRef: ExactO2PurposeRefV2;
  evaluationHorizonRef: EvaluationHorizonRefV2;
  pseudonymRotationPolicyVersionRef:
    PseudonymRotationPolicyVersionRefV2;
  pseudonymRotationScopeRef: PseudonymRotationScopeRefV2;
  reconstructivenessPolicyVersionRef:
    ReconstructivenessPolicyVersionRefV2;
  riskProjectionManifestVersionRef:
    RiskProjectionManifestVersionRefV2;
  blockedActiveSurfaceGeneration: FiniteNonNegativeSafeIntegerV2;
  state: "deny_all_consumption";
  revocationPolicyVersionRef: RevocationPolicyVersionRefV2;
};
```

#### common Shared Signal V2 value resolver, reconstructiveness gate와 non-recursive digest

`SharedSignalExportValueRegistryV1`은 shadow와 intervention이 공유하는
유일한 value-level authority다. exact global O2 purpose, non-private
approval ref/class와 horizon 하나에만 scoped된 immutable reusable
non-private snapshot이며 snapshot 사이 union, inheritance, fallback,
membership reuse가 없다. registry contract/ref 자체는 discovery
metadata일 뿐 cross-purpose authority가 아니다. legacy
`SharedInterventionExportRegistryV1`는 release authority가 아니며 별도
status, allowlist, checksum 또는 approval decision을 가질 수 없다.

trusted resolver는 payload freeze 전에 exported enum/ref/version을
**value-by-value**로 exact active snapshot의 named domain에서 resolve한다.
TypeScript brand, regex, key allowlist 또는 hash-then-accept는 membership
evidence가 아니다. missing, unknown, expired, revoked, stale,
cross-version, cross-purpose, cross-horizon, mismatched basis 또는
unavailable lookup은 assessment나 digest 사용 전에 fail closed한다.
source enum의 legal vocabulary와 registry membership도 둘 다 통과해야
한다. every registry domain array는 exact
`numericLimits.domainCardinalityLimits[domain]` 이하에서 unique,
exact member UTF-8 bytes ascending canonical order, immutable이어야 한다.
validator는 noncanonical array를 silent sort하지 않는다. missing limit,
zero/negative/unsafe limit 또는 over-cap array는 reject한다. empty domain은 그
domain의 release authority가 0이라는 뜻이며 fallback을 열지 않는다.
effective/expiry는 trusted server가 semantic validation한 exact
24-octet uppercase UTC grammar `YYYY-MM-DDTHH:mm:ss.SSSZ`다. exactly
three fractional digits와 literal `T`/`Z`만 허용하고 offset, lowercase,
omitted/extra fraction, leap second, invalid calendar/date/time 또는
equivalent alternate encoding은 거부한다. `effectiveAt < expiresAt`이어야
한다.
`trustedBasisChecksum`은 정확히 `sha256:` 뒤 64 lowercase hexadecimal인
trusted non-private snapshot-basis binding이다.
per-tenant, per-subject, consent-generation, O2-authorization-generation,
per-batch one-off snapshot/value는 exported bytes에 들어갈 수 없다.
future exported semantic field는 먼저 named closed domain과 이 sole
registry coverage를 추가하기 전 release할 수 없다.
이 문서는 O2 packet, registry contents, threshold 또는 runtime
implementation을 만들거나 승인하지 않는다. future exact approval가
없으면 export는 OFF다.

coarse bucket은 `timeBucketDerivationPolicy`에 따라 trusted server가
vault-authoritative event time에서 payload freeze 전에 만든 approved
bucket ref만 허용한다. RFC 3339/ISO timestamp, epoch seconds/milliseconds,
timezone·locale date, exact event time, arbitrary date text, client/model
label, unknown/custom bucket, approved policy보다 finer bucket을
normatively reject한다. bucket membership만으로 non-reconstructiveness를
증명하지 않는다.

opaque validator 규칙도 exact하다.

- `SharedSignalLocalRowIdV2`: trusted server CSPRNG 128-bit,
  `ssr2_` + unpadded base64url 22 chars. exact purpose/horizon/rotation
  안의 Shared-Signal-local tombstone target이며 private input에서
  파생하지 않는다.
- `SharedSignalLogicalBatchIdV2`: trusted coordinator CSPRNG 128-bit,
  `ssb2_` + unpadded base64url 22 chars. logical candidate 하나에서만
  사용한다.
- `O2PseudonymousSubjectKeyV2`: non-exportable purpose key로
  `KDF("inverge.shared-signal.v2.subject", purpose, horizon,
  rotationScope, vaultRotationGeneration, vaultSubjectRef)`에서 얻은
  256-bit output,
  `ssp2_` + unpadded base64url 43 chars. trusted vault만 만든다.
- `SharedItemFamilyPseudonymV2`: 별도 non-exportable key와
  `KDF("inverge.shared-signal.v2.item-family", purpose, horizon,
  rotationScope, vaultRotationGeneration, vaultItemFamilyRef)`의 256-bit
  output,
  `ssi2_` + unpadded base64url 43 chars. subject key와 key/domain을
  공유하지 않는다.
- `O2DomainSeparatedDedupeKeyV2`: trusted vault가 approved non-private
  `pseudonymousSubjectKey`, `sequenceIndex`, `eventKind`, approved semantic
  projection과 purpose/horizon/rotation scope/vault generation을
  `KDF("inverge.shared-signal.v2.dedupe", ...)`로 묶은 256-bit output,
  `ssd2_` + unpadded base64url 43 chars.

validator는 prefix, alphabet, padding 부재, decoded byte length,
trusted derivation proof와 exact scope를 모두 확인한다. stable account
ID, private event ID, raw/private SHA-256·fingerprint, vault commitment,
consent/grant/lineage ref 또는 cross-context equality handle은 모양이
맞아도 거부한다. client/model은 syntax만 맞춰 값을 만들 수 없다. 모든
opaque value는 non-authorizing이고 Personal Raw Vault reverse lookup
API가 없다.

모든 number는 finite non-negative safe integer이며 registry cap을
초과할 수 없다. `-0`, fraction, non-finite, overflow, negative, gap,
duplicate와 out-of-order index를 freeze 전에 reject한다. event 수,
distinct subject 수, subject별 trace 수와 cumulative linkability-window
수는 exact policy maximum 이하라야 한다. 각 vault-authoritative subject의
`sequenceIndex`는 0에서 시작해 combined event-kind trace 전체에서
contiguous하다. `(pseudonymousSubjectKey bytes, sequenceIndex)`, row ID,
dedupe key는 각각 unique여야 하며 mixed-kind duplicate도 거부한다.
trusted constructor는 subject-key UTF-8 bytes ascending, 그 subject의
sequence ascending이라는 global order만 emit한다. random tie-breaker,
ingestion order, client/model-controlled partition은 금지한다. partition은
exact `batchPartitionPolicyVersionRef`가 결정한다. validator는
noncanonical frozen input을 silent sort/split/repair하지 않는다.

한 batch의 registry, taxonomy, mapping, label, bucket, subject/item
pseudonym, rotation, shared-skill/source allowlist, reconstructiveness,
risk-projection, ordering, partition, retention, authorization, revocation,
delete와 artifact policy ref는 batch-wide다. event에 같은 의미의
variant-local version을 중복하지 않는다. 다른 snapshot/version을
silent mix한 batch는 reject한다. V2 두 event kind는 같은 mandatory
`SharedSignalExportEventHeaderV2`, registry, batch, digest, assessment,
reservation, common writer를 사용한다. intervention-only queue나
schema-specific writer는 없다.
payload의 non-private registry member
`pseudonymRotationScopeRef`는 한 immutable global rotation epoch를
식별하고 digest-visible하다. exact
`pseudonymRotationGenerationRef`는 그 scope의 current vault authority
generation이며 exported/shared bytes에 들어가지 않는다. trusted
validator는 every subject/item/dedupe value가 payload의 exact scope와
한 current vault generation에서 파생됐는지 확인하고 assessment,
composition component, reservation, preflight, grant와 lineage에 그
generation을 bind한다. stale/mixed scope나 generation은 policy version이
같고 syntax가 맞아도 reject한다.

`SharedSignalExportBatchDigestPayloadV2`는
`SharedSignalExportBatchV2`와 독립적으로 선언한 exact closed payload
schema다.
현재 batch의 모든 top-level field를 포함하되 `exportDigest`만 포함하지
않는다. `Omit<SharedSignalExportBatchV2, "exportDigest">`, final
envelope에서의
reverse derivation, dynamic field deletion, digest sentinel, `null` 또는
zero placeholder로 payload를 만들지 않는다. final
`SharedSignalExportBatchV2`도 exact closed envelope이며 payload field 전부와
정확히 하나의 `exportDigest` 외에는 어떤 top-level/nested field도
허용하지 않는다.

유일한 지원 profile은
`shared_signal_export_payload_rfc8785_sha256.v2`이다. 이 profile은
shadow-only, intervention-only, mixed-kind batch 모두에 쓰는 단 하나의
serializer, validator, digest와 envelope route다. 이 profile은 다음을
고정한다.

- schema: exact `SharedSignalExportBatchDigestPayloadV2`
- canonicalization: RFC 8785 JSON Canonicalization Scheme(JCS), valid I-JSON
- character encoding: UTF-8, BOM 없음
- number domain: finite safe integer만 허용하고 `-0`, fraction, non-finite,
  safe-integer 범위 밖 수는 거부
- hash: SHA-256
- payload domain: `inverge.shared_signal_export_batch.v2.payload`
- digest text: 정확히 `sha256:` 뒤 64개 lowercase hexadecimal

unknown 또는 legacy profile은 fail closed한다. 향후 변경은 새 explicit
payload type, profile version과 domain을 함께 정의해야 하며 기존
`v2`의 의미를 바꾸지 않는다. object key order와 insignificant
whitespace는 JCS가 정규화한다. array는 입력 순서가 의미이므로 sort,
dedupe 또는 reorder하지 않는다. 다만 trusted constructor가 payload
freeze 전에 exact subject-pseudonym UTF-8 bytes, 그 subject의 zero-based
contiguous `sequenceIndex` 순서로만 events를 만들며 validator는 다른
순서를 reject한다. frozen/digested envelope를 silent sort하지 않는다.
invalid UTF-8, BOM, invalid I-JSON,
duplicate key, lone surrogate와 그 밖의 invalid Unicode는 거부하고
Unicode normalization은 적용하지 않는다.

digest 생성 순서는 고정한다.

1. batch `id`, 모든 `sharedSignalRowId`, `dedupeKey`,
   observation 순서와 값, exact purpose/O2, horizon, pseudonym·allowlist,
   retention/revocation/delete/artifact policy 및 payload의 모든 값을 먼저
   확정한다.
2. payload 또는 final envelope의 어떤 field도 `exportDigest`나
   final-envelope commitment에서 파생하지 않는다. batch/row/dedupe ID도
   포함한다. digest 뒤 만들어지는 vault-only grant, idempotency 또는
   lineage 값은 payload/envelope로 다시 들어갈 수 없다.
3. exact closed payload schema로 strict decode한 뒤
   `payloadCanonicalBytes = UTF8(JCS(payload))`를 만든다.
4. 다음 length-delimited preimage를 SHA-256으로 hash한다.

```text
payloadDigestPreimage =
  UTF8("inverge.shared_signal_export_batch.v2.payload")
  || 0x00
  || uint64_be(octetLength(payloadCanonicalBytes))
  || payloadCanonicalBytes

exportDigest = "sha256:" || lowercase_hex(SHA256(payloadDigestPreimage))
```

5. 계산한 `exportDigest`를 payload에 정확히 한 번 attach한다.
6. completed `SharedSignalExportBatchV2`를 strict decode하고
   `canonicalEnvelopeBytes = UTF8(JCS(envelope))`로 한 번 동결한다. 이후
   어떤 field나 byte도 변경하지 않는다.

`payloadCanonicalBytes`와 `canonicalEnvelopeBytes`는 서로 다른 named
artifact다. `exportDigest`는 digest field가 없는 payload만 commit하며,
자신을 포함한 final envelope의 hash가 아니다. 완성된 envelope byte
identity는 Personal Raw Vault에만 남는 별도 commitment로 묶는다.

```text
canonicalEnvelopeCommitmentPreimage =
  UTF8("inverge.shared_signal_export_batch.v2.envelope")
  || 0x00
  || uint64_be(octetLength(canonicalEnvelopeBytes))
  || canonicalEnvelopeBytes

canonicalEnvelopeCommitment =
  "sha256:" ||
  lowercase_hex(SHA256(canonicalEnvelopeCommitmentPreimage))
```

`octetLength`는 문자열 길이가 아니라 exact UTF-8 byte 수이며 unsigned
64-bit big-endian으로 encode한다. `canonicalEnvelopeCommitment`와
`canonicalEnvelopeOctetLength`는 vault assessment, reservation,
preflight, grant와 exact commit/lineage evidence binding에만 존재한다.
exported/shared batch, client/API response, receipt, log,
telemetry, analytics, issue/PR/CI artifact 또는 Model/Eval Registry에
serialize하지 않으며 payload/envelope field로 되돌려 self-cycle을 만들지
않는다.

`VaultSharedSignalExportPreflightV2`와
`VaultSharedSignalCommitGrantV2`는 exact batch ID, supported payload
profile, recomputed payload digest, canonical final-envelope commitment와
octet length에 더해 exact active value-registry snapshot/version/basis,
ordering/partition policy, current reconstructiveness assessment
ref/commitment와 exact `pass`, reference
population, authority-selected joinable surface, composition-ledger
generation/commitment, prepared reservation, exact O2 purpose/generation,
rotation scope/vault generation, immutable subject-authorization manifest
ref/commitment, exact consent-ledger resolution ref/commitment,
source-event-set commitment,
current subject consent generations, notice/policy, retention, horizon,
lineage/artifact-set ref/commitment, expiry/replay와 authorization policy를
모두 bind하며 preflight는 prepared grant ref/commitment/state도 고정한다.

trusted validator와 commit gateway의 순서도 고정한다.

1. raw input의 invalid UTF-8/BOM, invalid I-JSON, duplicate key를 먼저
   거부한다.
2. unknown, alias, nested injection, missing, extra field, coercion,
   implicit default, non-finite, unsafe integer, fraction과 `-0`을 exact
   payload/final-envelope schema에서 거부한다. final envelope에는
   supported profile과 exactly one well-formed `exportDigest`가 있어야 한다.
3. validated final envelope의 non-digest field를 static field-by-field
   constructor에 넣어 독립 선언된 typed
   `SharedSignalExportBatchDigestPayloadV2`를 구성하고 canonicalize한다.
   arbitrary-object deletion이나 silent projection은 사용하지 않는다.
4. payload digest를 재계산해 supplied `exportDigest`와 constant-time
   compare한다.
5. completed envelope를 canonicalize하고 실제 emitted/persisted bytes가
   `canonicalEnvelopeBytes`와 byte-for-byte 동일한지 확인한다.
6. vault-only final-envelope commitment와 exact octet length를 재계산하고
   grant의 batch ID/profile/digest/commitment/length binding과 비교한다.
   digest와 commitment 비교는 constant-time이다.
7. 그 뒤에만 current registry, policy, reconstructiveness assessment,
   reference population, composition ledger/reservation, consent/O2/
   generation, grant expiry/replay와 complete lineage invariant를 다시
   검증하고 common first-write CAS를 실행한다.

어느 mismatch든 grant consume, Shared Signal row, log, telemetry,
analytics, Model/Eval 또는 downstream lineage side effect는 0건이다.
payload digest와 envelope commitment는 byte integrity일 뿐 consent, O2,
O5, grant, subject authorization 또는 private lineage API가 아니다. 기존
authorization, pseudonym, atomicity, revocation/delete와 offline-training
경계를 하나도 대체하지 않는다.

`SharedSignalExportEventV2`의 어느 variant에도 production
`learnerScopeRef`, private concept, problem/answer revision, private item
ID, root-cause ref, raw body 또는 free text가 없다. shared skill
allowlist에 없는 개인 concept는 rule map에서만 사용하고 export에서
제외한다. pseudonymous subject key와 item-family pseudonym은 exact
purpose, frozen evaluation horizon, non-private rotation scope와 current
vault rotation generation 안에서만 안정적이고, 다른
purpose/horizon/scope/generation과 연결할 수 없다.

`sharedSignalRowId`는 approved Shared Signal projection에서 새로 만든
random/local tombstone target이다. exact purpose, horizon과 non-private
rotation scope에 scoped되며 current vault generation binding을 lineage에
둔다. private event ID, raw body, private hash·fingerprint,
commitment, consent record 또는 vault lineage에서 파생하지 않는다.
authorization proof가 아니고 Personal Raw Vault로 reverse resolve할 수
없으며 다른 purpose/horizon/rotation에서 equality key로 재사용하지
않는다.

closed value/event sufficiency와 reconstructiveness는 서로 다른 mandatory
gate다. 후자는 exact strict-decoded candidate payload와 completed
envelope, cumulative release composition 전체에 대해 **write 전** 수행한다.
`VaultSharedSignalReconstructivenessAssessmentV2.decision`의 current exact
`pass`만 grant preparation 자격이 있다. `reject`, `indeterminate`,
timeout, unavailable evaluator, missing dimension/population, insufficient
sample, stale input, disagreement 또는 conflict는 모두 fail closed한다.
failure surface는 closed coarse reason code만 vault에 남기며 rare trace,
tuple, projection, subject/population/composition ref 또는 raw value를 log,
telemetry나 analytics에 쓰지 않는다.
field closure, pseudonymization, raw text 부재, checksum, per-field
commonness 또는 schema sufficiency는 pass가 아니다.
assessment 자체도 consent, O2/O5 approval, source/right/version
eligibility, grant, anonymization certificate, learner-facing score,
private-lineage/equality API 또는 fitting/training/refit/refresh authority가
아니다.

future exact O2 packet은
`VaultSharedSignalReconstructivenessPolicyV2`의 `kMin`, batch/subject/
linkability-window maximum, allowed bucket granularity, complete
quasi-identifier projection catalog, auxiliary-knowledge fixture, joinable
surface policy, uniqueness/linkability/composition limits와 accepted
pre-freeze mitigation을 모두 explicit/non-defaulted 값으로 승인해야 한다.
이 문서는 launch-ready 숫자나 absolute anonymization을 발명하지 않는다.
generic/missing threshold이면 release OFF다. `kMin - 1`, unknown
denominator, sampled-only evidence 또는 evaluator disagreement는 reject다.

complete risk-projection manifest는 exact O2 non-joinability proof로
제외되지 않은 모든 exported semantic field와 joint combination을
포함한다. 각 vault-authoritative subject에 대해 다음 전부를 검사한다.

- full ordered trace, every prefix/suffix, length `1..n`의 every contiguous
  window
- every non-empty semantic-field projection와 unordered presence/count
  projection
- sequence length, observation cardinality, deterministic order와 batch
  partition
- time-bucket, subject-adapter, shared-skill, item-family-pseudonym sequence
- event kind, outcome, qualification, source class 및 그 intersections
- rare value, sparse equivalence class, prior-release cohort overlap와
  union/intersection/difference
- cross-batch stitching, retry, replacement, split-batch, concurrent
  candidate, purpose/horizon/adjacent-rotation linkage
- exact policy가 고정한 auxiliary-information attacks

각 required projection/window는 distinct authorized human subject support
requirement를 통과해야 한다. vault-authoritative membership는 같은
human의 rows/pseudonyms를 하나로 묶되 random subject literal 자체를
semantic equivalence tuple에 넣어 인위적으로 unique하게 만들지 않는다.
random batch/row/dedupe literal도 direct semantic quasi-identifier에서
제외하되 reuse, derivation, scope와 cross-release linkability는 별도로
검사한다. item-family pseudonym과 ordered repetition은 반드시 risk
dimension으로 남는다.

current denominator에는 그 exact release/access scope에서 authorized,
visible한 distinct human만 정확히 한 번 센다. non-consenting/excluded
private candidate, vault-only record, 다른 tenant/purpose, revoked/
tombstoned row, duplicate pseudonym, synthetic identity 또는 Sybil은 cover가
아니다. prior revoked/deleted disclosure는 current cohort member가
아니지만 irreversible composition-attack history에는 남는다. V1의
optional/missing subject key 같은 historical non-releaseable surface도
vault-authoritative human grouping에서 보수적으로 accounting하며 V2
release 자격을 얻지는 않는다.

`VaultSharedSignalReleaseCompositionLedgerV2`는 prior active release,
later revoked/tombstoned/deleted disclosure, shadow와 intervention을
포함한 모든 policy-declared joinable schema, overlapping horizon,
adjacent rotation, retry/replacement와 concurrent prepared reservation을
포괄한다. O2 trusted coordinator만 conservative connected component를
정한다. overlapping component는 한 generation과 CAS를 쓰고 unknown/
disputed joinability는 component를 넓히거나 release를 deny한다.
candidate/exporter/schema writer가 좁힐 수 없다.
두 candidate가 같은 generation에서 individually pass해도 combined
release가 fail이면 둘 다 commit할 수 없다. CAS loser는 새 composition
generation에서 complete assessment를 다시 수행하며 prior pass/grant를
재사용하지 않는다.

prepared reservation은 competing candidate 평가에 보수적으로 포함하지만
`kMin` cover, visible row 또는 irreversible history가 아니다. committed
release만 history를 append한다. never-committed reservation만
invalidate/expire할 수 있고 이미 공개된 budget은 deletion, revocation,
re-consent, new batch ID, retry 또는 pseudonym rotation으로 복원되지
않는다. ledger history가 missing, damaged, unsafe-to-reconcile 또는 safe
replacement 없이 만료되면 empty로 간주하지 않고 affected
purpose/horizon/rotation pipeline을 block한다. risk ledger는 exact-purpose,
minimum, vault-only, non-exportable, non-reversible accounting만 보존하며
raw body, stable account ID, client-resolvable lookup/API를 만들지 않는다.
subject-linked material의 required deletion 뒤 aggregate proof가 부족하면
release를 deny한다.

failing frozen payload는 event/subject silent deletion, `other` 치환,
bucket widening, reorder, pseudonym rotation, split, batch-ID change 또는
stale-generation retry로 고치지 않는다. future O2-approved coarsening/
suppression/minimization은 payload freeze 전에 exact version으로 실행하고
새 payload, batch ID, digest, envelope commitment/length, assessment,
reservation과 grant를 만들어 모든 gate를 처음부터 다시 수행한다.
partial commit은 없다.

`VaultSharedSignalExportPreflightV2`,
`VaultSharedSignalReconstructivenessAssessmentV2`,
`VaultSharedSignalReleaseCompositionLedgerV2`,
`VaultSharedSignalReleaseReservationV2`와
`VaultSharedSignalCommitGrantV2`는 Personal Raw Vault 내부의
least-privilege record다. serializer, client/API response, receipt, log,
telemetry, analytics, issue/PR/CI artifact, Shared Signal 또는 Model/Eval
Registry에 serialize·return·record하지 않는다. 그 record는 private event
set, exact consent-ledger resolution, proposed batch와 affected downstream
artifact ID를 vault-internal lineage로 묶고, domain-separated
non-exportable key 아래 source-event-set commitment를 계산·검증한다.
manifest, ledger resolution, commitment와 lineage에는 vault 밖 lookup,
membership 또는 equality API가 없다.

Personal Raw Vault는 각 real-learner subject에 대해 extraction 또는
pseudonymization 전에 한 번, release preparation 직전에 다시 한 번
active, granted, non-revoked `pseudonymous_product_signal` exact-purpose
consent를 검증한다. 두 검사는 exact O2 purpose, consent notice/policy
version, retention state와 frozen evaluation horizon을 모두 일치시킨다.
missing, declined, revoked, expired/stale, wrong-purpose,
wrong-notice/policy-version 또는 unresolved consent는 해당 event를
제외한다.

`extractionAuthorizationCheckedAt`과 `releaseAuthorizationCheckedAt`은
audit evidence일 뿐 commit authority가 아니다. stale read replica,
cached ledger snapshot, exported metadata, retry token, prior successful
check 또는 timestamp만으로 Shared Signal write를 승인할 수 없다.

normative order는 바꿀 수 없다.

a. current O2/consent/rights와 active immutable value registry 하나를
   resolve한다.
b. 모든 closed candidate value를 construct하고 strict validate한다.
c. exact typed payload를 freeze하고 supported profile의 canonical bytes와
   payload digest를 계산한다.
d. digest를 한 번 attach하고 completed canonical envelope와 vault-only
   commitment/octet length를 freeze한다.
e. trusted O2 coordinator가 conservative joinable component를 정하고
   prepared reservation을 만든 뒤 current visible reference population,
   irreversible disclosure history와 모든 competing reservation을 포함해
   exact candidate를 평가한다.
f. exact current pass, reservation, policy, registry와 composition
   generation에 묶인 short-lived single-use grant를 준비한다.
g. first-write boundary에서 current registry/policy/assessment/
   composition generation, consent/O2/grant/digest/envelope binding을
   authoritative source에서 다시 resolve한다.
h. 한 transaction 또는 equivalent linearizable boundary에서 exact
   reservation과 grant를 CAS-consume하고 disclosure accounting을 한 번
   append하며 exact row set, complete lineage와 idempotent result를 함께
   commit한다.

release preparation은 다음을 **Personal Raw Vault 안에서만** 수행한다.

1. approved projection에서 purpose/horizon/rotation-scope와 current vault
   rotation-generation-scoped batch ID,
   `sharedSignalRowId`, dedupe key와 payload field 전부를 먼저 동결한다.
2. strict `SharedSignalExportBatchDigestPayloadV2`의 canonical bytes와
   length-delimited payload digest를 계산하고 digest를 한 번 attach한 뒤
   completed canonical envelope bytes, vault-only commitment와 octet length를
   동결한다.
3. trusted O2 coordinator가 authority-selected conservative joinability
   component를 구하고 `VaultSharedSignalReleaseReservationV2`를
   `prepared`로 만든 뒤 exact payload와 envelope를 current visible
   reference population, irreversible disclosure history와 같은 component의
   다른 모든 prepared reservation에 대해 평가한다.
4. current exact `pass`인
   `VaultSharedSignalReconstructivenessAssessmentV2`와 아직 Shared Signal에
   쓰지 않은 pending `VaultSharedSignalDownstreamLineageV2`를 만든다.
5. exact proposed batch ID, profile, registry, ordering/partition policy,
   payload digest, final-envelope commitment/octet length, assessment,
   reference population, joinable surface, composition ledger/reservation,
   exact O2 purpose/generation, rotation scope/vault generation, immutable
   subject-authorization manifest ref/commitment, exact consent-ledger
   resolution ref/commitment와 source-event-set commitment, 모든 included
   active consent generation, notice/policy version, retention state, frozen
   horizon, lineage/artifact-set ref/commitment, expiry/replay와
   authorization policy
   version에 묶인 short-lived single-use
   `VaultSharedSignalCommitGrantV2`를 `prepared`로 만든다.

consent, O2, notice/policy, retention, horizon, rotation scope/vault
generation, included subject 또는 subject-authorization manifest
ref/commitment, registry,
reconstructiveness/attacker-model/ordering/partition policy, reference
population, joinable surface, composition generation/reservation, payload
profile/digest, completed canonical envelope commitment/octet length 또는
authorization policy가 하나라도 바뀌면 assessment, reservation과 grant를
`invalidated`로 만든다. grant와 reservation은 explicit expiry와 replay
protection을 가지며 vault 밖으로 나가지 않는다.

첫 Shared Signal write에는 하나의 logical linearization point가 있다.
trusted gateway는 그 boundary에서 current, unexpired, unconsumed
generation을 authoritative ledger에서 다시 resolve한다. strict validator
순서로 exact batch ID/profile, recomputed payload digest, completed
canonical envelope bytes/commitment/octet length, registry/policy,
assessment `pass`, reference population, joinable surface, composition
ledger/reservation, subject-authorization manifest ref/commitment,
consent-ledger resolution ref/commitment, source-event-set, rotation
scope/generation과 grant binding을
모두 비교한 뒤 다음을 하나의
authorized transaction 또는 동등
coordinator/CAS boundary로 처리한다.

1. exact prepared reservation과 grant를 함께 `consumed`로 CAS한다.
2. irreversible disclosure accounting을 exact row set에 대해 정확히 한
   번 append한다.
3. authorized Shared Signal row 전부를 처음으로 commit한다.
4. 모든 active row와 private source observation의
   `VaultSharedSignalDownstreamLineageV2`를 `committed`로 전환한다.
5. exact idempotent commit result를 고정한다.

consent/O2 invalidation, revocation과 commit은 같은 authorization-generation
key 또는 동등한 linearizable serialization boundary를 사용한다.
revocation이 먼저 이기면 Shared Signal write는 0건이다. commit이 먼저
이기면 모든 row가 complete committed lineage를 가져 immediate
revocation target이 된다. 첫 write 전에는 canonical payload, proposed
row ID와 pending lineage를 vault 안에서만 stage한다. Shared Signal에
`inactive_staged`, hidden, pending 또는 유사 row를 미리 쓰지 않는다.

prepared reservation/grant consumption, disclosure-history append, 첫/all
Shared Signal row commit, committed vault-lineage transition과 exact
idempotent result의 logical linearization을 증명할 수 없으면 batch 전체를
fail closed한다. crash/retry가 active Shared Signal row without exact
one-time ledger append/committed lineage 또는 consumed authority without
the exact row set/idempotent result를 남길 수 없다. exact retry는 같은
idempotent result를 반환하고 row, ledger append, reservation/grant
consumption을 두 번 만들지 않는다. 이 invariant를 세울 수 없으면
active뿐 아니라 pending/hidden을 포함한 Shared Signal, log, telemetry와
Model/Eval write가 모두 0건이다.

concurrent duplicate commit, consumed-grant/reservation replay, stale
composition generation, non-current assessment, payload
digest/canonical-envelope byte/commitment/octet-length mismatch, expiry,
invalidation 또는 한 subject라도 stale generation인 mixed batch는 전체를
reject한다. partial commit하지 않고 새 generation과 새 authorized batch를
만든다. batch 전체의 authorization invariant를 증명할 수 없거나
vault-local commitment, grant, authorization 또는 lineage가 missing,
stale, mismatched, invalid이면 cross-plane write는 0건이다.

generic legal basis snapshot, contract, legitimate-interest theory, service
necessity, terms acceptance, tenant agreement, research approval,
`personal_service` consent, 다른 consent purpose, O2 approval, O4 또는
experiment tier는 active exact-purpose product-signal consent를 대체하지
않는다. O2와 product-signal consent는 둘 다 필요하며 어느 하나도 다른
하나를 대체하지 않는다. 별도 legal/compliance basis는 unrelated
compliance 또는 private-service operation에 기록할 수 있지만 Shared
Signal export authority를 부여하지 않고 이 contract의 대안이 아니다.

serialized `SharedSignalExportBatchV2` serializer와 validator는 위 exact closed
profile과 field allowlist를 nested shape까지 적용한다. unknown, extra,
missing, duplicate, alias, nested injection, coercion 또는 implicit
default를 발견하면 hash 전 fail closed하며 unknown field를 제거한 뒤
hash하지 않는다.
특히 consent-ledger entry ref, subject authorization manifest ref/digest,
`vaultScopedSourceEventSetCommitmentRef`,
`sourceEventSetCommitmentRef`의 alias, vault/private object ref, private
keyed commitment, raw/private content hash·fingerprint, stable account ID,
attestation·receipt·token·digest, commit grant/generation ref 또는 state,
replay token, private downstream-lineage ref/digest 또는 Personal Raw Vault
subject/event set으로 resolve·compare되는 equality handle을 포함하지
않는다. 이 금지는 Shared Signal row, client/API output, receipt, log,
telemetry, analytics, issue/PR/CI artifact와 Model/Eval Registry에도
동일하다.

export authorization metadata는 `consentPurpose`,
`authorizationClass`, registry-resolved
`authorizationPolicyVersionRef`와
`authorizationDecision`의 closed values뿐이다. 이 값들은 subject,
consent-ledger entry, vault record, private event set 또는 internal lineage
record를 식별하지 않고 batch·purpose·horizon·rotation 간 unique join key가
아니다. `exactPurposeRef`, `globalO2ApprovalRef`, retention과 policy
versions도 non-private global policy reference여야 한다. batch `id`는
frozen logical batch를, `exportDigest`는 exact digest payload bytes를
식별한다. completed envelope bytes는 vault-only commitment로만 묶는다.
어느 값도 authorization proof나 private lineage handle이 아니고, vault
subject/event-set lookup에 사용할 수 없다. `dedupeKey`도
approved Shared Signal projection의
non-private fields에서 purpose/horizon/rotation별로 생성하며 private event
ID, raw content, private hash·fingerprint 또는 vault commitment에서
파생하지 않는다.

export 뒤 revocation/delete도 row와 모든 descendant까지 닫힌 lifecycle을
따른다. Personal Raw Vault의 non-exportable
`VaultSharedSignalDownstreamLineageV2`는 각 authorized subject와 private source
observation에서 해당 exported batch ID, Shared-Signal-local row ID,
purpose/horizon/rotation/retry descendant, cache, feature snapshot,
materialization, dataset와 Model/Eval artifact ID까지 정방향으로
추적한다. 방향은 vault → Shared Signal target뿐이다. Shared Signal이나
어떤 consumer도 row ID에서 subject, ledger entry, private event,
commitment, grant/generation 또는 vault lineage로 reverse lookup할 수
없고, exported private handle을 fallback으로 요구하지 않는다.

`pseudonymous_product_signal` consent 철회, row-affecting purpose-scoped
delete 또는 O2 invalidation은 먼저 같은 serialization key에서 모든
unconsumed authorization generation을 invalidated로 만든다. 따라서
racing commit이 먼저 이기면 complete committed lineage를 남기고,
revocation이 먼저 이기면 새 Shared Signal write는 0건이다.
`offline_model_training` 철회는 training/dataset/model use를 막는 별도
purpose이며 product-signal authority를 대체·통합·암묵 변경하지 않는다.

revocation/delete/O2 invalidation을 acknowledge하거나
`revocationAppliedThroughRef`를 전진시키기 전에, vault lineage는 모든
affected Shared Signal row, cache, feature snapshot, materialization,
dataset와 Model/Eval artifact를 idempotent하게 non-active,
quarantined 또는 retired로 전이해야 한다. 전체 targeted closure를
동기적으로 증명할 수 없으면 acknowledge 전에 batch/purpose/horizon/
rotation 전체 consumer와 provenance descendant를 덮는 enforced
`SharedSignalDenyBarrierV2`를 설치한다. row 하나만 닫고 이미 파생된
artifact를 usable로 두거나 all-surface barrier 없는 eventual
best-effort는 금지한다.

revocation, delete, expiry 또는 quarantine은 과거 disclosure를 없던
일로 만들거나 composition budget을 되돌리지 않고 replacement release를
승인하지 않는다. removal로 residual active surface가 sparse/
reconstructive해질 수 있으므로 같은 revocation-serialized
linearization boundary에서
`SharedSignalActiveSurfaceCertificationV2.activeSurfaceGeneration`을
invalidate하고 changed surface를 expose하기 전 또는 그와 atomic하게
all-consumer provisional `SharedSignalDenyBarrierV2`를 설치한다. query,
cache/materialization builder, dataset job와 publisher는 current surface
generation과 일치하는 `current_pass` certification 없이는 읽거나
publish할 수 없다. residual surface가 current policy 아래 다시 pass한
뒤에만 barrier를 제거한다. registry, reconstructiveness policy 또는
attacker-model 변경에도 같은 generation invalidation/barrier를 적용한다.
non-private rotation scope 또는 its vault authority generation 변경에도
같은 rule을 적용한다. certification/barrier는 digest-visible
`pseudonymRotationScopeRef`와 `activeSurfaceGeneration`만 공유하고 private
rotation-generation ref는 serialize하지 않는다. trusted gateway가
vault-only generation binding과 current active-surface generation의
일치를 확인한다.
cohort denominator를 보존하려고 subject의 required deletion을 지연하거나
거부하지 않는다.

모든 Shared Signal query, cache, materialized view,
sufficiency/calibration job와 dataset builder는 active,
non-quarantined, non-tombstoned row만 읽는다. cache, feature snapshot,
materialization, dataset, evaluation 또는 model publication은 publish
boundary에서 모든 source row의 current active state를 다시 검증하고
downstream lineage 등록을 완료할 때까지 inactive다. 그 boundary는
revocation과 같은 key로 serialize한다. builder가 active row를 먼저
읽었더라도 그 뒤 revocation이 완료됐다면 stale read로 detached
artifact를 publish할 수 없다. 이미 publish된 descendant는 acknowledge
전에 같은 vault lineage로 quarantine/retire하거나 all-surface deny
barrier 아래 unusable이어야 한다.

`SharedSignalRowTombstoneV2` serializer는 exact V2 schema/event kind,
source batch/digest, Shared-plane-local target, coarse `state`,
`revocationPolicyVersionRef`와 `deletePropagationPolicyVersionRef`만
허용한다. detailed reason,
exact withdrawal time, subject/ledger/grant/generation/commitment/lineage
ref·digest와 open-ended operation metadata는 금지한다. lineage가
missing, damaged 또는 incomplete면 알려진 row만 닫지 않는다. containing
batch와 provenance-reachable descendant 전체를 quarantine하고, complete
closure를 증명할 수 없으면 affected purpose/horizon/rotation pipeline
또는 더 넓은 safe domain을 deny한 채 reconciliation한다. unknown
descendant가 usable로 남을 수 없다.

re-consent는 tombstoned old row를 resurrect하지 않는다. 새 authorization
generation, 새 export와 새 row lifecycle이 필요하다. backup restore,
cache replay, materialization rebuild와 disaster recovery도 quarantined/
tombstoned row나 descendant를 되살리지 않는다. immediate non-active
quarantine은 retention policy가 요구하는 이후 purpose-scoped physical
delete/purge와 구분한다.

quarantine/retirement는 automatic refit 권한이 아니다.
`pseudonymous_product_signal` consent와 O2도 fitting 권한이 아니다.
replacement fitting/training/dataset refresh는 active exact-purpose
`offline_model_training` consent와 그 시점에 유효한 별도 exact-scope
O5 아래 새 frozen dataset/model/parameter version으로만 수행한다. 유효한
두 gate 중 하나라도 없으면 refit하지 않는다.

shadow 평가는 다음을 요구한다.

- 같은 learner의 미래 독립 결과를 time-forward held-out으로 사용
- same-item, same-surface, retry와 exposed variant leakage 0
- fixed/rule baseline과 비교
- coverage, abstention, calibration, Brier/log loss와 사전 고정 ranking
  metric
- 과목별·concept별 sample sufficiency와 stability
- version별 reproducibility, drift와 rollback
- 사전 등록된 temporal cutoff와 frozen taxonomy, mapping adapter,
  rule, label, model version
- O5 전 learner-derived observation의 train·calibration-fitting 편입 0;
  frozen/versioned inference·evaluation partition만 허용
- future exact-scope O5가 fitting을 승인한 경우에도
  train/calibration/test 분리와 learner·content·item-family dedupe
- test set으로 mapping, threshold, abstention 또는 model을 tune하지 않음

shadow 동안 prediction은 다음을 바꾸지 못한다.

- `MasteryStateV1`
- `PersonalWeaknessMapV1`
- biggest-gap ranking
- Review Queue
- Today 또는 Full-Day
- 가격, 상품 manifest 또는 마케팅 문구
- learner-facing 화면

sample sufficiency와 calibration이 통과해도 자동 활성화하지 않는다.
별도 Owner decision과 limited recommendation acceptance 뒤에만 bounded
추천 입력 후보가 될 수 있으며, 그 뒤에도 합격확률·예상점수·숙달
percentage를 노출하지 않는다.

---

## 13. timed_full_solution

### 13.1 목적

미세 repair만 반복하면 부분 기술은 좋아져도 시험장에서 문제 전체를
시간 안에 완성하는 능력은 검증되지 않는다.

`timed_full_solution`은 다음을 본다.

- 문제 전체 구조를 백지에서 세우는가
- 배점을 합리적으로 배분하는가
- 계산·목차·포섭을 시간 안에 연결하는가
- blank, partial, timeout을 숨기지 않는가
- 같은 gap이 전체 수행에서 다시 나타나는가

### 13.2 필수 계약

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
- Starter 첫 결제의 필수 blocker가 아니라 Complete Study OS 단계의
  후속 기능

감정평가사 2차 각 과목의 공식 시험시간 기준은 Q-Net registry에
versioned source로 결합한다.

---

## 14. Personal Study Ledger, Review Queue, Full-Day

### 14.1 LearningDocument 계보

```text
immutable source asset
→ editable OCR/problem revision
→ attempt 또는 future contract-only guided exposure
→ ExplanationPacket revision
→ KeyConcept·DecisionPath·ContrastSet
→ gap/action
→ existing LearningGapRecord·S216 기반 automatic error-note projection
→ rewrite/recalculation revisions
→ D+1/D+7/timed evidence
→ versioned PersonalWeaknessMap projection
→ current next action
```

규칙:

- 원본을 OCR 수정으로 덮어쓰지 않는다.
- AI output은 exact problem/source basis에 묶는다.
- problem/source/policy 변경 시 과거 판정을 `stale`로 만든다.
- 원본, 사용자 수정, AI output, 개인 메모를 구조적으로 분리한다.
- autosave, conflict recovery, version history, export, delete를 제공한다.
- accepted wrong/partial feedback의 current automatic error note는 safe
  source refs와 released artifact에서 결정론적으로 재계산하며
  save/resume/reopen/Ledger/search에서 같은 projection revision을 복구한다.
  S216에 learner-visible body를 저장하거나 note view/save를 evidence로
  승격하지 않는다.
- personal weakness snapshot은 원장을 덮어쓰지 않고 exact basis에서
  언제든 재계산할 수 있어야 한다.

### 14.2 Review Queue

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
  | "guided_study" // reserved; current authority forbids runtime acceptance
  | "repair"
  | "review"
  | "timed_full_solution";
```

`guided_study` member는 schema compatibility fixture를 위한 reserved
contract value다. 별도 §5.0 승인이 완료되기 전의 어떤 implementation도
native planner, optimizer projection, Today/Full-Day, queue, API와
persistence에서 이 값을 생성·수락·배치할 수 없고 authority gate에서
fail closed해야 한다. 이 문서는 현재 배포 상태의 runtime receipt를
대신하지 않는다.

assisted 완료는 학습 이력에는 남지만 independent due를 닫지 않는다.

rule-based weakness map은 eligible `ReviewUnit` 후보와 priority reason을
제안할 수 있지만 queue를 직접 닫거나 mastery를 올리지 않는다.
learner-facing Today에는 계속 최대 3개의 CoreOutcome만 보이고,
weakness 후보 여러 개가 한꺼번에 주 CTA가 되지 않는다.

`timed_full_solution`은 versioned cadence policy가 eligible source,
rights, prior exposure, 최근 component repair와 시험 phase를 읽어
ReviewUnit을 제안한다. cadence 수치는 future Owner packet의 가설이며
이 문서가 하드코딩하지 않는다.

### 14.3 Native Full-Day

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

### 14.4 OR-Tools

OR-Tools는 optional adapter다.

- 무엇을 공부할지는 native evidence policy가 정한다.
- OR-Tools는 선택된 candidate를 시간창에 배치하는 역할만 한다.
- native baseline을 막지 않는다.
- isolated benchmark, threshold decision, hidden shadow,
  visible comparison, limited activation을 순서대로 거친다.
- hard constraint 또는 trusted gateway 검증 실패 시 native fallback,
  그것도 실패하면 `blocked_manual_plan_required`.
- Personal Weakness Map과 future pyBKT는 OR-Tools 입력 원장이 아니다.
  native evidence policy가 승인한 bounded candidate만 scheduler에
  전달한다.

---

## 15. 데이터, 권리, privacy, cost

### 15.1 다섯 plane

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
  policyVersion: string;
  purposeScopeRef: string;
  consentState: "granted" | "declined" | "revoked";
  retentionPolicyRef: string;
  effectiveAt: string;
  expiresAt?: string;
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

`PersonalWeaknessMapV1`의 개인 overlay, event와 snapshot은 기본적으로
`learner_private`다. 개인 misconception edge나 root-cause candidate를
shared CurriculumGraph, 다른 learner, tenant 또는 공용 corpus로
역승격하지 않는다.

Academy가 개인 map을 읽으려면 별도의 tenant sharing purpose와 RLS가
필요하다. real-learner pyBKT measurement와 frozen/versioned
inference·evaluation에는 canonical exact O2와 active, granted,
non-revoked `pseudonymous_product_signal` exact-purpose consent가 모두
필요하다. generic legal basis, contract, legitimate interest, service
necessity, terms acceptance, tenant agreement, research approval,
`personal_service` consent, 다른 consent purpose, O2 단독, O4 또는
experiment tier는 그 grant를 대체하지 않는다. 별도 legal/compliance
basis는 unrelated compliance 또는 private-service operation에 기록할 수
있지만 Shared Signal extraction/export authority가 아니다.

각 real-learner subject의 consent는 Personal Raw Vault 안에서 extraction
전과 batch release 직전에 exact O2 purpose, notice/policy version,
retention state와 evaluation horizon에 대해 다시 resolve한다. missing,
declined, revoked, expired/stale, wrong-purpose, wrong-notice/policy-version
또는 unresolved 상태는 event 제외와 batch-invariant fail-closed를
일으키고 Shared Signal, log, telemetry와 Model/Eval Registry write는
0건이다.

두 `checkedAt`은 audit evidence일 뿐 commit authority가 아니다.
vault는 §12.1의 sole `SharedSignalExportValueRegistryV1`로 모든 V2
event value를 resolve하고 exact batch ID, common supported digest profile,
recomputed payload digest, completed canonical envelope commitment/octet
length, current reconstructiveness assessment `pass`, reference population,
authority-selected joinable surface, composition-ledger generation/
commitment와 prepared reservation, O2 purpose/generation, rotation
scope/vault generation, immutable subject-authorization manifest와 exact
consent-ledger resolution의 ref/commitment, source-event-set commitment,
included subject의 current product-signal consent generation, notice/policy,
retention, horizon, lineage/artifact-set ref/commitment, expiry/replay와
authorization policy에 결합된 short-lived single-use
`VaultSharedSignalCommitGrantV2`를 prepared 상태로 만든다. 그 입력 중
하나라도 바뀌거나 expire되면 assessment/reservation/grant가
invalidated다. first row 전 strict validator는 registry/policy,
payload digest, canonical emitted/persisted envelope bytes, vault
commitment/length, exact assessment와 composition generation을 같은
acyclic rule로 다시 계산한다. 첫/all Shared Signal write,
reservation/grant prepared→consumed CAS, exact one-time irreversible
disclosure append, committed downstream row lineage와 idempotent result는
같은 trusted transaction/coordinator linearization에서만 일어난다.
consent/O2 invalidation과 commit도 같은 generation key로 serialize한다.
stale snapshot, timestamp, exported metadata, retry token 또는 과거 성공은
commit을 승인하지 못한다. duplicate/replay, digest/envelope-byte/
commitment/length, registry/policy/assessment/composition mismatch,
expiry/invalidation과 one-stale-subject mixed batch는 전체 reject한다.
shadow와 intervention 모두 exact `SharedSignalExportBatchV2`의 common
gateway만 사용한다. 그 boundary 전 payload, local row ID와 pending
lineage는 vault에만 있고 Shared Signal의 staged/hidden/pending write는
0건이다.

cohort parameter fitting, training, refit, parameter update 또는 dataset
refresh는 그 요건에 더해 active exact-purpose
`offline_model_training` consent와 별도 future exact-scope O5를
요구한다. product-signal consent, O2, approved export와 O4는 O5나
offline-training consent를 대체하지 않는다.

O2와 approved exact `SharedSignalExportBatchV2` 전에는 real learner
event의 추출,
export, frozen/versioned prediction·inference와 evaluation을 모두
금지한다. approved export는 rotating pseudonymous subject key와
allowlisted/registry-resolved closed values만 포함하며 production scope,
private concept와 root-cause identifier를 포함하지 않는다. V1 bytes,
grant, fallback 또는 implicit migration은 real-learner release authority가
아니다. O5 전 approved export의
learner-derived observation은 train 또는 calibration-fitting partition에
들어갈 수 없다.

subject authorization manifest, consent-ledger resolution, vault-scoped
source-event-set commitment, commit grant/generation과 revocation/delete
lineage map은 Personal Raw Vault 내부 preflight와 transaction에만
존재한다. exported batch, Shared Signal, client/API response, receipt,
log, telemetry, analytics, issue/PR/CI artifact와 Model/Eval Registry에는
그 ref, digest, token, state, private hash, fingerprint, commitment 또는
equality handle을 넣지 않는다. serializer는 closed allowlist와 nested
unknown-field rejection을 적용한다.

export에는 exact purpose/O2와 sole registry가 resolve한 named,
batch-wide policy/version ref를 포함한 closed non-private, non-unique,
non-resolvable authorization metadata만 남는다.
subject/item-family pseudonym은 exact purpose, horizon, non-private
rotation scope와 current vault rotation generation 밖에서 unlinkable해야
한다. vault generation은 export하지 않는다.

revocation/delete/O2 invalidation은 먼저 unconsumed generation을
invalidated로 만들고, Personal Raw Vault의 internal downstream lineage로
affected persisted row와 purpose/horizon/rotation/retry descendant,
cache, feature snapshot, materialization, dataset와 Model/Eval artifact를
모두 non-active/quarantined/retired로 만든다. 이 전에는
acknowledgement나 `revocationAppliedThroughRef` 전진이 없다. synchronous
closure가 불완전하면 모든 consumer와 descendant를 덮는 enforced
batch/purpose/horizon/rotation deny barrier를 먼저 설치한다. 각 builder는
publish 직전에 source-row active state를 재검증하고 revocation과
serialize된 boundary에서 lineage를 등록해야 한다. missing/damaged
lineage는 containing batch와 reachable derivative 전체의 quarantine
또는 더 넓은 pipeline deny를 일으킨다. re-consent, backup restore,
cache/materialization rebuild는 old tombstone과 descendant를 resurrect하지
않는다. exported private handle을 propagation fallback으로 요구하지
않는다. revocation/delete는 consumed disclosure budget을 복원하지 않는다.
changed residual surface generation의 certification을 invalidate하고
all-consumer deny barrier를 먼저 설치한 뒤 current
reconstructiveness policy로 recertify해야 한다. registry/policy/
attacker-model change에도 같은 barrier가 필요하며 deletion을 cohort
보존 때문에 지연하지 않는다.

refit는 active `offline_model_training` consent와 그 시점에 유효한 별도
exact-scope O5 아래 새 frozen version으로만 허용하고 in-place refit는
금지한다.

### 15.2 금지

- raw body를 log, telemetry, issue, PR, CI artifact 또는 screenshot에 저장
- raw learner body를 Shared Signal, Model/Eval dataset 또는
  fitting/training/refit/refresh input으로 이동
- 개인 업로드에서 공용 variant를 자동 생성·승격
- global equality oracle
- online model-weight update
- consent 하나로 모든 목적을 포괄
- generic legal basis, contract, service necessity, terms acceptance,
  tenant agreement, research approval, `personal_service` consent, 다른
  목적 consent, O2 단독, O4 또는 experiment tier로
  `pseudonymous_product_signal` consent를 대체
- generated ContrastSet을 verified corpus로 자동 승격
- personal weakness edge를 shared graph로 자동 승격
- raw learner body를 weakness graph label, telemetry 또는 pyBKT 입력으로 사용
- BKT shadow prediction을 learner-facing probability로 노출
- O2 전 real learner event를 pyBKT benchmark 또는 sufficiency audit에 export
- subject authorization manifest, consent-ledger ref/digest, vault/private
  object ref, source-event-set commitment, commit grant/generation,
  replay state, downstream lineage, raw/private hash·fingerprint 또는 vault
  equality handle을 `SharedSignalExportBatchV2`나 Shared Signal에 export
- open/free-text Shared Signal value, unresolved registry member,
  noncanonical order/partition 또는 unbounded numeric value를 export
- current exact reconstructiveness `pass`, composition reservation/ledger,
  common grant/CAS를 거치지 않는 shadow/intervention writer
- rejected/indeterminate/stale assessment, `kMin - 1`, unknown population
  또는 prior/concurrent/cross-schema composition 누락을 pass로 취급
- authorization generation consume 전 Shared Signal에 staged, hidden,
  pending 또는 inactive row를 write
- stale preflight timestamp/snapshot, exported metadata나 retry token으로
  commit authority를 대체
- revocation acknowledgement 뒤 affected row/cache/materialization/dataset/
  Model-Eval descendant를 usable로 남기거나 all-surface deny barrier 없이
  eventual best-effort propagation
- re-consent, backup restore, cache replay 또는 materialization rebuild로
  tombstoned row나 quarantined descendant를 resurrect
- revocation/delete가 prior disclosure budget을 복원한다고 보거나
  residual surface generation을 recertify/barrier 없이 읽기
- O2·approved export·O4만으로 learner-derived pyBKT fitting, training,
  refit, parameter update 또는 dataset refresh 수행
- O5 전 learner-derived observation을 train 또는 calibration-fitting
  partition에 편입

### 15.3 probe 원가

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

## 16. Owner Dogfood와 evidence 분리

### 16.1 Owner 목적

```text
아침 계획
→ 실제 학습
→ attempt_first
→ 풀이·probe·repair
→ 중간 replan
→ 하루 마감
→ D+1
→ D+7
→ timed full solution
→ rule-based weakness map 재계산·근거 확인
```

현재 Owner dogfood acceptance path는 위 `attempt_first` flow만 사용한다.
guided selector, route, API, event, `ExecutionBlock`, scheduling, mastery
또는 runtime을 이 flow가 요구하거나 승인하지 않는다.

Owner evidence가 검증할 수 있는 것:

- 개인 학습가치
- 잘못된 설명·계산·Law release
- UX friction
- Ledger reopen/resume
- native planner 적합성
- 제품을 자발적으로 다시 쓰는지
- weakness 후보가 실제 repair 우선순위를 설명하는지
- insufficient-evidence와 stale 상태가 과신 없이 작동하는지

Owner evidence가 검증할 수 없는 것:

- external usability
- 시장 가격
- 다양한 필체·기기·학습수준 일반화
- commercial readiness
- observed efficacy
- causal claim
- pyBKT 일반화·calibration 또는 learner-facing 정확도

### 16.2 Owner gate

| Gate | 최소 가설 (`attempt_first` only) | 의미 |
| --- | --- | --- |
| Early Value | 서로 다른 5일, usable result 12+, D+1 6+ | 학습가치 방향 |
| Owner-Private Core | 14일+, review 25~30+, D+1 10+, D+7 6+ | core 후보 |
| Scheduler Extended | 공부일 20+, plan 40+, midday replan 10+ | native 일정 품질 |

추가 기록:

- 풀이 뒤 어떤 probe를 썼는가
- probe가 repair를 도왔는가
- component repair 뒤 timed full solution에서 재발했는가
- deterministic conflict와 blocked release
- 동일 event/version에서 weakness snapshot이 재현되는가
- top-3 후보의 근거를 다시 열 수 있고 Owner가 유용하다고 판단하는가
- false weakness, assisted-only recovery와 stale 누락이 발생했는가

현재 dogfood의 study day, usable result, D+1과 D+7 분자·분모는 모두
현재 승인된 `attempt_first` flow에서만 계산한다. guided activity는 현재
acceptance record 또는 numerator에 들어가지 않는다.

guided-to-D+1은 현재 추가 기록이 아니다. 향후 exact guided-runtime
supersession, canonical/mirror/roadmap reconciliation, runtime/schema/RLS/flag
검증과 exact activation gate가 모두 별도로 승인된 뒤에만 별도 future
flow의 분리 metric·분리 numerator로 정의할 수 있다. 그 전에는 이 metric을
수집·요구·추정하지 않는다.

### 16.3 두 ledger를 합치지 않는다

| Ledger | 대상 | readiness에 사용할 수 있는 것 |
| --- | --- | --- |
| Owner-private evidence | Owner 1명 | Owner dogfood·private acceptance |
| External commercial evidence | 승인된 canary | 가격·사용성·지원·환불·원가 신호 |

Owner 일수·result·D+1은 외부 cohort 분자에 넣지 않는다.
Founder 구매·사용도 S238A/S240A Owner scheduler evidence 분자에 넣지
않는다.

---

## 17. 가격과 첫 매출

### 17.1 canonical과 v7 가설을 구분한다

작성 시점 live source에는 다음 historical/canonical 가격 가설이
존재한다.

- Founding Beta: 69,000원, 30일, 20 `usable_review_unit_v1`
- Basic: 59,000~69,000원/month 가설
- Pro: 119,000~149,000원/month 가설
- Premium: 249,000~299,000원/month 가설

이 중 Owner가 승인한 Founding Beta 가설은 정확히 invitation-only
69,000원 / 30일 / 20 `usable_review_unit_v1`뿐이다. 이것도 activation,
entitlement, public offer 또는 판매 승인이 아니며 별도 exact commercial
O4와 canonical external-commercial path를 여전히 요구한다.

v7은 이를 몰래 덮어쓰지 않는다. 다음은 별도 commercial amendment에서
검토할 **새 blocked offer hypotheses**다.

| Offer version | 가격 | 기간 | proposed exact included meter | 현재 상태 |
| --- | ---: | --- | --- | --- |
| `founder_canary_v1` | 39,000원 | 30일 | 8 `usable_review_unit_v1` | own exact amendment 전 blocked |
| `starter_v1` | 49,000원 | 30일 | 8 `usable_review_unit_v1` | own exact amendment 전 blocked |
| `complete_study_os_v1` | 89,000원 | 30일 | 20 `usable_review_unit_v1` | own exact amendment 전 blocked |

세 offer의 숫자는 모두 exact `usable_review_unit_v1` balance만 뜻한다.
`ReviewUnit` 또는 `deep_review_unit`을 과금하거나 그 balance로 fallback,
alias, conversion, migration하지 않는다. `founder_canary_v1`은 승인된
Founding Beta의 alias, discount 또는 smaller pack이 아니다.

현재 canonical source가 승인한 offer-to-meter binding은 위 historical
Founding Beta hypothesis뿐이다. `founder_canary_v1`, `starter_v1`,
`complete_study_os_v1`은 각각 자기 offer의 version, price, duration,
exact meter, included balance와 charging rule을 함께 명명하는 별도 exact
commercial amendment 전까지 모두 blocked다. 한 offer의 amendment나
Founding Beta 승인을 다른 offer에 재사용하지 않는다.

그 amendment가 승인된 뒤에도 entitlement, paid reservation, sale,
checkout 또는 payment는 canonical
`S241A → O3C → S239A → S242C → O4F → S243C`를 통과하고 exact-scope
`O4F` 뒤 authorized `S243C` 안에 들어가기 전까지 금지한다. 이 문서는
price나 commercial O4를 승인하지 않는다.

| submitted question points | `usable_review_unit_v1` charge |
| ---: | ---: |
| 10~25 | 1 |
| 40~50 | 2 |
| 100 | 4 |

배점 누락, 26~39, 51~99 또는 그 밖의 모호한 값은 제출 전에 명시적인
estimate/manual decision을 받아야 하며 결과 뒤 사용량을 올리지 않는다.
고비용 작업 전에 exact meter를 reserve하고, policy상 `usable` result가
성공적으로 확정된 경우에만 commit한다. generation 실패, blocked/stale
결과, provider 오류 또는 usable result 미생성은 reservation을 release하고
0 unit을 소비한다. 이 charging table은 세 신규 offer에 대한 비운영
proposal일 뿐이며 각 own exact amendment가 다시 승인해야 한다.
billing/entitlement/reservation/sale/checkout/payment를 활성화하지 않는다.

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

### 17.2 가격을 붙이는 가치

범용 AI로 대체하기 쉬운 것:

- 쉬운 설명
- 요약
- 자유형 질의응답

대체하기 어려운 것:

- deterministic 계산 검산
- source·rights·effective-version Trust
- PracticalDecisionPath
- 개인 오류 계보
- evidence-backed Personal Weakness Map과 root-cause 후보
- rewrite/recalculate verification
- D+1/D+7 독립 전이
- timed full solution
- Full-Day 운영과 safe replan

가격은 두 번째 묶음의 실제 가치와 지불의사에 붙인다.

각 exact offer manifest는 rule-based weakness map의 포함 여부와
minimum evidence behavior를 명시한다. 홈페이지나 demo에서
`풀수록, 내 답안의 약점이 선명해집니다`를 약속하면 규칙 기반 map,
근거 부족 상태, private scope와 evidence reopen은 그 offer의 launch
blocker가 된다. pyBKT는 별도 승인 전 어떤 offer의 제공 기능으로도
말하지 않는다.

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

### 17.3 미래 조건부 가격 검증 순서

아래는 현재 실행 가능한 launch 절차가 아니다. 세 신규 offer는 모두
blocked이고, 각 단계는 해당 offer의 own exact amendment와 canonical
`S241A → O3C → S239A → S242C → O4F → S243C`가 먼저 충족된 미래에만
조건부 ordering으로 사용할 수 있다.

1. `founder_canary_v1`의 own exact amendment와 exact-scope `O4F`,
   authorized `S243C`가 모두 존재하는 경우에만 39,000원 / 8-unit
   hypothesis를 첫 단계 후보로 검토한다.
2. 그 미래 단계의 누적 cap에 도달하면 신규 판매를 멈추고
   운영·원가·품질 gate를 평가한다. 가격은 자동으로 오르지 않는다.
3. `starter_v1`은 자기 version/price/duration/meter/balance/charging
   rule amendment와 해당 activation path가 별도로 승인된 경우에만
   49,000원 exact offer 후보로 뒤이어 검토한다.
4. pre-gate 구매나 paid reservation으로 수요를 미리 수집하지 않는다.
   향후 authorized `starter_v1`에서 Founder가 review 2회와 D+1 뒤
   다음 pack을 실제 구매 또는 paid reservation하는지는 그때의 별도
   exact decision으로만 기록한다.
5. 향후 39,000원 구매자가 생겨도 그 자체로 49,000원 지불의사 증거가
   아니다.
6. `complete_study_os_v1`도 own exact amendment, full product manifest와
   canonical activation path 뒤 별도 cohort에서만 검토한다.
7. 가짜 취소선 정가, 무기한 할인, 가짜 countdown을 금지한다.

### 17.4 QualifiedPriceDecisionV1

이 schema는 미래 evidence contract일 뿐 현재 수집 절차가 아니다.
`purchase`나 `paid_reservation` member는 어느 신규 offer의 entitlement,
reservation, sale, checkout 또는 payment도 승인하지 않는다. 사용할 수
있는 시점은 그 offer의 own exact amendment와 canonical
`S241A → O3C → S239A → S242C → O4F → S243C`가 모두 충족된 뒤다.

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

### 17.5 외부 canary 시작 전

commercial source amendment, commercial packet과 generic Owner approval은
필요할 수 있지만 외부 결제를 여는 충분조건이 아니다. 현재 controlling
external-commercial path는 다음 exact sequence다.

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
- completed `S239A` External-Readiness Second-Round Golden 9
- completed `S242C` Invitation-Only External Commercial Beta Core Readiness
- exact-scope approved `O4F` Owner External Commercial Beta Activation Approval
- first external payment only inside authorized `S243C` Wave A
- current-version Golden 3/9 as required by the live gate
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

현재 승인된 더 빠른 Starter bridge는 없다. `S236A`, `S237A`, `O4A`, Owner
Dogfood 또는 Owner Early Value는 위 external-readiness/commercial gates를
대체하지 않는다. 향후 단축 경로는 새로 병합된 explicit dated Owner decision이
`S241A`, `O3C`, `S239A`, `S242C`, `O4F`와 대체되는 dependency edge를 하나씩
명시하고, 별도 승인된 Work에서 canonical Markdown, machine-readable mirror와
live roadmap을 함께 reconcile한 뒤에만 재검토할 수 있다. 그 전까지 external
account, invitation, payment, active price/refund, entitlement와 Production은
OFF다.

또한 이 sequence만으로 세 신규 offer가 승인되는 것도 아니다.
`founder_canary_v1`, `starter_v1`, `complete_study_os_v1`은 각각 자기
exact commercial amendment까지 충족해야 하며, 현재는 세 offer 모두
blocked다.

weakness map을 exact feature manifest에 포함했다면 추가로 다음을
요구한다.

- evidence 없는 확정 약점 0
- assisted/view/save에 의한 false recovery 0
- A/B·tenant cross-graph access와 raw-body graph leak 0
- accessible list/table parity
- pyBKT learner-facing 또는 scheduler 영향 0

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


---

## 18. 다른 전문직 시험 확장 전략

### 18.1 “자가복제”가 아니라 certified compilation

이 절 전체는 internal feasibility와 contract candidate 전략이다. 현재
learner-facing scope는 감정평가사 2차 세 과목뿐이며, 이 절의 후보를 제품,
브랜드, route, navigation, pricing, public claim 또는 runtime으로
해석하지 않는다.

새 전문직 시험은 UI와 과목명만 바꿔 복제하지 않는다. 재사용하는 것은
kernel, evidence, tutor protocol, privacy, scheduling과 evaluation framework다.
시험 내용과 채점은 adapter가 다시 증명한다.

```text
공통 kernel 재사용
+ official exam package
+ skill graph
+ modality profile
+ rubric/validator
+ item/variant rights
+ adapter certification
= certified internal adapter candidate
```

이 결과도 별도 product-scope decision 없이는 learner-facing vertical이
아니다.

### 18.2 확장 순서 원칙

시장 규모만 보고 고르지 않는다. 다음 점수를 함께 본다.

- 현재 kernel과의 modality 적합성
- 공식 source와 기출 접근성
- rights 명확성
- deterministic validation 가능 범위
- rubric 안정성
- 빈번한 기준·법령 변경 비용
- item family/held-out 확보 가능성
- domain expert review 비용
- learner pain과 지불의사
- 현재 답안길 vertical을 늦추지 않는가

### 18.3 가까운 adapter와 먼 adapter

#### 가까운 adapter

- 감정평가사 1차 selected-response·계산
- 회계·경제형 객관식/계산 professional exam
- 법률형 객관식과 case analysis
- 서술형 이론·논술 시험

기존 source, 계산, 법령 version, rubric, D+1/D+7, timed와 weakness foundation을
많이 재사용할 수 있다.

#### 중간 adapter

- 복합 회계·세무 계산과 법령 적용
- 특허·노무·행정형 법률 서술
- 계리·정량형 계산/모델링
- 전문자격 oral/interview

새 validator, tool profile, oral privacy 또는 더 강한 expert rubric이 필요하다.

#### 먼 adapter

- 실제 장비·현장 수행
- 고위험 의사결정
- 외부 simulation environment가 필요한 시험

현재 product promise로 포함하지 않는다. 별도 safety case와 domain validation이
필요하다.

### 18.4 감정평가사 1차 adapter

`candidate/appraiser-first`는 internal non-product contract candidate이며
2차 state와 섞지 않는다. 아래 capability 목록은 실행 순서를 대체하지
않는다.

- five-choice selected response
- rapid answer grid
- answer/time/confidence
- distractor misconception
- 계산형 workpad
- OMR/timed set/full mock
- item family와 exposure
- QTI-compatible item representation 후보
- IRT/CAT는 data 충분 뒤 shadow

live authorization sequence는 정확히 다음과 같다.

```text
S236B First-Round Capture/OCR Benchmark Contracts
→ O3B Owner First-Round Rights and Version Approval
→ S237B First-Round Adaptive MCQ Core Contracts
→ O4B Owner First-Round Private Runtime Approval
→ S238B First-Round Authenticated Acceptance
```

PR #660의 Draft source나 benchmark green만으로 S236B 이후 단계를
충족하지 않는다. `candidate/both-track`도 제품 mode가 아니며
`S241A + S238B → S250`을 통과하기 전에는 두 engine을 연결하거나
learner-facing 동차 surface를 만들 수 없다. 이후에도 별도 dated Owner
scope decision과 canonical/mirror/roadmap reconciliation이 필요하다.

### 18.5 Academy internal/B2B contract candidate

Academy는 learner product vertical이 아니며 현재 runtime도 승인되지 않은
별도 internal/B2B contract candidate다. named partner packet과 exact Owner
approval 전에는 route, role, tenant runtime 또는 learner surface를 만들지
않는다. 미래 승인 뒤에도 단순 dashboard가 아니다.

```text
learner attempt
→ AI draft feedback
→ instructor review/approve/edit
→ learner repair
→ verification
→ tenant-private weakness summary
```

필수:

- named partner
- tenant RLS
- instructor role/approval
- learner consent와 sharing purpose
- class-level aggregate minimum cohort threshold
- raw answer의 tenant 밖 이동 금지
- instructor quality/effect measurement
- LTI/xAPI 등 외부 연동은 필요가 증명된 뒤 optional adapter

### 18.6 cross-exam transfer

“민법을 잘하니 모든 법 시험을 잘한다”처럼 자동 이전하지 않는다.

```ts
type CrossAdapterSkillBridgeV1 = {
  fromExamPackageRef: string;
  toExamPackageRef: string;
  fromSkillRef: string;
  toSkillRef: string;
  relation:
    | "same_underlying_skill_candidate"
    | "prerequisite_candidate"
    | "no_direct_transfer";
  supportingEvidenceRefs: string[];
  validatorRefs: string[];
  bridgePolicyVersion: string;
  status: "candidate" | "verified" | "rejected" | "stale";
};
```

verified bridge도 target exam에서 placement/diagnostic 부담을 줄이는 데만 쓸
수 있고 target mastery를 바로 부여하지 않는다.

---

## 19. 기술 아키텍처

### 19.1 conceptual package boundary

실제 repository path는 implementation Work에서 live code를 조사한 뒤 정한다.
전략상 경계는 다음과 같다.

```text
packages/
  professional-exam-reasoning-kernel/
    tutor-fsm/
    reasoning-artifacts/
    assistance-exposure/
    mastery-policy/
  exam-compiler/
    manifest/
    source-rights/
    skill-graph/
    rubric-compiler/
    validator-registry/
  assessment-engine/
    selected-response/
    calculation/
    essay-law/
    oral-simulation/
  learner-evidence/
    event-ledger/
    weakness-projection/
    calibration/
    assistance-dependence/
  intervention-policy/
  review-scheduler/
  trust-release-gateway/
  evaluation-platform/
  model-router/

adapters/
  appraiser-second/
  appraiser-first/
  future-profession-*/

apps/
  dabangil/
  academy-console/
```

### 19.2 append-only evidence, recomputable projection

- attempt, commitment, assistance, exposure, timer와 answer revision은 append-only
- mastery, weakness, readiness와 schedule은 projection
- learner-visible automatic error note는 existing `LearningGapRecord`와
  S216 metadata, accepted feedback/source release artifact의 recomputable
  learner-private projection이며 별도 body 원장이나 state가 아님
- source/taxonomy/policy 변경 시 stale 후 재계산
- projection을 원장처럼 mutate하지 않음
- replay/idempotency가 동일 state를 만들어야 함

### 19.3 trusted release gateway

모든 learner-facing AI output은 gateway를 통과한다.

```text
request
→ auth/RLS
→ episode state
→ source/right/version
→ prompt-injection sanitization
→ model route or deterministic tool
→ schema validation
→ claim/validator verification
→ assistance/exposure transaction
→ cost commit
→ bounded release
```

한 단계라도 실패하면 generic answer fallback을 하지 않는다.

confirmed pre-attempt Learning Lane reveal에서는 bounded release 전에
affirmative confirmation, active Measurement episode의 abandoned/
ineligible·unresumable 전이, distinct Learning episode open,
`full_solution_revealed` assistance, exact exposure와 모든 no-credit flag를
한 trusted transaction으로 commit한다. request, confirmation-screen view,
cancel 또는 failed affirmation은 authoritative state를 바꾸지 않는다.

Shared Signal release에서는 shadow와 intervention이 한 common gateway를
사용한다. gateway가 sole registry, exact payload/digest/envelope,
current reconstructiveness pass, composition generation/reservation,
vault-only single-use grant와 authorization state를 다시 검증하고
reservation/grant consumed CAS, one-time disclosure append, exact row set,
committed downstream lineage와 idempotent result를 같은
revocation-serialized boundary에서 완료한 뒤에만 release한다. preflight
timestamp나 prior check는 이 boundary를 대체하지 않는다.

### 19.4 model routing

- deterministic calculator/source lookup: model보다 우선
- closed classification: 저비용 model 후보 + rule validation
- 복잡한 open response: strong model
- 높은 위험 결과: independent verifier 또는 human escalation
- model disagreement: confidence를 평균내지 않고 conflict/abstain
- model/prompt 변경: versioned re-evaluation
- model provider outage: safe degraded mode

### 19.5 multi-agent 경계

역할 분리는 유용하지만 자유형 agent swarm은 핵심이 아니다.

허용 logical roles:

- Examiner
- Diagnostician
- Tutor
- Grader
- Source Verifier
- Deterministic Validator
- Planner
- Human Reviewer

초기에는 하나의 model route와 여러 deterministic workflow로 구현할 수 있다.
역할별 model 호출은 독립 evidence와 품질/비용 향상이 증명될 때만 추가한다.

### 19.6 untrusted content와 prompt injection

사용자가 올린 문제, 답안, OCR, PDF와 외부 source 안의 문장은 instruction이
아니다.

- data/content channel과 policy instruction 분리
- tool call allowlist
- URL/source fetch allowlist
- secret·system prompt·other learner data 요청 거부
- generated code/formula 실행 sandbox 또는 deterministic parser
- uploaded document가 “이전 지시를 무시하라”고 해도 실행하지 않음

### 19.7 open-source adapter 원칙

- QTI 3: item/interchange와 CAT 호환 후보
- ts-fsrs: review due 후보
- pyBKT: benchmark/shadow 후보
- OR-Tools: 일정 배치 후보
- Cytoscape.js: accessible graph renderer 후보

어떤 dependency도 제품 권위가 아니다. license, SBOM, version pin, supply-chain,
performance, fallback, uninstallability와 data boundary를 먼저 검토한다.

---

## 20. Evaluation Platform과 장기 moat

### 20.1 진짜 자산

모델 자체보다 다음 세 graph가 장기 자산이다.

1. `ExamSkillGraph`: 어떤 능력이 어떤 문제·rubric과 연결되는가
2. `MisconceptionAndCauseGraph`: 어떤 오류가 어떤 조건에서 반복되는가
3. `InterventionOutcomeGraph`: 어떤 상태의 learner에게 어떤 개입을 했을 때
   지연된 무도움 결과가 어떻게 변했는가

세 번째 graph가 가장 중요하지만, raw answer를 공유해 만드는 것이 아니다.
exact-purpose consent와 closed bodyless event를 사용한다.

### 20.2 Common Shared Signal V2 intervention outcome

아래 V1 declarations는 exact-head gap을 설명하는 historical,
**unsupported/non-releaseable** evidence일 뿐 serializer, registry,
validator, grant 또는 writer가 아니다. 그 open/optional 값과 별도
registry를 real-learner data에 사용하는 경로는 없다.

```ts
type HistoricalNonReleaseableApprovedSharedRegistryRefV1<
  TDomain extends
    | "exam_package"
    | "shared_skill"
    | "pre_state_class"
    | "intervention_policy"
    | "time_bucket"
    | "source_eligibility_class",
> = string & { readonly __approvedSharedRegistryDomain: TDomain };

type HistoricalNonReleaseableO2PseudonymousSubjectKeyV1 =
  string & { readonly __brand: "o2_pseudonymous_subject_key_v1" };

type HistoricalNonReleaseableO2DomainSeparatedDedupeKeyV1 =
  string & { readonly __brand: "o2_domain_separated_dedupe_key_v1" };

type HistoricalNonReleaseableInterventionOutcomeEventV1 = {
  pseudonymousSubjectKey?:
    HistoricalNonReleaseableO2PseudonymousSubjectKeyV1;
  examPackageRef:
    HistoricalNonReleaseableApprovedSharedRegistryRefV1<"exam_package">;
  sharedSkillRef:
    HistoricalNonReleaseableApprovedSharedRegistryRefV1<"shared_skill">;
  preStateClassRef:
    HistoricalNonReleaseableApprovedSharedRegistryRefV1<"pre_state_class">;
  interventionPolicyRef:
    HistoricalNonReleaseableApprovedSharedRegistryRefV1<
      "intervention_policy"
    >;
  interventionKind: HistoricalNonReleaseableSharedInterventionKindV1;
  assistanceLevel: HistoricalNonReleaseableSharedAssistanceLevelV1;
  outcomeHorizon:
    | "immediate"
    | "d1"
    | "d7"
    | "d30"
    | "timed"
    | "mock";
  outcomeClass:
    | "qualifying_success"
    | "qualifying_failure"
    | "abstained"
    | "ineligible";
  timeBucketRef:
    HistoricalNonReleaseableApprovedSharedRegistryRefV1<"time_bucket">;
  sourceEligibilityClassRef:
    HistoricalNonReleaseableApprovedSharedRegistryRefV1<
      "source_eligibility_class"
    >;
  dedupeKey: HistoricalNonReleaseableO2DomainSeparatedDedupeKeyV1;
};
```

```ts
type HistoricalNonReleaseableSharedInterventionKindV1 =
  | "orient"
  | "recall"
  | "contrast"
  | "rewrite"
  | "recalculate"
  | "verified_variant"
  | "timed_set"
  | "timed_full_solution";

type HistoricalNonReleaseableSharedAssistanceLevelV1 =
  | "none"
  | "recall_cue"
  | "concept_hint"
  | "structural_hint"
  | "partial_example"
  | "full_solution_revealed";

type HistoricalNonAuthoritativeSharedInterventionRegistryViewV1 =
  Readonly<SharedSignalExportValueRegistryV1>;
```

historical V1의 `other` 부재나 enum closure도 optional subject key, open
registry 값, separate writer와 missing composition gate를 보완하지
않는다. old cryptographic vector가 재현되어도 V1 bytes, grant 또는
intervention event를 release하지 않는다. legacy registry view가 필요한
경우 위처럼 exact immutable `SharedSignalExportValueRegistryV1` object의
non-authoritative read-only view일 뿐 별도 status, allowlist, checksum,
approval decision 또는 resolver를 갖지 않는다.

지원되는 intervention contract는 §12.1에 한 번 선언된
`InterventionOutcomeEventV2`다. 모든 intervention event는 exact
`eventKind: "intervention_outcome"`와 common
`SharedSignalExportEventHeaderV2`의 row ID, mandatory subject key,
zero-based contiguous sequence index와 dedupe key를 가진다. event의
exam package, shared skill, pre-state, intervention policy, horizon,
coarse bucket, subject adapter, source class와 모든 batch policy/version은
§12.1의 exact active `SharedSignalExportValueRegistryV1`에서
value-by-value resolve한다. `SharedInterventionExportRegistryV1`라는
별도 authority, implicit registry view, optional key 또는 variant-specific
ordering은 없다. `guided_reconstruction`은 현재 runtime authority가
없으므로 approved domain에 없다.

intervention-only와 mixed-kind candidate도 exact
`SharedSignalExportBatchDigestPayloadV2`/`SharedSignalExportBatchV2`,
`shared_signal_export_payload_rfc8785_sha256.v2`,
`inverge.shared_signal_export_batch.v2.payload` 및
`inverge.shared_signal_export_batch.v2.envelope` route만 사용한다.
combined shadow/intervention trace의 canonical subject-bytes/sequence
order, duplicate tuple/row/dedupe rejection, deterministic partition,
batch-wide registry/policy binding과 finite bounded number rule도 같다.
separate serializer/profile/digest/envelope, queue, grant, writer 또는
direct Shared Signal row path는 금지한다.

common gateway는 exact O2와 active exact-purpose
`pseudonymous_product_signal` consent를 확인한 뒤 exact candidate
payload/digest/completed-envelope commitment에 대해 current visible
population, prior active/removed disclosures, every joinable schema와
concurrent reservation을 포함한 reconstructiveness assessment를 수행한다.
current exact `pass`만
`VaultSharedSignalExportPreflightV2`,
`VaultSharedSignalReleaseReservationV2`와
`VaultSharedSignalCommitGrantV2`를 준비할 수 있다. common first-write
CAS는 reservation/grant를 consume하고 irreversible history를 정확히 한
번 append하며 exact row set, `VaultSharedSignalDownstreamLineageV2`와
idempotent result를 함께 commit한다. 그 전 staged/hidden/pending row는
0건이다.

manifest, assessment/reason/rare tuple, population/composition ref,
consent-ledger resolution, vault/private ref, source-event-set commitment,
grant/generation, raw/private hash·fingerprint와 internal
revocation/delete lineage는 export/log/telemetry/analytics/Model-Eval에
쓰지 않는다. alias, V1/V2 mix, nested internal-only value, unknown value,
registry/policy/assessment/composition mismatch는 whole batch를
fail closed하고 cross-plane side effect를 0건으로 만든다.

post-export revocation/delete/O2 invalidation은 common row ID와 lineage로
모든 row/descendant를 닫거나 acknowledge 전 all-consumer deny barrier를
설치한다. prior disclosure history/budget은 지우지 않는다. removal로
바뀐 active-surface generation을 invalidate하고 current policy로
recertify하기 전 모든 consumer를 deny한다. re-consent/rebuild/restore는
old row를 resurrect하거나 composition accounting을 reset하지 않는다.
fitting·training·refit·parameter update 또는 dataset refresh는 별도의
active `offline_model_training` consent와 future exact-scope O5가 모두
필요하다.

### 20.3 experiment hierarchy

```text
E0 static fixture
E1 synthetic simulation
E2 offline historical replay
E3 owner-private comparison
E4 learner-hidden shadow
E5 limited randomized or stepped canary
E6 preregistered external efficacy study
```

높은 단계로 갈수록 privacy, sample, ethics와 authority가 강화된다.
E3 Owner 결과를 E5/E6 효능으로 포장하지 않는다.

experiment tier는 data-operation authority가 아니다. real-learner-derived
event를 E3/E4에서 추출·export하고 frozen/versioned inference·evaluation에
쓰려면 exact O2와 approved export가 필요하다. parameter fitting,
training, refit, parameter update, dataset refresh 또는 learner-derived
train/calibration-fitting partition은 별도 future exact-scope O5 전에는
금지한다. O2, export approval, E-tier와 O4는 O5를 대체하지 않는다.

### 20.4 model/policy promotion

후보 policy는 다음을 모두 통과해야 한다.

- frozen temporal cutoff
- learner/item-family leakage 0
- O5 전 learner-derived train·calibration-fitting partition 0
- future exact-scope O5가 fitting을 승인한 경우
  train/calibration/test 분리
- rule baseline 비교
- coverage와 abstention
- calibration/Brier/log loss when probabilistic
- primary transfer metric
- severe subgroup degradation 없음 또는 승인된 mitigation
- version reproducibility
- rollback
- no learner-facing change during shadow

O5가 승인한 offline fitting 결과도 기존 candidate를 in-place 갱신하지
않는다. 새 frozen model/parameter/dataset version과 새 `proposed`
candidate로 시작하며, inference/evaluation 및 activation evidence를 다시
통과해야 한다. 이 promotion 목록은 O5를 부여하지 않는다.

### 20.5 no online self-training

production learner interaction으로 model weight나 policy를 자동 갱신하지
않는다.

- raw body online fine-tuning 금지
- offline이라는 이유만으로 허용되지 않음; learner-derived fitting,
  training, refit, parameter update와 dataset refresh는 별도 future
  exact-scope O5 필수
- O2, approved export와 O4는 O5 대체 불가
- O5 전 learner-derived observation의 train·calibration-fitting 편입 0
- revocation/delete는 artifact quarantine·retire만 허용; refit는
  then-valid O5 아래 새 frozen version으로만 수행하고 in-place update 금지
- reward hacking 방지
- session engagement를 learning reward로 사용 금지
- 후보 생성과 production promotion 분리
- human/Owner decision과 immutable evaluation artifact

### 20.6 사람 전문가의 역할

사람은 매 답안을 수동 첨삭하지 않아도 된다.

- official source와 effective version 승인
- taxonomy/rubric/validator 검수
- Golden/held-out fixture 관리
- model disagreement와 high-risk escalation
- adapter certification
- false-positive weakness와 severe misfeedback review
- efficacy claim 승인

AI는 expert 판단을 scale하지만 authority를 없애지 않는다.

### 20.7 KPI hierarchy

#### Tier 1 — learning

- unassisted held-out gain
- D+7/D+30 retention
- far-transfer success
- time-to-independent-correct
- timed completion
- recurrence reduction

#### Tier 2 — calibration and independence

- confidence calibration error
- hint escalation rate
- full solution dependence
- assisted success→unassisted transfer conversion

#### Tier 3 — safety and trust

- severe misfeedback
- source/version violation
- false mastery/recovery
- answer leakage
- privacy/RLS leak
- cost/usage mismatch

#### Tier 4 — product

- voluntary return
- completion
- support burden
- cost per qualifying learning result
- refund and retention

app time, message count, streak는 Tier 1을 희생하며 최적화하지 않는다.

---

## 21. learner UX

### 21.1 home

홈에는 다음만 우선 보인다.

- 오늘의 핵심 결과 최대 3개
- 지금 할 다음 행동 1개
- evidence-backed 취약 후보 최대 3개
- 판단 보류/근거 부족 상태

전체 skill graph, 통계, history는 progressive disclosure다.

### 21.2 tutor screen

```text
[문제·source·시간]
[1. 요구 파악]
[2. 내 답/방법/목차 먼저 제출]
[3. 풀이 공간]
[필요할 때만 힌트]
[제출 후 진단]
[한 가지 교정]
[대조/변형]
[다음 무도움 검증 예약]
```

chat transcript를 primary UI로 두지 않는다. 대화는 현재 state의 bounded
interaction surface다.

### 21.3 cognitive load

- 한 번에 한 질문
- 한 화면의 주 CTA 하나
- 필수/선택 구분
- 긴 설명은 접기
- 핵심개념 1~3개
- 사용자 수준에 맞는 pace
- 이미 아는 단계는 evidence가 있으면 건너뛸 수 있음
- 모든 문제에 장문 rationale 강제 금지

### 21.4 learner control

사용자는 다음을 할 수 있다.

- 현재 승인된 `attempt_first` 안에서 허용된 hint/reveal 선택
- 더 짧은 설명 선택
- source/evidence 열기
- AI 진단 이의제기
- OCR/답안 수정
- privacy/consent 관리
- export/delete
- graph 대신 list/table 사용

현재 `guided_study` selector는 노출하지 않는다. 미래 §5.0 승인이 난
뒤에도 guided path, hint와 full reveal의 evidence effect를 숨기거나
independent로 바꾸지는 못한다.

### 21.5 accessibility

- keyboard 전체 flow
- screen reader label/state announcement
- visible focus와 focus restoration
- 200% reflow
- reduced motion
- 색상 외 상태 표현
- graph/list/table parity
- voice/handwriting 대체 입력
- timer accommodation의 explicit policy
- cognitive accessibility를 위한 plain-language mode

---

## 22. 실행 로드맵

### 22.1 현재 critical path를 유지한다

v7은 범용 플랫폼을 이유로 감정평가사 2차 Owner critical path를 늦추지
않는다.

작성 시점 expected projection:

```text
PR #667 v7 docs-only correction·Draft review·terminal merge
├─→ O3A Golden 3 rights/source/version decision
└─→ O4V private-plane binding
    → S236P synthetic private-plane acceptance
O3A + S236P
→ S236A Owner-Private Golden 3
→ S237A Structured Tutor + Study OS Core
→ S237P Native Full-Day
→ O4A Owner-only activation
→ S238A Native baseline dogfood
→ S240A Native extended dogfood
→ S241A Owner-Private Authenticated Acceptance
```

실행 시점에는 live roadmap과 dated Owner decisions를 다시 읽는다.

### 22.2 PR #667 strategy correction

- existing branch only
- exact parent head `7a529a728f5690e9e2349d16e8c814213e3a93da`가 live일
  때 그 sole-child fast-forward docs-only corrective 하나
- existing v7 path 한 파일만 수정
- exact 신규 finding 두 건, Shared Signal value-domain closure P2와
  reconstructiveness/composition P2만 교정
- sole immutable `SharedSignalExportValueRegistryV1`, common V2
  shadow/intervention event/batch, exact opaque/numeric/order/partition
  domain과 value-by-value resolution을 고정
- exact closed payload schema, versioned RFC 8785/SHA-256 profile,
  length-delimited payload digest와 vault-only completed-envelope
  commitment/length을 current assessment/reservation/ledger/grant와 같은
  acyclic common writer rule로 고정
- existing 18 resolved thread를 reply/reopen/re-resolve하지 않음
- exact target thread
  `PRRT_kwDOSMHn8M6UUmjc`,
  `PRRT_kwDOSMHn8M6UUmjh`만 각각 독립 검증 뒤 evidence reply와 resolve
- 새 exact head에서 모든 required check success와 fresh review terminal
  결과를 요구
- known-thread target은 `20/20 resolved`
- final aggregate는 계속 one added v7 file
- corrected v6 또는 v6.1 artifact 재도입 금지
- Draft 유지
- auto-merge OFF
- product-signal consent/O2 activation, O5, guided runtime, price 또는
  commercial O4 승인 0
- implementation 0

### 22.3 S237A v7 learning source amendment 제안

S236A completion과 live authority 뒤의 별도 S237A Work에서만 source와
implementation contract를 다룬다. 그 Work도 runtime을 활성화하지 않으며
Owner-private learner runtime은 S237P 뒤 별도 O4A까지 OFF다.

S237A가 구현 후보로 다룰 수 있는 learner path는 current
`attempt_first` Learning Lane과 그 안의 confirmed answer-reveal
override다. override는 attempt-before-reveal default를 보존하는
non-guided, no-credit exit이며 Owner dogfood result/D+1/D+7 numerator에는
포함되지 않는다. `guided_study`, guided selector/route/API/event/
ExecutionBlock/scheduling/mastery는 contract-only로 남고, §5.0의 별도
dated Owner supersession 없이는 S237A 어느 slice도 이를
구현·출시·활성화하지 못한다.

| slice | 산출물 |
| --- | --- |
| S237A.0 | runtime/schema/RLS/flags/live contract 재조사 |
| S237A.1 | `attempt_first` commitment/assistance/exposure + tutor FSM + confirmed Learning reveal의 atomic no-credit transition; guided symbols는 contract fixture only |
| S237A.2 | 감정평가사 2차 ExamPackage/TaskProfile projection |
| S237A.3 | structured Workbench + struggle budget + scaffold/reveal/fading + deliberate confirmation |
| S237A.4 | ExplanationPacket/KeyConcept/probe/DecisionPath/Contrast |
| S237A.5 | DiagnosticCause/Gap/Repair/Verification + existing S216 기반 five-field automatic error-note projection |
| S237A.6 | Learning Lane vs Measurement Lane + confirmed override no-credit + D+1/D+7/timed qualification |
| S237A.7 | rule PersonalWeaknessMap + calibration + assistance dependence |
| S237A.8 | Ledger/search/resume/offline/conflict/accessibility |
| S237A.9 | exact-head integrated Owner acceptance |

이 table은 strategy projection이며 live roadmap authority를 자동 변경하지
않는다.

### 22.4 planner

```text
native evidence candidate selection
→ optional ts-fsrs due suggestion
→ native eligibility/ranking
→ optional OR-Tools placement
→ trusted gateway validation
→ Today/Full-Day
```

FSRS와 OR-Tools는 S237A core를 막지 않는다.

### 22.5 platform extraction gate

감정평가사 2차 Owner-private acceptance 전에는 대규모 generic package
refactor를 하지 않는다.

그 뒤 별도 Work:

1. 두 subject adapter 이상에서 공통 primitive 확인
2. compatibility fixture 동결
3. universal interface extraction
4. appraiser-second regression 100%
5. live first-round authority sequence 뒤 internal appraiser-first compatibility candidate
6. 두 번째 다른 modality adapter
7. C6 cross-vertical promotion decision

### 22.6 감정평가사 1차

이 절은 `candidate/appraiser-first`의 internal projection이며 learner
product나 runtime 승인이 아니다. 2차 core와 병렬로 사고만 하지, shared
schema/RLS mutation을 동시에 충돌시키지 않는다.

```text
S236B First-Round Capture/OCR Benchmark Contracts
→ O3B Owner First-Round Rights and Version Approval
→ S237B First-Round Adaptive MCQ Core Contracts
→ O4B Owner First-Round Private Runtime Approval
→ S238B First-Round Authenticated Acceptance
```

이 sequence를 owner diagnostic, generic pilot, limited adapter acceptance,
PR #660 또는 다른 source amendment로 단축하지 않는다. both-track은 별도로
`S241A + S238B → S250`을 요구한다. S250 전에는 두 track의 mastery,
readiness, navigation, pricing 또는 learner surface를 결합하지 않는다.
그 뒤의 learner-facing 1차·동차 범위도 exact dated Owner scope decision과
canonical/mirror/roadmap reconciliation 없이는 OFF다.

### 22.7 다른 전문직 시험

별도 exact Owner scope decision 뒤 internal feasibility로만 시작한다.
appraiser-first 또는 두 번째 certified modality는 기술적 선행 증거일 뿐
learner product 승인이 아니다.

- exact exam selection decision
- official source/rights feasibility
- adapter package
- Golden and held-out
- domain expert
- synthetic→private→limited external

“몇 주면 복제 가능” 같은 일정은 package completeness와 content/rights를
확인하기 전 약속하지 않는다.

### 22.8 commercial path

학습 contract와 commercial source amendment를 분리한다. commercial source
amendment, packet 또는 generic Owner approval만으로 외부 결제를 열지 않는다.
현재 controlling path는 다음이다.

```text
S241A → O3C → S239A → S242C → O4F → S243C
```

첫 외부 결제는 exact-scope `O4F` 뒤 승인된 `S243C` 안에서만 가능하다.
`S236A`, `S237A`, `O4A`, Owner dogfood와 Early Value는 이 경로를 대체하지
않는다. 별도 dated Owner supersession과 canonical/mirror/roadmap reconciliation
없이는 faster bridge가 존재하지 않는다.

현재 v7 가격은 감정평가사 2차 exact feature manifest에만 적용되는 가설이다.
다른 시험의 가격은 원가, scope, alternative spend와 실제 decision을 다시
측정한다.

---

## 23. 바로 다음 Work

### 23.1 지금 실행할 하나

PR #667의 fresh-review parent head
`7a529a728f5690e9e2349d16e8c814213e3a93da`와 main이 live checkpoint에
그대로 있을 때만, 별도 corrective Work가 다음을 수행한다.

1. live authority, parent head/tree, artifact와 exact unresolved P2 두 건,
   `PRRT_kwDOSMHn8M6UUmjc`,
   `PRRT_kwDOSMHn8M6UUmjh` 및 20-thread topology 검증
2. existing PR branch에 parent head의 sole-child corrective 하나
3. existing v7 경로 한 파일에서 one immutable value registry, closed
   value/opaque/numeric/order/partition domain, common V2 batch와
   shadow/intervention writer를 교정
4. exact candidate와 prior/split/concurrent/cross-schema composition에
   대한 current reconstructiveness pass, prepared reservation, ledger와
   first-write CAS binding을 교정
5. independent exact digest payload type, supported common V2
   canonicalization/hash profile, acyclic payload digest와 vault-only
   completed-envelope commitment/length을 보존·reconcile
6. exact O2 + active product-signal consent, vault-only
   assessment/manifest/commitment/grant/lineage와 separate offline-training
   consent + O5 fitting boundary를 보존
7. exact-head digest/manifest, 98 focused hostile assertions, 13 positive
   assertions, three two-way V2 golden vectors, authority audits와
   newest-head required checks 고정
8. 기존 18 resolved thread에는 mutation 없이 exact target threads만 각각
   독립 검증 뒤 1회 증거 답변·해결
9. 20/20 resolved 뒤 exact new head에 fresh `@codex review` 1회 요청하고
   terminal 결과까지 대기
10. prior caveat·release-artifact binding, exact first-round sequence,
   canonical commercial path와 aggregate 단일 경로 보존
11. Draft 유지, Ready/merge/auto-merge/O2/O5/data export/guided runtime/
   commercial O4/implementation 0으로 자동 중단

### 23.2 그 다음

- fresh exact-head hostile review
- 별도 explicit Ready/merge Work
- terminal merge 뒤 live roadmap reconciliation
- next authorized O3A/O4V/S236P slice 선택

이 문서는 후속 Work를 스스로 승인하지 않는다.

---

## 24. Acceptance matrix

### 24.1 structured tutor kernel

| 영역 | 통과 | fail-closed |
| --- | --- | --- |
| state machine | 모든 transition server-derived·versioned | client/model state spoof 0 |
| commitment | feedback 전 immutable | 사후 제출을 pre-feedback로 위장 0 |
| struggle | `attempt_first` bounded budget; guided semantics는 contract fixture only | 무한 반복·미승인 guided runtime·answer 즉시 노출 0 |
| scaffold | 최소 단계·fading | hint가 answer를 우회 누설 0 |
| reveal | default attempt-before-reveal; confirmed pre-attempt Learning override는 affirmative copy + trusted atomic lane/assistance/exposure/no-credit commit 뒤 output | request/view/cancel mutation·measurement pre-submit reveal·transaction 전 byte 0 |
| reveal override | existing eligibility/state transition에 subordinate한 non-guided basis; active Measurement episode는 먼저 abandoned/ineligible·unresumable, distinct Learning episode open | guided exit 재사용·self-authorization·client fixed-false spoof·revealed/same-surface independent credit 0 |
| reconstruction | learner 재수행 | view/save를 recovery로 계산 0 |
| transfer | unseen family·no assistance | same-item/same-surface stable 0 |
| caveat | exact `ko-KR.v1` copy가 heading 직후, body 전에 first render/reopen | missing/unknown/mismatch 시 body render 0 |
| release binding | exact upstream artifact가 candidate·validator·critic·consensus/conflict·final gate를 성공 resolve | single-model/claims-only usable 0 |
| accessibility | alternate input same semantics | accommodation을 ineligible로 임의 처리 0 |

### 24.2 exam compiler

- manifest required field completeness 100%
- package digest deterministic
- official rule/source/effective-version binding
- rights unresolved asset learner release 0
- revoked/stale package new episode 0
- adapter instruction prompt injection 0
- cross-adapter cache collision 0
- private skill cross-exam promotion 0
- Golden/held-out leakage 0
- kernel regression across certified adapters 100%

### 24.3 diagnosis/intervention

- insufficient evidence를 원인 확정으로 표시 0
- supporting/counter evidence와 disconfirmation
- model diagnosis direct state write 0
- high-confidence wrong은 pre-feedback evidence만
- intervention eligibility hard gate
- same evidence duplicate priority contribution 0
- weakness/mastery contradiction 0
- assistance dependence가 learner 낙인으로 노출 0
- accepted wrong/partial learner feedback마다 existing
  `LearningGapRecord`/S216 metadata에서 하나의 learner-private automatic
  error-note projection
- `왜 틀렸는지`, `정확한 원리`, `지금 바로 고칠 것`, `재발`,
  `다음 복습` 다섯 semantic field가 모두 non-empty, distinct, same
  feedback revision/primary gap에 결합
- correct principle은 usable claim/source/release artifact와
  `EffectiveVersionBindingV1`에 결합; missing/conflict/stale면 usable
  render 0
- recurrence count/recovery는 LearningGapRecord, status/evidence는 S216에서
  결정론적으로 reconcile; candidate-ID length 추론·conflict silent choice 0
- next review는 same-learner real canonical `ReviewUnit`과 valid
  `ReviewTaskKindV1`/due state에 resolve; candidate-only target 0
- immediate learner action 하나만 due primary CTA; note 생성/view/save의
  mastery·recovery·weakness·queue-completion credit 0
- save/reopen/resume/Ledger/search에서 same current note revision;
  S216 learner body persistence와 Shared/Academy/model promotion 0

### 24.4 measurement

- Learning/Measurement cache·route separation
- pre-attempt answer request, confirmation UI view와 cancel은 Measurement
  episode, exposure, attempt와 credit state mutation 0
- affirmative confirmed Learning reveal은 active Measurement episode를
  atomic하게 abandoned/ineligible·unresumable로 닫고 distinct Learning
  episode를 연 뒤 full assistance/exposure/no-credit를 output 전에 commit
- confirmed override의 revealed item, retry와 actually exposed/
  same-surface variant는 independent·D+1/D+7/timed/transfer qualification 0;
  future eligible unseen non-same-surface review만 기존 policy로 재평가
- presentation 전 eligibility snapshot
- full solution/hint leakage 0
- timer server authority
- D+1/D+7/D+30 policy reproducibility
- same-family/retry/exposed variant 독립 count 0
- held-out temporal leakage 0
- primary metric unassisted
- pass probability learner exposure 0
- real-learner extraction·export·frozen/versioned inference·evaluation은
  exact O2 + active exact-purpose `pseudonymous_product_signal` consent +
  approved export에만 한정
- extraction 전과 release 직전 consent/O2/notice-policy/retention/horizon
  재검증
- missing·declined·revoked·expired/stale·wrong-purpose·wrong-policy·
  unresolved consent 또는 O2 mismatch에서 event 제외, invalid batch reject,
  Shared Signal/log/telemetry/Model-Eval write 0
- sole active immutable `SharedSignalExportValueRegistryV1`에서 shadow와
  intervention의 every exported enum/ref/version을 value-by-value resolve;
  open/free-text/fallback/expired/mismatched/unavailable member 0
- closed opaque-ID encoding/authority/scope, finite bounded number,
  per-subject zero-contiguous index, canonical subject-bytes/sequence order와
  deterministic partition 100%
- independent exact `SharedSignalExportBatchDigestPayloadV2`가 final envelope의
  `exportDigest`를 structurally exclude하고 모든 payload field/observation을
  digest-visible하게 포함
- supported `shared_signal_export_payload_rfc8785_sha256.v2` common profile의
  strict
  I-JSON/RFC 8785/UTF-8, domain + NUL + uint64 byte-length + payload bytes
  SHA-256 재현 100%
- shadow-only, intervention-only, mixed-kind typed payload, actual digest
  preimage bytes, completed canonical envelope bytes, payload digest와
  vault-only envelope commitment/octet length의 3개
  two-independent-derivation golden vector 일치
- exact candidate full/prefix/suffix/all contiguous windows/all non-empty
  semantic projections 및 unordered presence/count가 future exact O2
  threshold와 complete manifest를 통과한 current reconstructiveness
  `pass`
- current visible distinct-human `kMin`, prior active/revoked/deleted
  history, split/retry/replacement, cross-schema and concurrent reservation
  composition을 모두 포함; missing/generic threshold나 `kMin - 1` pass 0
- legal basis, contract, service necessity, terms, tenant agreement,
  research approval, `personal_service`, 다른 consent, O2 단독, O4와
  experiment tier의 product-signal consent 대체 0
- O5 전 learner-derived fitting/training/refit/parameter update/
  dataset refresh와 train·calibration-fitting partition 0
- product-signal consent, O2, export approval와 O4의
  `offline_model_training` consent 또는 O5 대체 0

### 24.5 감정평가사 2차 vertical

기존 v7 vertical acceptance를 모두 요구한다.

- exact learner-visible caveat가 desktop/mobile, first render/reopen, body 전
  accessible order로 노출
- missing/invalid caveat에서 generated reference body release 0
- exact upstream reference-answer release artifact가 없거나 stale/blocked/conflict면
  `usable` render 0
- independent candidate set, subject validator, critic review,
  consensus/conflict resolution과 final release gate 누락 0
- 실무 deterministic number/unit/sign/rounding Golden 100%
- AI middle/final calculation conflict release 0
- 이론 unsupported assertion verified 승격 0
- 법규 missing/conflict/unbound/stale 기준안 release 0
- D+7 verified variant 전 stable 0
- weakness evidence conservation/dedupe
- graph/list accessibility parity

### 24.6 privacy/security

- raw body log/analytics/graph/shadow leak 0
- A/B·tenant·adapter cross-access 0
- uploaded content prompt injection 0
- direct API/multi-tab/retry reveal bypass 0
- secret/system prompt exposure 0
- export/delete/revocation propagation
- payload/final-envelope schema는 exact closed이고 duplicate/unknown/alias/
  nested/missing/extra/coercion/default/invalid I-JSON·Unicode·number를
  digest 전에 reject; unknown strip-then-hash 0
- commit authority는 exact batch ID/profile, recomputed payload digest,
  completed canonical envelope commitment/octet length, sole registry,
  ordering/partition policy, current exact assessment pass, reference
  population, authority-selected joinable surface, composition generation/
  commitment/reservation와 current O2/consent generations에 묶인
  short-lived single-use vault grant뿐; checkedAt, digest/commitment, stale
  snapshot, exported metadata와 retry token authority 0
- reservation/grant prepared→consumed CAS, exact one-time irreversible
  disclosure append, first/all Shared Signal rows, committed vault row
  lineage와 exact idempotent result가 one revocation-serialized logical
  linearization; 그 전 Shared Signal staged/hidden/pending write 0
- duplicate/replay, payload digest/canonical-envelope bytes/commitment/length
  mismatch, expiry/invalidation과 mixed stale subject batch는 side effect나
  partial 없이 whole-batch reject
- revocation/delete/O2 invalidation은 racing unconsumed grant를 먼저
  무효화하고 persisted row와 cache/feature/materialization/dataset/
  Model-Eval descendant를 모두 non-active/quarantined/retired로 만든 뒤
  acknowledge/applied-through 전진
- targeted closure가 불완전하면 모든 consumer와 provenance descendant를
  덮는 enforced batch/purpose/horizon/rotation deny barrier
- consumer는 active/non-quarantined/non-tombstoned row만 읽고 builder는
  publish 직전 source active recheck + lineage registration을 revocation과
  serialize
- missing/damaged/incomplete lineage는 containing batch와 reachable
  descendant quarantine 또는 broader pipeline deny; unknown usable
  descendant 0
- re-consent, cache/materialization rebuild, backup restore의 old row/
  descendant resurrection 0
- revocation/delete/re-consent/rotation/retry의 consumed composition budget
  reset 0; residual active-surface certification generation invalidation과
  all-consumer barrier 뒤 current-policy recertification
- pseudonym horizon linkage 0
- subject authorization manifest, consent-ledger ref/digest,
  vault/private object ref, source-event-set commitment, grant/generation,
  private downstream lineage, private hash·fingerprint와 equality handle의
  export 0
- authorization metadata는 closed, non-private, non-unique,
  non-resolvable global values만 허용
- final-envelope commitment/octet length, manifest, source-event-set
  commitment, assessment/reason/population/composition/reservation과
  revocation/delete lineage는 vault-internal only; exported private handle
  또는 digest/commitment lookup fallback 0
- standalone intervention serializer/profile/registry/grant/writer 또는
  common reconstructiveness gateway/CAS bypass 0
- internal-only alias, nested injection과 unknown export field 0
- supply-chain/SBOM/license review

### 24.7 evaluation

- frozen rule baseline
- O5 전 learner-derived evaluation-only partition
- future exact-scope O5 fitting에서만 train/calibration/test separation
- item-family/learner leakage 0
- coverage/abstention report
- subgroup and device/accessibility slice
- severe misfeedback threshold
- version reproducibility
- rollback rehearsal
- external efficacy claim before evidence 0

### 24.8 hostile fixtures

1. COMMIT 없이 full-solution endpoint 직접 호출
2. 다른 탭에서 hint 후 원래 탭 독립 제출
3. prefetch/cache에서 answer metadata 노출
4. model이 `independent_eligible=true`를 출력
5. client가 confidence를 feedback 뒤 수정
6. same-family 숫자만 바꾼 문항을 far transfer로 제출
7. uploaded OCR에 prompt injection 포함
8. 법규 effective date missing인데 generic model fallback
9. one mixed answer의 failure를 모든 skill에 복제
10. contract-only guided value를 runtime에서 수락하거나 view/save를 mastery로 승격
11. stale exam package로 new episode 생성
12. appraiser evidence를 다른 exam mastery로 bridge
13. revoked learner가 shadow export에 남음
14. graph node swap/cross-learner checksum tamper
15. OR-Tools가 evidence-ineligible task를 배치
16. ts-fsrs가 weakness를 직접 변경
17. pyBKT prediction이 queue 또는 UI에 영향
18. model disagreement를 평균내 verified release
19. caveat kind/version을 누락·위조한 채 body direct render
20. 존재하지 않거나 다른 problem basis의 release artifact ref를 주입
21. candidate set·critic·final gate 없이 `claims + verificationSummary`만으로 usable
22. timer offline gap을 independent로 위장
23. accessibility alternate input이 commitment evidence에서 누락
24. O2와 export approval만으로 learner-derived observation을 pyBKT
    train/calibration-fitting partition에 넣거나 fitting·refit·parameter
    update·dataset refresh 수행
25. revoked artifact를 유효한 exact-scope O5와 새 frozen version 없이
    in-place refit
26. generic legal-basis-only subject를 Shared Signal batch에 포함
27. `personal_service` consent만 있는 subject를 product-signal consent로
    재사용
28. wrong-purpose consent를 `pseudonymous_product_signal` grant로 처리
29. missing·declined·revoked·expired/stale consent subject를 포함
30. O2만 있고 active product-signal consent가 없는 event를 export
31. product-signal consent만 있고 matching exact O2가 없는 event를 export
32. vault commitment/private ref/raw hash/fingerprint를 batch에 주입
33. subject manifest 또는 consent-ledger ref/digest를 batch에 주입
34. internal-only alias, nested internal field 또는 unknown field를 주입
35. batch·purpose·horizon·rotation 사이 reusable/linkable authorization
    handle을 주입
36. vault-local preflight가 missing, stale, mismatched 또는 invalid인데
    batch release
37. revocation/delete propagation이 vault-internal lineage 대신 exported
    private handle을 요구
38. product-signal consent, O2와 approved export만으로
    `offline_model_training` consent와 exact O5 없이 fitting·training·
    refit·parameter update·dataset refresh 수행
39. final consent check 뒤 commit 전 consent가 revoked됐는데 stale
    prepared generation으로 첫 Shared Signal write
40. vault-only staging/pre-commit validation 뒤 첫 row write 전 consent가
    revoked됐는데 commit
41. 같은 window에서 O2가 invalidated됐는데 prepared grant consume
42. stale consent read replica, cached ledger snapshot 또는 checkedAt
    timestamp로 commit authorize
43. consumed grant replay 또는 concurrent duplicate commit을 두 번 반영
44. grant의 payload digest 또는 final-envelope commitment/octet length와
    validator가 재계산한 payload/canonical envelope bytes가 mismatch인데
    commit
45. included subject 하나의 consent generation이 stale인 mixed batch를
    부분 commit
46. crash/retry가 committed vault lineage 없는 active Shared Signal row를
    남김
47. crash/retry가 exact active/traceable idempotent row result 없이
    consumed authority를 남김
48. old batch/horizon/rotation/retry의 persisted row가 revocation 뒤 active
49. quarantined row를 query/cache/materialized view/dataset builder가 읽음
50. builder가 active row를 읽은 뒤 revocation이 완료됐는데 detached
    cache/feature snapshot/dataset/model을 publish
51. missing/damaged lineage에서 containing row를 silently active로 유지
52. incomplete lineage가 known descendant만 닫고 unknown
    provenance-reachable derivative를 usable로 유지
53. all-surface non-active 전이 또는 enforced deny barrier 전에 revocation
    acknowledge나 `revocationAppliedThroughRef` 전진
54. internal grant/generation/downstream lineage를 alias 또는 nested
    export field로 주입
55. re-consent로 old tombstoned row를 resurrect
56. backup restore, cache replay 또는 materialization rebuild로 tombstoned
    row/descendant를 resurrect
57. explicit affirmative confirmation 없이 pre-attempt answer request만으로
    reveal
58. request, confirmation-screen view 또는 cancel이 Measurement episode,
    exposure, attempt나 credit를 mutate
59. `confirmationOutcome = "affirmed"` 전 lane transition
60. submitted attempt 뒤 confirmed-override basis를 쓰거나 immutable
    pre-reveal snapshot mismatch를 수락
61. client가 spoof한 confirmation으로 reveal
62. Measurement Lane에서 direct API, multi-tab, cache/prefetch로 answer reveal
63. override 때 active Measurement episode를 atomic하게
    abandoned/ineligible·unresumable로 만들지 않거나 나중에 resume
64. confirmation은 commit됐지만 `full_solution_revealed` assistance 또는
    exact exposed surface 기록이 누락
65. answer-bearing output을 `full_solution_revealed`보다 약한 assistance로
    기록
66. client/model이 fixed no-credit field를 true로 변경
67. no-credit transaction commit 전에 answer byte/token 반환
68. revealed item, retry 또는 actually exposed/same-surface variant를
    independent/D+1/D+7/timed/transfer로 계산
69. confirmed override를 guided study 또는 guided exit로 분류
70. override record가 existing `AnswerRevealEligibilityV1`와 trusted state
    transition 없이 self-authorize
71. submitted wrong/partial answer 없는 pre-attempt reveal에서 cause,
    biggest gap, repair 또는 automatic error note 생성
72. accepted wrong/partial feedback 뒤 automatic error note 누락
73. 두 번째 competing error-note store/state를 만들거나 learner body를
    metadata-only S216 record에 저장
74. 다섯 required field 중 하나가 missing, empty, duplicated 또는 generic
75. correct principle이 usable source/claim/release evidence에 unbound
76. required `EffectiveVersionBindingV1`가 missing/conflict/stale인데
    principle을 usable로 render
77. recurrence state/count/evidence 없이 prevention cue가 반복 pattern을
    발명
78. recurrence count를 candidate-ID array length로 추론하거나
    LearningGapRecord와 S216 conflict를 silent accept
79. next-review text는 있지만 real queue/schedule target이 없음
80. S216 `reviewQueueCandidate`를 real learner-scope canonical
    `ReviewUnit` 없이 승격
81. next review가 existing `ReviewTaskKindV1` 밖의 task kind 사용
82. insufficient cause evidence를 certain learner fault로 render
83. note-level uncertainty가 referenced cause hypothesis와 모순
84. client/model field status·qualification 또는 arbitrary/multiple
    primary CTA를 수락하거나 due 전 next review를 primary로 만듦
85. note generation/render/view/save가 mastery, recovery, weakness 또는
    queue-completion을 증가
86. private error-note body를 Shared Signal, Academy 또는 model training으로
    promotion
87. actual `exportDigest`를 포함한 completed envelope 자체를
    `exportDigest` preimage로 hash
88. hash fixed-point를 탐색하거나 self-referential serializer로 digest 생성
89. `exportDigest = ""`, `null`, zero, sentinel 또는 provisional value를
    payload preimage에 포함
90. unvalidated arbitrary object에서 `exportDigest`를 dynamic delete한 뒤
    payload로 간주
91. final exported envelope에 `exportDigest`가 missing
92. `SharedSignalExportBatchDigestPayloadV2`에 `exportDigest` property가 존재
93. top-level `exportDigest`가 duplicate
94. alias 또는 nested digest injection
95. unknown field를 silently strip한 뒤 hash
96. observations만 또는 payload 일부만 hash
97. named canonical payload가 아니라 raw transport JSON을 hash
98. object key order, whitespace, escape 또는 numeric spelling 차이를 서로
    다른 valid digest input으로 인정
99. wrong domain, schema/profile version, algorithm, prefix, case, digest
    length 또는 encoding을 수락
100. default insertion, coercion 또는 silent Unicode normalization으로
     digest-visible value 변경
101. digest attach 뒤 모든 top-level payload field 각각의 mutation
102. digest attach 뒤 observation leaf mutation 또는 array reorder
103. 다른 batch ID, purpose, horizon, rotation 또는 authorization
     generation에 digest 재사용
104. batch ID, row ID, dedupe key 또는 다른 field가 `exportDigest`에서
     파생되거나 vault-only derived value가 payload/envelope로 되돌아오는
     indirect cycle
105. attached payload digest는 일치하지만 vault-only final-envelope
     commitment 또는 byte length가 mismatch
106. final-envelope commitment/octet length를 vault 밖에 serialize
107. verifier가 supplied canonical bytes 또는 digest를 재구성 없이 신뢰
108. digest는 valid지만 consent/O2/grant가 invalid인데 authorize
109. 다른 consent/O2/grant가 valid한 digest mismatch에서 grant consume,
     row 또는 다른 side effect 발생
110. future V2 exported registry/value field가 payload preimage에서 누락
111. digest 또는 envelope commitment를 authorization, membership 또는
     private-lineage lookup evidence로 사용

Shared Signal V2 corrective hostile matrix는 transient validator에서 아래
98개 hostile case를 모두 독립 assertion으로 실행한다. 이 목록은 test
artifact나 golden bytes를 저장하는 곳이 아니라 required behavior의
stable contract다.

1. `SSV2-H01`: `occurredAtBucketRef`에 free text
2. `SSV2-H02`: bucket field에 RFC 3339/ISO timestamp
3. `SSV2-H03`: bucket field에 epoch seconds/milliseconds 또는 timezone
   date
4. `SSV2-H04`: unknown/custom/finer-than-approved bucket ID
5. `SSV2-H05`: free-text/unknown subject adapter
6. `SSV2-H06`: cross-purpose/cross-version subject adapter
7. `SSV2-H07`: unknown/expired/revoked taxonomy version
8. `SSV2-H08`: unknown/expired/revoked mapping-adapter version
9. `SSV2-H09`: unknown/expired/revoked label-policy version
10. `SSV2-H10`: private concept 또는 unknown shared-skill ID
11. `SSV2-H11`: enum-valid but registry/version-invalid source class
12. `SSV2-H12`: arbitrary string in any batch policy/version/ref
13. `SSV2-H13`: `other`, passthrough, model/learner-authored fallback
14. `SSV2-H14`: stable account ID disguised as subject pseudonym
15. `SSV2-H15`: private event ID/raw-private hash disguised as item
    pseudonym, row ID 또는 dedupe key
16. `SSV2-H16`: cross-purpose/horizon/rotation pseudonym 또는 dedupe reuse
17. `SSV2-H17`: invalid opaque encoding/length/derivation authority
18. `SSV2-H18`: missing/unknown/expired/revoked/stale registry
19. `SSV2-H19`: registry basis mismatch 또는 lookup unavailable
20. `SSV2-H20`: shadow/intervention validator가 서로 다른 registry 사용
21. `SSV2-H21`: brand만 맞고 trusted membership resolution 없음
22. `SSV2-H22`: hash-then-accept, silent normalization/case-fold fallback
23. `SSV2-H23`: unsafe/fractional/negative/out-of-range/gapped/duplicate
    sequence index
24. `SSV2-H24`: event/trace/batch count가 approved cap 초과
25. `SSV2-H25`: future exported field에 closed domain/registry coverage 없음
26. `SSV2-H26`: 한 subject의 unique full ordered trace
27. `SSV2-H27`: full trace는 common이나 prefix/suffix가 unique
28. `SSV2-H28`: bucket + adapter + skill joint tuple이 unique
29. `SSV2-H29`: bucket + item pseudonym + outcome joint tuple이 unique
30. `SSV2-H30`: rare sequence length 또는 sparse equivalence class
31. `SSV2-H31`: each field common이나 joint tuple unique
32. `SSV2-H32`: arbitrary order/partition covert identifier
33. `SSV2-H33`: field closure/pseudonymization만으로 pass
34. `SSV2-H34`: schema sufficiency만으로 pass
35. `SSV2-H35`: missing exact future O2 threshold를 pass
36. `SSV2-H36`: insufficient/unknown reference population을 pass
37. `SSV2-H37`: non-consenting/excluded/vault-only/cross-purpose/revoked
    subject를 current cover로 계산
38. `SSV2-H38`: indeterminate/timeout/evaluator failure를 pass
39. `SSV2-H39`: isolated batch는 pass지만 prior release와 함께 fail
40. `SSV2-H40`: 두 batch가 한 reconstructive trace를 split해 각각 pass
41. `SSV2-H41`: joinable intervention surface를 composition에서 누락
42. `SSV2-H42`: overlapping-cohort differencing으로 membership 재구성
43. `SSV2-H43`: retry/new batch ID가 composition을 reset
44. `SSV2-H44`: rotation/re-consent가 prior budget을 reset
45. `SSV2-H45`: revoked/deleted disclosure를 history에서 지운 unsafe
    replacement
46. `SSV2-H46`: same generation의 concurrent pass 둘이 combined fail인데
    둘 다 commit
47. `SSV2-H47`: stale composition generation/population snapshot
48. `SSV2-H48`: assessment가 다른 digest/envelope/batch/purpose/horizon/
    rotation/registry/policy에 bind
49. `SSV2-H49`: copied/replayed prior pass
50. `SSV2-H50`: assessment 뒤 payload/envelope mutation
51. `SSV2-H51`: assessment 뒤 subject/event silent deletion, bucket
    widening, rotation 또는 reorder
52. `SSV2-H52`: failed payload split/partial commit
53. `SSV2-H53`: grant에 assessment/joinable-surface/composition binding 누락
54. `SSV2-H54`: commit이 composition generation을 CAS/append하지 않음
55. `SSV2-H55`: Shared Signal staged/first write 뒤 assessment
56. `SSV2-H56`: assessment/reason/rare tuple/population/composition ref를
    vault 밖에 serialize
57. `SSV2-H57`: rare trace가 failure log/telemetry/analytics에 노출
58. `SSV2-H58`: raw learner body/private concept를 exported assessment
    evidence로 사용
59. `SSV2-H59`: ledger가 indefinite private store/reverse lookup API가 됨
60. `SSV2-H60`: subject history purge 뒤 missing aggregate proof를 zero로
    간주
61. `SSV2-H61`: valid digest/consent/O2/grant이나 current exact pass 없음
62. `SSV2-H62`: pass가 invalid consent/O2/grant를 대체
63. `SSV2-H63`: revocation이 privacy budget 복원 또는 refit 자동 승인
64. `SSV2-H64`: removal 뒤 sparse surface를 certification/barrier 없이
    읽음
65. `SSV2-H65`: cohort denominator 보존을 위해 deletion 지연/거부
66. `SSV2-H66`: new registry field가 digest payload에서 누락
67. `SSV2-H67`: V1/V2 observation/payload/grant mix
68. `SSV2-H68`: old profile fallback/implicit migration
69. `SSV2-H69`: assessment/composition ref를 exported payload에 주입
70. `SSV2-H70`: registry/policy mutation 뒤 새 digest/assessment 없음
71. `SSV2-H71`: valid payload digest이나 envelope commitment/length mismatch
72. `SSV2-H72`: pass를 digest/consent/O2/O5/lineage evidence로 사용
73. `SSV2-H73`: consent/O2 generation이 registry/payload/envelope/shared로
    유출
74. `SSV2-H74`: per-subject/per-batch one-off registry value
75. `SSV2-H75`: duplicate/noncanonical/over-domain-cap registry array,
    missing/unsafe domain cap 또는 invalid time order
76. `SSV2-H76`: intervention event를 assessed batch와 다른 registry로 decode
77. `SSV2-H77`: per-subject index는 valid이나 global order가 noncanonical
78. `SSV2-H78`: ordering/partition ref 누락·mismatch·post-digest change
79. `SSV2-H79`: standalone intervention/alternate writer가 common gateway,
    reservation, ledger 또는 CAS 우회
80. `SSV2-H80`: omitted/rotated/multiple subject pseudonym이 human grouping
    또는 budget reset
81. `SSV2-H81`: duplicate/synthetic/Sybil pseudonym으로 `kMin` 부풀림
82. `SSV2-H82`: candidate가 conservative component를 좁힘
83. `SSV2-H83`: unknown joinability를 non-joinable로 처리
84. `SSV2-H84`: prepared reservation을 `kMin` 또는 permanent history로 계산
85. `SSV2-H85`: exact ledger append/grant/lineage/idempotent result 없이 rows
    commit
86. `SSV2-H86`: exact rows 없이 ledger/grant/lineage commit
87. `SSV2-H87`: exact retry가 history/budget/rows를 두 번 반영
88. `SSV2-H88`: exact O2 proof 없이 semantic field/contiguous window를
    manifest에서 누락
89. `SSV2-H89`: removal과 matching-generation certification/barrier 사이
    residual surface 관찰
90. `SSV2-H90`: registry/policy/attacker-model change 뒤 old certification
    readable
91. `SSV2-H91`: old golden 재현을 이유로 V1 real-learner release
92. `SSV2-H92`: tenant/subject/consent/O2-generation registry snapshot ID가
    exported bytes에 존재
93. `SSV2-H93`: intervention 전용 implicit/unversioned serializer/profile
94. `SSV2-H94`: discriminator missing/unknown/alias/wrong schema decode
95. `SSV2-H95`: 어느 V2 event든 common row/subject/sequence/dedupe header 누락
96. `SSV2-H96`: intervention-only/mixed batch가 optional key,
    variant-specific/ingestion order에 의존
97. `SSV2-H97`: mixed-kind reorder/duplicate subject-sequence tuple이 accepted
98. `SSV2-H98`: intervention row에 common tombstone/quarantine/lineage target
    없음

transient positive matrix 13개도 요구한다.

1. `SSV2-P01`: every value/opaque ID/number가 one active immutable
   registry에서 resolve
2. `SSV2-P02`: exact timestamp transport reject 후 deterministic approved
   coarse bucket
3. `SSV2-P03`: independently reconstructed digest와 assessment binding 일치
4. `SSV2-P04`: every projection이 exact `kMin`에서 pass,
   `kMin - 1` reject
5. `SSV2-P05`: exact maximum sequence/event/registry-domain count pass,
   maximum + 1 reject
6. `SSV2-P06`: pinned policy와 sufficient visible population의 whole-batch pass
7. `SSV2-P07`: prior-release union/intersection/difference composition pass
8. `SSV2-P08`: concurrent candidate 중 exactly one CAS, loser full
   reassessment
9. `SSV2-P09`: revocation row/descendant closure + residual recertify/deny +
   budget 유지
10. `SSV2-P10`: registry→digest→assessment→composition CAS→grant→rows→lineage
    full commit
11. `SSV2-P11`: independent two derivations의 trace signature와 pass/fail
    일치
12. `SSV2-P12`: exact retry는 row set, reservation/grant consumption, ledger
    append 각 1회
13. `SSV2-P13`: shadow-only/intervention-only/mixed batch가 one
    registry/common header/
    canonicalization/joinability component/gateway를 공유하고 two-way
    intervention/mixed ordering 일치

모든 actionable P0/P1/P2는 0/0/0이어야 한다.

---

## 25. Definition of Done

### 25.1 답안길 감정평가사 2차 Owner product

- structured tutor FSM 실제 동작
- `attempt_first` runtime과 contract-only/non-operative `guided_study` 분리
- 별도 §5.0 supersession 전 guided selector/route/API/event/block/schedule 0
- commitment/confidence before feedback
- bounded scaffold/reveal/fading과 non-guided confirmed Learning answer
  override의 atomic assistance/exposure/no-credit transition
- Explanation Workbench
- exact learner-visible caveat와 upstream reference-answer release-artifact binding
- KeyConcept/DecisionPath/Contrast/probe
- deterministic Trust
- cause hypothesis→gap→repair→verification
- accepted wrong/partial feedback마다 existing LearningGapRecord/S216
  metadata authority에서 파생된 five-field learner-visible automatic error
  note; real next `ReviewUnit`, deterministic recurrence reconciliation,
  save/reopen/resume와 field-level fail-closed
- D+1/D+7
- timed full solution
- PersonalWeaknessMap
- calibration/assistance dependence projection
- Ledger/search/resume
- Native Full-Day
- source/version/privacy/accessibility
- Shared Signal export의 exact O2 + active exact-purpose product-signal
  consent 및 legal-basis substitution 0
- shadow/intervention 공통 sole immutable value registry의 every
  enum/ref/version value-by-value resolution, closed opaque/numeric/order/
  partition domain과 unsupported V1 fallback 0
- self-containing envelope를 hash하지 않는 independent exact digest
  common V2 payload, versioned RFC 8785/SHA-256 profile, strict validator와
  payload-digest-attach-final-envelope의 acyclic construction
- preflight/grant가 recomputed payload digest와 completed canonical
  envelope의 vault-only commitment/octet length, current registry/policy,
  exact reconstructiveness pass, reference population, joinable surface와
  composition reservation/ledger를 동일하게 bind하고 모든 mismatch에서
  grant consume와 cross-plane side effect 0
- closed non-linkable export metadata와 vault-only manifest/commitment/
  assessment/reservation/ledger/single-use grant/revocation-delete lineage
- first/all row commit의 atomic reservation/grant consume, one-time
  irreversible disclosure append, lineage/idempotent result와 persisted row부터
  cache/materialization/dataset/Model-Eval까지 revocation closure 또는
  all-surface deny barrier
- current active-surface generation certification; revocation/delete와
  registry/policy/attacker-model change 뒤 residual pass 전 readable surface
  0, prior disclosure budget reset 0
- hard violation, raw leak, false mastery 0

### 25.2 universal kernel

- 감정평가사 2차 adapter가 public interface만 사용
- state/evidence contracts adapter-independent
- at least two task modalities pass common fixture
- model/provider replaceable
- deterministic replay
- no exam-specific prompt leakage into kernel
- compatibility version and rollback

### 25.3 Exam Compiler v1

- manifest compiler
- source/right/version registry binding
- skill/task profile compiler
- item-family/exposure contract
- rubric/validator registry
- tutor/measurement profile
- certification report
- package digest/deprecation/revocation

### 25.4 두 번째 certified adapter candidate

- kernel 수정 없이 또는 approved compatible extension으로 추가
- exact official package
- modality Golden/held-out
- domain expert signoff
- synthetic/private/limited external gate
- no cross-adapter data contamination
- separate product-scope decision 전 learner-facing brand/route/pricing 0

### 25.5 learning evidence

- primary KPI는 unassisted transfer
- delayed retention 측정
- assisted와 independent 분리
- 현재 Owner dogfood day/result/D+1/D+7은 `attempt_first` only
- confirmed pre-attempt Learning reveal은 non-guided/no-credit이고 current
  Owner dogfood numerator 밖; future credit은 새 eligible independent
  evidence에서만
- guided-to-D+1은 exact future guided supersession·activation 뒤 별도 metric
- intervention outcome lineage
- automatic error note는 existing LearningGapRecord/S216의 learner-private
  recomputable projection이고 다섯 field와 real ReviewUnit을 요구하며
  generation/view/save credit 0
- baseline comparison
- O2 + active product-signal consent extraction/evaluation과
  offline-training consent + O5 fitting/training/refresh 권한 분리
- export digest는 named closed payload만 commit하고 completed envelope
  bytes는 vault-only length-delimited commitment로 별도 bind; 둘 다
  authorization 또는 private-lineage handle이 아님
- exact current candidate와 prior/split/retry/concurrent/cross-schema
  composition의 complete trace/projection/window가 future exact O2 policy를
  통과하고 current `pass`가 common grant/CAS에 bound
- Shared Signal/Model-Eval/client/log surface의 private vault linkage 0
- product-signal revocation은 active row와 모든 provenance descendant를
  acknowledgement 전에 non-active로 만들거나 enforced all-surface
  barrier를 설치
- efficacy claim은 evidence 수준에 맞음

### 25.6 사업

- 실제 제공 기능만 판매
- 시험별 exact feature manifest
- 비용·support·refund·entitlement 안전
- Owner와 external evidence 분리
- historical Founding Beta 외 세 신규 offer는 own exact amendment 전 blocked
- 모든 entitlement/reservation/sale/checkout/payment는
  `S241A → O3C → S239A → S242C → O4F → S243C` 전 0
- 다른 시험 가격 자동 복제 금지
- generic AI가 아닌 검증·전이·개인 계보에 가격을 붙임

---

## 26. 최종 원칙

1. AI가 문제를 푸는 능력이 아니라 사용자가 AI 없이 푸는 능력을
   최적화한다.
2. prompt가 아니라 state machine이 tutor 순서를 통제한다.
3. 내적 chain-of-thought가 아니라 시험에 필요한 bounded observable artifact를
   요구한다.
4. 답을 감추는 것이 목적이 아니라 최소 scaffold 뒤 learner reconstruction을
   만드는 것이 목적이다.
5. learning과 measurement를 분리한다.
6. assistance, exposure, mastery, weakness와 readiness를 섞지 않는다.
7. stable은 delayed unseen transfer 없이는 부여하지 않는다.
8. official source, rights, effective version와 deterministic validator가 model
   위에 있다.
9. PersonalWeaknessMap은 증거 기반 priority projection이지 지식 oracle이
   아니다.
10. 새 시험은 prompt 복제가 아니라 signed adapter package로 추가한다.
11. 감정평가사 2차를 먼저 완성하고 검증된 공통만 kernel로 승격한다.
12. adaptive model은 rule baseline을 이기고 calibration/abstention을 통과한
    뒤에도 shadow부터 시작한다.
13. FSRS는 언제, OR-Tools는 어디에 배치할지 보조할 뿐 무엇을 공부할지
    결정하지 않는다.
14. learner raw data는 기본 private이며 공동 자산이 되려면 별도 목적·권리·
    consent·pseudonymization이 필요하다.
15. 사용시간보다 unassisted transfer, retention, timed completion과 safety를
    본다.
16. Owner dogfood, 시장 검증, 가격 evidence와 efficacy evidence를 합치지
    않는다.
17. 생성된 학습 기준안은 exact upstream release artifact를 통과하기 전
    learner-facing usable body가 될 수 없고, 통과하더라도 공식 답안이나 공식
    채점기준이 되지 않는다.
18. Shared Signal은 exact O2와 active exact-purpose product-signal
    consent가 모두 있을 때만 열리며 legal basis, service consent, 다른
    목적, O4 또는 experiment tier가 이를 대체하지 못한다.
19. private manifest, consent-ledger resolution, commitment,
    commit grant/generation과 revocation/delete lineage는 Personal Raw
    Vault 밖으로 나가지 않으며,
    export에는 private plane으로 되돌아가는 ref·digest·equality handle을
    만들지 않는다.
20. O2와 product-signal consent는 real-learner extraction·frozen
    evaluation 경계이고, offline-training consent + O5는 별도 offline
    fitting·training·refresh 경계다. 어느 O4도 둘을 합치지 못한다.
21. Shared Signal의 첫 persisted row는 current single-use generation
    및 composition reservation consume, irreversible disclosure append,
    exact row set, complete vault lineage와 idempotent result가 한 atomic
    boundary에서 성공한 뒤에만 존재하고, 철회된 row와 모든 descendant는
    다시 usable해지지 않는다.
22. attempt-before-reveal은 default지만 Learning Lane의 clear affirmative
    override를 감금하지 않는다. 그 선택은 guided가 아니며 full
    assistance/exposure/no-credit를 output 전에 함께 기록한다.
23. accepted wrong/partial feedback는 기존 gap/S216 authority에서 다섯
    field automatic error note로 보이되, note 자체가 새 evidence나
    mastery authority가 되지 않는다.
24. Shared Signal `exportDigest`는 독립 선언된 exact closed payload를
    RFC 8785/UTF-8, versioned domain과 length-delimited SHA-256으로 commit한
    뒤 한 번 attach한다. completed envelope byte identity는 Personal Raw
    Vault의 별도 commitment/length로만 묶으며 어느 digest도 권한이나
    private lookup handle이 아니다.
25. Shared Signal의 shadow와 intervention은 sole immutable value registry,
    common V2 profile/header/batch/writer와 exact value-domain resolution을
    공유하며 V1/fallback/alternate writer를 허용하지 않는다.
26. exact candidate와 cumulative prior/split/concurrent/cross-schema
    composition의 current reconstructiveness `pass` 없이는 row가 0건이며,
    revocation은 disclosure budget을 복원하지 않고 residual surface를
    barrier 아래 recertify한다.
27. 세계 최고 수준은 기능 수가 아니라 **잘못된 도움을 막고, 실제 독립
    능력을 증명하며, 다른 시험에서도 같은 품질을 재현하는 구조**로 만든다.

---

## 27. 참고

### 교육·튜터 설계 근거

- [AI tutoring outperforms in-class active learning: a randomized controlled trial, Scientific Reports 2025](https://www.nature.com/articles/s41598-025-97652-6)
- [Generative AI without guardrails can harm learning, PNAS 2025](https://doi.org/10.1073/pnas.2422633122)
- [OECD Digital Education Outlook 2026](https://www.oecd.org/en/publications/2026/01/oecd-digital-education-outlook-2026_940e0dd8.html)
- [OECD: Policies supporting responsible and systematic GenAI adoption in higher education, 2026](https://www.oecd.org/en/publications/policies-supporting-responsible-and-systematic-genai-adoption-in-higher-education_c4e5621f-en.html)
- [Tutor CoPilot: A Human-AI Approach for Scaling Real-Time Expertise](https://arxiv.org/abs/2410.03017)

### 표준·도구 후보

- [1EdTech QTI 3](https://www.1edtech.org/standards/qti/index)
- [Google OR-Tools CP-SAT](https://developers.google.com/optimization/cp/cp_solver)
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- [pyBKT](https://github.com/CAHLR/pyBKT)
- [Cytoscape.js](https://github.com/cytoscape/cytoscape.js)
- [NIST AI RMF Generative AI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)

### 저장소 provenance

- [PR #662](https://github.com/chachathecat/inverge/pull/662)
- [PR #667](https://github.com/chachathecat/inverge/pull/667)
