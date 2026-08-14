# 답안길 Cross-Surface Parity Matrix

- Authority: ULC-0 / Issue #719
- Contract: `dabangil.unified_product_multisurface_launch.v1`
- Target student surfaces: Web, iOS/iPadOS, Android
- Instructor primary surface: Web
- Current runtime authorization: none

## Parity rule

Parity means the same learner outcome, server-authoritative state transition,
support status, source/currentness boundary, assistance classification, and
delete/export effect across all student surfaces. It does not require
pixel-identical presentation or identical native interaction mechanics.

No client may create a surface-local mastery, verified, or currentness truth.
Offline drafts are unsynchronized input until the trusted idempotent server
transition accepts them.

## Final student capability matrix

| Capability | Web | iOS/iPadOS | Android | Delivery stage | Authoritative state/evidence | Current state |
|---|---|---|---|---|---|---|
| Today | required | required | required | WCV-C3, native parity in ULC-M1 | server Today projection | future-gated |
| Review Queue | required | required | required | WCV-C3, native parity in ULC-M1 | durable review state | future-gated |
| Authentication/session | required | required | required | ULC-M1 | trusted server session and tenant boundary | future-gated |
| Push registration | Web policy only | required | required | ULC-M1 | opaque device registration; no private body | future-gated |
| Deep/universal/app link | required | required | required | ULC-M1 | versioned route contract | future-gated |
| In-app account deletion | Web account UI | required | required | ULC-M1, final proof ULC-R1 | server deletion workflow | future-gated |
| Camera capture | browser support | required | required | ULC-M2 | private capture lineage | future-gated |
| PDF/photo share | browser upload | required | required | ULC-M2 | private capture lineage | future-gated |
| Multipage capture | required | required | required | ULC-M2 | ordered capture revision | future-gated |
| Editable OCR confirmation | required | required | required | ULC-M2 | learner-confirmed revision | future-gated |
| Second-round Practice Trusted Repair | required | required | required | C2R-C-P, native parity ULC-M2 | typed Practice validator and durable episode | future-gated |
| Second-round Theory Trusted Repair | required | required | required | C2R-C-T, native parity ULC-M2 | target-scoped Theory validator and durable episode | future-gated |
| Second-round Law Trusted Repair | required | required | required | C2R-C-L, native parity ULC-M2 | exact Law source/version validator and durable episode | future-gated |
| Offline draft | browser-local draft may exist | required | required | ULC-M2 | no mastery before accepted sync | future-gated |
| Idempotent synchronization | required | required | required | ULC-M2 | trusted API receipt/CAS | future-gated |
| Concept Decoder | required | required | required | ULC-K1 | typed learner-error repair object | future-gated |
| Formula Graph | required | required | required | ULC-K1 | typed formula relation object | future-gated |
| Hidden reconstruction | required | required | required | ULC-K1 | assistance-aware exposure/reconstruction | future-gated |
| D+1/D+7 scheduling | required | required | required | WCV-C3 and ULC-K1 parity | server schedule and independent evidence | future-gated |
| Civil Law MCQ | required | required | required | ULC-F1 after S238B | subject source/rights/domain contract | future-gated |
| Economics MCQ | required | required | required | ULC-F2 | subject source/rights/domain contract | future-gated |
| Real Estate Principles MCQ | required | required | required | ULC-F3 | subject source/rights/domain contract | future-gated |
| Appraisal-related Law MCQ | required | required | required | ULC-F4 | exact current Law/source contract | future-gated |
| Accounting MCQ | required | required | required | ULC-F5 | exact standard/version/calculation contract | future-gated |
| Instructor assignment consumption | required | required | required | ULC-I1 | tenant-scoped approved assignment | future-gated |
| Approved instructor feedback consumption | required | required | required | ULC-I1 | explicit instructor approval | future-gated |
| Complete instructor authoring/review console | required, Web-primary | not required | not required | ULC-I1 | tenant-scoped instructor authority | future-gated |
| Learner-specific automatic notes | required | required | required | WCV-C3/ULC-K1 | private learning lineage | future-gated |
| Data export | required | required entry or linked Web flow | required entry or linked Web flow | ULC-R1 | verified complete export | future-gated |
| Answer deletion | required | required | required | ULC-R1 | server deletion receipt | future-gated |
| External Web account-deletion resource | required | linked | linked | ULC-R1 | public durable Web resource | future-gated |
| AI/source/currentness/human-review status | required | required | required | ULC-R1 | same status vocabulary and source version | future-gated |

## Cross-surface invariants

| Invariant | Required result |
|---|---|
| Mastery truth | one server-authoritative state across Web/iOS/Android |
| Assistance | visible cue/explanation remains assisted on every surface |
| Mastery evidence | explanation alone never changes learning state |
| Reconstruction | accepted learner reconstruction may change state under the same validator |
| Independent performance | later independent performance may change state under the same evidence contract |
| Currentness | client cannot set or bypass source-currentness status |
| Verification | client cannot set `verified` |
| Offline | unsynchronized local draft creates no authoritative learning evidence |
| API | critical behavior has a versioned mobile-consumable HTTP contract |
| Secrets | service-role/provider credentials never enter a client |
| Notifications | no answer/OCR/concept/score/private text in payloads |
| Deletion/export | surface entries resolve to the same server-authoritative scope and receipts |
| Support state | `supported`, `limited`, `AI-assisted`, `human-unreviewed`, `source-currentness-required`, or `blocked` is consistent |

## Current authority audit

This matrix is a target contract only. As of ULC-0, ULC-M1 consumes S241A
and ULC-F1 independently consumes S238B. Neither acceptance gate nor mastery
may substitute or transfer across tracks.

- no native app exists under this authority;
- no first-round runtime is authorized;
- no instructor runtime is authorized;
- no public release is authorized;
- no payment is authorized; and
- no row marked `future-gated` may be represented as shipped, supported, or
  active.
