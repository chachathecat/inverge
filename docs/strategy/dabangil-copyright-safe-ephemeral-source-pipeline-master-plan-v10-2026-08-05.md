---
document_title: "답안길 Copyright-Safe Ephemeral Source Pipeline 마스터플랜 Addendum v10"
document_subtitle: "문제 촬영·AI 풀이·답안 교정 기능을 유지하면서 제3자 교재 원문을 서버 자산으로 남기지 않는 저작권·개인정보 방화벽"
document_role: "integrated v8 and additive v9를 보완하는 exact-scope strategy amendment"
status: "owner-strategy/non-authoritative"
dated: "2026-08-05 KST"
repository: "chachathecat/inverge"
owner_decision:
  - "docs/decisions/2026-08-05-owner-ephemeral-source-copyright-firewall.md"
integrates_with:
  - "docs/strategy/dabangil-professional-exam-reasoning-os-master-plan-v8-2026-08-05.md"
  - "docs/strategy/dabangil-adaptive-understanding-progression-recovery-master-plan-v9-2026-08-05.md"
amends_for_strategy_only:
  - "source capture, OCR, provider routing, output release and learning-ledger persistence for unlicensed third-party study materials"
  - "Personal Raw Vault eligibility"
  - "trusted release gateway data-flow"
  - "privacy, logging, cache, queue, backup and provider-retention acceptance"
exact_scope_precedence: "For SourceRightsModeV1=transient_personal_study, this addendum and the dated Owner decision override less restrictive source-retention language in v8/v9."
does_not_supersede:
  - "live GitHub state and runtime"
  - "other dated Owner decisions outside this exact scope"
  - "AGENTS.md outside conflicting unlicensed-source persistence assumptions"
  - "canonical Markdown and machine-readable contracts until separately amended"
  - "roadmap/active-program.yml"
current_learner_facing_scope: "Dabangil Appraiser Second three subjects only"
real_third_party_content_authorization: "none"
runtime_authorization: "none"
schema_authorization: "none"
provider_authorization: "none"
dependency_authorization: "none"
deployment_authorization: "none"
production_authorization: "none"
external_learner_authorization: "none"
commercial_authorization: "none"
raw_source_persistent_retention_seconds: 0
ephemeral_session_hard_ceiling_seconds: 600
background_raw_source_jobs_allowed: false
raw_source_object_storage_allowed: false
raw_source_prompt_cache_allowed: false
raw_source_embedding_allowed: false
raw_source_training_or_eval_allowed: false
execution_rule: "Every implementation Work must reconcile live code, provider contracts, platform buffering/logging behavior and exact authority; this document does not itself authorize implementation."
legal_status: "risk-minimizing engineering plan, not a guarantee of immunity or a substitute for Korean copyright/privacy counsel"
research_checked_at: "2026-08-05 KST"
---

# 답안길 Copyright-Safe Ephemeral Source Pipeline 마스터플랜 Addendum v10

## 문제를 읽되, 문제를 소유하지 않는 AI 튜터 아키텍처

이 문서는 답안길의 핵심 기능을 축소하는 문서가 아니다.

사용자는 계속 다음을 할 수 있어야 한다.

```text
내가 가진 문제집의 한 문항 촬영
→ 문제 요구와 조건 확인
→ 내 답안·목차·계산 먼저 제출
→ AI 풀이·첨삭·개념 설명·학습법 제공
→ 가장 큰 간극 교정
→ D+1/D+7·Review Queue·다음 행동 생성
```

다만 권리자로부터 서버 저장·AI 처리·검색·재사용 허락을 받지 않은 일반
상업 교재에 대해서는 답안길이 그 문제의 사진, OCR, 표현, 해설 또는
1:1 답안 cache를 영속적으로 보유하지 않는다.

> **원문은 한 번의 제한된 개인 학습 세션에서만 읽고 버린다. 서버가 기억할
> 것은 책의 표현이 아니라 사용자의 학습 증거다.**

이 목표는 `DELETE after response` 한 줄로 달성되지 않는다. 원문은 DB뿐
아니라 ingress buffer, object storage, queue, cache, log, trace, crash report,
backup, provider safety log, prompt cache와 운영자 도구에 남을 수 있다.
따라서 이 문서는 데이터 분류, 프로세스 권한, API, provider registry,
output firewall, persistence schema, observability, hostile test와 legal
operations를 하나의 fail-closed pipeline으로 고정한다.

이 문서는 법적 위험을 0으로 보장하지 않는다. 특히 한국 저작권법상
상업적 AI 서비스가 사용자의 한 문항 사적 학습을 기술적으로 보조하는
구조에 대한 모든 쟁점이 확정 판례로 닫혀 있다고 전제하지 않는다. 대신
다음 방어사실을 제품과 증거로 만든다.

- 사용자 중심의 제한된 개인 학습
- 한 문항·한 세션·비공개 처리
- 원문·OCR·답지의 비축적
- 공용 문제은행·RAG·training·cross-user reuse 0
- 사용자의 선행 시도와 독자적 교육적 변환
- 출판사 해설 표현의 비재현
- 전체 책·답지·분할 추출 차단
- 권리자 신고와 repeat-infringer 대응
- exact provider retention과 정책 drift 통제
- 구현과 고지가 일치한다는 재현 가능한 증거

---

## 0. 한 페이지 결론

### 0.1 권리별 두 개의 제품 경로

```text
촬영 또는 source 선택
        ↓
Source Rights Router
        ↓
┌───────────────────────────────────────────────┐
│ A. licensed / user-authored / open-rights     │
│    → Rights-Manifest Full Companion           │
│    → exact permission 범위의 저장·검색·RAG    │
│                                               │
│ B. ordinary third-party commercial material  │
│    → Private Ephemeral Tutor                  │
│    → one item · synchronous · non-persistent  │
│                                               │
│ C. answer key / whole book / illegal scan     │
│    → blocked                                  │
└───────────────────────────────────────────────┘
```

사용자 UI는 하나의 촬영 버튼을 유지할 수 있다. 그러나 server authority와
persistence capability는 권리모드에 따라 물리적으로 분리한다.

### 0.2 가장 강한 배치 구조

```text
[사용자 기기]
  camera/crop
  PII redaction
  OCR when available
  source-expression minimization
  local encrypted working memory
        │
        │ TLS + optional application-layer encrypted envelope
        ▼
[Ephemeral Source Processor]
  no object-storage credential
  no general DB write credential
  no analytics/session-replay SDK
  no durable queue
  memory-only synchronous execution
  exact provider route allowlist
        │
        ├── on-device answer path, or
        └── contractually approved ZCR/ZDR provider path
        │
        ▼
[Output Copyright Firewall]
  no question restatement
  no answer-key imitation
  input/output overlap scan
  independent Dabangil structure
        │
        ├── full result → client stream only
        └── closed, source-scrubbed evidence projection
                           │
                           ▼
[Persistent Evidence Plane]
  no raw image/OCR/problem/prompt/provider output
  rights mode + policy version + bodyless receipt
  concept/error/assistance/exposure/next action
```

### 0.3 절대 불변식

1. `transient_personal_study` 원문은 어떤 persistent store에도 쓰지 않는다.
2. raw processor는 원문을 저장할 수 있는 credential 자체를 갖지 않는다.
3. raw request는 synchronous path만 사용한다. queue, webhook, batch,
   background mode와 retry job을 사용하지 않는다.
4. provider retention이 exact route에서 닫히지 않으면 원문을 보내지 않는다.
5. server-side full explanation history는 만들지 않는다. 전체 결과는 client에
   stream하고 필요한 경우 local-only encrypted vault에 저장한다.
6. persistent ledger는 closed schema와 source-expression scrub을 통과한
   evidence만 받는다.
7. raw input을 재현하거나 answer key를 모방하는 출력은 release하지 않는다.
8. PDF, multiple pages, answer key, sequential extraction과 coordinated split
   upload는 block한다.
9. rights promotion은 자동화하지 않는다. 허락된 source는 별도의 signed
   rights manifest로 다시 ingest한다.
10. fail-open, cheaper retained-provider fallback, debug body capture와 silent
    policy drift를 금지한다.

### 0.4 가장 중요한 제품 선택

법적 방어를 가장 강하게 하려면 기본값은 다음이다.

```text
raw source: client-only or ephemeral memory
full AI result: client-only
persistent cloud record: bodyless learning evidence
```

사용자가 cross-device full source/history를 요구할 경우 다음 중 하나만
허용한다.

- licensed source mode
- user-authored source mode
- 별도 법적 검토를 통과한 end-to-end encrypted sync mode

일반 상업 교재의 편의를 위해 cloud raw vault를 다시 여는 것은 이 v10의
기본 경로가 아니다.

---

## 1. 법적·제품 설계 원칙

### 1.1 설계가 고려하는 법적 구조

2026-08-05 기준 이 계획은 최소한 다음을 고려한다.

- 저작권법 제30조는 비영리 개인 이용·가정에 준하는 제한된 범위의 복제를
  “그 이용자”에게 허용한다. 따라서 무라이선스 원문 선택·촬영·전처리를
  사용자 기기에 최대한 가깝게 둔다.
- 제35조의2는 컴퓨터 처리상 필요한 일시적 복제를 허용하지만 원래 이용
  자체가 침해인 경우에는 적용되지 않는다. 따라서 TTL, RAM 또는 삭제시간
  하나를 면책 논리로 사용하지 않는다.
- 제35조의5 공정이용은 목적·성격, 저작물 종류·용도, 이용량·중요성,
  현재·잠재 시장 영향을 종합한다. 답안길은 한 문항·개인 비공개·독자적
  튜터링·비축적·시장 비대체를 제품 전체에서 강화한다.
- 제102조의 온라인서비스제공자 책임 제한은 요건부 제도다. OCR·분류·AI
  출력에 적극 개입하는 답안길은 단순 저장소 면책만을 유일한 방어로
  삼지 않는다.
- 개인정보가 사진에 함께 찍힐 수 있으므로 개인정보 최소화, 목적 설정,
  상용 LLM API 처리자 관리와 정보주체 권리까지 같은 pipeline에서 다룬다.

### 1.2 이 설계가 하지 않는 주장

- “사진을 삭제하면 언제나 합법이다.”
- “한 문제는 항상 저작권이 없다.”
- “교육 목적이면 상업 서비스도 자동 면책된다.”
- “AI provider가 책임지므로 답안길은 책임이 없다.”
- “ZDR이라는 이름이면 물리적 비트가 어떤 예외도 없이 사라진다.”
- “사용자가 약관에 동의했으므로 서비스 구조의 문제는 모두 사용자 책임이다.”
- “공정이용을 기술적으로 100% 판정할 수 있다.”

### 1.3 방어목표

`LegalDefenseEnvelopeV1`은 면책 판정이 아니라 실제 방어사실 묶음이다.

```ts
type LegalDefenseEnvelopeV1 = {
  sourceRightsMode: SourceRightsModeV1;
  userInitiated: true;
  privateDeliveryOnly: true;
  itemCountClass: "single_item";
  sourcePersistentWrites: 0;
  sourceCrossUserReuse: 0;
  sourceTrainingOrEvalUse: 0;
  sourceEmbeddingOrRagUse: 0;
  answerKeyMarketReplacementFeatures: 0;
  learnerPreAttemptState: "captured" | "guided_exception";
  outputTransformationPolicyRef: string;
  providerRetentionDecisionRef: string;
  deletionReceiptRef: string;
  policyVersion: string;
};
```

이 envelope가 있어도 법원이 동일한 결론을 보장하지 않는다. 다만 서비스가
어떤 이용을 했는지, 무엇을 하지 않았는지, 정책이 실제 코드에서
강제됐는지를 설명할 수 있게 한다.

---

## 2. 권리모드와 Source Rights Router

### 2.1 closed rights modes

```ts
type SourceRightsModeV1 =
  | "licensed_full"
  | "user_authored"
  | "open_or_public_domain"
  | "official_link_only"
  | "transient_personal_study"
  | "blocked";

type SourceRightsDecisionV1 = {
  id: string;
  mode: SourceRightsModeV1;
  rightsManifestRef?: string;
  declaredSourceClass:
    | "commercial_book"
    | "commercial_answer_key"
    | "official_exam_source"
    | "public_open_source"
    | "learner_created"
    | "unknown";
  allowedCapabilities: SourceCapabilityV1[];
  prohibitedCapabilities: SourceCapabilityV1[];
  reasonCodes: string[];
  policyVersion: string;
  decidedAt: string;
  derivationAuthority: "trusted_server";
};

type SourceCapabilityV1 =
  | "capture"
  | "ephemeral_ocr"
  | "ephemeral_model_inference"
  | "persistent_raw_storage"
  | "persistent_ocr_storage"
  | "persistent_full_output_storage"
  | "private_search"
  | "shared_search"
  | "embedding"
  | "rag"
  | "training"
  | "evaluation"
  | "cross_user_reuse"
  | "public_display";
```

### 2.2 default rule

권리 manifest가 없는 제3자 상업 교재는
`transient_personal_study`보다 넓은 권한을 받지 않는다.

```text
unknown commercial material
→ transient_personal_study
→ one-item ephemeral path only
```

다음은 자동으로 `blocked` 후보가 된다.

- 출판사 답지·해설지 사진
- PDF/EPUB/ZIP 또는 document bundle
- 책 전체·chapter 전체·다중 페이지
- 불법 스캔 watermark 또는 공유 사이트 흔적
- OCR text 대량 paste
- 여러 계정의 분할 업로드 조정
- 특정 책 전 문항 정답 생성 요청
- source protection 제거·watermark 제거 요청
- 원문 또는 생성 답안을 공개·판매하려는 요청

### 2.3 user declaration은 권리승격이 아니다

사용자는 다음을 확인한다.

> 이 자료에 적법하게 접근하고 있으며, 개인 학습을 위해 한 문항만
> 처리합니다. 책 전체·답지·불법복제물의 추출이나 공유를 요청하지 않습니다.

이 확인은 abuse prevention과 고지에 필요하지만 출판사 license를 대체하지
않는다. server는 사용자 체크박스를 근거로 `persistent_raw_storage=true`를
부여하지 않는다.

### 2.4 rights manifest

```ts
type RightsManifestV2 = {
  id: string;
  sourceIdentityRef: string;
  rightsHolderRefs: string[];
  chainOfTitleEvidenceRefs: string[];
  licenseInstrumentRef: string;
  permittedCapabilities: SourceCapabilityV1[];
  prohibitedCapabilities: SourceCapabilityV1[];
  territory: string[];
  language: string[];
  audienceScope: string[];
  effectiveFrom: string;
  effectiveUntil?: string;
  attributionPolicyRef?: string;
  subprocessorPermission: "allowed" | "prohibited" | "conditional";
  modelTrainingPermission: "allowed" | "prohibited" | "conditional";
  terminationDeletionPolicyRef: string;
  manifestDigest: string;
  status: "draft" | "approved" | "expired" | "revoked" | "blocked";
};
```

rights manifest가 있더라도 capability별 허용 범위를 계산한다. 단순히 책을
표시할 권한이 있다는 이유로 model training·RAG·public display 권한까지
확장하지 않는다.

### 2.5 transient에서 licensed로 자동 승격 금지

transient session에 원문이 남지 않으므로 나중에 공용 문제은행으로
승격할 source asset도 없다. license를 취득하면 publisher/official source에서
새로운 controlled ingest를 수행한다. transient user upload를 복구하거나
user corpus를 뒤져 재사용하지 않는다.

---

## 3. 데이터 분류와 persistence matrix

### 3.1 데이터 클래스

```ts
type SourceDataClassV1 =
  | "D0_RAW_SOURCE_EXPRESSION"
  | "D1_TRANSIENT_OCR_EXPRESSION"
  | "D2_RECONSTRUCTABLE_SOURCE_DERIVATIVE"
  | "D3_LEARNER_AUTHORED_BODY"
  | "D4_NON_RECONSTRUCTABLE_LEARNING_SIGNAL"
  | "D5_BODYLESS_OPERATIONAL_METADATA";
```

#### D0 — raw source expression

- 원본 사진·scan·screenshot
- crop·thumbnail·deskew image
- page image bytes
- answer-key image
- source audio/video

#### D1 — transient OCR expression

- OCR full text
- layout text
- figure caption
- question stem and choices
- source sentence fragments

#### D2 — reconstructable derivative

- 문제를 거의 그대로 재구성할 수 있는 fact sequence
- 원문 문장순서와 1:1 대응하는 JSON
- source-specific embedding
- perceptual hash 또는 stable fingerprint가 source retrieval에 쓰일 수 있는
  장기 인덱스
- 문제번호별 full AI solution cache
- prompt/response pair

#### D3 — learner-authored body

- 사용자가 직접 쓴 답안·목차·계산
- 사용자 메모
- 이의제기와 reflection

D3 안에 원문을 복사한 구간이 섞일 수 있으므로 source-expression scrub을
통과하기 전에는 persistent eligible이 아니다.

#### D4 — non-reconstructable learning signal

- concept ID
- closed error code
- assistance/exposure class
- correctness/rubric dimension state
- time bucket
- next action code
- mastery/weakness projection input

#### D5 — bodyless operational metadata

- opaque request ID
- rights mode
- route/model/policy version
- byte-size bucket
- status and timestamps
- deletion receipt
- latency/cost/token count
- blocked reason code

### 3.2 persistence matrix

| Data class | client memory | optional local encrypted vault | raw processor memory | persistent server | provider |
| --- | ---: | ---: | ---: | ---: | ---: |
| D0 | yes | explicit opt-in only | bounded request lifetime | **never** | only approved exact route |
| D1 | yes | explicit opt-in only | bounded request lifetime | **never** | only approved exact route |
| D2 | bounded | default no | bounded request lifetime | **never in transient mode** | no cache/training |
| D3 | yes | yes | needed portion only | default bodyless; scrubbed policy exception | needed portion only |
| D4 | yes | yes | yes | yes, private scoped | no need by default |
| D5 | yes | n/a | yes | yes | provider’s own usage metadata may exist |

### 3.3 prohibited fields

`transient_personal_study` persistent schema에는 다음 이름 또는 의미의 field를
두지 않는다.

```text
raw_image
source_image
thumbnail
ocr_text
question_text
question_body
source_excerpt
prompt_body
provider_request
provider_response
full_explanation
answer_cache
source_embedding
vector
page_snapshot
source_url_to_uploaded_copy
```

이름을 바꿔 우회하는 것도 금지한다. schema linter는 semantic annotation과
sample payload를 함께 검사한다.

### 3.4 persistability decision

```ts
type PersistabilityDecisionV1 = {
  dataClass: SourceDataClassV1;
  rightsMode: SourceRightsModeV1;
  targetPlane:
    | "none"
    | "client_local_vault"
    | "learner_private_evidence"
    | "licensed_source_vault"
    | "cleared_shared_bank";
  allowed: boolean;
  transformationRefs: string[];
  reasonCodes: string[];
  policyVersion: string;
  basisChecksum: string;
};
```

model output이나 client가 `allowed=true`를 제출하지 않는다. trusted policy가
rights mode, data class, target plane과 transformation evidence로 계산한다.

---

## 4. 물리적 아키텍처와 capability separation

### 4.1 네 개의 실행영역

```text
1. Client Capture Zone
2. Ephemeral Source Zone
3. Persistent Evidence Zone
4. Licensed Content Zone
```

#### Client Capture Zone

- camera, crop, rotation, page-boundary detection
- PII redaction
- one-item segmentation
- local OCR baseline
- source-expression minimization
- local encrypted vault

#### Ephemeral Source Zone

- raw payload decrypt/parse
- ephemeral OCR fallback
- prompt compile
- exact provider call
- output firewall
- source-scrubbed projection build
- deletion receipt

#### Persistent Evidence Zone

- auth and learner scope
- bodyless episode/assistance/exposure/timer events
- D4/D5 learning record
- Review Queue and projections
- no raw-source read or write capability

#### Licensed Content Zone

- signed rights manifest
- source vault, OCR revisions, RAG and cache only as exact license permits
- separate storage namespace, keys, tables and service accounts

### 4.2 raw processor privilege contract

`EphemeralSourceProcessor`에는 다음 credential이 없다.

- Supabase Storage write/list/delete
- Vercel Blob or generic object-store credentials
- general PostgreSQL connection string
- Redis durable data credentials
- analytics write key
- session replay SDK key
- error tracker attachment/body upload
- queue producer credential
- email/support attachment credential
- model training/eval upload credential

허용 egress:

- approved model endpoint
- narrow `ReceiptWriter` RPC
- narrow `EvidenceProjectionWriter` RPC
- key management/decryption endpoint when required
- health and bodyless metrics endpoint

`ReceiptWriter`와 `EvidenceProjectionWriter`는 closed schema 외 arbitrary
string, byte array, nested free text와 URL을 거부한다.

### 4.3 persistent service는 raw를 받지 않는다

Persistent Evidence API의 route에는 image/PDF/file upload parser를 설치하지
않는다. raw bytes를 보내면 content-type과 payload scanner에서 4xx로
거부한다. 이는 accidental endpoint reuse를 막는다.

### 4.4 deployment placement

UI가 Vercel에 있더라도 raw processor를 같은 runtime에 둬야 한다고
가정하지 않는다. 선택한 platform이 다음을 문서와 test로 닫지 못하면 raw
processor를 그곳에 배치하지 않는다.

- request-body logging 여부
- ingress/body buffering과 persistence
- temporary disk behavior
- crash/core dump
- APM/session replay
- support access
- backup/snapshot
- data region and subprocessors
- process teardown semantics

platform이 원문 비보관을 증명하지 못하면 on-device path 또는 별도 검증된
processor로 제한한다.

### 4.5 application-layer envelope encryption

TLS는 필수다. 추가로 ingress·edge·debug 계층의 plaintext 노출을 줄이기 위해
application-layer encrypted envelope를 사용할 수 있다.

```ts
type EncryptedSourceEnvelopeV1 = {
  sessionRef: string;
  keyVersion: string;
  algorithm: "HPKE_APPROVED_PROFILE";
  nonce: string;
  ciphertext: string;
  aadDigest: string;
  contentTypeCode: "jpeg" | "png" | "webp" | "utf8_text";
  byteLength: number;
};
```

- encryption은 raw persistence를 허용하는 면허가 아니다.
- ciphertext도 기본적으로 persistent store에 쓰지 않는다.
- processor 안에서만 decrypt하고 plaintext를 log/error에 넣지 않는다.
- exact crypto profile과 key lifecycle은 별도 security Work에서 검증한다.
- custom crypto를 즉흥 구현하지 않고 검증된 library와 KMS/HSM boundary를
  사용한다.

---

## 5. end-to-end pipeline

### 5.1 Stage 0 — client policy bootstrap

앱은 signed `EphemeralSourcePolicyManifestV1`을 받아 다음을 확인한다.

```ts
type EphemeralSourcePolicyManifestV1 = {
  policyVersion: string;
  acceptedMimeTypes: ("image/jpeg" | "image/png" | "image/webp")[];
  maxImageCount: 1;
  maxPageCount: 1;
  maxBytes: number;
  maxPixels: number;
  sessionTtlSeconds: number;
  allowedProviderRouteRefs: string[];
  localOcrRequiredWhenAvailable: boolean;
  answerKeyProcessingAllowed: false;
  pdfAllowed: false;
  batchAllowed: false;
  backgroundAllowed: false;
  rawPersistenceAllowed: false;
  manifestDigest: string;
};
```

manifest signature 또는 version이 invalid/stale이면 촬영 처리 버튼을 열지
않는다.

### 5.2 Stage 1 — local capture and minimization

기기에서 다음을 수행한다.

1. 한 문항 영역 crop
2. 인접 페이지와 불필요한 여백 제거
3. 얼굴, 이름, 수험번호, 전화번호, 이메일, QR/barcode 후보 마스킹
4. 다중 페이지·답지·연속 페이지 후보 탐지
5. 가능한 경우 OCR
6. subject, task type과 user answer를 별도 channel로 분리
7. source text를 instruction이 아닌 untrusted data로 태깅

원본 camera roll 저장은 OS 선택이며 답안길 cloud 저장과 별개다. 앱 내부
임시 파일은 response 또는 cancel 뒤 제거한다. service worker와 browser
cache가 source request/response를 cache하지 않도록 한다.

### 5.3 Stage 2 — source session authorization

Client는 원문 없이 metadata-only session을 요청한다.

```http
POST /api/v1/ephemeral-source/sessions
Content-Type: application/json
Idempotency-Key: <opaque>
```

허용 payload 예시:

```json
{
  "declaredSourceClass": "commercial_book",
  "subjectAdapter": "appraiser_second_practical",
  "inputKind": "single_camera_item",
  "imageCount": 1,
  "pageCount": 1,
  "byteSizeBucket": "1m_to_4m",
  "requestedMode": "attempt_first"
}
```

금지 payload:

- title free text
- OCR
- question number
- source URL to illegal copy
- image base64
- answer key text

서버는 rights mode, abuse window, provider availability와 policy version을
평가해 short-lived token을 발급한다.

```ts
type EphemeralSourceSessionV1 = {
  id: string;
  learnerScopeRef: string;
  rightsDecisionRef: string;
  rightsMode: "transient_personal_study";
  status:
    | "authorized"
    | "processing"
    | "completed"
    | "blocked"
    | "failed"
    | "expired";
  policyVersion: string;
  providerRouteDecisionRef: string;
  issuedAt: string;
  expiresAt: string;
  maxBytes: number;
  maxImageCount: 1;
  rawPersistentWritesAllowed: false;
};
```

### 5.4 Stage 3 — direct encrypted ephemeral submission

```http
POST /ephemeral/v1/process
Authorization: Ephemeral <single-use-token>
Content-Type: application/octet-stream
Cache-Control: no-store, private, max-age=0
Pragma: no-cache
```

- token은 single-use이며 learner scope·policy·route·size에 결속한다.
- query string, filename과 header에 source text를 넣지 않는다.
- multipart parser가 disk temp file을 만드는 platform에서는 사용하지 않는다.
- request read가 끝나기 전에 content-length, decompression bomb와 pixel limit을
  검증한다.
- 서버 retry middleware와 automatic request replay를 끈다.

### 5.5 Stage 4 — ephemeral decrypt, validation and OCR

processor는 request scope의 memory arena에서만 다음을 수행한다.

- envelope authentication
- MIME magic-byte verification
- one-page segmentation
- malware/decompression-bomb defense
- PII redaction verification
- answer-key/high-risk classifier
- local OCR result가 있으면 validate; 없을 때 approved ephemeral OCR
- prompt injection data labeling

validation fail이면 provider를 호출하지 않고 buffer reference를 release한다.

### 5.6 Stage 5 — source-expression minimization

원격 모델 품질을 유지하면서 source 표현 전송량을 줄이기 위해 두 route를
구분한다.

#### Route E1 — minimized structured reasoning, 기본 우선

```ts
type MinimizedProblemRepresentationV1 = {
  subjectAdapter: string;
  taskType: string;
  demandCodes: string[];
  numericFacts: Record<string, number | string>;
  legalOrRuleRefs: string[];
  relationshipGraph: ClosedProblemRelationV1[];
  learnerCommitment?: ClosedLearnerCommitmentV1;
  excludedSourceExpression: true;
  minimizationPolicyVersion: string;
};
```

- 고유 문장, 서사, 비유와 불필요한 표현을 제거한다.
- 사실·숫자·요구·관계만 보낸다.
- 표현을 제거하면 문제 의미가 손상되는 서술형에서는 E1을 억지로 사용하지
  않고 E2 eligibility를 평가한다.

#### Route E2 — full transient context, 예외

- exact provider route가 contractually approved zero-content-retention class
- endpoint/model/capability가 eligible
- `store=false` 또는 equivalent 강제
- persistent conversation, file object, assistant/thread/vector store 없음
- background/batch/prompt caching 없음
- written legal review가 이 exact flow를 허용

하나라도 없으면 E2는 block한다.

### 5.7 Stage 6 — learner attempt binding

기본은 `attempt_first`다.

- AI full solution 전 learner commitment 또는 explicit guided exit를 요구
- user answer는 source와 분리된 channel
- pre-feedback confidence와 assistance/exposure를 bodyless event로 먼저
  기록할 수 있음
- bodyless event commit이 실패하면 full output을 release하지 않음

`guided_study`는 v8/v9의 assistance/exposure 제한을 그대로 유지한다.
저작권 방화벽이 학습 evidence 규칙을 완화하지 않는다.

### 5.8 Stage 7 — provider call

Provider request builder는 다음을 강제한다.

```ts
type EphemeralProviderRequestV1 = {
  routeRef: string;
  routePolicyVersion: string;
  retentionClass:
    | "on_device"
    | "contractual_zero_content_retention_with_disclosed_exceptions";
  modelRef: string;
  synchronous: true;
  store: false;
  background: false;
  cache: false;
  trainingOptIn: false;
  tools: [];
  persistentConversationRef?: never;
  fileObjectRef?: never;
  vectorStoreRef?: never;
  requestDigest: string;
};
```

- web search, remote MCP, code interpreter, file search와 third-party tools를
  raw-source episode에서 기본 금지한다.
- model SDK debug logging을 disable한다.
- provider request ID는 bodyless receipt에 남길 수 있지만 provider console의
  content retention 상태와 연결해 audit한다.
- timeout 뒤 server-side retry하지 않는다. 사용자가 원하면 새 session에서
  다시 전송한다.

### 5.9 Stage 8 — output copyright firewall

provider output은 즉시 learner에게 보내지 않는다.

검사 순서:

```text
schema validation
→ unsupported-source/answer-key imitation scan
→ input/output overlap scan
→ prohibited publisher-style request scan
→ question restatement removal
→ factual/deterministic validation
→ Dabangil independent structure rewrite
→ release or block
```

### 5.10 Stage 9 — transient explanation packet

```ts
type EphemeralExplanationPacketV1 = {
  sessionRef: string;
  rightsMode: "transient_personal_study";
  questionRestatement?: never;
  solutionDirection: string;
  steps: EphemeralExplanationStepV1[];
  keyConcepts: EphemeralKeyConceptV1[];
  learnerGapFeedback?: string;
  repairAction: string;
  nextActionProjection: PersistableNextActionV1;
  sourceOverlapDecisionRef: string;
  persistenceEligibility: "client_only";
  expiresWithSession: true;
};
```

이 packet은 server DB의 `ExplanationPacketV2`로 insert하지 않는다. client에
stream한 뒤 processor reference를 release한다.

### 5.11 Stage 10 — persistent learning projection

full packet에서 closed, non-reconstructable evidence만 추출한다.

```ts
type PersistableLearningProjectionV1 = {
  learnerScopeRef: string;
  tutorEpisodeRef: string;
  rightsMode: "transient_personal_study";
  subjectAdapter: string;
  conceptRefs: string[];
  demandCodeRefs: string[];
  diagnosticCauseCodes: DiagnosticCauseCodeV1[];
  rubricDimensionStates: ClosedRubricDimensionStateV1[];
  assistanceSnapshotRef: string;
  exposureSnapshotRef: string;
  attemptQualification: "independent" | "assisted" | "ineligible";
  repairTaskKind: "rewrite" | "recalculate" | "recall" | "verified_variant";
  nextActionCode: string;
  duePolicyRef?: string;
  sourceExpressionPresent: false;
  arbitraryFreeTextPresent: false;
  projectionPolicyVersion: string;
  projectionChecksum: string;
};
```

초기 strongest mode에서는 arbitrary free text를 persistent projection에 넣지
않는다. learner answer와 full feedback은 local vault에 둔다.

후속 legal/privacy review가 `source_scrubbed_learner_body`를 허용하는 경우에도
별도 schema, overlap scanner, manual delete와 retention을 요구한다. 그 경로는
이 v10의 최소 acceptance가 아니다.

### 5.12 Stage 11 — release and zero-reference sequence

권장 순서:

```text
1. output firewall pass
2. bodyless assistance/exposure transaction commit
3. source-scrubbed learning projection commit
4. client response stream complete or client disconnect recorded
5. provider stream closed
6. OCR/image/prompt/output references released
7. worker memory arena destroyed/process recycled when policy requires
8. deletion receipt committed
9. session terminal state committed
```

client disconnect가 발생해도 source를 recovery queue에 넣지 않는다. full
output 재전송을 위해 server cache를 만들지 않는다.

### 5.13 Stage 12 — deletion receipt

```ts
type EphemeralDeletionReceiptV1 = {
  sessionRef: string;
  rightsMode: "transient_personal_study";
  sourcePersistentWriteCount: 0;
  ocrPersistentWriteCount: 0;
  promptPersistentWriteCount: 0;
  fullOutputPersistentWriteCount: 0;
  objectStoreWriteCount: 0;
  durableQueueWriteCount: 0;
  embeddingWriteCount: 0;
  providerRouteRef: string;
  providerRetentionClass: string;
  memoryReferencesReleasedAt: string;
  processLifecycleEvidenceRef: string;
  bodylessAuditDigest: string;
  policyVersion: string;
  receiptLimitationsCode: "LOGICAL_NO_PERSISTENCE_NOT_PHYSICAL_BIT_ERASURE";
};
```

receipt는 물리적 RAM bit의 완전 삭제를 증명한다고 주장하지 않는다. 대신
애플리케이션이 persistent write를 하지 않았고 참조를 해제했으며 승인된
process lifecycle을 완료했다는 운영증거다.

---

## 6. API contract

### 6.1 allowed endpoints

```text
POST /api/v1/ephemeral-source/sessions       metadata-only authorization
POST /ephemeral/v1/process                   single synchronous source request
POST /api/v1/learning-projections            closed D4 projection only
GET  /api/v1/ephemeral-source/sessions/:id   bodyless status/receipt only
DELETE /api/v1/local-vault-metadata/:id       local locator metadata only, if any
```

### 6.2 forbidden endpoints

```text
POST /uploads/problems
POST /source-files
POST /problem-bank/import
POST /embeddings/source
POST /rag/index
POST /background/source-job
GET  /source/:id/raw
GET  /problem/:book/:number/answer
```

transient source에는 retrievable source ID가 존재하지 않는다.

### 6.3 response headers

모든 ephemeral response는 최소 다음을 검토한다.

```http
Cache-Control: no-store, private, max-age=0
Pragma: no-cache
Vary: Authorization
X-Content-Type-Options: nosniff
Content-Security-Policy: <strict application policy>
Referrer-Policy: no-referrer
```

브라우저 history, service worker, CDN과 intermediary cache 동작은 separate
acceptance fixture로 검증한다.

### 6.4 idempotency

- session creation은 metadata idempotency 가능
- raw processing은 exactly-once claim을 만들지 않음
- 같은 token의 재사용은 거부
- provider timeout 뒤 raw payload를 server가 replay하지 않음
- client가 재시도하려면 새 session/token으로 local source를 다시 전송
- learning projection과 receipt는 idempotency key로 중복 commit 0

### 6.5 error contract

error response에는 다음을 넣지 않는다.

- OCR excerpt
- model output excerpt
- provider error body containing prompt
- filename or page text
- stack local variable dump
- serialized request

```ts
type SafeEphemeralErrorV1 = {
  code: ClosedEphemeralErrorCodeV1;
  publicMessageCode: string;
  sessionRef: string;
  retryClass: "new_session_allowed" | "blocked" | "support_metadata_only";
  incidentRef?: string;
};
```

support ticket에도 원문 자동 첨부를 금지한다.

---

## 7. client/on-device implementation contract

### 7.1 capture

- camera frame은 user action 전 background upload하지 않음
- one-item crop confirmation
- page count detector
- image dimension and file-size reduction
- EXIF strip
- geolocation metadata strip
- hidden thumbnail/cache review
- clipboard paste도 같은 policy 적용

### 7.2 PII redaction

탐지 후보:

- 이름·서명
- 전화번호·이메일
- 수험번호·학생번호
- 얼굴
- 학원 회원번호
- QR/barcode
- 주소
- handwritten personal memo

자동탐지 confidence가 낮으면 사용자에게 crop/redaction 확인을 요구한다.
redaction 전 source를 cloud에 보내지 않는다.

### 7.3 local OCR

local OCR은 다음 장점이 있다.

- source 표현의 서버 전송량 감소
- 사용자가 잘못 인식된 OCR을 수정 가능
- 구조화 E1 route 사용 가능

다만 local OCR text를 analytics, crash report 또는 browser sync에 넣지 않는다.

### 7.4 local encrypted vault

```ts
type LocalSourceVaultEntryV1 = {
  localId: string;
  sourceCiphertext: Uint8Array;
  explanationCiphertext?: Uint8Array;
  learnerAnswerCiphertext?: Uint8Array;
  localKeyHandleRef: string;
  createdAt: string;
  expiresAt?: string;
  cloudSync: false;
};
```

- WebCrypto/platform keystore 기반
- raw key를 server로 전송하지 않음
- default OFF 또는 명시적 opt-in
- browser sync, iCloud/Google Drive 자동연동 여부를 정확히 고지
- local delete 제공
- 앱 uninstall/OS backup semantics를 과장하지 않음
- cross-device sync는 별도 Work와 법적 검토 전 OFF

### 7.5 service worker/PWA

- source request와 full result에 `cache.put` 금지
- offline queue에 raw request 금지
- Background Sync 금지
- push payload에 source/answer/OCR 금지
- Workbox runtime cache pattern에서 ephemeral route 명시적 exclude
- navigation snapshot/session replay exclude

### 7.6 UI copy

허용:

> 이 문제는 일회성 학습 모드로 처리됩니다. 원본 이미지와 OCR 원문은
> 답안길의 문제은행·서비스 DB·모델 학습자료로 저장되지 않습니다.

provider route가 exact ZDR가 아닌 경우 위 문구만으로 “외부 처리자도
무보관”을 암시하지 않는다. 화면에 route-specific notice를 표시한다.

금지:

- 완벽한 무저장
- 법적으로 무조건 안전
- 절대 아무도 볼 수 없음
- 물리적으로 즉시 완전 삭제
- 출판사 허락 불필요

---

## 8. ephemeral processor implementation contract

### 8.1 memory discipline

- raw body를 generic request logger가 읽기 전에 logging middleware 제외
- whole-body stringify 금지
- immutable copies 최소화
- base64 duplicate 생성 최소화
- temporary file API 금지
- swap/core dump/heap snapshot 정책 검토
- profiler와 debugger OFF
- crash handler가 local variables를 수집하지 않음
- worker lifetime cap
- memory pressure 시 source를 disk spill하지 않고 request block

### 8.2 branded non-serializable types

```ts
declare const ephemeralBrand: unique symbol;

type EphemeralBytes = Uint8Array & {
  readonly [ephemeralBrand]: "EphemeralBytes";
};

type EphemeralOcrText = string & {
  readonly [ephemeralBrand]: "EphemeralOcrText";
};

type PersistableClosedCode = string & {
  readonly __persistableClosedCode: true;
};
```

raw wrapper는 `toJSON`, implicit string conversion과 generic logger use를
runtime에서 throw하도록 구현할 수 있다. compile-time brand만으로 안전을
주장하지 않고 runtime sink guard와 integration test를 함께 둔다.

### 8.3 sink guard

모든 persistent sink는 다음 API를 통과한다.

```ts
persist<T extends PersistableSchema>(value: T): Promise<PersistReceipt>;
```

`EphemeralBytes`, `EphemeralOcrText`, arbitrary Buffer, long free text와
unclassified object는 compile/runtime에서 거부한다.

### 8.4 egress allowlist

raw processor에서 DNS/HTTP egress는 approved provider hostname과 narrow
internal RPC만 허용한다. webhook, arbitrary URL fetch, telemetry collector와
remote MCP는 차단한다.

### 8.5 no background execution

- no queue enqueue
- no cron
- no batch
- no workflow continuation carrying source
- no deferred retry
- no durable agent state
- no thread/conversation object
- no temporary upload object

긴 모델 호출이 필요하더라도 synchronous connection budget 안에서만
처리하거나 block한다. background mode로 quality를 유지하지 않는다.

---

## 9. provider retention registry

### 9.1 provider route object

```ts
type ProviderRetentionClassV1 =
  | "on_device"
  | "contractual_zero_content_retention_with_disclosed_exceptions"
  | "limited_security_retention"
  | "training_or_human_review_possible"
  | "unknown";

type ProviderRouteRegistryEntryV1 = {
  routeRef: string;
  provider: string;
  accountOrProjectRef: string;
  endpoint: string;
  modelAllowlist: string[];
  capabilityAllowlist: string[];
  retentionClass: ProviderRetentionClassV1;
  trainingUse: "no" | "opt_in_only" | "possible" | "unknown";
  applicationStateRetention: string;
  abuseOrSafetyRetention: string;
  exceptionalRetentionConditions: string[];
  humanReviewConditions: string[];
  dataRegionRefs: string[];
  subprocessorRegistryRef: string;
  dpaRef: string;
  contractEvidenceRefs: string[];
  checkedAt: string;
  expiresAt: string;
  policyDigest: string;
  status: "eligible" | "blocked" | "stale";
};
```

### 9.2 transient route eligibility

기본 hard gate:

```text
on_device
OR
contractual_zero_content_retention_with_disclosed_exceptions
+ exact endpoint/model eligible
+ no persistent application state
+ no background/batch/file/vector/conversation state
+ training use no
+ written legal approval
```

`limited_security_retention`, `training_or_human_review_possible`, `unknown`은
무라이선스 full-source route에서 blocked다.

### 9.3 OpenAI checkpoint — 2026-08-05

공식 API data-control 문서는 다음을 별개로 다룬다.

- API data는 기본적으로 model training에 사용되지 않음
- 일반 abuse-monitoring log는 endpoint에 따라 최대 30일일 수 있음
- Zero Data Retention은 승인과 설정이 필요하며 endpoint/capability별 eligibility가
  다름
- Responses API는 기본 application state retention이 있을 수 있고 ZDR에서
  `store=false`가 강제됨
- background mode는 polling을 위해 disk에 잠시 저장하며 ZDR 호환 경로로
  취급하면 안 됨
- Assistants, Threads, Conversations, Vector Stores와 Files에는 별도 persistent
  state가 있음
- image/file input에는 safety classifier가 특정 위험을 감지할 경우 ZDR에서도
  manual review를 위한 예외 보관 가능성이 명시됨

따라서 “OpenAI API는 학습하지 않는다”만으로 transient route를 승인하지
않는다. 조직·project 설정, endpoint, model, capability와 예외를 deployment
시점에 다시 확인한다.

### 9.4 Gemini checkpoint — 2026-08-05

공식 Gemini API terms는 다음을 구분한다.

- unpaid service는 입력·출력을 제품 개선에 사용하고 human reviewer가 처리할
  수 있음
- paid service는 제품 개선에 사용하지 않지만 policy 위반 탐지·안전·법적
  요구를 위해 limited period logging이 있을 수 있음

따라서 unpaid route는 blocked다. paid route도 자동으로
`contractual_zero_content_retention`이 아니며, 별도 계약상 zero-content-
retention이 닫히기 전에는 `limited_security_retention`으로 분류한다.

### 9.5 policy drift

- registry entry는 expiry를 가짐
- provider terms/docs hash 또는 model eligibility가 바뀌면 stale
- stale route로 새 session 0
- approved route outage 시 retained route fallback 0
- route status는 client notice와 실제 runtime config에 동일 binding
- monthly automated check는 후보를 만들 수 있지만 human/legal approval 없이
  eligible 승격 금지

### 9.6 provider contract responsibility

Provider 계약이 고객에게 입력 권리 보유를 보증하도록 요구할 수 있으므로,
답안길은 end-user checkbox만 믿고 provider에 무제한 원문을 보내지 않는다.
provider terms, source rights mode와 legal rationale를 같은 route decision에
결속한다.

---

## 10. Output Copyright Firewall

### 10.1 목표

원문을 저장하지 않아도 출력이 문제 또는 출판사 해설을 실질적으로
재현하면 분쟁 위험이 남는다. 따라서 output은 별도의 release gate다.

### 10.2 금지 출력

- 문제 지문 전체 또는 장문 재전재
- 선택지 전체 반복
- 출판사 해설의 고유 목차·암기문구·비유·예시 재현
- “책 없이도 전 문항을 볼 수 있는” self-contained answer archive
- source/answer-key 이미지 재출력
- 특정 출판사·강사의 문체 모방
- problem number를 통한 server answer recall

### 10.3 Dabangil output structure

```text
1. 이 문제의 평가목표
2. 사용자가 먼저 잡아야 할 요구와 제약
3. 독자적인 해결 순서
4. 사용자의 답안에서 가장 큰 간극
5. 다시 쓸 한 가지
6. 다음 무도움 확인
```

문제 문장을 그대로 따라가는 해설이 아니라 사용자 사고행동을 중심으로
구성한다.

### 10.4 overlap detection

```ts
type SourceOverlapDecisionV1 = {
  exactLongSpanCount: number;
  normalizedNgramOverlapBand: "low" | "medium" | "high";
  structuralSequenceSimilarityBand: "low" | "medium" | "high";
  sourceRestatementDetected: boolean;
  answerKeyImitationDetected: boolean;
  action: "release" | "regenerate" | "block";
  policyVersion: string;
};
```

- Korean tokenization, punctuation/spacing normalization과 formula exemption을
  별도로 검증
- 법률 조문, 공식 명칭, 수식과 unavoidable technical phrase는 별도 class
- threshold는 보수적 product control이며 저작권법상 bright-line이라고
  주장하지 않음
- input text와 output 모두 memory 안에서 검사하고 overlap artifact를
  persistent 저장하지 않음
- persistent receipt에는 band/action/reason code만 기록

### 10.5 publisher-style requests

다음 요청은 refuse/reframe한다.

- “○○출판사 해설 그대로”
- “답지 문장을 베껴 써줘”
- “이 책 전 문제 정답을 순서대로”
- “사진 여러 장 보내면 합쳐서 문제집 만들어줘”
- “watermark 지우고 저장해줘”

대신 독자적인 개념 설명, 사용자의 답안 첨삭과 한 문항 learning guidance를
제공한다.

### 10.6 output persistence

transient mode full output은 다음 중 하나다.

- client memory only
- explicit local encrypted vault

server는 full output, problem-answer pair와 source-locator answer cache를
저장하지 않는다. support/debug를 위해 output을 복사하지 않는다.

---

## 11. persistent evidence schema

### 11.1 허용 테이블 예시

```sql
create table ephemeral_source_sessions (
  id uuid primary key,
  learner_scope_id uuid not null,
  rights_mode text not null check (rights_mode = 'transient_personal_study'),
  status text not null,
  policy_version text not null,
  provider_route_ref text not null,
  byte_size_bucket text not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  completed_at timestamptz,
  deletion_receipt_id uuid,
  constraint no_raw_content_columns check (true)
);

create table ephemeral_deletion_receipts (
  id uuid primary key,
  session_id uuid not null unique,
  source_persistent_write_count integer not null check (source_persistent_write_count = 0),
  ocr_persistent_write_count integer not null check (ocr_persistent_write_count = 0),
  prompt_persistent_write_count integer not null check (prompt_persistent_write_count = 0),
  full_output_persistent_write_count integer not null check (full_output_persistent_write_count = 0),
  provider_retention_class text not null,
  policy_version text not null,
  limitations_code text not null,
  completed_at timestamptz not null
);

create table learner_evidence_projections (
  id uuid primary key,
  learner_scope_id uuid not null,
  tutor_episode_id uuid not null,
  rights_mode text not null,
  subject_adapter text not null,
  concept_refs text[] not null,
  diagnostic_cause_codes text[] not null,
  rubric_dimension_codes text[] not null,
  assistance_snapshot_ref uuid not null,
  exposure_snapshot_ref uuid not null,
  repair_task_kind text not null,
  next_action_code text not null,
  arbitrary_free_text_present boolean not null check (arbitrary_free_text_present = false),
  source_expression_present boolean not null check (source_expression_present = false),
  projection_checksum text not null,
  policy_version text not null,
  created_at timestamptz not null
);
```

실제 migration은 live schema를 조사한 별도 Work에서 작성한다. 위 SQL은
contract illustration이며 이 문서가 migration을 승인하지 않는다.

### 11.2 금지 테이블

```text
transient_source_images
transient_ocr_documents
user_problem_bank
source_embeddings
problem_answer_cache
provider_prompt_archive
full_ephemeral_explanations
raw_debug_payloads
```

### 11.3 database permissions

- raw processor role에 table insert/update/select 0
- ReceiptWriter role은 receipt table의 stored procedure만 execute
- ProjectionWriter role은 closed projection procedure만 execute
- procedure는 JSON arbitrary payload를 받지 않음
- RLS learner scope
- admin UI에서도 raw columns 자체가 없음
- backup에는 D4/D5만 존재

### 11.4 locator metadata

ISBN, book title, page/question number 조합은 exact source를 식별할 수 있으므로
persistent learner history 기본값으로 저장하지 않는다.

허용 후보:

- local-only source locator
- rights registry의 canonical source identity
- abuse 방지를 위한 rotating keyed HMAC, short TTL
- subject/concept coarse metadata

rotating HMAC는 공용 source database를 만드는 데 재사용하지 않고 key expiry
후 장기 linkage가 불가능해야 한다.

---

## 12. logs, traces, analytics and support

### 12.1 bodyless observability

허용 metric:

- request count
- status code
- latency bucket
- byte-size bucket
- provider route/model version
- token count/cost
- rights mode
- blocked reason code
- deletion receipt success

금지:

- request/response body
- OCR excerpt
- filename
- source title in URL/query
- prompt
- provider output
- user answer free text
- screenshot/session replay of capture/tutor surface

### 12.2 logger contract

```ts
type EphemeralOperationalLogV1 = {
  eventCode: string;
  sessionRef: string;
  statusCode: string;
  latencyBucket: string;
  byteSizeBucket: string;
  routeRef: string;
  policyVersion: string;
  occurredAt: string;
};
```

logger API는 arbitrary `message`, `error.stack`, `request`, `response`와
`extra: unknown`을 허용하지 않는다.

### 12.3 error tracker

- request body capture OFF
- breadcrumbs containing OCR/input OFF
- replay/screenshot OFF on capture and result routes
- attachment OFF
- `beforeSend` 또는 equivalent sanitizer에서 unknown field drop
- sanitizer failure 시 event 전체 drop
- source markers를 넣은 hostile test로 verify

### 12.4 APM and tracing

- HTTP span attributes에 URL query/body/header source 0
- model SDK auto-instrumentation의 prompt/response capture OFF
- database statement bind values capture OFF
- log correlation은 opaque session ID만
- trace export fail-open 금지: sanitizer가 불확실하면 trace를 버림

### 12.5 support operations

- “문제 사진 첨부” 버튼 기본 제거
- support agent가 원문을 요구하지 않음
- user가 자발적으로 보내는 경우 별도 support retention/rights notice와
  manual secure channel 필요; 초기에는 금지
- debugging은 synthetic reproduction으로 수행
- incident report는 content-free metadata와 canary marker만 사용

---

## 13. cache, queue, backup and build boundary

### 13.1 cache

금지:

- CDN cache
- server response cache
- React/Next data cache에 raw source/output
- model prompt cache
- Redis body cache
- browser service worker cache
- common question answer cache

`no-store` header만 믿지 않고 cache inventory와 hostile fixture를 검사한다.

### 13.2 queue

raw source, OCR, prompt와 full output을 durable queue에 넣지 않는다.

- no retry queue
- no dead-letter queue containing body
- no background OCR
- no asynchronous evaluator
- no webhook carrying source

bodyless receipt/evidence projection의 queue 사용도 별도 승인 전 synchronous
transaction을 우선한다.

### 13.3 backup and snapshots

persistent plane에 raw가 없으므로 backup에도 raw가 없어야 한다. acceptance는
현재 DB만 검사하지 않고 다음을 포함한다.

- point-in-time recovery snapshot
- object-storage versioning
- Redis persistence/AOF
- log archive
- analytics warehouse
- support export
- CI artifact

### 13.4 build/test artifacts

- real textbook photo를 fixture로 commit 금지
- screenshots, Playwright traces, videos에 real source 금지
- synthetic public-domain or fabricated fixtures only
- failure artifact upload 전에 source-marker scanner
- PR comments/issues에 raw content 금지
- local developer temp directory cleanup

---

## 14. abuse prevention without building a problem bank

### 14.1 limits

- image count exactly 1
- page count exactly 1
- PDF/document/archive blocked
- one active raw session per learner by default
- rate and concurrency caps
- repeated sequential extraction pattern detection
- answer-key and bulk OCR classifier
- account/device abuse signals within privacy policy

### 14.2 short-lived abuse fingerprint

```ts
type RotatingAbuseFingerprintV1 = {
  value: string;
  keyEpoch: string;
  ttlHours: number; // hard ceiling defined by policy
  purpose: "bulk_and_sequence_abuse_only";
  crossUserContentReuseAllowed: false;
  sourceRetrievalAllowed: false;
};
```

- source fingerprint는 daily/short-epoch keyed HMAC
- long-term global equality oracle 금지
- key rotation 뒤 linkage 금지
- raw OCR/perceptual image hash 장기 DB 금지
- abuse score를 문제은행 dedup이나 answer cache에 재사용 금지

### 14.3 coordinated split upload

- multiple accounts sharing same short-lived sequence signal
- page-number progression when voluntarily available client-side
- unusual throughput
- repeated answer-key classifier hits

이 신호는 automated permanent guilt 판정이 아니다. false positive-safe block,
notice와 appeal을 제공한다.

### 14.4 normal study protection

매일 여러 문제를 공부하는 정상 사용자를 단순 수량만으로 차단하지 않는다.
한 문항 중심, user attempt, session spacing, no batch와 no source reuse를
함께 평가한다.

---

## 15. privacy and security

### 15.1 privacy-by-design

- 목적: one-item private tutoring
- 최소수집: source lifetime bounded
- source body not persistent
- provider/subprocessor inventory
- user notice and rights
- delete/export for persistent D4/D5
- PII redaction before remote processing
- CPO/legal/security review

### 15.2 authentication and authorization

- authenticated owner-private first
- single-use session token
- token audience bound to ephemeral processor
- short expiry
- replay protection
- learner scope and rights decision binding
- no source in JWT claims
- token/log redaction

### 15.3 network security

- TLS 1.2+ policy or current approved baseline
- egress allowlist
- no public raw object URL
- no presigned upload URL to object store
- rate limits and WAF rules without body logging
- dependency SSRF protection
- model tool calls disabled

### 15.4 prompt injection

source OCR은 instruction이 아니다.

- policy and content channel separation
- model prompt marks source as quoted untrusted data
- source cannot request secrets, tools, URLs or persistence
- source cannot override no-store/no-training policy
- tool list empty
- output schema validation

### 15.5 secret handling

- provider key only in server secret store
- client never receives provider key
- key rotation
- route-specific project/account
- raw processor secret cannot access persistent source storage
- no secrets in local vault or logs

### 15.6 dependency review

OCR/image/parser/crypto/model SDK마다 다음을 확인한다.

- telemetry default
- temp file behavior
- crash reporting
- license/SBOM
- native binary provenance
- network egress
- cache
- update policy
- uninstall/rollback

---

## 16. legal and operational controls

### 16.1 terms

이용약관에는 최소 다음을 명시한다.

- 적법하게 보유·접근한 자료
- 개인 학습 한정
- 한 문항 처리
- whole-book/PDF/answer-key/illegal scan 금지
- coordinated split upload 금지
- output public distribution/resale 금지
- rights complaint and account action
- AI output accuracy/copyright review caveat

약관은 기술통제를 대체하지 않는다.

### 16.2 copyright notice-and-action

```ts
type CopyrightNoticeCaseV1 = {
  id: string;
  claimantRef: string;
  claimedWorkMetadataRef: string;
  affectedRightsRegistryRefs: string[];
  requestedActionCodes: string[];
  evidenceRefs: string[];
  status: "received" | "under_review" | "blocked" | "resolved";
  receivedAt: string;
  actionedAt?: string;
};
```

원문이 저장되지 않으므로 case에는 user source image를 자동 보존하지 않는다.
대신 future processing blocklist, rights registry, notices와 bodyless session
metadata를 사용한다.

### 16.3 repeat-infringer policy

- repeated whole-book/answer-key/illegal scan attempts
- valid rights notices
- appeal and correction
- proportionate suspension/termination
- policy version and evidence

### 16.4 legal hold

legal hold가 발생해도 과거에 존재하지 않던 raw source를 새로 보존할 수는
없다. hold는 existing D4/D5 metadata와 notice records에 적용한다. 앞으로 raw
retention을 켜는 대신 affected feature를 block한다.

### 16.5 marketing

허용 가치제안:

- 내 답안을 중심으로 교정
- 원문을 문제은행으로 축적하지 않는 개인 튜터
- 개념·오류·다음 행동 중심 학습기록

금지:

- 답지 구매 불필요
- 모든 교재 완벽 해설
- 책 전체 자동 풀이
- 출판사보다 더 좋은 공식 답
- 법적으로 완벽히 안전

### 16.6 publisher companion path

최고 기능은 license로 연다.

```text
book purchase / entitlement
→ Companion Pass
→ signed RightsManifestV2
→ Full Companion mode
→ permitted source storage/search/RAG
→ publisher royalty/usage reporting
```

출판사의 교재 판매와 디지털 companion market을 대체하기보다 결합하는
사업모델을 우선한다.

---

## 17. v8/v9 integration override

### 17.1 Personal Raw Vault

v8의 Personal Raw Vault는 권리별로 나뉜다.

```text
Licensed/User-Owned Raw Vault
- exact rights permit persistent source

Ephemeral Source Plane
- transient_personal_study
- persistent source body 0
```

`private`와 `lawful to persist`를 동일시하지 않는다. 개인 계정 전용이어도
무라이선스 원문은 server raw vault에 저장하지 않는다.

### 17.2 LearningDocument lineage

v8의 일반 계보:

```text
immutable source asset
→ editable OCR/problem revision
→ attempt ...
```

transient override:

```text
client-held source locator
→ ephemeral source session
→ non-persisted interpretation
→ bodyless attempt/evidence projection
→ Review Queue / mastery / weakness / Momentum
```

### 17.3 ExplanationPacket

- licensed/user-authored/open-rights: v8 `ExplanationPacketV2` persistent policy
- transient: `EphemeralExplanationPacketV1`, client-only, session-expiring
- both routes share tutor FSM, assistance/exposure, Trust and answer-reveal policy
- transient route의 full packet absence가 mastery를 자동 약화하거나 강화하지
  않음; qualifying evidence는 bodyless refs로 유지

### 17.4 v9 adaptive follow-up

v9의 bottom action rail과 why-chain은 transient mode에서도 유지한다.

- dynamic follow-up button text는 client-side/full transient packet에서 파생
- persistent server에는 closed action code와 concept ref만 저장
- raw question/explanation text를 Momentum, nudge, notification, analytics에
  복제하지 않음
- reopen 시 local vault 또는 책 재촬영이 없으면 generic concept-level action만
  제공

### 17.5 Measurement Lane

- transient source가 held-out measurement item으로 자동 승격되지 않음
- source rights/validator/variant manifest가 없는 item은 verified transfer 또는
  stable 근거로 사용하지 않음
- user-provided item은 learning episode에만 사용
- official/licensed variant bank가 D+7 measurement를 담당

---

## 18. proposed package boundary

실제 repository path는 live implementation Work에서 조사한다. 전략상 경계:

```text
packages/
  source-rights-router/
    rights-mode/
    rights-manifest/
    capability-policy/

  ephemeral-source-contracts/
    data-classification/
    session/
    deletion-receipt/
    provider-retention/

  source-capture-client/
    crop/
    pii-redaction/
    local-ocr/
    local-vault/

  ephemeral-source-processor/
    ingress/
    decrypt/
    ocr/
    minimization/
    provider-route/
    output-firewall/
    zero-reference/

  evidence-projection-gateway/
    closed-schema/
    persistence-sink-guard/
    idempotency/

  copyright-operations/
    notice-action/
    repeat-infringer/
    rights-blocklist/

  ephemeral-acceptance/
    source-marker/
    sink-inventory/
    fault-injection/
    provider-drift/
```

### 18.1 dependency direction

```text
rights policy
  ↓
ephemeral contracts
  ↓
client + raw processor
  ↓
closed evidence projection
  ↓
existing learner evidence/momentum
```

existing learner packages가 raw-source package를 import하지 않는다.

### 18.2 kill switches

```ts
type EphemeralSourceKillSwitchV1 = {
  globalEnabled: boolean;
  fullSourceRemoteEnabled: boolean;
  minimizedRemoteEnabled: boolean;
  onDeviceEnabled: boolean;
  providerRouteOverrides: Record<string, "enabled" | "blocked">;
  reasonCode: string;
  effectiveAt: string;
  policyVersion: string;
};
```

provider drift, raw leak 또는 legal notice 시 route 단위로 즉시 block한다.

---

## 19. code and schema guardrails

### 19.1 lint rules

- `no-ephemeral-value-to-json`
- `no-ephemeral-value-to-logger`
- `no-ephemeral-value-to-db`
- `no-ephemeral-value-to-object-storage`
- `no-raw-source-in-analytics`
- `no-background-source-job`
- `no-source-prompt-cache`
- `no-transient-explanation-persistence`

### 19.2 migration checker

CI는 persistent schema diff에서 다음을 찾는다.

- prohibited column semantics
- bytea/blob/text/jsonb arbitrary payload in transient tables
- vector/embedding columns
- source URL/image path
- TTL table을 raw storage 우회로 사용하는 경우

TTL이 짧다는 이유로 raw table을 허용하지 않는다. persistent retention 0은
“몇 분 후 삭제”가 아니라 insert 자체 0이다.

### 19.3 infrastructure policy as code

- raw service account에 storage/database/queue deny
- egress allowlist
- debug/replay off
- log sink redaction
- no persistent volume
- no object-store bucket binding
- provider project route allowlist
- policy drift check

### 19.4 canary source marker

synthetic fixture에는 unique markers를 심는다.

```text
DABANGIL_EPHEMERAL_CANARY_<run-id>_<class>
```

처리 뒤 다음을 검색한다.

- DB and PITR snapshot
- Storage and versions
- Redis/cache
- queue/DLQ
- logs/APM/traces/replay
- analytics warehouse
- support tool
- CI artifacts
- provider dashboard/export where contractually available

marker가 하나라도 발견되면 acceptance fail이다.

---

## 20. hostile acceptance matrix

### 20.1 capture and upload

1. two images in one request
2. PDF renamed JPEG
3. ZIP/polyglot file
4. decompression bomb
5. 100MP image
6. EXIF GPS/name
7. adjacent two-page spread
8. answer-key layout
9. illegal-scan watermark
10. source text in filename/query/header

### 20.2 persistence escape

11. OCR library temp file
12. multipart parser disk spill
13. model SDK debug log
14. exception serializes request body
15. Sentry/APM captures local variables
16. service worker caches request
17. CDN caches response
18. Redis retry cache
19. queue/DLQ after timeout
20. object-store fallback on memory pressure
21. database JSON audit payload
22. provider file upload object
23. assistant/thread/vector store creation
24. prompt cache
25. background mode

### 20.3 crash and interruption

26. client disconnect before provider response
27. provider timeout
28. processor crash after OCR
29. processor crash after model output
30. receipt writer unavailable
31. evidence projection writer unavailable
32. network retry middleware replay
33. multi-tab token replay
34. worker scale-down
35. out-of-memory

각 실패에서도 raw persistent write 0이어야 한다.

### 20.4 output infringement controls

36. model restates whole question
37. model copies long source span
38. user requests publisher answer style
39. answer-key image submitted
40. model reproduces answer-key wording
41. official statute/formula unavoidable phrase false positive
42. Korean spacing/punctuation evasion
43. OCR error hides overlap
44. output translated then back-translated to imitate source
45. same book question-number answer recall attempt

### 20.5 cross-user and corpus

46. second user submits same source
47. prior answer cache lookup
48. source embedding creation attempt
49. analytics event receives OCR
50. evaluation dataset exporter selects transient session
51. model-training job selects learner evidence
52. rights promotion tries to reuse transient upload
53. coordinated accounts reconstruct a chapter

### 20.6 provider drift

54. ZDR project flag removed
55. model becomes ZDR-ineligible
56. endpoint application-state policy changes
57. provider adds prompt caching
58. DPA/subprocessor changes
59. paid route falls back to free quota
60. outage fallback selects retained provider

### 20.7 privacy

61. name/phone/student ID in margin
62. handwritten sensitive note
63. QR code
64. face/photo on page
65. minor user account
66. deletion/export request
67. legal notice
68. support agent requests source screenshot

### 20.8 evidence integrity

69. full output view counted as mastery
70. transient user item counted as held-out verified variant
71. same item retry counted as transfer
72. bodyless projection tampered with source text
73. learner answer copied question text into persistent field
74. deletion receipt created before cleanup
75. receipt claims physical bit erasure
76. missing provider route evidence

모든 actionable P0/P1/P2는 0/0/0이어야 한다.

---

## 21. verification layers

### 21.1 E0 static

- type/lint/schema policy
- IAM diff
- route inventory
- provider config snapshot
- no prohibited dependency/config

### 21.2 E1 local synthetic

- fabricated problem images only
- fault injection every stage
- memory/temp directory inspection
- local logs and caches scan

### 21.3 E2 deployed synthetic

- synthetic canary marker through exact deployed route
- all persistent sinks and provider evidence scan
- browser/PWA cache scan
- crash/disconnect/retry

### 21.4 E3 Owner-private rights-safe pilot

초기에는 user-authored or public-domain synthetic-like source만 사용한다.
실제 제3자 상업 교재는 written legal approval 전 사용하지 않는다.

### 21.5 E4 exact real-source Owner decision

필수:

- exact data-flow legal memo
- provider contract and retention evidence
- privacy review
- E0-E3 pass
- current source policy and user notice
- limited one-item Owner-only scope
- incident and kill switch rehearsal

### 21.6 external/commercial

기존 v8 commercial path와 별도 O3/O4/S gates를 모두 통과한다. 이 v10
acceptance만으로 external payment나 learner activation을 열지 않는다.

---

## 22. incident response

### 22.1 incident classes

```ts
type EphemeralIncidentClassV1 =
  | "RAW_PERSISTENT_WRITE"
  | "OCR_OR_PROMPT_LOG_LEAK"
  | "PROVIDER_RETENTION_DRIFT"
  | "OUTPUT_SOURCE_REPRODUCTION"
  | "BULK_EXTRACTION_BYPASS"
  | "CROSS_USER_REUSE"
  | "PRIVACY_EXPOSURE"
  | "FALSE_DELETION_CLAIM";
```

### 22.2 immediate actions

1. global/route kill switch
2. preserve bodyless incident metadata
3. stop new sessions
4. identify affected sinks and time window
5. purge according to provider/platform capability
6. legal/privacy/security escalation
7. rights-holder/user notification analysis
8. root cause and regression fixture
9. written approval before reopen

### 22.3 evidence preservation paradox

incident investigation을 위해 raw source를 새로 복사하지 않는다. 필요한 경우
synthetic marker와 infrastructure metadata로 재현한다. 이미 leaked persistent
copy가 존재하면 counsel-directed containment와 legal hold를 적용한다.

### 22.4 user communication

“삭제 완료”를 과장하지 않는다. 어떤 계층에 얼마 동안 존재했는지, 어떤
조치를 했는지, provider 예외를 포함해 사실대로 설명한다.

---

## 23. implementation roadmap

아래 ID는 strategy placeholder다. live roadmap을 자동 변경하지 않는다.

### CPF-0 — authority and legal design freeze

- Owner decision merge
- v10 merge
- exact legal questions list
- source/right modes
- user notice draft
- provider contract checklist

DoD:

- scope and non-goals closed
- no runtime change
- counsel input packet ready

### CPF-1 — data-classification and sink inventory

- D0-D5 types
- persistence matrix
- all storage/cache/log/queue/provider sinks inventory
- schema/IAM baseline

DoD:

- unknown sink 0
- raw data flow diagram

### CPF-2 — client capture baseline

- one-item crop
- PII redaction
- EXIF strip
- local OCR
- service-worker exclusions
- local vault prototype

DoD:

- source leaves device only after explicit action
- no browser/PWA cache leak

### CPF-3 — isolated ephemeral processor

- separate service identity
- no persistent credentials
- synchronous ingress
- memory/temp-file controls
- closed errors

DoD:

- synthetic canary persistent writes 0
- crash/fault tests pass

### CPF-4 — provider retention registry

- exact contract/docs evidence
- account/project binding
- endpoint/model/capability allowlist
- drift expiry and kill switch
- no fallback

DoD:

- unknown/limited-retention route rejected for full source

### CPF-5 — output copyright firewall

- no-restatement prompt
- overlap detector
- publisher-style refusal
- deterministic validation
- client-only packet

DoD:

- hostile reproduction fixtures pass
- unavoidable formula/statute false-positive policy

### CPF-6 — bodyless evidence integration

- `PersistableLearningProjectionV1`
- receipt writer
- Review Queue/mastery integration
- local/full packet vs cloud/bodyless split

DoD:

- learning loop works without server source/full answer
- transient item cannot become verified measurement item

### CPF-7 — observability and operational hardening

- log/APM/replay sanitization
- support policy
- backup/PITR scan
- CI artifact scan
- incident response

DoD:

- end-to-end canary marker absent from every sink

### CPF-8 — Owner-private synthetic acceptance

- deployed synthetic route
- 76 hostile fixtures
- deletion receipt limitations
- policy drift rehearsal

DoD:

- P0/P1/P2 0/0/0
- all hard gates green

### CPF-9 — legal review and bounded real-source decision

Counsel packet:

- exact sequence diagram
- data classes and retention table
- provider contract/screenshots/config evidence
- user UI/terms/privacy copy
- output samples and overlap controls
- abuse policy
- incident plan
- E0-E8 evidence

DoD:

- written Korean copyright/privacy review
- blocking issues 0 or feature remains blocked
- separate Owner exact-scope authorization

### CPF-10 — publisher companion program

- target publishers
- rights matrix
- Companion Pass contract
- royalty/usage reporting
- source ingest and termination delete

DoD:

- unrestricted full functionality only for signed exact rights

---

## 24. acceptance matrix

| 영역 | 통과 | fail-closed |
| --- | --- | --- |
| rights routing | unknown commercial source → transient | checkbox로 persistent 권리 승격 0 |
| capture | one item, PII redacted, EXIF stripped | PDF/multi-page/answer-key 0 |
| ingress | sync, no-store, no disk spill | platform behavior unknown이면 route 0 |
| processor IAM | persistent store credentials 0 | accidental DB/object-store write capability 0 |
| provider | exact eligible route and current evidence | limited/unknown/free route fallback 0 |
| output | independent structure, overlap pass | source/answer-key reproduction 0 |
| persistence | D4/D5 closed projection only | D0-D2 or arbitrary body 0 |
| logs/trace | bodyless metadata | prompt/OCR/source/answer body 0 |
| cache/queue | none for raw/full output | retry/DLQ/background 0 |
| PWA | no raw cache/sync/push | offline raw queue 0 |
| learning | attempt/scaffold/repair/D+1/D+7 maintained | transient item auto-verified 0 |
| cross-user | no source or answer reuse | same-source cache 0 |
| deletion receipt | honest logical no-persistence evidence | physical erasure overclaim 0 |
| legal ops | terms/notice/repeat policy/counsel | marketing overclaim 0 |
| incident | kill switch and sink scan | route remains live after raw leak 0 |

### 24.1 quantitative hard gates

- raw source persistent write count: `0`
- OCR/prompt/full-output persistent write count: `0`
- object-store source objects: `0`
- source embeddings/vector entries: `0`
- durable source jobs/DLQ entries: `0`
- source markers in logs/traces/replay/analytics/support/CI: `0`
- cross-user source/output reuse: `0`
- provider route with stale/unknown retention: `0`
- PDF/multi-page/answer-key accepted: `0`
- output blocking overlap escapes: `0` in Golden hostile set
- false deletion/zero-risk claims: `0`
- transient user item qualifying as verified held-out transfer: `0`

---

## 25. Definition of Done

### 25.1 strategy DoD

- dated Owner decision
- v10 exact-scope integration
- rights modes and data classes
- complete pipeline/API/provider/output/persistence/ops contracts
- implementation slices and hostile matrix
- official legal/provider sources recorded
- no runtime or Production authority implied

### 25.2 implementation DoD

- source capture feature works end-to-end
- one-item AI tutoring quality is usable
- raw processor has no persistence capability
- full result streams to client and local vault optional
- cloud learning record remains useful with D4/D5 only
- every sink inventory and canary scan pass
- provider route evidence current
- output firewall pass
- incident/kill switch rehearsal
- written legal review

### 25.3 product DoD

사용자는 다음을 경험한다.

```text
책을 펼친다
→ 한 문제를 찍는다
→ 내 답을 먼저 낸다
→ AI의 독자적 설명·첨삭을 받는다
→ 한 가지를 고친다
→ 다음 복습이 남는다
```

답안길 server에는 다음이 남지 않는다.

```text
책 사진
OCR 원문
문제 지문
출판사 답지
원문 prompt
provider full response
문제별 full answer cache
embedding/RAG source
```

server에는 다음만 남는다.

```text
권리모드와 정책버전
bodyless 처리·삭제 receipt
과목·개념·오류·assistance/exposure
repair와 next action
D+1/D+7을 위한 학습 evidence
```

---

## 26. 최종 원칙

1. private는 lawful-to-persist와 같은 말이 아니다.
2. TTL은 no-persistence가 아니다.
3. no-training은 no-retention과 같은 말이 아니다.
4. ZDR은 endpoint·model·capability·exception까지 exact binding해야 한다.
5. raw processor는 정책이 아니라 credential 부재로 저장을 못 하게 한다.
6. 원문은 queue, cache, log, trace, backup과 support에도 들어가지 않는다.
7. full output도 무라이선스 문제별 cloud answer bank가 되지 않는다.
8. user attempt와 학습 evidence는 source expression과 분리한다.
9. output이 원문·답지를 재현하면 입력 비보관만으로 충분하지 않다.
10. 전체 책·답지·분할 추출은 사용자 약속뿐 아니라 기술적으로 막는다.
11. provider drift와 outage는 retained fallback이 아니라 route block을 만든다.
12. 삭제 receipt는 논리적 비보관 증거이며 물리적 bit erasure를 과장하지 않는다.
13. verified transfer는 rights-cleared item bank에서 측정한다.
14. 최고의 사용자 경험은 license/Companion Pass에서 완전히 연다.
15. 법적 방어는 약관 한 줄이 아니라 architecture, evidence와 운영의 일치다.

> **답안길의 장기 자산은 남의 문제집 원문이 아니라, 사용자가 어떤 개념에서
> 왜 막혔고 어떤 교정 뒤 AI 없이 풀 수 있게 되었는지를 보여주는 비복원적
> 학습 증거다.**

---

## 27. official references checked 2026-08-05

### Korean law and guidance

- 국가법령정보센터, 저작권법 제30조·제35조의2·제35조의5
  - https://www.law.go.kr/lsLinkProc.do?lsNm=%EC%A0%80%EC%9E%91%EA%B6%8C%EB%B2%95&lsId=000798&chrClsCd=010202&joNo=003000000%5E003500000%5E003502000%5E003503000&mode=2
  - https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1029423587
- 국가법령정보센터, 저작권법 제102조 온라인서비스제공자 책임 제한
  - https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1025203239
- 한국저작권위원회, 생성형 인공지능 결과물에 의한 저작권 분쟁 예방 안내서,
  2025-06-30
  - https://www.copyright.or.kr/information-materials/publication/research-report/view.do?brdctsno=54252
- 한국저작권위원회, 생성형 인공지능의 저작물 학습에 대한 저작권법상
  공정이용 안내서, 2026-02-26
  - https://www.copyright.or.kr/information-materials/publication/research-report/view.do?brdctsno=55211
- 개인정보보호위원회, 생성형 인공지능(AI) 개발·활용을 위한 개인정보 처리
  안내서 발표, 2025-08-06
  - https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=11410

### Provider terms and data controls

- OpenAI API data controls
  - https://developers.openai.com/api/docs/guides/your-data
- OpenAI Services Agreement
  - https://openai.com/policies/services-agreement/
- Gemini API Additional Terms
  - https://ai.google.dev/gemini-api/terms
- Gemini Developer API pricing/data-use table
  - https://ai.google.dev/gemini-api/docs/pricing

### interpretation rule

Provider pages and law can change. No URL or 2026-08-05 checkpoint is permanent
runtime authority. Every deployment and material route change must re-check the
current official text, exact contract, account/project setting, endpoint/model
eligibility and counsel guidance.
