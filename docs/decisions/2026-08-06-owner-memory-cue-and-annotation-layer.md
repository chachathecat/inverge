---
decision_title: "답안길 Memory Cue & Annotation Layer V13 후속 Owner 결정"
status: "owner-decision/proposed-for-merge"
dated: "2026-08-06 KST"
repository: "chachathecat/inverge"
active_master_plan: "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md"
mandatory_annex: "docs/strategy/dabangil-memory-cue-and-annotation-layer-v1-2026-08-06.md"
machine_contract: "config/dabangil-memory-cue-and-annotation-layer-v1.json"
validation_record: "docs/qa/memory-cue-and-annotation-layer-v1-validation.md"
does_not_authorize:
  - "runtime, API, UI, schema, migration, RLS, Storage, provider, dependency, deployment or Production"
  - "terminology corpus build, Hanja dictionary import, real source processing or personal annotation persistence"
  - "MCAL-1 terminology construction, MCAL-2 Memory Post-it runtime, MCAL-3 semantic-highlight runtime or MCAL-4 personal-annotation runtime"
  - "roadmap/WIP mutation, CPF-2A implementation, PR #692 mutation, Ready transition, merge or auto-merge"
---

# Owner 결정 — Memory Cue & Annotation Layer

## 1. 결정

V13의 필수 후속 부속계약으로 `Memory Cue & Annotation Layer(MCAL)`를 채택한다.
V13은 계속 유일한 active master plan이며 MCAL은 V14가 아니다.
MCAL은 별도의 정의 저장소나 두 번째 정의 authority가 아니다. 모든 `exactDefinitionRef`는
released·versioned VESG concept/evidence projection을 가리키며, 해석 실패·hold·drift 시 cue도 release하지 않는다.

MCAL의 역할은 다음 연결점을 고정하는 것이다.

```text
검증된 exact definition·concept·QuestionUnit
→ 검증된 한자/형태소/어근 해부
→ 암기용 쉬운 풀이와 대비
→ 단서 제거형 회상
→ attempt/repair/transfer/D+1/D+7 evidence
```

## 2. 정확한 개발 우선순위

```text
핵심 근거·개념·문제·검증 엔진
→ attempt/repair/transfer/D+7 루프
→ 용어 해부·기억 포스트잇 MVP
→ 의미형 하이라이트
→ 개인 주석 편집기
```

이 순서를 문서와 기계계약에 고정한다. 이번 결정은 MCAL-0 source-only 계약만 허용한다.

## 3. 정의와 암기말 분리

```text
formalTerm ≠ literalGloss ≠ memoryGloss ≠ exactDefinitionRef ≠ independent evidence
```

암기말·비유·한자 직역은 공식 정의, 공식답안, 채점기준 또는 mastery가 아니다.
`exactDefinitionRef`는 released·versioned VESG concept/evidence projection으로만 resolve한다.
MCAL은 그 projection을 표시할 뿐 정의를 생성·덮어쓰기·release하는 authority가 아니다.
모든 cue는 정확한 정의 reference와 “암기용 풀이” 경계를 가진다.

## 4. 한자·어근 안전성

- 출처 없는 한자·어근을 추측하지 않는다.
- disputed/unknown은 hold.
- pedagogic-only 해석은 어원이라고 표시하지 않는다.
- 안전한 분해가 없으면 분해하지 않는다.
- profile별 과목·언어·권리 검토를 독립 수행한다.

## 5. Cue fading과 evidence

```text
FULL → DECOMPOSITION_ONLY → PROMPT_ONLY → HIDDEN
```

답변 전에 decomposition·memory gloss·prompt 중 어떤 단서든 표시하면 assistance/exposure다.
`CueExposureEvent`는 별도 ledger를 만들지 않고 canonical Assistance/Exposure ledger를 재사용한다.
모든 render-capable request와 exposure-event timing(`BEFORE_RESPONSE`, `AFTER_RESPONSE`, `REVIEW_ONLY`)은
`canonicalRecordCommitted === true`를 요구한다. truthiness는 금지하며 missing·null·false·string·number·
object·array·ambiguous 또는 caller-inferred commit state는 cue byte 0으로 fail closed한다. request와 event의
`AFTER_RESPONSE`는 동일 exact-boolean gate를 사용하며 `canonicalExposureRecordCommitted` 같은 alias는
canonical field를 대체하지 못한다. exact true 하나만으로 다른 binding·ordering·race gate를 우회하지 못한다.
`REVIEW_ONLY` request도 이 canonical field를 생략하거나 exact primitive `true` 이외의 값을 쓰면 렌더하지 않는다.
모든 render-capable request/event validator는 timing 분기 전에 shared record-failure gate를 적용하며,
`recordFailure === false`를 exact primitive equality로 요구한다. 따라서 `canonicalRecordCommitted === true`와
함께 `recordFailure === true`가 있더라도 cue byte 0으로 fail closed한다.
request와 event validator는 같은 closed timing/classification map을 확인한다. `BEFORE_RESPONSE`는
`LOW` 또는 `MATERIAL`만 허용하며, request가 classification을 생략하거나 `NONE`을 쓰면 invalid다. `NONE`은 해당
attempt에 pre-response cue exposure가 없었다는 뜻이다. timing과 classification은 canonical
ledger에서 파생하고 client 입력을 신뢰하지 않는다. submitted-attempt `AFTER_RESPONSE` request도 성공 전에
같은 map의 `NONE`·`LOW`·`MATERIAL` 중 하나를 명시해야 하며 missing 또는 임의 값은 cue byte 0으로 실패한다.
sequence에 pre-response event가 하나라도
있으면 independent retrieval·far transfer·stable D+7은 부적격이며 뒤의 event가 복구하지 못한다.
ordering ambiguity와 render/submit race도 fail closed다.
`BEFORE_RESPONSE` attempt state는 client가 아니라 canonical server attempt ledger에서 파생하며,
non-null exact `attemptId`와 learner scope가 exact `INDEPENDENT_ATTEMPT_OPEN` 한 건에 resolve되어야
하고, exact learner·attempt·cue·cue revision·단일 request에 묶인 active deliberate server-recorded
single-use confirmation을 모두 요구한다. confirmation은 `replayed === false`도 exact primitive equality로
만족해야 하며 missing·default·coercion은 non-replayed 증거가 아니다. `cancelled`도 정확히 primitive
`false`여야 하므로 missing·null·string·number·object·array·`true` 또는 다른 malformed 값은 active
confirmation 증거가 아니다. request와 confirmation의 `cueId`, `cueRevisionId`, `requestId`는 서로
비교하기 전에 양쪽에서 각각 exact trimmed canonical identifier schema를 통과해야 한다. 두 값이 함께
누락되거나 null·wrong-type·empty·whitespace·malformed인 채 같아도 confirmation binding이 아니다.
client boolean과 preselected consent는 부족하다.
모든 `BEFORE_RESPONSE` render-capable validator는 하나의
`EXACT_PRE_RESPONSE_RENDER_GATE_V1`에 위임해야 하며 별도 event validator, alternate route 또는
약한 두 번째 policy로 우회할 수 없다. confirmation consumption → cue exposure record → `ASSISTED`
전환 → independent-evidence invalidation은 all-or-nothing으로 cue byte 렌더 전에 commit한다.
missing·empty·unknown·unresolved·ambiguous·conflicting·cross-learner·cross-attempt·submitted·closed·stale·
cancelled·replayed·mismatched·client-inferred attempt reference, invalid confirmation, partial commit, record failure,
inconsistent ledger state 또는 render/submit race는 cue byte 0으로 fail closed한다. 이미 submitted인
canonical attempt는 `AFTER_RESPONSE`만 허용한다. 이 variant는
non-null exact `attemptId`와 exact primitive string인 trimmed·non-empty `learnerPrivateScopeId`를 request/event와
canonical resolution이 각각 독립적으로 가져야 하고, authenticated learner scope의 exact `SUBMITTED`
attempt 한 건에 일치해야 한다. 양쪽 모두 missing이라 `undefined === undefined`인 경우도 binding이 아니다.
client/latest/caller 추론과 missing·undefined·null·empty·whitespace·wrong-type·malformed·unknown·ambiguous·
conflicting·cross-learner·cross-attempt·mismatched·stale·replayed·client-inferred·caller-asserted·unresolved·
pre-submission reference는 cue byte 0으로 fail closed한다.
오직 별도 `REVIEW_ONLY` variant만 attempt-unbound일 수 있고 항상 evidence-neutral이다. 그러나
caller가 붙인 `REVIEW_ONLY` label, `canonicalExposureRecordCommitted` boolean, client event 또는 inferred
timing은 authorization evidence가 아니다. cue request와 exposure-event 두 render path 모두
`CANONICAL_REVIEW_ONLY_RENDER_GATE_V1`에 위임하고, trusted server resolver가 exact learner·attempt
scope·cue·cue revision·request에 묶인 canonical timing/classification 및 committed exposure를 한 건으로
resolve해야 한다. canonical server attempt ledger에서 같은 learner/attempt scope의 open independent
attempt가 0건임도 별도로 증명한다. missing·unresolved·ambiguous·conflicting·cross-learner·stale·client-inferred
state 또는 matching open attempt는 cue byte 0으로 fail closed한다.
outer canonical timing/classification resolution 자체도 `resolved === true`를 포함한 required exact state를
독립적으로 만족해야 하며, nested open-attempt absence proof가 valid해도 outer unresolved state를 대체하지 못한다.
exposure-event path는 이 shared review-only gate로 조기 routing하기 전에 event의 `derivedFrom`이 exact
`CANONICAL_ASSISTANCE_EXPOSURE_LEDGER`이고 `ordering === "ORDERED"`임을 각각 요구한다. 두 필드의 누락,
client provenance 또는 ambiguous ordering은 cue byte 0으로 실패하며 request path가 event-only 필드를
합성하거나 그 누락을 허용하는 근거가 될 수 없다.
submitted binding, `BEFORE_RESPONSE` open-attempt binding 및 `REVIEW_ONLY`의 nested zero-count absence proof는
각자의 canonical server attempt resolution에 같은 exact state gate를 독립적으로 적용한다. `known === true`,
`resolved === true`, `ambiguous === false`, `conflicting === false`, `stale === false`,
`clientInferred === false`가 exact primitive equality로 모두 성립해야 하며 누락·default·coercion·truthiness는
canonical resolution 증거가 아니다.

cue absence는 independent-evidence eligibility만 보존한다. empty event, cue-free sequence 또는
`AFTER_RESPONSE` event만으로 independent retrieval·far transfer·stable D+7이 positive가 될 수 없다.
세 credit을 판단하기 전에 base canonical exposure history는 exact valid non-null `attemptId` 및
`learnerPrivateScopeId`를 포함하고 evaluated attempt의 두 값과 정확히 같아야 한다. far-transfer는
source history나 copied count가 아니라 별도의 authoritative canonical history를 요구하며 그 history는
`transferAttemptId`와 authenticated learner scope에 exact-bind한다. stable D+7도 별도 history를
`d7AttemptId`와 같은 learner scope에 exact-bind한다. 각 history는 authoritative·complete·single-record·
non-ambiguous·non-conflicting·fresh·non-replayed·non-client-inferred·non-caller-paired여야 하고,
자체 `preResponseCueExposureCount`를 exact nonnegative safe integer로 제공해야 한다. 정확히 0만 해당
affirmative evidence의 자격을 보존한다. missing·undefined·null·boolean·string·fractional·negative·NaN·
infinite·unsafe·object·array·cross-attempt·cross-learner·ambiguous·conflicting·stale·replayed·
client/caller-inferred history 또는 count는 affected credit을 fail closed한다. exact 0이나 unbound count
copy 자체는 어떤 affirmative learning evidence도 만들지 않는다.
positive independent retrieval은 exact submitted-and-evaluated response record, far transfer는 distinct
eligible non-same-representation task와 submitted/evaluated independent result, stable D+7은 completed
D+7 evaluation·cue `HIDDEN`·all-surface byte absence·non-same representation·unresolved scoring conflict 0의
별도 canonical evidence를 각각 요구한다. stable D+7은 canonical server attempt ledger의 identified
source attempt를 한 건으로 resolve하고 D+7 record의 `sourceAttemptId`, learner scope 및
`sourceAttemptSubmittedAt`을 그 attempt의 exact `attemptId`, learner scope 및 canonical `submittedAt`과
field-for-field bind한다. 그 timestamp와 canonical D+7 evaluation ledger의 `d7EvaluationCompletedAt`은 exact
RFC3339 UTC millisecond instant이고 server가 계산한 실제 elapsed interval이 최소 `604800000` ms여야 한다.
independently supplied older timestamp, `D_PLUS_7` label, caller elapsed 값, missing·mismatched·malformed·
unresolved provenance, non-UTC·reversed 또는 7일 미만 interval은 credit을 만들지 못한다. 세 affirmative record의 `ambiguous`는 exact primitive
`false`여야 한다. missing·undefined·null·`true`·string(`"true"`, `"false"` 포함)·number·object·array는
해당 record의 credit을 만들지 못한다. invalid independent response는 dependent far-transfer와 D+7을
함께 막고 invalid transfer/D+7 ambiguity는 각 credit만 막는다. exact false만으로는 증거가 생기지 않는다.
missing exposure record/history, failed render, partial commit, ambiguous record 또는 `ASSISTED` attempt는
positive learning evidence 0으로 fail closed한다.
`HIDDEN`은 DOM·SSR·접근성 text·prefetch·cache·direct API output 어디에도 cue byte가 없음을 뜻한다.
D+7 stable과 timed integration은 cue hidden, non-same representation,
unresolved scoring conflict 0을 요구한다.

## 6. 표면 규칙

- memory card 기본 collapsed이며, 선기록 없는 기본 접힘 상태에는 formal term만 보인다.
- decomposition을 접힘 상태에 미리 표시하려면 exposure를 렌더 전에 원자적으로 기록한다.
- expanded 최대 1개.
- primary semantic highlight 최대 3개이며 revision-bound typed anchor가 필수다.
- anchor의 열 `requiredBindings`는 각 필드의 exact type·closed enum·pattern과 kind별 domain·locator·
  target-type consistency를 모두 검증한다. missing·null·empty·malformed·wrong-type·ambiguous·inconsistent
  binding은 reject하고 truthiness-only validation은 금지한다. `requiredBindingsAmbiguous`는 exact primitive
  `false`, `conflictingRequiredBindings`는 exact empty array여야 하며 필드 누락·wrong-type·malformed state,
  genuine ambiguity 또는 non-empty conflict array는 reject한다.
- `OFFICIAL_PERMITTED_RANGE`의 `itemRightsManifestId`는 exact trimmed primitive string과
  `^irm_[A-Za-z0-9][A-Za-z0-9._:-]{2,123}$` closed format을 통과해야 한다. 별도
  `CANONICAL_SERVER_ITEM_RIGHTS_MANIFEST_BOUNDARY`의 authoritative item record 한 건이 manifest ID와
  anchor ID/kind/domain/target type/`rightsManifestId`, 특히 exact `targetRevisionId`를 field-for-field
  bind해야 한다. bare truthy ID, caller assertion/equality, fallback, missing·empty·whitespace·malformed·
  wrong-type·unresolved·ambiguous·conflicting·stale·replayed·cross-revision·client-inferred binding은 reject한다.
- private anchor의 `ownerBindingRef`와 `vaultLocalTargetRef`는 closed primitive-string schema와 exact
  format을 통과해야 한다. `CANONICAL_SERVER_PRIVATE_ANCHOR_OWNER_BOUNDARY`의 server-side authoritative
  resolution 한 건이 authenticated learner·tenant와 정확히 일치하고 owner ref·anchor·kind·vault-local
  target·revision·digest·scope·locator를 field-for-field bind해야 한다. caller/client equality·truthiness는
  증거가 아니며 missing·malformed·wrong-type·foreign/cross-owner·cross-tenant·ambiguous·conflicting·stale·
  replayed·unresolved·client-inferred resolution은 reject한다.
- color-only 의미 금지; text label과 accessible name 필수.
- primary response를 가리지 않는다.
- Today에 네 번째 primary task를 만들지 않는다.

## 7. 개인 주석

개인 자유문장은 마지막 단계다. Personal Raw Vault, owner isolation, retention,
export/delete, RLS/Storage/provider, backup, logs/traces, sync conflict, hostile
cross-user 검증을 별도 승인하기 전 구현하지 않는다.

개인 메모·제3자 원문 anchor는 shared VESG, Exam World, generator, analytics,
training 또는 다른 사용자 응답으로 승격하지 않는다.

Personal Raw Vault의 raw annotation body를 직접 training하는 것은 default-off가 아니라
무조건적·비우회 금지다. learner consent·opt-in, 계약, 관리자 선택 또는 미래 O5도 이를 허용할
수 없다. rename·alias·relabel로 원본 분류를 지우거나 raw body를 Cleared Content Bank로 직접
promotion할 수도 없다.

미래 candidate는 raw body와 별개의 closed-schema non-reconstructive signal, 또는 raw body의
재명명·직접승격이 아닌 별도 authored·rights-owned·provenance/rights-reviewed Cleared Content
Bank object뿐이다. contribution, Cleared Content Bank promotion과 exact-purpose O5는 서로
구별된 gate이며 어느 것도 다른 gate를 대신하지 않는다. 각 미래 승인은 global boolean이 아니라
independently resolved contribution·promotion·O5 receipt여야 하고, 세 receipt가 exact `signalId`·
`signalRevisionId`·`purposeId`·`o5ScopeId`에 모두 일치해야 한다. cross-candidate/revision/purpose/scope,
missing, ambiguous, replayed, stale, revoked 또는 independently unresolved receipt는 fail closed한다.
현재 세 canonical authorization은 모두 정확히 false이며 테스트의 미래 receipt 모의는 이를 변경하지
않는다. structurally valid·candidate-bound receipt set은 미래 binding contract의 유효성만 증명하고 현재
training·offline training·다른 사용을 승인하지 않는다. `currentlyAuthorized`도 항상 false이고,
mock·fixture·hypothetical/future context는 canonical false를 override할 수 없다. 활성화에는 canonical
authorization boundary를 바꾸는 별도 승인 변경이 필요하다.

signal은 raw body·raw pointer·reconstructive derivative를 rename·alias·relabel한 객체일 수 없다.
canonical closed signal-schema validator는 `closedValueSchema: true`나 safety-proof marker를 후보가
제공했다는 사실을 신뢰하지 않고 실제 candidate object 전체를 검증한다. top-level 및 consent·retention
nested object는 선언된 exact field set만 허용하며 additional/unknown field를 금지한다. 따라서
`rawAnswer`, free-text 또는 reconstructive payload 같은 미선언 field는 기존 safety marker가 모두
통과해도 candidate eligibility 전에 fail closed한다.
`SEPARATE_NON_RECONSTRUCTIVE_SIGNAL`의 같은 validated candidate object에는 다음 다섯 property가
각각 명시적으로 존재하고 primitive boolean이며 정확히 `false`여야 한다:
`containsRawAnnotationBody`, `containsRawBodyPointer`, `containsExcerptOrFreeText`, `reconstructive`,
`reconstructiveDerivativeOfRawBody`. missing·undefined·null·non-boolean·`true`·ambiguous·cross-object·
unvalidated 값은 안전의 증거가 아니며 candidate 단계에서 fail closed한다. proof는 canonical closed
signal-schema validator가 exact signal/revision에 묶어 검증해야 하며 client assertion은 받지 않는다.
또한 exact `signalId`·`signalRevisionId`·`purposeId`·`o5ScopeId`에 묶인 active exact-purpose consent와
동일 binding·finite `expiresAt`을 가진 active purpose-scoped retention을 각각 canonical consent/opt-out
ledger와 purpose-retention ledger에서 요구한다. consent와 retention의 두 expiry는 매 decision 때
`TRUSTED_SERVER_CLOCK_BOUNDARY`의 exact ISO-8601 UTC time과 비교하며 둘 다 evaluation time보다 엄격히
뒤여야 한다. caller/candidate/client time, 고정 날짜, missing/invalid/untrusted/ambiguous time, at-expiry 또는
post-expiry는 fail closed한다. generic opt-in, contract, administrator choice 또는 O5는 이를 대체하지 못한다.
각 canonical record는 `consent.expired === false`, `consent.revoked === false`,
`retention.expired === false`, `retention.revoked === false`를 exact primitive boolean으로 요구한다.
`!== true`, truthiness, defaulting, coercion 또는 true의 부재는 금지한다. missing·undefined·null·true·string·
number·object·array 또는 다른 non-false 값 하나라도 있으면 candidate eligibility와 hypothetical receipt는
fail closed한다. exact false는 다른 source·ACTIVE·purpose·binding·finite-retention·trusted-time·strict-future
expiry gate가 모두 통과할 때 eligibility만 보존하며 consent·receipt·current authorization·training·promotion·
O5 authorization을 만들지 않는다. mismatched·indefinite·cross-purpose record도 fail closed다.

`LEARNER_ATTEMPT_RANGE`와 `PRIVATE_SOURCE_RANGE`는 owner-bound `LEARNER_PRIVATE` 및
`VAULT_LOCAL_ONLY`로 강제한다. private target digest는 vault-local integrity metadata일 뿐이며,
non-vault에는 excerpt·offset·locator·attempt reference·digest·identifier가 없는 bodyless receipt만
허용한다. shared graph·analytics·logs·cache index·cross-user·Portable Core content projection은 금지한다.

## 8. Portable Core

공통 코어는 cue·component·anchor·fading·exposure·highlight interface만 재사용한다.
각 ExamProfile이 용어·정확한 정의·한자/어근·암기말·권리·현재성·검토자를 소유한다.
cross-profile cue·정답·mastery 상속은 금지한다.

## 9. 비승인 경계

이 결정은 다음을 승인하지 않는다.

- runtime/UI/API/schema/persistence/dependency;
- 실제 용어목록·사전·교재·기출 처리;
- 개인 주석 저장·동기화·export·analytics;
- 제1차 또는 다른 시험 activation;
- MCAL-1 용어 구축, MCAL-2 포스트잇 runtime, MCAL-3 하이라이트 runtime, MCAL-4 편집기 runtime;
- released VESG concept 없는 MCAL-1 term;
- CPF-2A closure와 approved bodyless exposure path 없는 MCAL-2;
- roadmap/WIP, CPF-2A, PR #692 변경;
- Ready, merge, auto-merge.

## 10. 완료조건

- V13 single active pointer 유지.
- MCAL annex/decision/JSON/QA/test 연결.
- 모든 authorization false.
- strict JSON, path, fence, focused tests 통과.
- released·versioned VESG definition projection과 mnemonic separation.
- canonical Assistance/Exposure ledger 재사용과 render-before-record 금지.
- 모든 render-capable validator가 공유하는 exact pre-response gate + canonical
  independent-attempt-open + exact learner/attempt/cue/revision/request-bound single-use confirmation +
  atomic confirmation consumption/`ASSISTED`/independent-evidence invalidation before any cue byte.
- cue absence preserves eligibility only; independent response, distinct non-same-representation transfer
  and completed hidden/no-conflict D+7 each require separate affirmative canonical evidence; D+7 additionally
  requires trusted source/evaluation instants proving at least 604800000 ms of actual elapsed time.
- `AFTER_RESPONSE` exact canonical submitted-attempt binding plus closed-map request classification;
  `REVIEW_ONLY` may be unbound only after trusted canonical timing/classification derivation and proof of zero
  matching open independent attempts, while its event path proves canonical provenance and exact ordering before routing.
- every anchor required binding exact schema and kind-policy consistency; truthiness-only validation 0.
- raw personal annotation body direct training·rename/alias 우회·direct Cleared Content promotion 0;
  raw pointer/reconstructive-derivative relabel 우회 0; 다섯 content-safety property의 같은-object
  validated explicit boolean false proof; trusted-time exact-purpose consent와 finite purpose retention;
  exact-candidate-bound independently resolved contribution/promotion/O5 receipts와 현재 canonical
  authorization false.
- HIDDEN byte absence와 revision-bound typed anchor.
- MCAL-1~MCAL-4 authorization false.
- cue fading/evidence/source safety/portable profile gates.
- runtime·roadmap·CPF-2A·PR #692 변화 0.
