# 답안길 Unified Product & Multisurface Launch Convergence v1

- Decision date: 2026-08-14 KST
- Lead issue: #719 (`ULC-0`)
- Active master: V13 only
- Relationship: mandatory subordinate launch amendment
- Machine contract:
  `config/dabangil-unified-product-multisurface-launch-v1.json`
- Installation-time implementation authority (historical 2026-08-14 state):
  WCV-C2 / C2 / C2R-A / #702
- Current repository selector after the later exact C2R-C-P supersession:
  WCV-C2 / C2 / #717 / C2R-C-T / #703 / authorized_unstarted; operational
  start still requires the validated terminal C2R-C-P merge and receipt
- Current activation: none

## 1. Product convergence

The final public product is:

> 답안길 — 감정평가사 1·2차 통합 합격 운영체계

The public product converges three student surfaces and one Web-primary
instructor workbench around one server-authoritative learner state.

| Audience | Web | iOS/iPadOS | Android |
|---|---|---|---|
| Student | required | required | required |
| Instructor | primary complete workbench | approved assignment/feedback consumption only | approved assignment/feedback consumption only |

The amendment defines the future destination. It does not change the current
learner-facing runtime boundary, which remains second-round-only and
unactivated for public use. First-round, native, and instructor runtime each
require their own later complete vertical and exact gate.

## 2. Public 1.0 capability set

The future free-limited 1.0 is complete only when all of these modules pass
their exact gates:

### Daily command

- Today
- Review Queue

### First-round MCQ

- Civil Law
- Economics
- Real Estate Principles
- Appraisal-related Law
- Accounting

Each subject uses a five-choice learner loop and its own source, rights,
currentness, domain-quality, held-out, and release evidence.

### Second-round Trusted Repair

- Practice
- Theory
- Law

The WCV-C2R serial authority remains controlling for these subject outcomes.
No ULC record may promote PR #716 donor evidence or bypass C2R-A through
C2R-C-L.

### Capture and repair

- camera and PDF capture
- photo/PDF share and multipage capture in the later native outcome
- editable OCR confirmation
- direct repair
- offline draft and idempotent server synchronization in the later native
  capture outcome

### Durable learning

- D+1 and D+7
- transfer and reopening
- learner-specific automatic notes
- Review Queue and Today projection

### Knowledge repair

- Concept Decoder
- Formula Graph
- hidden reconstruction before mastery evidence

### Trust and control

- data export
- answer deletion
- account deletion
- AI/source/currentness/human-review status

## 3. Free-limited launch contract

`ULC-L1` is public and free-limited. It is not a paid beta and does not need a
paid cohort, paid-conversion evidence, or a Founding Beta wave.

The limited supersession is precise:

- the old `privateFoundingBetaBeforePublicS225` rule remains true for the
  commercial S225/O4D route;
- O4D keeps `[S245C, S242V]`, and S225 requires both independent
  `[O4D, WCV-C6]` gates;
- it is false only as a prerequisite for ULC-L1;
- ULC-L1 has no in-app purchase CTA and payment remains false;
- ULC-L1 creates no commercial, retention, efficacy, score-gain, pass-rate,
  or causal claim; and
- market-fit or efficacy uncertainty alone is not a reason to label the
  service beta.

Capabilities expose honest support states:

| State | Meaning |
|---|---|
| `supported` | exact release gates pass for the declared scope |
| `limited` | a declared boundary remains; unsupported scope is not implied |
| `AI-assisted` | AI contributed and the result is not represented as sole human judgment |
| `human-unreviewed` | no qualified human review is claimed |
| `source-currentness-required` | source/date verification is needed before release or reliance |
| `blocked` | release predicate fails closed |

## 4. Separate paid and evidence path

The paid/evidence route begins only after free-limited ULC-L1:

`ULC-L1 → O4W → WCV-C5 → WCV-C6 → separate payment/paid-claim authorization`

This route remains the only future path to payment activation, paid-cohort
claims, retention/commercial-readiness claims, delayed-evidence claims,
efficacy/causal claims, and continuous calibration. Passing ULC-L1 does not
establish any of those states.

The terminal legacy paid launch is deliberately dual-gated. O4D Owner
public-self-serve authority cannot substitute for WCV-C6 paid evidence, and
WCV-C6 cannot substitute for O4D. No gate completion bypasses the other or
authorizes automatic start, learner/payment activation, public release, or
Production activation.

## 5. Multisurface architecture

### Web and API

- Keep the existing root Next.js application.
- Keep Vercel as the Web and trusted HTTP API deployment target.
- Expose every critical mobile-consumable learner operation through a
  versioned trusted HTTP API.
- Do not make framework-private server actions the only mobile contract.

### Native apps

- Expo React Native is the future iOS/iPadOS and Android client framework.
- Expo Router owns native navigation, universal/app links, and deep links.
- EAS Build, Submit, and Workflows own native build/CI/store submission.
- Maestro supplies native end-to-end evidence.

These are future selections, not installed dependencies. The first complete
native learner-outcome PR installs exact versions and provides license,
security, SBOM, lockfile, and rollback evidence.

### Persistence and truth

- Existing Supabase/Postgres remains authoritative persistence.
- Tenant and learner boundaries are enforced on the trusted server and
  database boundary.
- Web and native clients consume one learner-state truth.
- Clients cannot set mastery, verification, or source-currentness state.
- Mobile clients never receive a service-role secret.

### Push and private data

Push payloads contain no raw answer, OCR, concept, score, source-private text,
or other private learner body. A notification carries only the minimal opaque
reference and presentation-safe copy required by an approved notification
contract.

### Prohibited final shapes

- remote-website-only WebView wrapper
- static-exported current server app used as the final native app
- independent Web/mobile mastery stores
- mobile client authority over verified/current/mastery state
- service-role credentials in a client
- private learner content in push payloads
- unversioned mobile access to critical learner behavior

## 6. Recorded future repository shape

The later native implementation may create:

```text
apps/mobile
packages/contracts
packages/domain
packages/api-client
packages/design-tokens
packages/offline-sync
packages/release-contracts
```

This ULC-0 authority creates none of those paths and does not move the Web app
to `apps/web`.

## 7. Complete-vertical dependency graph

Every item is queued, unselected, unstarted, and `automaticStartAllowed:
false`. Terminal C2R-C-L is the entry gate.

| Order | Item | Complete outcome | Sequence dependency and operational prerequisite |
|---:|---|---|---|
| 1 | WCV-C3 | durable evidence, D+1/D+7, transfer, reopening, Ledger, Review Queue, Today | C2R-C-L |
| 2 | ULC-M1 | native install/auth, Today, Review Queue, push registration, deep link, in-app deletion | WCV-C3; operational S241A |
| 3 | ULC-M2 | camera/share/multipage/OCR confirmation/Trusted Repair/offline draft/idempotent sync | ULC-M1 |
| 4 | ULC-K1 | Concept Decoder, precise definition, Formula Graph, hidden reconstruction, scheduling, parity | ULC-M2 |
| 5 | ULC-F1 | Civil Law MCQ on Web/iOS/Android | ULC-K1; operational S238B |
| 6 | ULC-F2 | Economics MCQ on Web/iOS/Android | ULC-F1 |
| 7 | ULC-F3 | Real Estate Principles MCQ on Web/iOS/Android | ULC-F2 |
| 8 | ULC-F4 | Appraisal-related Law MCQ on Web/iOS/Android | ULC-F3 |
| 9 | ULC-F5 | Accounting MCQ on Web/iOS/Android | ULC-F4 |
| 10 | ULC-I1 | Web-primary instructor authoring/review/approval workbench | ULC-F5 |
| 11 | WCV-C4 | final-product Owner proof, red-team, routing and instructional-mode proof | ULC-I1 |
| 12 | ULC-R1 | privacy, disclosure, deletion, store metadata, native evidence and coordinated-release readiness | WCV-C4 |
| 13 | ULC-L1 | free-limited public Web/iOS/Android 1.0, payment false | ULC-R1 |

The two authenticated-acceptance prerequisites are independent: `S241A`
is consumed by `ULC-M1`, and `S238B` is consumed by `ULC-F1`. Neither
acceptance evidence nor mastery substitutes or transfers between tracks.

The roadmap runner continues selecting only WCV-C2 metadata. ULC-0 is not an
active campaign and consumes no writer slot. No framework-only, API-only,
persistence-only, UI-only, or QA-only mandatory PR may appear between these
outcomes.

## 8. Concept Decoder

Concept Decoder repairs the learner's specific error. It is not a generic
summary or a free-standing explanation page.

Each decoder object carries:

1. term and Hanja/English/symbol breakdown;
2. intuitive explanation;
3. precise exam definition;
4. analogy and the analogy's limitations;
5. applicability conditions;
6. common confusions;
7. exam-writing layer;
8. learner-error provenance;
9. retrieval prompts; and
10. D+1/D+7 scheduling.

The object links to the actual attempt/revision/repair lineage without moving
raw private bodies outside their authorized vault.

## 9. Formula Graph

Formula Graph is a typed relation object. Required fields are:

- expression;
- variables;
- units;
- causal direction;
- applicability conditions;
- derived forms;
- rounding and sign constraints;
- common error patterns;
- exact source and version; and
- link to the learner's actual failed attempt.

Free-form formatted text cannot substitute for the typed relation. The graph
must reject unit, sign, rounding, applicability, or source-version ambiguity
before verified release.

## 10. Learning-state evidence

An easy explanation or exposed formula creates no mastery evidence. A visible
cue remains assisted exposure. Only learner reconstruction and later
independent performance may change learning state, under the existing
assistance-aware evidence rules.

This rule is identical across Web, iOS/iPadOS, and Android. A surface-specific
cache or offline draft may not become a second mastery authority.

## 11. Instructor Web workbench

ULC-I1 is one complete Web-primary instructor outcome containing:

- problem authoring;
- rubric and acceptable alternatives;
- source binding;
- class and assignment;
- AI pre-review;
- instructor review queue;
- instructor approval; and
- approved assignment/feedback delivery to student surfaces.

It preserves tenant separation, source/rights controls, explicit instructor
approval, and the rule that instructor approval alone does not promote
tenant content to shared Gold or the Cleared Content Bank. ULC-0 does not
activate ULC-I1 or create an academy pilot.

## 12. Store and compliance gates

Before ULC-L1, ULC-R1 proves:

- in-app account deletion on iOS/iPadOS and Android;
- an external Web deletion resource;
- privacy policy;
- Apple App Privacy declarations;
- Google Data Safety declarations;
- AI-generated/AI-assisted disclosure;
- source/currentness date and human-review state;
- notification privacy;
- least-privilege camera/photo/file permissions;
- an app-review demo account; and
- delete/export verification.

The exact platform mapping is maintained in
`docs/qa/dabangil-store-compliance-matrix.md`.

## 13. Coordinated release manifest

One `DabangilReleaseManifestV1` binds:

| Field | Required binding |
|---|---|
| release identity | release ID and public version |
| source identity | exact git head and tree |
| Web | deployment identity and final gate |
| iOS/iPadOS | bundle ID, version, build, EAS build, final gate |
| Android | package, version, version code, EAS build, final gate |
| runtime contracts | API, evidence, validator versions |
| data | migration-set digest |
| policy | privacy-policy and AI-disclosure versions |
| deletion | verified in-app and external-Web evidence |
| store | metadata digest |
| release | per-surface final gate status |

iOS and Android are approved then held. Web remains gated. A single manual
release command begins the coordinated opening, and all three surfaces must
be available within at most 24 hours.

## 14. Validation and release authority

ULC-0 source validation must prove:

- one active master (V13);
- one ULC-0 lead issue (#719);
- exact preservation of the WCV-C2R object, roadmap block, and 21-row matrix;
- exact preserved installation-time selection WCV-C2/C2/C2R-A/#702;
- exact current repository selector
  WCV-C2/C2/#717/C2R-C-T/#703/authorized_unstarted, with C2R-C-T requiring the
  validated terminal C2R-C-P merge and receipt;
- unique future IDs and resolved dependencies;
- no selected or started ULC stage;
- no O4W/C5/C6 dependency on free ULC-L1;
- the separate paid path still requires all three and a later authorization;
- exactly three public/student surfaces;
- one learner-state authority;
- all current activation flags false;
- deletion on both in-app and external Web paths; and
- a release window of 24 hours or less.

Required checks are documented in
`docs/qa/dabangil-multisurface-launch-validation.md`. The cross-surface module
contract is documented in
`docs/qa/dabangil-cross-surface-parity-matrix.md`.

## 15. Authority-only boundary

ULC-0 changes source authority only. It performs no C2R-A, WCV-C3, native,
first-round, instructor, provider, content, migration, payment, store,
deployment, or Production work. It adds no package or lockfile. It establishes
no technical readiness, market readiness, efficacy, or public availability.

Every later stage requires a fresh exact-main gate and explicit Owner Work.
