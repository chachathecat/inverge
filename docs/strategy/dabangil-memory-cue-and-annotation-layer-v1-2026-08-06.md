---
document_title: "답안길 Memory Cue & Annotation Layer v1"
document_subtitle: "전문용어를 검증된 의미 단위로 해부하고 단서를 점차 제거해 독립 회상·전이로 연결하는 V13 필수 후속 명세"
document_role: "V13 mandatory follow-up annex for terminology memory cues, semantic highlights and later learner-private annotations"
status: "owner-strategy/non-authoritative"
dated: "2026-08-06 KST"
repository: "chachathecat/inverge"
active_master_plan: "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md"
owner_decision: "docs/decisions/2026-08-06-owner-memory-cue-and-annotation-layer.md"
machine_contract: "config/dabangil-memory-cue-and-annotation-layer-v1.json"
validation_record: "docs/qa/memory-cue-and-annotation-layer-v1-validation.md"
current_learner_facing_scope: "appraiser_kr second stage three subjects only"
runtime_authorization: "none"
ui_authorization: "none"
schema_authorization: "none"
persistence_authorization: "none"
dependency_authorization: "none"
real_content_authorization: "none"
production_authorization: "none"
execution_rule: "This annex fixes contracts and development order only. It authorizes no runtime, UI, schema, persistence, dependency, real-source processing, roadmap mutation, Ready transition or merge."
---

# 답안길 Memory Cue & Annotation Layer v1

## 0. 결론

`Memory Cue & Annotation Layer(MCAL)`은 V13을 대체하는 새 마스터플랜이 아니다.
V13의 근거·개념·문항·검증·학습증거 사이에 다음 연결점만 고정하는 필수 후속 부속계약이다.
동기화된 machine contract version은 `1.0.23`이다.

```text
VESG / exact definition / QuestionUnit
→ verified term decomposition
→ memory gloss and contrast cue
→ cue-faded recall
→ attempt / repair / transfer / D+1 / D+7 evidence
```

정확한 개발 우선순위는 다음과 같다.

```text
핵심 근거·개념·문제·검증 엔진
→ attempt/repair/transfer/D+7 루프
→ 용어 해부·기억 포스트잇 MVP
→ 의미형 하이라이트
→ 개인 주석 편집기
```

MCAL-0 문서·기계계약·테스트만 이 Work에서 허용한다. MCAL-1부터 MCAL-4까지는
모두 미승인이다. 나머지 단계는 별도 Work와 해당 시점의 VESG release·CPF·권리·
개인정보·접근통제·export/delete·runtime 권위를 요구한다.

---

# 1. 절대 분리 원칙

```text
formalTerm
≠ literalGloss
≠ memoryGloss
≠ exactDefinitionRef
≠ independent retrieval evidence
```

- `literalGloss`: 한자·형태소·어근의 문자 그대로의 뜻.
- `memoryGloss`: 기억을 돕기 위한 쉬운 표현·비유·압축문장.
- `exactDefinitionRef`: released·versioned VESG concept/evidence projection을 가리키는 typed reference.
- `independent retrieval evidence`: 단서 없이 학습자가 직접 설명·계산·구별·적용한 증거.

MCAL은 별도 정의 저장소나 두 번째 정의 authority가 아니다. 정의를 만들거나 덮어쓰거나
release하지 않으며, reference가 resolve되지 않거나 held·drift 상태면 cue도 hold한다.
`memoryGloss`나 `literalGloss`는 정답·공식 정의·채점근거가 아니다.
예를 들어 “적산가액 = 원가를 하나씩 쌓아 셈한 값”은 암기용 입구일 뿐,
정확한 정의·산식·적용조건을 대체하지 않는다.

모든 learner-facing cue에는 다음 경계를 명시한다.

> 암기용 풀이입니다. 시험용 정확한 정의를 대체하지 않습니다.

---

# 2. 용어 해부 계약

```ts
type TermDecompositionKindV1 =
  | "VERIFIED_HANJA"
  | "KOREAN_MORPHEME"
  | "ENGLISH_ROOT"
  | "LATIN_GREEK_ROOT"
  | "FORMULA_SEMANTICS"
  | "PLAIN_LANGUAGE_ONLY"
  | "NO_SAFE_DECOMPOSITION";

type DecompositionEvidenceStatusV1 =
  | "SOURCE_VERIFIED"
  | "CONVENTIONAL_MEANING_VERIFIED"
  | "PEDAGOGIC_ONLY"
  | "DISPUTED"
  | "UNKNOWN"
  | "HELD";

type TermComponentV1 = {
  componentId: string;
  surface: string;
  reading?: string;
  literalMeaning?: string;
  kind: TermDecompositionKindV1;
  evidenceStatus: DecompositionEvidenceStatusV1;
  sourceRefs: string[];
};
```

강제 규칙:

- 한자·어근을 모델이 추측해 채우지 않는다.
- `DISPUTED`, `UNKNOWN`, `HELD`는 learner-facing release 금지.
- `PEDAGOGIC_ONLY`는 어원이 아니라 기억용 해석이라고 표시한다.
- 안전한 분해가 없으면 `NO_SAFE_DECOMPOSITION`을 선택한다.
- 각 ExamProfile이 자기 용어·정의·분해근거·현재성·권리·검토자를 소유한다.
- 감정평가사 용어를 다른 시험 profile에 자동 상속하지 않는다.

---

# 3. MemoryCue 계약

```ts
type ReleasedVesgDefinitionProjectionRefV1 = {
  profileId: string;
  conceptId: string;
  graphSnapshotId: string;
  normSnapshotId: string;
  evidenceProjectionRevision: string;
  releaseRef: string;
  targetDigest: string;
};

type MemoryCueV1 = {
  cueId: string;
  profileId: string;
  scopeNodeId: string;
  graphSnapshotId: string;
  normSnapshotId: string;
  rightsManifestId: string;
  terminologySnapshotId: string;

  formalTerm: string;
  decompositionKind: TermDecompositionKindV1;
  componentIds: string[];

  literalGloss?: string;
  memoryGloss: string;
  exactDefinitionRef: ReleasedVesgDefinitionProjectionRefV1;
  meaningBoundaryNote: string;

  contrastScopeNodeIds: string[];
  trapWarning?: string;
  recallPromptIds: string[];
  applicationPromptIds: string[];

  sourceRefs: string[];
  authorAgentId: string;
  linguisticReviewRef?: string;
  subjectReviewRef: string;
  rightsReviewRef: string;

  releaseStatus:
    | "CANDIDATE"
    | "DECOMPOSITION_VERIFIED"
    | "SUBJECT_REVIEWED"
    | "RELEASED"
    | "HELD"
    | "SUPERSEDED";
};
```

release 전 필수:

```text
exactDefinitionRef resolves to a RELEASED versioned VESG concept/evidence projection
projection target digest and releaseRef resolve
target-date norm resolves
rights manifest permits use
decomposition evidence exists
memory gloss does not contradict the exact definition
oversimplification boundary is explicit
contrast/trap links resolve where present
subject review passes
linguistic review passes when required
```

법령·기준·정의 drift가 발생하면 cue도 자동 `HELD` 또는 재검토 대상이다.

---

# 4. 적산가액 예시의 정확한 사용법

아래는 구조를 설명하기 위한 비권위 예시다. 실제 release에는 별도 현행 정의·권리·
언어·과목 검토가 필요하다.

```yaml
formalTerm: 적산가액
decomposition:
  - surface: 積
    reading: 적
    literalMeaning: 쌓다
  - surface: 算
    reading: 산
    literalMeaning: 셈하다
  - surface: 價額
    reading: 가액
    literalMeaning: 값·금액
memoryGloss: "원가를 하나씩 쌓아 셈한 값"
exactDefinitionRef:
  profileId: appraiser_kr_second
  conceptId: "<released-vesg-concept-id>"
  graphSnapshotId: "<graph-snapshot-id>"
  normSnapshotId: "<norm-snapshot-id>"
  evidenceProjectionRevision: "<released-revision>"
  releaseRef: "<release-ref>"
  targetDigest: "<sha256>"
contrast:
  - 비준가액
  - 수익가액
meaningBoundaryNote: "암기용 풀이이며 정확한 산식·감가수정·적용조건을 대체하지 않음"
```

단순 말장난이 아니라 다음 기억경로를 만든다.

```text
어원/형태소 단서
→ 쉬운 의미
→ 정확한 정의
→ 혼동개념 대비
→ 5초 회상
→ 새 문제 적용
```

---

# 5. AnnotationAnchor와 source boundary

```ts
type AnnotationAnchorKindV1 =
  | "CONCEPT_NODE"
  | "FORMULA_NODE"
  | "PROCEDURE_STEP"
  | "QUESTION_UNIT"
  | "OWNED_CONTENT_RANGE"
  | "OFFICIAL_PERMITTED_RANGE"
  | "LEARNER_ATTEMPT_RANGE"
  | "PRIVATE_SOURCE_RANGE";

type AnnotationDomainV1 =
  | "SHARED_OWNED"
  | "SHARED_OFFICIAL_PERMITTED"
  | "LEARNER_PRIVATE";

type BodyLocatorPolicyV1 =
  | "NONE"
  | "SHARED_STABLE_SELECTOR"
  | "VAULT_LOCAL_ONLY";

const ANNOTATION_ANCHOR_KIND_POLICY_V1 = {
  CONCEPT_NODE: {
    domains: ["SHARED_OWNED"],
    bodyLocatorPolicies: ["NONE"],
    targetTypes: ["VESG_CONCEPT_NODE"],
  },
  FORMULA_NODE: {
    domains: ["SHARED_OWNED"],
    bodyLocatorPolicies: ["NONE"],
    targetTypes: ["VESG_FORMULA_NODE"],
  },
  PROCEDURE_STEP: {
    domains: ["SHARED_OWNED"],
    bodyLocatorPolicies: ["NONE"],
    targetTypes: ["VESG_PROCEDURE_STEP"],
  },
  QUESTION_UNIT: {
    domains: ["SHARED_OWNED", "SHARED_OFFICIAL_PERMITTED"],
    bodyLocatorPolicies: ["NONE"],
    targetTypes: ["VERSIONED_QUESTION_UNIT"],
    domainSelection: "EXPLICIT_ALLOWLIST_VALUE_REQUIRED",
    rightsStateRequired: true,
  },
  OWNED_CONTENT_RANGE: {
    domains: ["SHARED_OWNED"],
    bodyLocatorPolicies: ["SHARED_STABLE_SELECTOR"],
    targetTypes: ["OWNED_CONTENT_REVISION_RANGE"],
  },
  OFFICIAL_PERMITTED_RANGE: {
    domains: ["SHARED_OFFICIAL_PERMITTED"],
    bodyLocatorPolicies: ["SHARED_STABLE_SELECTOR"],
    targetTypes: ["OFFICIAL_PERMITTED_CONTENT_REVISION_RANGE"],
    itemLevelRightsRequired: true,
  },
  LEARNER_ATTEMPT_RANGE: {
    domains: ["LEARNER_PRIVATE"],
    bodyLocatorPolicies: ["VAULT_LOCAL_ONLY"],
    targetTypes: ["LEARNER_ATTEMPT_REVISION_RANGE"],
    ownerBound: true,
    targetDigestPolicy: "VAULT_LOCAL_INTEGRITY_METADATA_ONLY",
    nonVaultProjection: "BODYLESS_RECEIPT_ONLY",
  },
  PRIVATE_SOURCE_RANGE: {
    domains: ["LEARNER_PRIVATE"],
    bodyLocatorPolicies: ["VAULT_LOCAL_ONLY"],
    targetTypes: ["PRIVATE_SOURCE_REVISION_RANGE"],
    ownerBound: true,
    targetDigestPolicy: "VAULT_LOCAL_INTEGRITY_METADATA_ONLY",
    nonVaultProjection: "BODYLESS_RECEIPT_ONLY",
  },
} as const satisfies Record<AnnotationAnchorKindV1, object>;

type AnnotationAnchorBaseV1<
  K extends AnnotationAnchorKindV1,
  D extends AnnotationDomainV1,
  L extends BodyLocatorPolicyV1,
  T extends (typeof ANNOTATION_ANCHOR_KIND_POLICY_V1)[K]["targetTypes"][number],
> = {
  anchorId: string;
  profileId: string;
  kind: K;
  domain: D;
  conceptOrQuestionRef?: string;
  targetType: T;
  targetRevisionId: string;
  targetDigest: string;
  bodyLocatorPolicy: L;
  rightsManifestId: string;
  createdAt: string;
  status: "ACTIVE" | "HELD" | "SUPERSEDED";
  requiredBindingsAmbiguous: false;
  conflictingRequiredBindings: [];
};

type PrivateAnchorOwnerBindingRefV1 = `pob_${string}`;
type VaultLocalTargetRefV1 = `vault_${string}`;
type ItemRightsManifestIdV1 = `irm_${string}`;

type AuthoritativeItemRightsManifestBoundaryV1 = {
  source: "CANONICAL_SERVER_ITEM_RIGHTS_MANIFEST_BOUNDARY";
  serverSide: true;
  authoritative: true;
  resolved: true;
  matchingRecordCount: 1;
  ambiguous: false;
  conflicting: false;
  stale: false;
  replayed: false;
  clientInferred: false;
  crossRevision: false;
  itemRightsManifestId: ItemRightsManifestIdV1;
  anchorId: string;
  kind: "OFFICIAL_PERMITTED_RANGE";
  domain: "SHARED_OFFICIAL_PERMITTED";
  targetType: "OFFICIAL_PERMITTED_CONTENT_REVISION_RANGE";
  targetRevisionId: string;
  rightsManifestId: string;
};

type AuthoritativePrivateAnchorOwnerBoundaryV1 = {
  authenticatedLearnerId: string;
  tenantScopeId: string;
  resolution: {
    source: "CANONICAL_SERVER_PRIVATE_ANCHOR_OWNER_BOUNDARY";
    serverSide: true;
    authoritative: true;
    resolved: true;
    matchingRecordCount: 1;
    ambiguous: false;
    conflicting: false;
    stale: false;
    replayed: false;
    clientInferred: false;
    crossLearner: false;
    crossTenant: false;
    ownerBindingRef: PrivateAnchorOwnerBindingRefV1;
    authenticatedLearnerId: string;
    tenantScopeId: string;
    anchorId: string;
    kind: "LEARNER_ATTEMPT_RANGE" | "PRIVATE_SOURCE_RANGE";
    vaultLocalTargetRef: VaultLocalTargetRefV1;
    targetRevisionId: string;
    targetDigest: string;
    targetDigestScope: "VAULT_LOCAL_INTEGRITY_METADATA_ONLY";
    bodyLocatorPolicy: "VAULT_LOCAL_ONLY";
  };
};

type AnnotationAnchorV1 =
  | AnnotationAnchorBaseV1<"CONCEPT_NODE", "SHARED_OWNED", "NONE", "VESG_CONCEPT_NODE">
  | AnnotationAnchorBaseV1<"FORMULA_NODE", "SHARED_OWNED", "NONE", "VESG_FORMULA_NODE">
  | AnnotationAnchorBaseV1<"PROCEDURE_STEP", "SHARED_OWNED", "NONE", "VESG_PROCEDURE_STEP">
  | (AnnotationAnchorBaseV1<"QUESTION_UNIT", "SHARED_OWNED", "NONE", "VERSIONED_QUESTION_UNIT"> & {
      rightsState: "SHARED_OWNED";
    })
  | (AnnotationAnchorBaseV1<
      "QUESTION_UNIT",
      "SHARED_OFFICIAL_PERMITTED",
      "NONE",
      "VERSIONED_QUESTION_UNIT"
    > & { rightsState: "SHARED_OFFICIAL_PERMITTED" })
  | AnnotationAnchorBaseV1<
      "OWNED_CONTENT_RANGE",
      "SHARED_OWNED",
      "SHARED_STABLE_SELECTOR",
      "OWNED_CONTENT_REVISION_RANGE"
    >
  | (AnnotationAnchorBaseV1<
      "OFFICIAL_PERMITTED_RANGE",
      "SHARED_OFFICIAL_PERMITTED",
      "SHARED_STABLE_SELECTOR",
      "OFFICIAL_PERMITTED_CONTENT_REVISION_RANGE"
    > & { itemRightsManifestId: ItemRightsManifestIdV1 })
  | (AnnotationAnchorBaseV1<
      "LEARNER_ATTEMPT_RANGE",
      "LEARNER_PRIVATE",
      "VAULT_LOCAL_ONLY",
      "LEARNER_ATTEMPT_REVISION_RANGE"
    > & {
      ownerBindingRef: PrivateAnchorOwnerBindingRefV1;
      vaultLocalTargetRef: VaultLocalTargetRefV1;
      targetDigestScope: "VAULT_LOCAL_INTEGRITY_METADATA_ONLY";
      nonVaultProjection: "BODYLESS_RECEIPT_ONLY";
    })
  | (AnnotationAnchorBaseV1<
      "PRIVATE_SOURCE_RANGE",
      "LEARNER_PRIVATE",
      "VAULT_LOCAL_ONLY",
      "PRIVATE_SOURCE_REVISION_RANGE"
    > & {
      ownerBindingRef: PrivateAnchorOwnerBindingRefV1;
      vaultLocalTargetRef: VaultLocalTargetRefV1;
      targetDigestScope: "VAULT_LOCAL_INTEGRITY_METADATA_ONLY";
      nonVaultProjection: "BODYLESS_RECEIPT_ONLY";
    });

type PrivateAnchorBodylessReceiptV1 = {
  projectionType: "BODYLESS_RECEIPT_ONLY";
  anchorKind: "LEARNER_ATTEMPT_RANGE" | "PRIVATE_SOURCE_RANGE";
  privateBodyPresent: false;
  contentBearing: false;
};
```

- kind policy key 집합은 위 8개 kind와 정확히 같아야 한다. default·fallback은 없고,
  caller가 domain 또는 locator를 덮어쓸 수 없다. unknown kind, 누락 mapping 또는
  충돌 값은 reject하거나 `HELD`로 닫고 shared domain으로 대체하지 않는다.
- `requiredBindings`의 열 필드(`anchorId`, `profileId`, `kind`, `domain`, `targetType`,
  `targetRevisionId`, `targetDigest`, `bodyLocatorPolicy`, `rightsManifestId`, `status`)는 선언된
  closed schema로 각각 exact type·enum·pattern을 검증한다. `targetDigest`는 exact `sha256:` digest이고
  `targetType`은 kind policy와 일치해야 한다. missing·null·empty·malformed·wrong-type·ambiguous·
  inconsistent binding은 모두 reject하며 truthiness-only 검사는 금지한다. ambiguity/conflict state도
  closed type이다. `requiredBindingsAmbiguous`는 exact primitive `false`,
  `conflictingRequiredBindings`는 exact empty array여야 하며 필드 누락·wrong-type·malformed state,
  primitive `true` 또는 non-empty conflict array는 모두 reject한다.
- shared cue는 답안길 소유·라이선스·item-permitted official content에만 연결한다.
- `QUESTION_UNIT`은 두 shared domain 중 하나를 명시적으로 선택하고 rights state를 반드시 가진다.
- `OFFICIAL_PERMITTED_RANGE`는 item-level rights를 반드시 가진다. `itemRightsManifestId`는 exact
  primitive trimmed string이며 `^irm_[A-Za-z0-9][A-Za-z0-9._:-]{2,123}$` closed format을 통과해야
  한다. ID truthiness나 caller equality만으로는 충분하지 않다. 별도 trusted parameter인
  `CANONICAL_SERVER_ITEM_RIGHTS_MANIFEST_BOUNDARY`에서 authoritative item record가 정확히 한 건
  resolve되어야 하고, 그 resolution은 item manifest ID·anchor ID/kind/domain/target type·기존
  `rightsManifestId`와 특히 같은 `targetRevisionId`를 field-for-field bind한다. missing·undefined·null·
  empty·whitespace·malformed·wrong-type ID, unresolved·ambiguous·conflicting·stale·replayed·
  cross-revision·client-inferred resolution, caller assertion·fallback·inference는 모두 reject한다.
- 제3자 교재의 exact text range, OCR, 문제문장, 해설표현은 개인 vault 밖으로 나가지 않는다.
- `LEARNER_ATTEMPT_RANGE`와 `PRIVATE_SOURCE_RANGE`는 owner-bound `LEARNER_PRIVATE` 및
  `VAULT_LOCAL_ONLY`만 허용한다. target digest는 vault-local integrity metadata일 뿐이다.
- 두 private kind의 `ownerBindingRef`와 `vaultLocalTargetRef`는 각각 exact primitive string이며
  `^pob_[A-Za-z0-9][A-Za-z0-9._:-]{2,123}$`,
  `^vault_[A-Za-z0-9][A-Za-z0-9._:-]{2,121}$` 형식이어야 한다. validation은 candidate가 보낸
  owner boolean·equality·resolution assertion을 받지 않고, 별도 trusted parameter인
  `CANONICAL_SERVER_PRIVATE_ANCHOR_OWNER_BOUNDARY`에서 server-side authoritative resolution 한 건을
  요구한다. 이 closed resolution은 authenticated learner와 tenant scope가 정확히 일치하고,
  `ownerBindingRef`·anchor ID/kind·vault-local target·target revision/digest/scope·locator를 field-for-field
  bind해야 한다. missing·null·empty·whitespace·malformed·wrong-type·foreign-owner·cross-learner·
  cross-tenant·ambiguous·conflicting·stale·replayed·unresolved·client-inferred 또는 extra-field resolution은
  모두 fail closed한다.
- 두 private kind의 non-vault projection은 위 네 필드만 가진 bodyless receipt다. excerpt,
  offset, body/attempt locator, attempt reference, private target digest, anchor/receipt identifier를
  포함하지 않으며 shared graph·analytics·logs·cache index·cross-user 또는 Portable Core의
  content-bearing projection으로 들어가지 않는다.
- source가 삭제·변경되면 개인 anchor는 orphan-safe 상태로 전환하고 원문을 복원하지 않는다.

---

# 6. Cue fading과 학습증거

```ts
type CuePresentationStateV1 =
  | "FULL"
  | "DECOMPOSITION_ONLY"
  | "PROMPT_ONLY"
  | "HIDDEN";
```

권장 순서:

```text
첫 학습: FULL
D+1: DECOMPOSITION_ONLY 또는 PROMPT_ONLY
후속 회상: PROMPT_ONLY
D+7 stable / timed: HIDDEN
```

강제 evidence 규칙:

- 답변 전에 decomposition·memory gloss·prompt 중 어떤 단서든 표시하면 exposure다.
- `CueExposureEvent`는 별도 저장소가 아니라 canonical Assistance/Exposure ledger event를 재사용한다.
- `BEFORE_RESPONSE`는 canonical server attempt ledger가 `INDEPENDENT_ATTEMPT_OPEN`으로
  판정한 non-null exact attempt와 learner scope 한 건에만 허용하며, client가 보낸 attempt state나
  latest-attempt 추론은 신뢰하지 않는다.
- learner가 해당 learner·attempt·cue·cue revision·단일 request에 정확히 묶인 active deliberate
  server-recorded single-use confirmation을 명시적으로 완료해야 한다. confirmation의 `replayed`는 exact
  primitive `false`여야 하며 missing·default·coercion은 non-replayed 증거가 아니다. `cancelled` 역시
  exact primitive `false`여야 하므로 missing·null·string·number·object·array·`true` 또는 다른 malformed
  값은 active confirmation을 증명하지 못한다. request와 confirmation 양쪽의 `cueId`, `cueRevisionId`,
  `requestId`는 equality 비교 전에 각각 exact trimmed canonical identifier schema를 통과해야 한다.
  두 쪽이 함께 누락되어 `undefined === undefined`가 되거나 null·wrong-type·empty·whitespace·malformed
  identifier가 서로 같아도 reveal을 승인하지 않는다. confirmation은 추가 필드 없는 exact single canonical
  record이고 server-side·authoritative·independently-resolved·known·resolved가 primitive true, ambiguous·
  conflicting·cross-learner·cross-attempt·mismatched·stale·replayed·cancelled·client/caller-inferred가 primitive
  false여야 한다. client boolean, 미리 선택된 consent, source label 또는 outer success state는 confirmation이 아니다.
- authenticated learner scope와 subject·attempt-resolution·confirmation learner scope 네 값은 모두 같은 exact
  canonical identifier schema를 독립적으로 통과하고 field-for-field로 일치해야 한다. matching malformed 값,
  인증 문맥과 다른 foreign learner에 맞춘 subject/attempt/confirmation, client/caller scope alias 또는 inference는
  cue reveal을 승인하지 않는다.
- cue render request validator와 별도 cue exposure event validator를 포함해 `BEFORE_RESPONSE` byte를
  허용할 수 있는 모든 path는 동일 `EXACT_PRE_RESPONSE_RENDER_GATE_V1`에 위임한다. alternate route나
  약한 두 번째 policy는 금지한다.
- confirmation consumption, cue exposure record, `ASSISTED` 전환, independent-evidence invalidation은
  하나의 all-or-nothing transaction으로 cue byte 렌더 전에 순서대로 commit되어야 한다.
- missing·empty·unknown·unresolved·ambiguous·conflicting·cross-learner·cross-attempt·submitted·closed·stale·
  cancelled·replayed·mismatched·client-inferred attempt reference, invalid confirmation, partial commit, record failure,
  inconsistent ledger state 또는 render/submit race는 모두 fail closed하며 cue byte를 전혀 렌더하지 않는다.
- pre-response의 실제 `renderSubmitRaceDetected`는 exact primitive `false`여야 하며 missing·coercion·string·
  number·object·array도 안전 상태를 증명하지 못한다.
- `BEFORE_RESPONSE` open-attempt binding과 `REVIEW_ONLY` nested zero-count absence proof의 canonical attempt
  resolution은 shared generic `canonical attempt resolution state gate`를 각각 독립적으로 통과해야 한다.
  이 gate는 `known === true`, `resolved === true`, `ambiguous === false`,
  `conflicting === false`, `stale === false`, `clientInferred === false`를 exact primitive equality로 요구하며
  missing·default·coercion·truthiness로 대체하지 않는다. 이 generic subset은 submitted rendering을 단독으로
  authorize하지 않는다.
- 이미 response가 제출된 canonical attempt는 `AFTER_RESPONSE`만 허용한다. request, exposure event와 optional
  bound `REVIEW_ONLY`는 모두 하나의 authoritative `EXACT_CANONICAL_SUBMITTED_ATTEMPT_RESOLUTION_GATE_V1`에
  위임한다. resolution은 additional-field-free non-null·non-array closed object, exact server ledger source,
  count 1 및 `SUBMITTED`를 요구한다. server-side·authoritative·independently-resolved·known·resolved·submitted·
  submitted-before-exposure는 exact primitive true이고 cross-learner·cross-attempt·mismatch·replay·pre-submission·
  closed·stale·cancelled·ambiguity·conflict·client/caller inference는 exact primitive false여야 한다.
  subject와 record의 `attemptId`·`learnerPrivateScopeId`는 같은 exact trimmed canonical identifier schema를 각각
  독립적으로 통과한 다음 server-authenticated `authenticatedLearnerPrivateScopeId`와 exact attempt에
  field-for-field로 일치해야 한다. authenticated scope, subject와 record의 learner scope 세 값은 모두
  독립적으로 schema-valid해야 하며 client/caller authenticated-scope alias는 받지 않는다.
  matching missing·whitespace·malformed·wrong-type identifier, outer source/state/success claim, client/latest/caller
  inference, missing·extra-field·wrong-source·zero/multiple·foreign·unsafe·unsubmitted record는 cue byte와 positive
  learning evidence를 모두 0으로 fail closed한다. 약한 outer policy는 authorization authority가 아니다.
- 별도 `REVIEW_ONLY` variant만 attempt에 묶이지 않을 수 있고 항상 evidence-neutral이지만,
  caller label·`canonicalExposureRecordCommitted` boolean·client event·inferred timing으로 선택할 수 없다.
  cue render request validator와 exposure-event validator 모두
  `CANONICAL_REVIEW_ONLY_RENDER_GATE_V1`에 위임한다. 이 gate는 trusted server resolver에서 exact
  learner·attempt scope·cue·cue revision·request에 묶인 canonical `REVIEW_ONLY` timing/classification과
  committed exposure record를 한 건으로 resolve하고, canonical server attempt ledger에서 같은 learner와
  attempt scope의 open independent attempt가 0건임을 별도로 증명해야 한다. nested absence resolution 자체도
  shared canonical attempt resolution state gate를 독립적으로 통과해야 하며, missing·unresolved·ambiguous·
  conflicting·cross-learner·stale·client-inferred resolution 또는 matching open attempt는 cue byte 0으로
  fail closed한다. outer canonical timing/classification resolution도 `resolved === true`를 포함한 required
  exact state를 독립적으로 만족해야 하며 valid nested proof가 unresolved outer resolution을 대체하지 못한다.
  outer resolution과 nested zero-count absence record는 각각 non-null·non-array closed canonical object이며
  undeclared field를 허용하지 않는다. outer record는 exact resolver·one authoritative/server-side/
  independently-resolved match·request/scope/timing/classification binding을 요구한다. nested record는 exact server
  attempt resolver에서 `INDEPENDENT_ATTEMPT_OPEN`을 조회하고 같은 learner-private/attempt scope의 zero match를
  증명한다. safe state는 exact primitive true, declared ambiguity·conflict·cross-scope·mismatch·stale·replay·
  cancellation·client/caller inference는 exact primitive false여야 한다.
  authenticated learner scope, subject learner scope, outer canonical review-only resolution learner scope,
  nested zero-match absence record learner scope 네 값도 같은 exact canonical identifier schema를 독립적으로
  통과하고 field-for-field로 일치해야 한다. matching malformed, coordinated foreign learner, client/caller alias
  또는 inference는 request/event 양쪽에서 cue reveal을 승인하지 않는다.
  이 두 validator의 `REVIEW_ONLY` path도 shared canonical-record gate를 먼저 통과해
  `canonicalRecordCommitted === true`를 exact primitive equality로 증명해야 하며 필드 생략은 실패다.
  outer timing 또는 nested canonical timing이 `REVIEW_ONLY`인 모든 path는 routing이나 다른 early return 전에
  실제 subject의 `renderSubmitRaceDetected === false`를 exact primitive equality로 요구하고 shared review-only
  authorizer가 같은 필드를 다시 검증한다. missing·undefined·null·`true`·string·number·object·array·default·
  coercion은 cue byte 0으로 실패하며 exact false만 otherwise valid review-only render를 보존한다.
- pre-response cue가 없다는 사실은 independent-evidence **eligibility만 보존**한다. empty sequence나
  `AFTER_RESPONSE` event 자체는 independent retrieval·far transfer·stable D+7 증거를 만들지 않는다.
- base `evidence.attempt`에는 additional-field-free canonical attempt record gate를 먼저 적용한다. exact
  attempt·learner·submission ID와 canonical `submittedAt`, `SUBMITTED`·`INDEPENDENT`를 요구한다.
  source는 `CANONICAL_SERVER_ATTEMPT_LEDGER`, server-side·authoritative·independently-resolved·known·resolved는
  exact true, ambiguous·conflicting·mismatched·stale·client/caller-inferred는 exact false, count는
  `matchingRecordCount === 1`이어야 한다. base 전용 safe-state gate는 별도로 `crossLearner`, `crossAttempt`,
  `replayed`, `cancelled`를 모두 exact primitive `false`로 요구하며 shared generic attempt-resolution helper를
  확장하거나 review-only absence semantics를 바꾸지 않는다. missing·malformed·wrong-type·반대 상태·0건·복수 record는
  independent retrieval 전에 positive evidence 0으로 fail closed하고 dependent far transfer와 stable D+7도
  함께 차단한다.
- independent retrieval은 candidate-owned closed `canonicalResponseEvaluation`이 exact base attempt·learner·
  submission 및 candidate evaluation ID에 bind되고, single authoritative resolved fresh record의 모든 safe/unsafe
  state를 exact primitive로 통과해야 한다. evaluation completion은 bound base attempt의 canonical `submittedAt`과
  같은 시각이거나 그 뒤여야 하고 caller source label, outer success flag 또는 outer/caller timestamp는 대체하지 못한다.
- response·transfer·D+7의 세 closed canonical evaluation record는 shared record-internal predicate
  `affirmativeEvidenceOutcomeAccepted`를 required field로 가지며 exact primitive `true`여야 한다. 이는 해당
  authoritative canonical evaluator가 그 affirmative-evidence credit에 필요한 performance를 받아들였다는 뜻만
  가지며 MCAL이 numeric scoring·rubric·threshold·mastery authority가 되는 것은 아니다. completion, record/
  `resultId` 존재, truthiness, non-zero score, outer/caller/client `success`·`correct`·`score`·`threshold`·
  `thresholdMet`, 다른 attempt·learner·submission·evaluation·transfer·D+7 stage outcome은 대체하지 못한다.
  missing·false·null·undefined·string·number·object·array·malformed·wrong-source·zero/multiple·unresolved·ambiguous·
  conflicting·stale·replayed·cancelled·cross-scope·mismatched·inferred·defaulted·aliased·coerced outcome은 fail closed한다.
  invalid response outcome은 independent retrieval·far transfer·stable D+7을 모두 막고, invalid transfer outcome은
  otherwise-valid independent retrieval·stable D+7을 보존하며 far-transfer만 막고, invalid D+7 outcome은
  otherwise-valid independent retrieval·far transfer를 보존하며 stable D+7만 막는다.
- far transfer는 그 독립 회상 외에도 distinct eligible task, non-same representation, actual submitted
  independent transfer attempt와 candidate-owned closed `canonicalTransferEvaluation`을 별도로 요구한다. 이
  evaluation은 source/transfer attempt·learner·submission·evaluation·result·task IDs에 exact-bind된다. source attempt가
  직접 가진 closed `taskBinding`은 `CANONICAL_SERVER_ATTEMPT_TASK_BINDING_RESOLVER`에서 exact single record로
  server-resolve되고 attempt·learner scope에 exact-bind되어야 한다. transfer의 `originTaskId`는 그 binding의
  canonical `taskId`와 정확히 같아야 한다. 실제 `transferAttemptId`는 `CANONICAL_SERVER_ATTEMPT_LEDGER`의
  exact single submitted canonical transfer attempt로 별도 resolve하고, 그 attempt가 직접 가진 별도
  `taskBinding`도 같은 server task-binding resolver에서 exact single authoritative record로 독립 resolve한다.
  canonical transfer attempt와 그 binding은 transfer record의 attempt ID·authenticated learner scope 및
  서로의 attempt identity에 정확히 bind되며 source attempt/binding으로 대체하거나 재사용할 수 없다.
  `transferTaskId`는 canonical transfer task와 정확히 같고 두 canonical task 자체가 달라야 한다.
  source와 transfer의 canonical task identity는 trim·case-fold·alias·추론·정규화 없이 field-for-field 비교한다.
  caller task inequality, `distinctEligibleTask: true` 또는 `NON_SAME_REPRESENTATION`만으로는 충분하지 않다.
  missing·malformed·wrong-source·extra-field·ambiguous·conflicting·stale·client/caller-inferred·mismatched·
  cross-attempt·cross-learner·unresolved·0건·복수 transfer attempt/task binding은 far-transfer credit만 fail
  closed하며 otherwise valid independent retrieval과 stable D+7은 유지한다.
  transfer evaluation completion도 canonical transfer attempt의 `submittedAt`과 같은 시각이거나 그 뒤여야 하며,
  1 ms 이전 또는 outer/caller timestamp 대체는 far-transfer만 fail closed한다.
  canonical transfer attempt의 `submittedAt` 자체도 canonical base/source attempt의 `submittedAt`과 같거나 뒤여야
  한다. 두 trusted canonical attempt record의 exact RFC3339 UTC millisecond timestamp만 비교하며 transfer가 source보다
  1 ms 앞서면 far-transfer만 거부한다. equality와 later는 허용하고 outer/caller source·transfer timestamp는 대체하지 못한다.
- stable D+7은 실제 완료된 D+7 independent evaluation, cue `HIDDEN`, 모든 surface의 cue byte 부재,
  non-same representation 및 unresolved scoring conflict 0의 canonical record를 별도로 요구한다.
  실제 D+7 candidate의 `canonicalD7Attempt`도 `CANONICAL_SERVER_ATTEMPT_LEDGER`에서 exact single authoritative
  record로 별도 resolve하며 `d7AttemptId`, authenticated learner scope, submission ID 및 canonical `submittedAt`에 exact-bind되고 base/source attempt와
  달라야 한다. 이 record는 exact `SUBMITTED`·`INDEPENDENT`, known/resolved exact true, ambiguous·conflicting·
  cross-learner·cross-attempt·mismatched·stale·replayed·cancelled·client/caller-inferred exact false여야 한다.
  missing·malformed·wrong-source·0건·복수·foreign·reused·unsubmitted·assisted·unsafe record 또는 outer claim/base
  attempt 대체는 stable D+7만 fail closed하고 otherwise valid independent retrieval과 far transfer는 유지한다.
  identified source attempt는 `evidence.attempt`에서 closed single canonical server-attempt record로 resolve한다.
  D+7 candidate는 별도 closed `canonicalD7Evaluation`을 가지고 exact source·evaluation ID·source attempt·D+7
  attempt·learner·submission에 bind된다. interval은 source attempt record의 canonical `submittedAt`과 이 bound
  evaluation record의 `d7EvaluationCompletedAt`만으로 계산한다. outer/source-labeled timestamp, 별도로 공급한
  더 오래된 timestamp, missing·mismatched·malformed 또는 unresolved provenance는 stable credit을 만들지 못한다.
  이와 별도로 D+7 evaluation completion은 자기 canonical D+7 attempt의 `submittedAt`과 같은 시각이거나 뒤여야
  한다. 1 ms 이전은 stable D+7만 거부하고 equality와 later completion은 통과한다.
  canonical D+7 attempt의 `submittedAt` 자체도 canonical base/source attempt의 `submittedAt`과 같거나 뒤여야 한다.
  두 trusted canonical attempt record의 exact RFC3339 UTC millisecond timestamp만 비교하며 D+7 attempt가 source보다
  1 ms 앞서면 stable D+7만 거부한다. equality와 later는 허용하고 outer/caller source·D+7 timestamp는 대체하지 못한다.
- missing exposure history/record, failed render, partial commit 또는 ambiguous record는 positive learning
  evidence 0으로 fail closed한다. `ASSISTED` attempt는 어떤 affirmative record가 있어도 부적격이다.
- cue를 보고 맞힌 것은 independent mastery가 아니다.
- cue를 본 뒤의 수정은 assisted repair로 분리한다.
- same cue card 반복은 far transfer가 아니다.
- stable 후보는 D+7, cue `HIDDEN`, non-same representation, unresolved scoring conflict 0을 요구한다.
- timed GS에서는 기본적으로 cue를 숨긴다.
- cue 버튼 클릭만으로 capability axis를 올리지 않는다.

```ts
type CueExposureEventBaseV1 = CanonicalAssistanceExposureEventV1 & {
  eventKind: "CUE_EXPOSURE";
  exposureId: string;
  learnerPrivateScopeId: string;
  cueId: string;
  stateShown: CuePresentationStateV1;
  shownAt: string;
  derivedFrom: "CANONICAL_ASSISTANCE_EXPOSURE_LEDGER";
  canonicalRecordCommitted: true;
  recordFailure: false;
};

type CueExposureEventV1 = CueExposureEventBaseV1 & (
  | {
      timing: "BEFORE_RESPONSE";
      assistanceClassification: "LOW" | "MATERIAL";
      attemptId: string;
      attemptBinding: ExactCanonicalIndependentOpenAttemptBindingV1;
      confirmation: PreResponseCueConfirmationV1;
      preResponseRenderGateId: "EXACT_PRE_RESPONSE_RENDER_GATE_V1";
      independentEvidenceEligible: false;
    }
  | {
      timing: "AFTER_RESPONSE";
      assistanceClassification: "NONE" | "LOW" | "MATERIAL";
      attemptId: string;
      attemptBinding: ExactCanonicalSubmittedAttemptBindingV1;
    }
  | {
      timing: "REVIEW_ONLY";
      assistanceClassification: "NONE" | "LOW" | "MATERIAL";
      attemptScopeId: string;
      reviewOnlyResolution: CanonicalReviewOnlyResolutionV1;
      attemptId?: string;
      attemptBinding?: ExactCanonicalSubmittedAttemptBindingV1;
      independentEvidenceEligible: false;
    }
);

type ExactCanonicalIndependentOpenAttemptBindingV1 = {
  source: "CANONICAL_SERVER_ATTEMPT_LEDGER";
  attemptId: string;
  learnerPrivateScopeId: string;
  canonicalAttemptState: "INDEPENDENT_ATTEMPT_OPEN";
  matchingRecordCount: 1;
  known: true;
  resolved: true;
  submitted: false;
  closed: false;
  stale: false;
  cancelled: false;
  replayed: false;
  ambiguous: false;
  conflicting: false;
  clientInferred: false;
};

type ExactCanonicalSubmittedAttemptBindingV1 = {
  source: "CANONICAL_SERVER_ATTEMPT_LEDGER";
  attemptId: string;
  learnerPrivateScopeId: string;
  canonicalAttemptState: "SUBMITTED";
  matchingRecordCount: 1;
  serverSide: true;
  authoritative: true;
  independentlyResolved: true;
  known: true;
  resolved: true;
  submitted: true;
  submittedBeforeExposure: true;
  ambiguous: false;
  conflicting: false;
  crossLearner: false;
  crossAttempt: false;
  mismatched: false;
  replayed: false;
  preSubmission: false;
  closed: false;
  stale: false;
  cancelled: false;
  clientInferred: false;
  callerInferred: false;
};

type CanonicalReviewOnlyResolutionV1 = {
  source: "CANONICAL_SERVER_CUE_TIMING_CLASSIFICATION_RESOLVER";
  serverSide: true;
  authoritative: true;
  independentlyResolved: true;
  known: true;
  resolved: true;
  matchingResolutionCount: 1;
  ambiguous: false;
  conflicting: false;
  crossLearner: false;
  crossAttempt: false;
  mismatched: false;
  stale: false;
  replayed: false;
  cancelled: false;
  clientInferred: false;
  callerInferred: false;
  canonicalTiming: "REVIEW_ONLY";
  canonicalAssistanceClassification: "NONE" | "LOW" | "MATERIAL";
  canonicalExposureRecordState: "COMMITTED";
  learnerPrivateScopeId: string;
  attemptScopeId: string;
  cueId: string;
  cueRevisionId: string;
  requestId: string;
  openIndependentAttemptResolution: {
    source: "CANONICAL_SERVER_ATTEMPT_LEDGER";
    queriedCanonicalAttemptState: "INDEPENDENT_ATTEMPT_OPEN";
    learnerPrivateScopeId: string;
    attemptScopeId: string;
    matchingRecordCount: 0;
    serverSide: true;
    authoritative: true;
    independentlyResolved: true;
    known: true;
    resolved: true;
    ambiguous: false;
    conflicting: false;
    crossLearner: false;
    crossAttempt: false;
    mismatched: false;
    stale: false;
    replayed: false;
    cancelled: false;
    clientInferred: false;
    callerInferred: false;
  };
};

const CUE_TIMING_CLASSIFICATION_V1 = {
  BEFORE_RESPONSE: ["LOW", "MATERIAL"],
  AFTER_RESPONSE: ["NONE", "LOW", "MATERIAL"],
  REVIEW_ONLY: ["NONE", "LOW", "MATERIAL"],
} as const;

const EXACT_RENDER_RECORD_FAILURE_GATE_V1 = {
  field: "recordFailure",
  requiredPrimitiveType: "boolean",
  requiredExactValue: false,
  appliesToTimings: ["AFTER_RESPONSE", "REVIEW_ONLY"],
  evaluatedBeforeApplicableTimingRouting: true,
  beforeResponseFailureStateSource:
    "AUTHORITATIVE_PRE_RESPONSE_TRANSACTION_POST_STATE_RESOLUTION_GATE_V1",
  renderCapableValidators: [
    "CUE_RENDER_REQUEST_VALIDATOR",
    "CUE_EXPOSURE_EVENT_VALIDATOR",
  ],
  invalidStateBehavior: "FAIL_CLOSED_NO_CUE_BYTES",
} as const;

type PreResponseCueConfirmationV1 = {
  source: "CANONICAL_SERVER_CONFIRMATION_LEDGER";
  status: "CONFIRMED";
  attemptId: string;
  learnerPrivateScopeId: string;
  cueId: string;
  cueRevisionId: string;
  requestId: string;
  confirmationId: string;
  serverRecorded: true;
  deliberate: true;
  active: true;
  singleUse: true;
  matchingRecordCount: 1;
  stale: false;
  replayed: false;
  consumed: false;
  ambiguous: false;
};

const PRE_RESPONSE_RENDER_TRANSACTION_V1 = [
  "CONFIRMATION_CONSUMPTION_COMMITTED",
  "CUE_EXPOSURE_RECORD_COMMITTED",
  "ATTEMPT_STATE_TRANSITIONED_TO_ASSISTED",
  "INDEPENDENT_EVIDENCE_INVALIDATED",
  "CUE_BYTES_RENDERED",
] as const;

type AuthoritativePreResponseTransactionPostStateV1 = {
  source: "CANONICAL_SERVER_PRE_RESPONSE_TRANSACTION_POST_STATE_RESOLVER";
  transactionId: string;
  matchingRecordCount: 1;
  serverSide: true;
  authoritative: true;
  independentlyResolved: true;
  known: true;
  resolved: true;
  committed: true;
  committedBeforeRender: true;
  renderBarrierSatisfied: true;
  confirmationConsumed: true;
  cueExposureRecordCommitted: true;
  postCommitAttemptState: "ASSISTED";
  postCommitIndependentEvidenceEligible: false;
  positiveLearningEvidenceAwarded: false;
  learnerPrivateScopeId: string;
  attemptId: string;
  cueId: string;
  cueRevisionId: string;
  requestId: string;
  confirmationId: string;
  orderedCommittedSteps: readonly [
    "CONFIRMATION_CONSUMPTION_COMMITTED",
    "CUE_EXPOSURE_RECORD_COMMITTED",
    "ATTEMPT_STATE_TRANSITIONED_TO_ASSISTED",
    "INDEPENDENT_EVIDENCE_INVALIDATED",
  ];
  partialCommit: false;
  recordFailure: false;
  wrongCommitOrder: false;
  renderSubmitRaceDetected: false;
  ambiguous: false;
  conflicting: false;
  crossLearner: false;
  crossAttempt: false;
  crossCue: false;
  crossCueRevision: false;
  crossRequest: false;
  crossConfirmation: false;
  mismatched: false;
  stale: false;
  replayed: false;
  cancelled: false;
  inferred: false;
  clientInferred: false;
  callerInferred: false;
};

const EXACT_CANONICAL_ATTEMPT_RESOLUTION_STATE_GATE_V1 = {
  requiredExactPrimitiveBooleanStates: {
    known: true,
    resolved: true,
    ambiguous: false,
    conflicting: false,
    stale: false,
    clientInferred: false,
  },
  eachResolutionValidatedIndependently: true,
  truthinessDefaultingCoercionOrAbsenceAccepted: false,
} as const;

const EXACT_CANONICAL_SUBMITTED_ATTEMPT_RESOLUTION_GATE_V1 = {
  source: "CANONICAL_SERVER_ATTEMPT_LEDGER",
  additionalFieldsAllowed: false,
  requiredFields: [
    "source", "attemptId", "learnerPrivateScopeId", "canonicalAttemptState",
    "matchingRecordCount", "serverSide", "authoritative", "independentlyResolved",
    "known", "resolved", "submitted", "submittedBeforeExposure", "crossLearner",
    "crossAttempt", "mismatched", "replayed", "preSubmission", "closed", "stale",
    "cancelled", "ambiguous", "conflicting", "clientInferred", "callerInferred",
  ],
  identifierFields: ["attemptId", "learnerPrivateScopeId"],
  identifierSchema: "EXACT_TRIMMED_CANONICAL_IDENTIFIER_V1",
  exactMatchingRecordCount: 1,
  requiredCanonicalAttemptState: "SUBMITTED",
  requiredExactPrimitiveBooleanStates: {
    serverSide: true,
    authoritative: true,
    independentlyResolved: true,
    known: true,
    resolved: true,
    submitted: true,
    submittedBeforeExposure: true,
    crossLearner: false,
    crossAttempt: false,
    mismatched: false,
    replayed: false,
    preSubmission: false,
    closed: false,
    stale: false,
    cancelled: false,
    ambiguous: false,
    conflicting: false,
    clientInferred: false,
    callerInferred: false,
  },
  consumers: [
    "validateCanonicalAttemptBinding",
    "evaluateCueRender.AFTER_RESPONSE",
    "validateCueExposureEvent.AFTER_RESPONSE",
    "authorizeCanonicalReviewOnlyCueRender.OPTIONAL_BOUND_REVIEW_ONLY",
  ],
  weakerOuterPolicyAuthoritative: false,
} as const;

const PRE_RESPONSE_RENDER_GATE_V1 = {
  gateId: "EXACT_PRE_RESPONSE_RENDER_GATE_V1",
  renderCapableValidators: [
    "CUE_RENDER_REQUEST_VALIDATOR",
    "CUE_EXPOSURE_EVENT_VALIDATOR",
  ],
  attemptResolutionStateGate: "EXACT_CANONICAL_ATTEMPT_RESOLUTION_STATE_GATE_V1",
  confirmationReplayedMustExactlyEqual: false,
  alternateValidatorBypassAllowed: false,
} as const;

const CANONICAL_REVIEW_ONLY_RENDER_GATE_V1 = {
  timingClassificationSource: "CANONICAL_SERVER_CUE_TIMING_CLASSIFICATION_RESOLVER",
  requiredResolutionBooleanStates: {
    known: true,
    resolved: true,
    ambiguous: false,
    conflicting: false,
    crossLearner: false,
    stale: false,
    clientInferred: false,
  },
  openAttemptAbsenceSource: "CANONICAL_SERVER_ATTEMPT_LEDGER",
  openAttemptStateFilter: "INDEPENDENT_ATTEMPT_OPEN",
  openAttemptAbsenceResolutionStateGate: "EXACT_CANONICAL_ATTEMPT_RESOLUTION_STATE_GATE_V1",
  matchingCanonicalOpenIndependentAttemptCount: 0,
  renderCapableValidators: [
    "CUE_RENDER_REQUEST_VALIDATOR",
    "CUE_EXPOSURE_EVENT_VALIDATOR",
  ],
  callerLabelOrBooleanSufficient: false,
} as const;

type CanonicalExposureHistoryV1 = {
  source: "CANONICAL_ASSISTANCE_EXPOSURE_LEDGER";
  authoritative: true;
  complete: true;
  matchingRecordCount: 1;
  attemptId: string;
  learnerPrivateScopeId: string;
  missingExposureRecord: false;
  failedRender: false;
  partialCommit: false;
  ambiguousRecord: false;
  ambiguous: false;
  conflicting: false;
  stale: false;
  replayed: false;
  clientInferred: false;
  callerPaired: false;
  preResponseCueExposureCount: number; // exact nonnegative safe integer
  preResponseCueExposureCountAuthoritative: true;
  preResponseCueExposureCountAmbiguous: false;
  preResponseCueExposureCountConflicting: false;
  preResponseCueExposureCountStale: false;
  preResponseCueExposureCountClientInferred: false;
};
```

- `AFTER_RESPONSE`와 `REVIEW_ONLY` render-capable request/event는 shared gate에서
  `canonicalRecordCommitted === true`와 `recordFailure === false`를 exact primitive equality로 요구한다.
  `BEFORE_RESPONSE`는 request-owned completion proof를 사용하지 않는다. `commitSteps`, outer
  `canonicalRecordCommitted`/`recordFailure`, success/completion/atomicity booleans 및 caller source/label이
  subject에 있으면 authorization path에서 reject한다.
- timing과 assistance classification은 canonical ledger가 파생하며 untrusted client 값을 받지 않는다.
  request와 event validator는 같은 closed timing/classification map을 사용한다. pre-response request는
  `assistanceClassification`이 명시된 `LOW` 또는 `MATERIAL`이어야 하며 omitted 또는 `NONE`은 렌더하지 않는다.
  submitted-attempt `AFTER_RESPONSE` request도 성공 전에 mapped `NONE`·`LOW`·`MATERIAL` 중 하나를
  명시해야 하며 omitted 또는 임의 값은 렌더하지 않는다.
- attempt state는 `CANONICAL_SERVER_ATTEMPT_LEDGER`에서 파생한다. `BEFORE_RESPONSE`는 exact
  learner/attempt resolution의 `INDEPENDENT_ATTEMPT_OPEN`과 exact single-use confirmation이 모두 없으면
  허용하지 않으며, 모든 render-capable validator가 위 shared gate에 위임해야 한다.
- confirmation은 learner·attempt·cue·cue revision·request·confirmation identity 여섯 필드가 모두 정확히 일치하는 단 하나의
  active, deliberate, server-recorded, non-cancelled, fresh, unused, explicitly non-replayed record여야 한다.
  `replayed === false`는 exact primitive equality로 검증하며, 단순 client
  boolean·preselected consent는 부족하다.
- `BEFORE_RESPONSE + NONE`은 invalid다. `NONE`은 해당 attempt에 pre-response cue exposure가
  하나도 없었음을 뜻한다.
- attempt sequence에 pre-response event가 하나라도 있으면 independent retrieval, far transfer,
  stable D+7 evidence는 모두 부적격이며 뒤의 event가 이를 independent로 복구할 수 없다.
- pre-response cue가 없다는 record는 eligibility만 보존한다. empty event list, cue-free record 또는
  `AFTER_RESPONSE` event만으로는 positive learning evidence가 생기지 않는다.
- independent retrieval·far transfer·stable D+7 credit 전에 각 applicable canonical exposure history는
  위 closed shape와 exact source를 만족하고 server-side·authoritative·independently-resolved·known·resolved·
  complete·single-record·non-ambiguous·non-conflicting·fresh·non-replayed·non-cancelled·non-cross-scope·
  non-mismatched·non-client/caller-inferred·non-caller-paired여야 한다. base history의 exact,
  valid, non-null `attemptId`와 `learnerPrivateScopeId`는 평가하는 `attempt`의 두 값과 정확히 같아야 한다.
  far-transfer history는 별도 canonical history로 그 record의 `transferAttemptId` 및 authenticated learner
  scope에, stable-D+7 history는 별도 canonical history로 `d7AttemptId` 및 같은 learner scope에 각각
  bind한다. source attempt의 history나 unbound copied count를 downstream history로 대체할 수 없다.
- 각 history의 `preResponseCueExposureCount`는 exact primitive number, nonnegative safe integer이고
  authoritative·non-ambiguous·non-conflicting·fresh·non-client-inferred여야 한다. 정확히 0일 때에만 해당
  affirmative evidence가 독립적으로 통과할 자격을 보존한다. 0보다 크면 해당 credit을 거부하고,
  missing·null·boolean·string·fractional·negative·NaN·infinite·unsafe integer·object·array·stale·ambiguous·
  conflicting·replayed·client/caller-inferred history 또는 count는 affected credit을 fail closed한다. exact 0
  자체는 response, retrieval, transfer 또는 D+7 evidence를 만들지 않는다.
- positive independent retrieval은 closed `canonicalResponseEvaluation`을 base attempt의 exact attempt·learner·
  submission ID와 candidate evaluation ID에 bind한다. far transfer는 closed `canonicalTransferEvaluation`을
  source/transfer attempt·learner·submission·evaluation·result·task IDs에 bind한다. stable D+7은 closed
  `canonicalD7Evaluation`을 source attempt·canonical D+7 attempt·learner·submission·evaluation ID에 bind한다.
  세 record 모두 exact source, one match, server-side·authoritative·independently-resolved·known·resolved true와
  모든 declared unsafe state exact false를 요구하고 undeclared extra field를 거부한다. caller source string과
  outer success boolean은 canonical resolution을 대체하지 못한다. 각 record 내부의
  `affirmativeEvidenceOutcomeAccepted`도 exact primitive `true`여야 하며 completion·record/result 존재·truthy/
  non-zero score·outer/caller/client outcome·cross-stage outcome·default/alias/coercion은 이를 대체하지 못한다.
  이 predicate는 기존 canonical evaluator의 acceptance만 전달하며 새 scoring·rubric·threshold·mastery authority가 아니다.
  stable D+7 interval은 bound source attempt의
  canonical `submittedAt`과 bound D+7 evaluation record의 `d7EvaluationCompletedAt` exact RFC3339 UTC
  millisecond instant만 결합하고,
  server가 계산한 실제 elapsed interval이 최소 `604800000` ms여야 한다. `D_PLUS_7` label이나 caller elapsed
  값, outer completion/source timestamp는 이를 대체하지 못하고 independently supplied older source timestamp, missing·mismatched·malformed·
  unresolved provenance, non-UTC·reversed·short interval은 credit을 만들지 못한다.
  세 affirmative record의 `ambiguous`는 exact primitive `false`여야 한다.
  missing·undefined·null·`true`·string(`"true"`, `"false"` 포함)·number·object·array는 해당 record의
  credit을 만들 수 없다. invalid independent response는 dependent far-transfer와 D+7도 막고, invalid
  transfer 또는 D+7 evaluation은 각각의 credit만 막으며 다른 gate를 약화하지 않는다. exact `false`나
  exposure event는 그 자체로 affirmative evidence를 만들지 않는다.
- confirmation consumption → exposure → `ASSISTED` → independent-evidence invalidation의 exact transaction이
  모두 commit된 다음에만 cue byte를 렌더한다. 완료 증거는 untrusted request subject 밖의 trusted decision
  context에서 canonical server post-state resolver가 반환한 non-null·non-array·additional-field-free record
  정확히 한 건뿐이다. 이 record는 learner-private scope·attempt·cue·cue revision·request·confirmation identity를
  exact-bind하고 server-side authority, independent resolution, commit-before-render, confirmation consumption,
  exposure commit, `ASSISTED` post-state, independent/positive evidence false 및 exact ordered steps를 record 내부에서
  증명한다. partial/wrong-order/record-failure/race, ambiguity/conflict/cross-binding/mismatch/stale/replay/cancel/
  inference는 exact false여야 한다. pre-transaction confirmation의 `consumed === false`, open attempt, outer boolean,
  source label 또는 expected-step array는 대체 증거가 아니다. invalid resolution은 exception 없이 cue byte와 모든
  affirmative evidence를 0으로 fail closed한다.
- canonical state가 `SUBMITTED`이면 `BEFORE_RESPONSE`는 거부하고 `AFTER_RESPONSE`만 허용한다.
  `AFTER_RESPONSE` request/event와 optional bound review는 동일 closed submitted-record gate로 exact source,
  single count, `SUBMITTED`, server-side/authority/independent-resolution, full safe/unsafe primitive state와
  independently schema-validated exact attempt/learner binding을 증명해야 한다. malformed matching IDs,
  undeclared fields, outer/caller substitution, unknown/cross-scope/mismatch/replay/pre-submission/cancellation/
  inference는 cue byte와 positive learning evidence를 모두 0으로 fail closed한다.
- `REVIEW_ONLY`만 attempt-unbound일 수 있다. optional binding이 있으면 동일 exact submitted-attempt
  validation을 통과해야 하며, bound/unbound 모두 independent retrieval·far transfer·stable D+7에는
  중립이다. 단, 두 render-capable path에서 trusted server resolution과 matching open independent
  attempt 0건이 먼저 증명되어야 하며 caller label, boolean, client event 또는 timing inference는
  authorization evidence가 아니다. exposure-event path는 이 shared gate로 routing하기 전에
  `derivedFrom === "CANONICAL_ASSISTANCE_EXPOSURE_LEDGER"`와 `ordering === "ORDERED"`를 모두 exact하게
  증명하며 누락·client provenance·ambiguous ordering은 cue byte 0으로 실패한다. request path에는 이
  event-only 필드를 요구하지 않는다.
  outer timing이나 nested canonical timing으로 review-only가 식별되면 두 validator는 이 routing과 다른 early
  return보다 먼저 actual subject의 `renderSubmitRaceDetected === false`를 exact primitive equality로 검증하고
  shared authorizer에서 재검증한다. missing·non-boolean·`true`는 cue byte 0이며 exact false만 통과할 수 있다.

`HIDDEN`은 CSS로 가리거나 접어 둔 상태가 아니다. cue·decomposition·prompt·memory gloss
바이트가 DOM, SSR payload, accessibility text, prefetch response, cache entry 또는 direct
API output 어디에도 존재하지 않아야 한다.

---

# 7. Memory Post-it MVP

MVP는 자유 편집기가 아니라 검토된 system cue의 읽기·회상 표면이다.

기본 UX:

```text
[적산가액]  ▾
```

기본 접힘 상태는 `formalTerm`만 노출한다. `積 쌓다 + 算 셈하다` 같은 decomposition을
답변 전에 접힘 상태에 미리 보여 주려면 canonical exposure를 렌더 전에 원자적으로
기록해야 하며, 기록 실패 시 decomposition byte를 보내거나 렌더하지 않는다.

펼치면:

```text
암기용 풀이
정확한 정의 링크
헷갈림 방지
5초 회상
새 문제 적용
```

hard UX:

- 기본 collapsed이며 선기록 없는 상태에는 formal term만 보인다.
- pre-response cue는 atomic exposure record 성공 뒤에만 렌더한다.
- `HIDDEN`에서는 DOM·SSR·접근성 text·prefetch·cache·direct API output cue byte가 0이다.
- 한 surface에 expanded memory card 최대 1개.
- 주 응답입력·계산표·답안작성을 가리지 않는다.
- 모바일은 anchored bottom sheet, 데스크톱은 여백 card를 우선 검토한다.
- 색·질감보다 낮은 시각소음과 명확한 계층을 우선한다.
- 키보드·스크린리더·확대·고대비에서 동일 의미를 제공한다.
- Today primary task를 네 번째로 만들지 않는다.
- 회상 prompt는 기존 CoreOutcome/ReviewUnit 안에서만 실행한다.

MVP가 포함하지 않는 것:

```text
개인 자유문장
포스트잇 드래그
제3자 원문 영구 anchor
공유
배치 import
백그라운드 동기화
분석용 raw text
```

---

# 8. 의미형 하이라이트

```ts
type SemanticHighlightRoleV1 =
  | "EXACT_DEFINITION"
  | "CONDITION_TRIGGER"
  | "PROCEDURE_SEQUENCE"
  | "EXCEPTION_TRAP"
  | "FORMULA_UNIT_VERIFICATION"
  | "DECISIVE_FACT";
```

하이라이트는 장식이 아니라 이유가 있는 학습단서다.

강제 규칙:

- 색만으로 의미를 전달하지 않는다.
- 같은 실제 candidate에 비어 있지 않은 visible text label, valid computed accessible name,
  `colorOnlyMeaning` exact primitive `false`를 항상 함께 제공한다(`ALL_OF`). candidate 필드의 missing·
  `undefined`·`null`·문자열·숫자·배열·객체, truthiness coercion, default/inference 또는 전역
  `colorOnlyMeaningAllowed: false`는 세 번째 조건을 대신할 수 없다. visible text가 올바른 computed
  accessible name을 만들면 중복 `aria-label`은 요구하지 않는다.
- concept/question surface의 primary highlight 기본 최대 3개.
- 모든 문장을 칠하는 기능을 기본값으로 제공하지 않는다.
- highlight click/view는 mastery가 아니다.
- highlight role은 revision-bound typed anchor, target revision/digest와 rights state를 가져야 한다.
- AI 추천은 candidate이며 reviewed rule 또는 learner confirmation 전 공유 release 금지.
- timed attempt에서는 기본 hidden.

---

# 9. 개인 주석 편집기

개인 편집기는 마지막 단계다.

```ts
type LearnerAnnotationKindV1 =
  | "USER_MNEMONIC"
  | "OWN_WORDS_EXPLANATION"
  | "CONFUSION_NOTE"
  | "FORMULA_CUE"
  | "SELF_QUESTION"
  | "EXAM_COMPRESSION"
  | "PRIVATE_SOURCE_NOTE";
```

개인 body 계약:

```text
plane = PERSONAL_RAW_VAULT
owner isolation = mandatory
shared reuse = 0
cross-user reuse = 0
direct raw-body model training = 0 unconditionally
consent / opt-in / contract / administrator / future O5 override = 0
raw-body rename / alias / direct Cleared Content Bank promotion = 0
free-text analytics = 0
export/delete = required before activation
purpose retention = required
append-only exposure/history where learning evidence depends on it
```

이 금지는 default가 아니라 변경 불가능한 입력 적격성 경계다. learner consent·opt-in, 계약,
관리자 선택 또는 미래 O5 승인도 Personal Raw Vault의 annotation body 자체를 직접 training
input이나 training candidate로 만들 수 없다. raw body의 이름·별칭·label·container를 바꾸어도
원래의 `PERSONAL_ANNOTATION_RAW_BODY` 분류가 유지되며, 그것을 Cleared Content Bank object로
직접 승격할 수 없다.

training candidate validator는 `originKind`, `kind` 등 어떤 candidate field보다 먼저 container gate를
실행한다. `null`, `undefined`, primitive, array, Date/Map 및 malformed/non-record container는 exception 없이
`candidateEligible === false`, `currentlyAuthorized === false`, disclosure/promotion 0으로 fail closed한다.

미래 training candidate가 될 수 있는 것은 다음 두 종류뿐이다.

- raw body·excerpt·free text를 포함하거나 복원할 수 없는 별도 identity의 closed-schema
  non-reconstructive signal. raw body pointer나 reconstructive derivative를 rename·alias·relabel한
  객체도 signal이 될 수 없다;
- raw annotation body의 rename·alias·직접 promotion이 아닌, 별도로 작성되고 실제 권리를
  소유하며 provenance와 rights review를 통과한 별도 Cleared Content Bank object.

Cleared Content Bank candidate는 exact identifier-only closed field set만 허용한다. caller가 공급한
`separateObjectIdentity`·`separatelyAuthored`·`rightsOwned`·`rightsReviewed`·`provenanceReviewed`
boolean, unknown field, `rawAnswer`·private raw pointer·free text·excerpt·reconstructive payload는 eligibility
증거가 아니며 즉시 reject한다. 별도 canonical promotion/rights/provenance resolver의 additional-field-free
closed record 한 건이 exact source·count 1을 갖고 `serverSide`·`authoritative`·`independentlyResolved`·
`known`·`resolved` exact true와 `ambiguous`·`conflicting`·`stale`·`clientInferred`·`callerInferred`·
`replayed`·`cancelled`·`mismatched`·모든 cross-bound state exact false를 만족해야 한다. record는 candidate
kind·`signalId`·`signalRevisionId`·`purposeId`·`o5ScopeId`를 field-for-field bind하고 separate object
identity, separate authorship, actual rights ownership, rights/provenance review 및 personal/private raw content
부재를 각각 증명해야 한다. missing·extra·malformed·unknown·mismatched·unsafe·stale·inferred·0건·복수
record는 hypothetical approval receipt 평가 전에 fail closed한다. 이 canonical proof를 가진 유효한 별도
authored·rights-owned candidate path는 유지한다.

contribution gate, Cleared Content Bank promotion gate와 exact-purpose O5 gate는 서로 다른
승인이다. contribution은 promotion을, promotion은 O5를, O5는 contribution/promotion을 대신하지
않는다. 미래 승인도 global boolean이 아니라 contribution·promotion·O5 각각의 independently
resolved receipt여야 한다. 세 receipt는 서로 다른 `receiptId`를 가지며 exact `signalId`·
`signalRevisionId`·`purposeId`·`o5ScopeId`에 모두 일치해야 한다. missing·cross-candidate·
cross-revision·cross-purpose·cross-scope·ambiguous·replayed·stale·revoked·independently unresolved
receipt는 authorization false로 fail closed한다. 이 문서는 그 세 gate 중 어느 것도 승인하지 않으며
canonical authorization flag는 모두 false다. 테스트의 future receipt는 모의 상태일 뿐 canonical
authorization을 변경하지 않는다. structurally valid하고 candidate-bound인 receipt set도 미래 binding
contract를 만족할 수 있음을 증명할 뿐, 현재 training·offline training 또는 다른 사용을 승인하지 않는다.
receipt set은 `contribution`·`promotion`·`o5`만 가진 closed object이고 각 receipt도 no-extra-field closed
canonical record다. kind-specific canonical source와 exact one match를 요구한다. `serverSide`·`authoritative`·
`independentlyResolved`·`known`·`resolved`·`active`는 exact true이고 `ambiguous`·`conflicting`·`replayed`·
`stale`·`revoked`·`clientInferred`·`callerInferred`·`crossCandidate`·`crossRevision`·`crossPurpose`·`crossScope`는
exact false다. missing·extra·malformed·duplicate ID·foreign binding·wrong source·non-boolean record는 otherwise
safe candidate eligibility를 유지하되 hypothetical receipt validity와 current authorization을 false로 둔다.
이 계약 아래 모든 canonical authorization flag와 `currentlyAuthorized`는 정확히 `false`이며,
mock·fixture·hypothetical/future context가 이를 override할 수 없다. 현재 사용 activation은 canonical
authorization boundary를 바꾸는 별도 Owner 승인 변경을 요구한다.

`SEPARATE_NON_RECONSTRUCTIVE_SIGNAL`에는 위 세 approval gate와 별도로 canonical origin/content-safety,
consent, retention decision-context resolution 및 trusted decision-time record가 모두 필요하다.

그보다 먼저, 같은 validated signal candidate object에 아래 다섯 property가 각각 명시적으로 존재하고
primitive boolean이며 정확히 `false`여야 한다.

```text
containsRawAnnotationBody = false
containsRawBodyPointer = false
containsExcerptOrFreeText = false
reconstructive = false
reconstructiveDerivativeOfRawBody = false
```

어느 하나라도 missing·undefined·null·non-boolean·`true`이거나 proof가 ambiguous·cross-object·
unvalidated이면 candidate eligibility는 fail closed다. validation source는
`CANONICAL_CLOSED_SIGNAL_SCHEMA_VALIDATOR`여야 하며 client assertion은 받지 않는다. 이 validator는
candidate가 제공한 `closedValueSchema: true`나 proof marker를 적합성 증거로 신뢰하지 않고 실제
actual candidate object 전체의 exact top-level 및 consent·retention nested field set과 값을 검증한다.
additional/unknown field는 허용하지 않으므로 `rawAnswer`, free text 또는 reconstructive payload가 하나라도
있으면 다른 marker가 모두 정상이어도 eligibility 전에 fail closed한다. property 부재는
content safety의 증거가 아니다.

candidate의 다섯 safety boolean, source label, `closedValueSchema`와 proof marker는 canonical origin 또는
content-safety 판정을 대신하지 않는다. 별도 decision-context의 additional-field-free closed
`CANONICAL_SIGNAL_ORIGIN_CONTENT_SAFETY_RESOLVER` record 한 건이 exact signal·revision·purpose·O5 scope에
bind하고 `SEPARATE_NON_RECONSTRUCTIVE_SIGNAL_ORIGIN`을 resolve해야 한다. server-side·authoritative·
independently-resolved·known·resolved·separate-object state는 exact true이고 raw body/pointer/excerpt/
free-text/reconstructive/rename/direct-promotion·ambiguous·conflicting·mismatched·cross-bound·stale·replayed·
cancelled·client/caller-inferred state는 exact false다. candidate echo만 있거나 record가 missing·extra·
wrong-source·0건/복수·foreign·unsafe이면 hypothetical receipt 평가 전에 fail closed한다.

- `CANONICAL_VERSIONED_CONSENT_OPT_OUT_LEDGER`의 active exact-purpose canonical consent resolution 한 건.
- `CANONICAL_PURPOSE_SCOPED_RETENTION_LEDGER`의 active finite purpose-bound retention canonical resolution 한 건.

candidate 내부 consent/retention은 non-authoritative echo다. 두 decision-context record는 각각
additional-field-free closed object, exact canonical record ID·source·count 1, server-side·authoritative·
independently-resolved·known·resolved exact true와 ambiguous·conflicting·mismatched·cross-bound·stale·
replayed·cancelled·client/caller-inferred exact false를 요구한다. 둘 다 exact `signalId`·`signalRevisionId`·
`purposeId`·`o5ScopeId`에 bind되고 source/state/expiry/boolean을 포함한 candidate echo와 field-for-field로
일치해야 한다. candidate label이나 canonical-looking nested object만으로 ledger resolution을 대체할 수 없다.

두 canonical record는 각각 `consent.expired === false`, `consent.revoked === false`,
`retention.expired === false`, `retention.revoked === false`를 exact primitive boolean으로 요구한다.
`!== true`, truthiness, defaulting, coercion 또는 true의 부재로 대체할 수 없다. 어느 필드든 missing·
undefined·null·true·string(`"true"`, `"false"`)·number·object·array 또는 다른 non-false 값이면 candidate는
부적격이고 hypothetical receipt도 valid가 될 수 없다. exact false는 다른 모든 source·ACTIVE·purpose·
binding·finite-retention·trusted-time·strict-future-expiry gate가 통과할 때 eligibility만 보존하며 consent,
receipt, current use, training, promotion 또는 O5 authorization을 만들지 않는다.

consent와 retention의 두 `expiresAt`은 candidate echo가 아니라 위 canonical resolution에서만 읽는다.
decision 시점의 `TRUSTED_SERVER_CLOCK_BOUNDARY`도 additional-field-free closed canonical record 한 건이어야
한다. exact source·record ID·count 1, server-side·authoritative·independently-resolved·trusted·known·resolved
exact true와 ambiguous·conflicting·stale·replayed·cancelled·client/caller-inferred exact false를 검증한 뒤
canonical ISO-8601 UTC `evaluatedAt`만 비교에 사용한다. 두 expiry 모두 evaluation time보다 엄격히 뒤여야
한다. candidate·caller·client time, missing·extra·invalid·ambiguous·untrusted·non-single clock record,
expiry와 같은 시각 또는 그 이전은 candidate eligibility false로 fail closed한다. 고정 날짜 비교는 금지한다.

```ts
type CandidateBoundTrainingApprovalReceiptV1 = {
  receiptId: string;
  approvalKind: "CONTRIBUTION_APPROVAL" | "PROMOTION_APPROVAL" | "O5_APPROVAL";
  source:
    | "CANONICAL_CONTRIBUTION_APPROVAL_RESOLVER"
    | "CANONICAL_PROMOTION_APPROVAL_RESOLVER"
    | "CANONICAL_O5_APPROVAL_RESOLVER";
  serverSide: true;
  authoritative: true;
  independentlyResolved: true;
  known: true;
  resolved: true;
  matchingRecordCount: 1;
  active: true;
  ambiguous: false;
  conflicting: false;
  replayed: false;
  stale: false;
  revoked: false;
  clientInferred: false;
  callerInferred: false;
  crossCandidate: false;
  crossRevision: false;
  crossPurpose: false;
  crossScope: false;
  signalId: string;
  signalRevisionId: string;
  purposeId: string;
  o5ScopeId: string;
};

type TrustedTrainingDecisionTimeV1 = {
  source: "TRUSTED_SERVER_CLOCK_BOUNDARY";
  recordId: string;
  evaluatedAt: string;
  matchingRecordCount: 1;
  serverSide: true;
  authoritative: true;
  independentlyResolved: true;
  trusted: true;
  known: true;
  resolved: true;
  ambiguous: false;
  conflicting: false;
  stale: false;
  replayed: false;
  cancelled: false;
  clientInferred: false;
  callerInferred: false;
};
```

generic opt-in, contract, administrator choice 또는 O5 자체는 consent나 retention을 대신하지 않는다.
missing·mismatched·expired·revoked·indefinite·cross-purpose consent/retention은 candidate 단계에서
fail closed한다. raw body, raw pointer 또는 reconstructive derivative는 이름을 signal로 바꾸어도
계속 부적격이다.

별도 활성화 전 요구:

- CPF source-safety closure.
- schema·RLS·Storage·provider exact Work.
- retention·export·delete·backup semantics.
- private source anchor and orphan handling.
- no logs/traces/error bodies.
- offline and sync conflict policy.
- accessibility and mobile editing.
- hostile cross-user and reconstruction tests.
- Owner-private runtime evidence.

---

# 10. V13 연결점

## VESG

```text
MemoryCue.scopeNodeId → exact VESG node
exactDefinitionRef → released, versioned VESG concept/evidence projection
MCAL → projection consumer, never definition authority
graph/norm/revision/digest drift → cue hold
free-text tag → source of truth 금지
```

## QuestionReference / QuestionUnit

- cue는 문제 전체가 아니라 필요한 concept·formula·procedure·question unit에 연결한다.
- attempt 전 reveal은 exposure.
- Book Tutor의 private source body는 shared cue seed가 아니다.

## Learner Capability Twin

cue는 다음 축의 보조 evidence를 만들 수 있으나 직접 값을 변경하지 않는다.

```text
knowledgeAccuracy
retrievalStrength
methodSelection
transferDistance
confidenceCalibration
```

## Review Queue

```text
required recall state
prior cue exposure
contrast requirement
application requirement
D+1/D+7 due
```

## Full GS

- packet freeze 후 cue policy도 동결.
- 기본 hidden.
- reveal 시 assisted event.
- cue-assisted packet result는 independent timed integration이 아니다.

---

# 11. Portable Professional Exam Core

공통 재사용:

```text
MemoryCue interface
TermComponent interface
AnnotationAnchor interface
CuePresentationState
CueExposureEvent
SemanticHighlightRole
bodyless annotation receipt
```

profile-owned:

```text
formal terminology
exact definitions
Hanja/root decomposition
memory gloss
contrast/traps
currentness
rights
linguistic/subject reviewer
release policy
```

다른 profile이 `적산가액` cue나 감정평가사 mastery를 상속하지 않는다.

---

# 12. 정확한 구현 순서

```text
MCAL-0 — source-only contracts and validation
  이 문서·Owner 결정·machine contract·focused test
  learner UI/persistence 0

MCAL-1 — reviewed Appraiser Second terminology registry
  실무 15~20 + 이론 15~20 + 법규 15~20
  released, versioned VESG concept required for every term
  exact definition projection / decomposition / contrast / proof
  learner UI 0

MCAL-2 — Memory Post-it MVP
  core authority/concept/question/verifier available
  attempt/repair/transfer/D+7 loop accepted
  MCAL-1 reviewed
  CPF-2A closed
  approved bodyless exposure path
  canonical Assistance/Exposure ledger reuse
  read-only reviewed system cues
  recall prompt + cue fading
  Owner-only first

MCAL-3 — bounded semantic highlighting
  revision-bound typed anchors
  owned/permitted stable anchors
  max three primary highlights
  accessibility and timed-mode tests

MCAL-4 — personal annotation editor
  separate persistence/schema/privacy Work
  CPF, retention, export/delete, RLS, backup and hostile evidence
  Owner-only before any wider activation
```

금지:

```text
MCAL-1 term without a released VESG concept
MCAL-2 before core loop acceptance, CPF-2A closure or approved bodyless exposure path
MCAL-3 as arbitrary highlighter before revision-bound stable anchors
MCAL-4 before CPF/privacy/export-delete gates
automatic roadmap selection
```

---

# 13. 향후 N-of-1 검증

별도 권위가 생긴 뒤 유사 난도의 용어를 다음처럼 비교할 수 있다.

```text
A: 정확한 정의만
B: 정의 + 검증된 해부 + memory gloss
C: B + 회상 prompt + cue fading
```

평가:

```text
D+1 independent recall
D+7 hidden-cue recall
confused-term discrimination
new-problem application
response time
hint dependence
confidence calibration
accessibility/usability defects
```

Owner N=1은 기능·안전·사용성 신호일 뿐 공개 인지효과나 합격효과를 증명하지 않는다.

---

# 14. Hard gates

```text
memory_gloss_used_as_exact_definition = 0
literal_gloss_presented_as_professional_definition = 0
invented_or_unverified_hanja_released = 0
cue_without_profile_or_scope_node = 0
cue_without_exact_definition_or_norm_or_rights = 0
stale_cue_after_definition_drift = 0
exact_definition_ref_outside_released_versioned_vesg_projection = 0
mcal_second_definition_authority = 0
mcal1_term_without_released_vesg_concept = 0
mcal2_before_cpf2a_closure = 0
mcal2_without_approved_bodyless_exposure_path = 0
separate_cue_exposure_ledger = 0
pre_response_decomposition_without_exposure = 0
collapsed_cue_bytes_before_atomic_exposure = 0
hidden_cue_bytes_in_dom_ssr_accessibility_prefetch_cache_or_api = 0
semantic_highlight_without_revision_bound_typed_anchor = 0
anchor_missing_or_invalid_required_binding = 0
private_anchor_without_exact_authoritative_owner_binding = 0
cue_reveal_without_exposure_event = 0
cue_view_promotes_independent_mastery = 0
d7_stable_with_visible_cue = 0
d7_stable_without_actual_7_day_elapsed_interval = 0
learning_evidence_from_unresolved_or_non_single_canonical_attempt = 0
after_response_request_without_closed_classification = 0
review_only_event_without_provenance_or_ordering = 0
same_representation_counted_as_far_transfer = 0
color_only_semantic_highlight = 0
primary_highlights_over_three = 0
expanded_memory_cards_over_one = 0
memory_card_obscures_primary_response = 0
private_source_range_in_shared_plane = 0
personal_annotation_body_outside_personal_raw_vault = 0
personal_free_text_in_logs_or_analytics = 0
cross_user_personal_cue_reuse = 0
direct_raw_personal_annotation_body_training = 0
raw_personal_annotation_body_renamed_or_aliased_for_training = 0
raw_personal_annotation_body_directly_promoted_to_cleared_content_bank = 0
reconstructive_annotation_signal_used_as_training_candidate = 0
training_candidate_without_distinct_contribution_promotion_o5_gates = 0
training_candidate_without_exact_candidate_bound_approval_receipts = 0
mock_or_hypothetical_receipt_authorizes_current_training = 0
training_decision_without_trusted_server_evaluation_time = 0
cleared_content_candidate_without_canonical_bound_provenance = 0
personal_editor_before_cpf_privacy_export_delete_gates = 0
mcal_runtime_before_core_loop_acceptance = 0
other_profile_term_auto_inheritance = 0
mcal_creates_fourth_today_primary_task = 0
pre_response_cue_without_canonical_independent_attempt_open = 0
pre_response_cue_without_exact_single_use_confirmation = 0
pre_response_cue_before_atomic_assisted_transition = 0
pre_response_cue_after_partial_commit_or_race = 0
pre_response_cue_from_open_or_unsafe_confirmation_record = 0
render_capable_exposure_event_without_exact_boolean_committed_record = 0
independent_credit_without_exact_canonical_pre_response_exposure_count = 0
positive_credit_from_open_unresolved_or_unbound_evaluation_record = 0
d7_credit_from_outer_or_substituted_completion_timestamp = 0
submitted_attempt_rendered_as_before_response = 0
review_only_without_canonical_server_resolution = 0
review_only_with_matching_open_independent_attempt = 0
```

---

# 15. Definition of Done for this source-only follow-up

- V13 remains sole active master plan.
- MCAL is named mandatory follow-up annex.
- exact development order is machine-readable.
- exact definition and mnemonic are structurally separate, with released/versioned VESG projection authority.
- MCAL never becomes a second definition authority.
- Hanja/root provenance and fail-closed statuses exist.
- canonical Assistance/Exposure ledger reuse, atomic pre-render recording and HIDDEN byte absence exist.
- every decisive canonical record in the bounded render/evidence surface is closed, single, exact-source,
  server-side, authoritative, resolved, exact-bound and exact-safe-state validated; mutation matrices cover every
  required omission, extra field, wrong/zero/multiple source, non-boolean state, foreign binding and timestamp substitution.
- every render-capable `BEFORE_RESPONSE` validator delegates to one exact gate, rejects request-owned atomic
  proof fields, and requires one closed canonical server post-state resolution outside the request proving the exact
  learner/attempt/cue/revision/request/confirmation binding, ordered atomic commit and `ASSISTED` transition before render.
- every `REVIEW_ONLY` render-capable path requires canonical server timing/classification derivation,
  committed exposure proof and matching open independent attempt count zero.
- semantic highlight role/budget/accessibility and revision-bound typed anchors exist.
- every declared anchor required binding passes exact type, closed enum, pattern and kind-policy consistency;
  truthiness-only validation is forbidden.
- personal annotation remains last and private.
- training-candidate container validation runs before every field read and null/undefined/primitives/arrays/non-records
  fail closed without throwing or disclosing/promoting material.
- every signal content-safety field is present on the same validated object as boolean `false`, and one separate
  closed authoritative `CANONICAL_SIGNAL_ORIGIN_CONTENT_SAFETY_RESOLVER` record proves the bound safe origin;
  candidate-only, missing, extra, unsafe, inferred or cross-object proofs fail closed.
- consent and retention use separate closed authoritative decision-context records and expiry uses one closed trusted
  server decision-time record; candidate/caller-shaped echoes cannot substitute. Contribution/promotion/O5 each require
  an independently resolved exact-candidate-bound receipt while canonical authorization flags remain false.
- Portable Core owns interfaces only.
- MCAL-1 through MCAL-4 remain unauthorized.
- all authorization values remain false.
- strict JSON and focused contract tests pass.
- roadmap, PR #692, runtime, schema, persistence and dependencies remain unchanged.

> **MCAL의 목표는 어려운 용어를 예쁘게 꾸미는 것이 아니다. 정확한 뜻을 해치지 않는
> 기억 단서를 제공하고, 그 단서를 점차 없애 결국 시험에서 스스로 꺼내 쓰게 하는 것이다.**
