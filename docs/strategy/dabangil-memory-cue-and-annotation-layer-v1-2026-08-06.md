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
  },
  FORMULA_NODE: {
    domains: ["SHARED_OWNED"],
    bodyLocatorPolicies: ["NONE"],
  },
  PROCEDURE_STEP: {
    domains: ["SHARED_OWNED"],
    bodyLocatorPolicies: ["NONE"],
  },
  QUESTION_UNIT: {
    domains: ["SHARED_OWNED", "SHARED_OFFICIAL_PERMITTED"],
    bodyLocatorPolicies: ["NONE"],
    domainSelection: "EXPLICIT_ALLOWLIST_VALUE_REQUIRED",
    rightsStateRequired: true,
  },
  OWNED_CONTENT_RANGE: {
    domains: ["SHARED_OWNED"],
    bodyLocatorPolicies: ["SHARED_STABLE_SELECTOR"],
  },
  OFFICIAL_PERMITTED_RANGE: {
    domains: ["SHARED_OFFICIAL_PERMITTED"],
    bodyLocatorPolicies: ["SHARED_STABLE_SELECTOR"],
    itemLevelRightsRequired: true,
  },
  LEARNER_ATTEMPT_RANGE: {
    domains: ["LEARNER_PRIVATE"],
    bodyLocatorPolicies: ["VAULT_LOCAL_ONLY"],
    ownerBound: true,
    targetDigestPolicy: "VAULT_LOCAL_INTEGRITY_METADATA_ONLY",
    nonVaultProjection: "BODYLESS_RECEIPT_ONLY",
  },
  PRIVATE_SOURCE_RANGE: {
    domains: ["LEARNER_PRIVATE"],
    bodyLocatorPolicies: ["VAULT_LOCAL_ONLY"],
    ownerBound: true,
    targetDigestPolicy: "VAULT_LOCAL_INTEGRITY_METADATA_ONLY",
    nonVaultProjection: "BODYLESS_RECEIPT_ONLY",
  },
} as const satisfies Record<AnnotationAnchorKindV1, object>;

type AnnotationAnchorBaseV1<
  K extends AnnotationAnchorKindV1,
  D extends AnnotationDomainV1,
  L extends BodyLocatorPolicyV1,
> = {
  anchorId: string;
  profileId: string;
  kind: K;
  domain: D;
  conceptOrQuestionRef?: string;
  targetType: "CONCEPT" | "FORMULA" | "PROCEDURE_STEP" | "QUESTION_UNIT" | "CONTENT_RANGE";
  targetRevisionId: string;
  targetDigest: string;
  bodyLocatorPolicy: L;
  rightsManifestId: string;
  createdAt: string;
  status: "ACTIVE" | "HELD" | "SUPERSEDED";
};

type AnnotationAnchorV1 =
  | AnnotationAnchorBaseV1<"CONCEPT_NODE", "SHARED_OWNED", "NONE">
  | AnnotationAnchorBaseV1<"FORMULA_NODE", "SHARED_OWNED", "NONE">
  | AnnotationAnchorBaseV1<"PROCEDURE_STEP", "SHARED_OWNED", "NONE">
  | (AnnotationAnchorBaseV1<"QUESTION_UNIT", "SHARED_OWNED", "NONE"> & {
      rightsState: "SHARED_OWNED";
    })
  | (AnnotationAnchorBaseV1<
      "QUESTION_UNIT",
      "SHARED_OFFICIAL_PERMITTED",
      "NONE"
    > & { rightsState: "SHARED_OFFICIAL_PERMITTED" })
  | AnnotationAnchorBaseV1<
      "OWNED_CONTENT_RANGE",
      "SHARED_OWNED",
      "SHARED_STABLE_SELECTOR"
    >
  | (AnnotationAnchorBaseV1<
      "OFFICIAL_PERMITTED_RANGE",
      "SHARED_OFFICIAL_PERMITTED",
      "SHARED_STABLE_SELECTOR"
    > & { itemRightsManifestId: string })
  | (AnnotationAnchorBaseV1<
      "LEARNER_ATTEMPT_RANGE",
      "LEARNER_PRIVATE",
      "VAULT_LOCAL_ONLY"
    > & {
      ownerBindingRef: string;
      targetDigestScope: "VAULT_LOCAL_INTEGRITY_METADATA_ONLY";
      nonVaultProjection: "BODYLESS_RECEIPT_ONLY";
    })
  | (AnnotationAnchorBaseV1<
      "PRIVATE_SOURCE_RANGE",
      "LEARNER_PRIVATE",
      "VAULT_LOCAL_ONLY"
    > & {
      ownerBindingRef: string;
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
- shared cue는 답안길 소유·라이선스·item-permitted official content에만 연결한다.
- `QUESTION_UNIT`은 두 shared domain 중 하나를 명시적으로 선택하고 rights state를 반드시 가진다.
- `OFFICIAL_PERMITTED_RANGE`는 item-level rights를 반드시 가진다.
- 제3자 교재의 exact text range, OCR, 문제문장, 해설표현은 개인 vault 밖으로 나가지 않는다.
- `LEARNER_ATTEMPT_RANGE`와 `PRIVATE_SOURCE_RANGE`는 owner-bound `LEARNER_PRIVATE` 및
  `VAULT_LOCAL_ONLY`만 허용한다. target digest는 vault-local integrity metadata일 뿐이다.
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
  판정한 exact attempt에만 허용하며, client가 보낸 attempt state는 신뢰하지 않는다.
- learner가 해당 attempt·cue·cue revision·단일 request에 정확히 묶인 deliberate confirmation을
  명시적으로 완료해야 한다. client boolean이나 미리 선택된 consent는 confirmation이 아니다.
- confirmation record, cue exposure record, `ASSISTED` 전환, independent-evidence invalidation은
  하나의 all-or-nothing transaction으로 cue byte 렌더 전에 순서대로 commit되어야 한다.
- missing·cancelled·stale·replayed·mismatched·ambiguous confirmation, partial commit, record failure,
  render/submit race는 모두 fail closed하며 cue byte를 전혀 렌더하지 않는다.
- 이미 response가 제출된 canonical attempt는 `AFTER_RESPONSE`만 허용한다.
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
};

type CueExposureEventV1 = CueExposureEventBaseV1 & (
  | {
      timing: "BEFORE_RESPONSE";
      assistanceClassification: "LOW" | "MATERIAL";
      attemptId: string;
      independentEvidenceEligible: false;
    }
  | {
      timing: "AFTER_RESPONSE";
      assistanceClassification: "NONE" | "LOW" | "MATERIAL";
      attemptId?: string;
    }
  | {
      timing: "REVIEW_ONLY";
      assistanceClassification: "NONE" | "LOW" | "MATERIAL";
      attemptId?: string;
    }
);

const CUE_TIMING_CLASSIFICATION_V1 = {
  BEFORE_RESPONSE: ["LOW", "MATERIAL"],
  AFTER_RESPONSE: ["NONE", "LOW", "MATERIAL"],
  REVIEW_ONLY: ["NONE", "LOW", "MATERIAL"],
} as const;

type PreResponseCueConfirmationV1 = {
  source: "CANONICAL_SERVER_CONFIRMATION_LEDGER";
  status: "CONFIRMED";
  attemptId: string;
  cueId: string;
  cueRevisionId: string;
  requestId: string;
  singleUse: true;
};

const PRE_RESPONSE_RENDER_TRANSACTION_V1 = [
  "CONFIRMATION_RECORD_COMMITTED",
  "CUE_EXPOSURE_RECORD_COMMITTED",
  "ATTEMPT_STATE_TRANSITIONED_TO_ASSISTED",
  "INDEPENDENT_EVIDENCE_INVALIDATED",
  "CUE_BYTES_RENDERED",
] as const;
```

- timing과 assistance classification은 canonical ledger가 파생하며 untrusted client 값을 받지 않는다.
- attempt state는 `CANONICAL_SERVER_ATTEMPT_LEDGER`에서 파생한다. `BEFORE_RESPONSE`는 exact
  `INDEPENDENT_ATTEMPT_OPEN`과 exact single-use confirmation이 모두 없으면 허용하지 않는다.
- confirmation은 attempt·cue·cue revision·request 네 필드가 모두 정확히 일치하는 단 하나의
  non-cancelled, fresh, unused server record여야 한다. 단순 client boolean·preselected consent는 부족하다.
- `BEFORE_RESPONSE + NONE`은 invalid다. `NONE`은 해당 attempt에 pre-response cue exposure가
  하나도 없었음을 뜻한다.
- attempt sequence에 pre-response event가 하나라도 있으면 independent retrieval, far transfer,
  stable D+7 evidence는 모두 부적격이며 뒤의 event가 이를 independent로 복구할 수 없다.
- confirmation → exposure → `ASSISTED` → independent-evidence invalidation의 exact transaction이
  모두 commit된 다음에만 cue byte를 렌더한다. partial commit, ordering ambiguity, ledger record
  failure 또는 render/submit race는 rollback 후 fail closed하며 cue byte와 independent credit 모두 0이다.
- canonical state가 `SUBMITTED`이면 `BEFORE_RESPONSE`는 거부하고 `AFTER_RESPONSE`만 허용한다.

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
- 비어 있지 않은 visible text label과 valid computed accessible name을 항상 둘 다 제공한다
  (`ALL_OF`). visible text가 올바른 computed accessible name을 만들면 중복 `aria-label`은
  요구하지 않는다.
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

미래 training candidate가 될 수 있는 것은 다음 두 종류뿐이다.

- raw body·excerpt·free text를 포함하거나 복원할 수 없는 별도 identity의 closed-schema
  non-reconstructive signal;
- raw annotation body의 rename·alias·직접 promotion이 아닌, 별도로 작성되고 실제 권리를
  소유하며 provenance와 rights review를 통과한 별도 Cleared Content Bank object.

contribution gate, Cleared Content Bank promotion gate와 exact-purpose O5 gate는 서로 다른
승인이다. contribution은 promotion을, promotion은 O5를, O5는 contribution/promotion을 대신하지
않는다. 이 문서는 그 세 gate 중 어느 것도 승인하지 않으며 모든 authorization은 false다.

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
cue_reveal_without_exposure_event = 0
cue_view_promotes_independent_mastery = 0
d7_stable_with_visible_cue = 0
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
personal_editor_before_cpf_privacy_export_delete_gates = 0
mcal_runtime_before_core_loop_acceptance = 0
other_profile_term_auto_inheritance = 0
mcal_creates_fourth_today_primary_task = 0
pre_response_cue_without_canonical_independent_attempt_open = 0
pre_response_cue_without_exact_single_use_confirmation = 0
pre_response_cue_before_atomic_assisted_transition = 0
pre_response_cue_after_partial_commit_or_race = 0
submitted_attempt_rendered_as_before_response = 0
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
- semantic highlight role/budget/accessibility and revision-bound typed anchors exist.
- personal annotation remains last and private.
- Portable Core owns interfaces only.
- MCAL-1 through MCAL-4 remain unauthorized.
- all authorization values remain false.
- strict JSON and focused contract tests pass.
- roadmap, PR #692, runtime, schema, persistence and dependencies remain unchanged.

> **MCAL의 목표는 어려운 용어를 예쁘게 꾸미는 것이 아니다. 정확한 뜻을 해치지 않는
> 기억 단서를 제공하고, 그 단서를 점차 없애 결국 시험에서 스스로 꺼내 쓰게 하는 것이다.**
