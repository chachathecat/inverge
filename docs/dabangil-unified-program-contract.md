# 답안길 Post-#650 Unified Program Contract

- Contract version: `dabangil.unified_program.v1`
- Owner decision: `docs/decisions/2026-07-23-post-650-unified-program-reset.md`
- Machine-readable mirror:
  `config/dabangil-unified-program-contract.json`
- Live status and dependencies: `roadmap/active-program.yml`
- Scope: contracts and roadmap only

## 1. Canonical authority

Use this order when sources conflict:

1. a dated Owner decision record for the exact decision it owns;
2. this cross-track unified program contract;
3. `docs/inverge-second-round-final-product-spec.md` and
   `docs/dabangil-second-exam-premium-os.md` for second-round detail;
4. versioned executable/domain contracts for behavior already implemented;
5. `roadmap/active-program.yml` for current primary status, dependencies,
   priority, flat lock group, and WIP;
6. `AGENTS.md` and `config/agent-risk-policy.yml` for operating and risk rules.

Live GitHub and the current tree are authoritative for implemented state.
Attachments, handoffs, issue prose, and old prompts are inputs, not live state.

### Superseded and subordinate map

| Source | Current use |
|---|---|
| 2026-06-25 first-round hard-freeze clauses | Superseded only for Foundation; runtime and exposure gates remain |
| July 16 control plane and execution prompt pack | Historical; never rerun |
| July 22 #644 handoff | Historical; not operational truth |
| Full-Day addendum and paid-beta plan | Inputs subsumed into this contract |
| Attached Post-#650 v3 plan | Owner input; stale live snapshot and embedded prompt are not canonical |
| `docs/inverge-master-roadmap.md` | Historical phase detail below this contract |
| `docs/inverge-product-constitution.md` | Historical kernel detail below this contract |
| `docs/inverge-curriculum-system.md` | Legacy compatibility metadata until a new verified Foundation registry exists |
| `docs/inverge-study-schedule-system.md` | Legacy templates, not first-round runtime authority |
| `docs/inverge-business-model.md` | Target catalog history; activation still gated |
| S222 completion | Academy source-contract history, not live Academy service readiness |
| S223/S224 completion | Historical source/runtime contract acceptance, not current content, commercial, or efficacy readiness |

The scoped supersession does not weaken existing second-round public-launch,
rights, source, legal-version, calculation, privacy, or authority safeguards.

## 2. Product sequence

The critical release path is:

```text
second-round Golden 3 readiness
→ Owner O3 content approval
→ owner-private Golden 3
→ Founding Beta core readiness
→ Owner O4 activation approval
→ Wave A (3–5)
→ Owner O3 Golden 9 rights/reviewer approval
→ Golden 9
→ Wave B/C (10–15, then 20–30)
→ second-round authenticated acceptance
 + separately queued Mineral Cobalt/Figma/home contract readiness
→ Owner O4 public self-serve approval
→ S225 public self-serve acceptance
```

First-round Foundation may proceed in a bounded parallel lane. First-round
runtime, navigation, pricing, learner claims, and public exposure are not
authorized by Foundation.

Both-track begins only after separately proven authenticated first-round and
second-round acceptance. Academy runtime begins only after a named-partner
packet and explicit Owner approval.

The repository still contains legacy first-round compatibility routes and
code. This reset neither audits nor removes them and must not claim runtime
absence. Their presence is not authorization for new activation or exposure.

## 3. Learning execution glossary

`Full-Day` and `Personal Study Ledger` are canonical contracts only. This
reset does not implement either runtime.

`Full-Day` plans against 30–720 available minutes, including explicit
600/720-minute fixtures. It contains zero to three `CoreOutcome` values and
zero or more `ExecutionBlock` values. Planned minutes cannot silently exceed
availability; overflow is reduced, deferred, or dropped with a reason, and
illness/gaps cannot create an unbounded backlog.

`Personal Study Ledger` is the append-only private index of
`LearningDocument` lineage, attempt, assistance, exposure, review, rewrite or
recalculation, and delayed independent evidence. Its raw bodies remain in the
Personal Raw Vault.

### `CoreOutcome`

A learner-visible daily outcome. A day has zero to three `CoreOutcome` values.
It is the only count governed by the Today max-three rule.

### `ExecutionBlock`

A bounded piece of lecture, reading, problem solving, answer production, or
review work. A day has zero or more blocks. Blocks fit the declared time
budget; overflow is reduced, deferred, or dropped with a reason. Finishing a
block alone never changes mastery.

### `LearningDocument`

The learner-owned lineage from source identity and capture through revisions,
attempts, review evidence, biggest gap, next action, rewrite/recalculation,
assistance/exposure events, and delayed checks. Raw content stays in its
authorized private vault. Its service answers, notes, handwriting, and raw OCR
never enter shared content. A separately authored user-owned contribution for
which the user has actual rights is a distinct contribution object that may
use the Section 7–8 Cleared Content Bank path; it never converts, derives
from, or relocates the private `LearningDocument`.

### `ReviewUnit`

A non-billable recovery/scheduling object selected against a minute budget.
It is not a usage credit, price unit, entitlement, or Deep Review Unit.

### `attempt_first`

The learner makes an independent attempt before answer or full-solution
exposure. Any later reveal is append-only exposure history and cannot rewrite
the initial attempt as unseen.

### `guided_study`

This is a canonical contract only; this reset implements or authorizes no
guided-study runtime.

The system records exposure before any hint, explanation, answer, or full
solution, then provides a subject-specific worked explanation, a core concept
record, and a future independent review. It cannot be relabeled
`attempt_first`, independent, unseen, or stable.

### `assistance-aware mastery`

This is a canonical contract only; this reset implements no mastery runtime.
Assistance, exposure, and mastery are separate axes. A supported correction,
hinted success, full-solution view, or supported rewrite cannot establish
stable mastery or held-out readiness. Stable candidacy requires delayed,
independent evidence on an unseen or verified variant and remains subject to
the domain validator.

Gold and held-out datasets have separate IDs, storage/access paths, and
contamination tests.

## 4. Founding Beta commercial hypothesis

The following is an Owner-approved hypothesis, not an activation:

| Field | Hypothesis |
|---|---|
| Product | 답안길 2차 Founding Beta |
| Access | invitation-only |
| Price | 69,000 KRW, VAT included |
| Term | 30 days, no automatic renewal |
| Included meter | 20 `usable_review_unit_v1` |
| Public self-serve | off |
| Activation | requires later O4 packet |

Every account retains one lifetime full-value review before payment.
Payment-first and deliberately degraded free output are prohibited.

### Three disjoint unit contracts

| Contract | Purpose | Billable |
|---|---|---:|
| `ReviewUnit` | learning recovery and scheduling | no |
| `usable_review_unit_v1` | Founding Beta hypothesis meter | only after O4 activation |
| `deep_review_unit` | legacy S219/S220 premium meter | legacy contract only |

There is no alias, balance sharing, conversion, migration, fallback, or silent
substitution among the three.

For `usable_review_unit_v1`, only these hypotheses are defined:

- 10–25 points: 1 unit;
- 40–50 points: 2 units;
- 100 points: 4 units.

Missing points, 26–39 points, 51–99 points, and any other ambiguous value
require an explicit pre-submit estimate/manual decision. The system must not
infer a charge or raise it after the result.

Usage follows `reserve → usable result commit` or `failure release`. OCR
failure, provider failure, release blockers, persistence failure, re-reading,
scheduled review, export, and delete do not commit units. These rules remain
contract-only until an O4-authorized implementation.

## 5. Readiness axes

These states never imply one another:

- `runtime_ready`: authenticated storage, failure, recovery, and isolation;
- `content_ready`: source, rights, answer, and version verification;
- `quality_ready`: Gold and deterministic/AI quality gates;
- `commercial_ready`: payment, entitlement, usage, support, cost, refund, and
  legal readiness;
- `observed_efficacy`: repeated held-out improvement was observed;
- `causal_claim_ready`: an O5-approved design supports a causal claim.

Historical completion of S202–S224 does not make any of these current states
true without fresh evidence.

The roadmap marks S200–S224 with
`completionScope: historical_contract_evidence` and
`currentReadinessEstablished: false`. Their primary `completed` status
preserves history; it is not a current readiness claim.

## 6. First-round Adaptive MCQ Foundation

Foundation owns contracts only:

- official exam notices, subject/rule versions, and taxonomy;
- five subject adapters for 민법, 경제학원론, 부동산학원론,
  감정평가관계법규, and 회계학, all contract-only;
- Q-Net rights evidence per post and per attached asset;
- QTI 3-compatible item/response/scoring shapes without a conformance claim;
- xAPI/Caliper-compatible metadata envelopes without Production telemetry;
- attempt, confidence, elapsed time, answer change, elimination, exposure, and
  assistance events;
- rapid answer grid and private capture contracts;
- five-choice true/false correction and explanation;
- `K/C/A/R/T/G`: knowledge, concept, application, reading, time, and guessing
  causes;
- deterministic accounting/economics checks and versioned Law/K-IFRS status;
- Gold/held-out physical separation and timed/OMR readiness contracts.

Official availability never implies redistribution rights. An item inherits
the most restrictive decision from its source post and asset. Private capture
is `private_personal_use_only`. Resolving its answer or source never changes
that status, and the private capture itself is never promoted. A user may
separately submit an actually rights-owned, separately authored contribution
object under content-contribution consent/contract, rights and O3 review, and
promotion quarantine. That path does not derive from or reclassify the
private capture.

## 7. Data planes

### Personal Raw Vault

User captures, OCR, answers, notes, rewrites, and AI bodies for that user.

### Academy Tenant Vault

Academy problems, rubrics, submissions, instructor edits, and approved prose
for that tenant. Instructor approval alone never creates shared Gold.

### Shared Signal Plane

Only purpose-consented, pseudonymous, non-reconstructive derived signals such
as concept ID, outcome, time, confidence, assistance, exposure, error code,
and delayed recovery.

Existing `SAFE_DERIVED_SIGNAL_KEYS`, key-name sanitizers, and legacy telemetry
are personal-service/legacy metadata only and are not Shared Signal eligible.
Some allow free-text values. A future O2 adapter requires a closed value-level
schema of approved IDs, enums, counts, and buckets, plus purpose consent and
reconstructiveness tests; free text is prohibited.

### Cleared Content Bank

Only rights-cleared official assets, contracted content, owner-created
content, or separately authored user-owned contribution objects after
promotion review. A user-owned contribution requires actual rights and is not
a private service answer, note, handwriting artifact, or raw OCR extraction.

### Model/Eval Registry

Dataset, policy, model, prompt, scheduler, evaluator, held-out, activation,
rollback, and result versions.

Private raw content never automatically enters a shared plane. Before
authorized promotion, private/tenant raw text, corrections, source excerpts,
and reconstructive embeddings are prohibited from Shared Signal, shared
model/eval data, and the Cleared Content Bank. Exported/general cross-vault
equality signals and equality oracles are prohibited. Rights-cleared or
contributed content may exist in the Cleared Content Bank only after the
promotion basis and review below; the sole pre-promotion comparison is the
rights-gated, least-privilege quarantine preflight.

Rights-cleared content may improve shared references and evaluation through
the Cleared Content Bank. Purpose-consented pseudonymous derived signals may
improve scheduling and evaluation through the Shared Signal Plane. Neither
permission creates a path for private raw bodies to enter a shared plane.

Private and Academy fingerprints are domain-separated and vault-scoped.
They are keyed and one-way with vault-specific non-exportable domain keys and
never expose an equality oracle.
Global dedup identifiers are permitted only after material has been promoted
into the Cleared Content Bank. The promotion basis is rights-cleared
official/owner-created/contracted content, or a separately consented
user-owned contribution object meeting the boundary above. O3/review and
quarantine always apply.
Pseudonymous-signal consent alone never permits a global fingerprint or
pre-promotion cross-vault comparison.

One narrow pre-promotion operation is allowed inside rights-promotion
quarantine: after applicable rights prerequisites and, for user-owned
material, content-contribution consent/contract, an access-controlled,
domain-separated, least-privilege internal promotion fingerprint may compare
the candidate with the Cleared Content Bank. It emits only decision metadata,
no equality signal to the source vault, user, or tenant, and creates no global
identifier. A global identifier exists only after promotion.

## 8. Consent, promotion, and quarantine

The Consent/Opt-out Ledger versions purpose, subject, scope, policy, grant,
revocation, and effective time separately for:

1. personal service processing;
2. pseudonymous product-improvement signals;
3. Academy sharing;
4. separately authored, rights-owned content contribution;
5. offline model training.

Opt-out or revocation stops future use for the revoked purpose, including
Shared Signal use, Academy sharing, content promotion, and offline
training/dataset refresh as applicable. Deletion and retention remain
purpose-scoped and follow legal/contractual obligations without silently
authorizing a different purpose.

Rights promotion records source/post/asset identifiers, rights tier, hash,
attribution, answer status, effective version, reviewer, and decision.

Fingerprint/dedup review, conflicting-answer quarantine, poisoning/anomaly
quarantine, and held-out contamination checks occur before promotion. No
online model-weight update from any input is permitted. All permitted
training is offline and requires an exact-scope O5 gate.

## 9. OSS and standards lifecycle

The lifecycle state vocabulary is:

```text
proposed
→ benchmark_only
→ shadow
→ limited_activation
→ active
```

Transition requirements are edge-specific. `proposed → benchmark_only`
requires a pinned version, license/SBOM, model-asset rights where relevant, an
isolated benchmark environment, a fallback adapter, a named owner, and a
tested rollback plan; it requires neither prior performance/comparison
evidence nor an activation gate. Its named owner must still manually select
the queued roadmap item; benchmark entry or execution is never automatic.
`benchmark_only → shadow` requires stage-specific benchmark/comparison
evidence, exact-scope O2 measurement/consent, and the adapter-specific
prerequisites below. `shadow → limited_activation` requires shadow evidence
from the same exact adapter, version, and configuration, plus an exact-scope
O4E approval naming adapter, version/config, cohort, and purpose. Evidence
cannot transfer across adapters, versions, or configurations, and no
transition is automatic.

This reset schedules only
`proposed → benchmark_only → shadow → limited_activation`; its required safety
path then goes to `rollback`. `limited_activation → active` is unscheduled and
not authorized. O4E authorizes limited activation only, never `active`; a
future active transition requires that exact adapter/version/config's
limited-activation evidence, a new roadmap item, and a separate exact-scope O4
approval distinct from O4E.

`rollback` is a direct safety transition from `benchmark_only`, `shadow`,
`limited_activation`, or `active`. Limited activation never has to advance to
active before rollback. Rollback is immediate and fail-safe; it never waits
for a new Owner gate or fresh comparison evidence. Its tested plan must exist
before entering any non-proposed stage. The minimum safety path is therefore
`benchmark_only → shadow → limited_activation → rollback`.

- OpenCV and PaddleOCR start as capture benchmarks.
- QTI 3 and xAPI/Caliper are compatibility targets, not certification claims.
- `ts-fsrs`/`pyBKT` remain `benchmark_only`, with no learner-hidden
  instrumentation, until adapter-specific benchmark/comparison evidence
  exists and the exact-scope O2 measurement/consent gate is approved. Only
  then may they enter learner-hidden `shadow`; `ts-fsrs` additionally requires
  beta evidence and `pyBKT` sufficient closed-schema skill-event data.
- IRT/CAT remains a contract-only offline analysis/simulation lane after
  sufficient independent attempts and contamination-safe held-out data; this
  reset authorizes no IRT/CAT execution. Synthetic or non-personal
  rights-cleared fixtures may be eligible for a separately authorized future
  offline analysis under their source rights; this reset does not authorize
  it. Any learner- or Academy-derived attempt signal instead requires an exact
  O2-approved purpose, purpose consent, a closed non-reconstructive value
  schema, purpose-scoped retention/revocation, and storage in the Shared Signal
  Plane; tenant contract alone is insufficient and raw content is prohibited.
  Any IRT/CAT fitting, training, or dataset refresh requires eligible inputs,
  separate exact-purpose consent, and an exact-scope O5. Any future runtime
  model/parameter/config output starts as a new `proposed` candidate.
- LTI 1.3/H5P waits for a named Academy partner.

`shadow` is observation/comparison only. The native fixed schedule and native
rules remain the sole decision authority. Shadow output cannot change
learner- or Academy-visible output, Today/Full-Day, Review Queue, mastery,
scheduling, recommendations, entitlements, operational decisions, or
persisted product state. The only permitted data write is to the Shared Signal
Plane, and only after exact-scope O2 approval, purpose consent, a pseudonymous
non-reconstructive transform, and an approved closed value-level schema with
no raw content or free text. Purpose-scoped retention applies and revocation
stops future use. The Model/Eval Registry may receive only aggregate, version,
and evidence metadata, never a learner-level record or raw content. Shadow
records cannot influence runtime product behavior. Aggregate, versioned
evidence in the Model/Eval Registry may inform a human Owner gate, but it can
never trigger an automatic transition.

Runtime candidates stay frozen and versioned: `shadow`, `limited_activation`,
and any future `active` candidate never fit, train, or refresh in place.
Before O5, shadow and limited activation are inference/evaluation only and
cannot authorize research use or ground an efficacy claim. O2 and O4E do not
substitute for O5. Any separate offline training or dataset-refresh workflow
requires eligible inputs—purpose-consented pseudonymous non-reconstructive
Shared Signal or promoted Cleared Content Bank material only—separate
exact-purpose consent, and a future exact-scope O5 gate. Direct Personal or
Academy raw content is ineligible. O5 scopes are non-transferable:
training/refresh approval does not authorize research opt-in or efficacy
claims, and vice versa. Online model-weight updates remain prohibited for
every stage and every input.

O5 authorizes only its named offline work, not runtime use. A resulting
model, parameter, or adapter configuration receives a new candidate identity
at `proposed`, a new manually selected queued roadmap item, and no reuse of
completed S270/O4E evidence or gates. It must independently clear
held-out/benchmark evidence, `shadow`, and a new exact-candidate activation
gate; hot-swapping into an existing limited or active adapter is prohibited.
A refreshed dataset instead receives a new dataset identity and independently
clears eligible-input, exact-consent, rights/lineage, quarantine, and held-out
validation. It is a versioned logical manifest over eligible bodies that
remain in the Shared Signal Plane or Cleared Content Bank, not a new durable
body store. Model/Eval stores only version, lineage, and evidence manifest
metadata, never row bodies. An exact-O5 offline workflow may make only a
least-privilege ephemeral materialization with purpose-scoped
retention/deletion; it is deleted when the workflow ends and is never retained
outside the five canonical planes. The dataset has no runtime influence by
itself, and every runtime artifact produced from it re-enters the adapter
lifecycle at `proposed`.

O2 authorizes only its exact measurement/consent scope. Benchmark and shadow
evidence follows O2; any limited activation still requires a separate
exact-scope O4 approval. O4E is that limited-activation gate only and cannot
authorize `active`. Golden 3 O3 approval does not authorize Golden 9, and
Founding Beta O4 approval does not authorize S225 public self-serve.

This reset adds no package, import, provider, model, prompt, or scheduler.

## 10. Academy and both-track gates

Academy requires a named partner, one tenant, named instructors, learner
range, pilot dates, content rights, privacy/data-processing terms, support,
exit/refund owner, tenant isolation evidence, and explicit instructor approval
before learner handoff. AI drafts never auto-send.

Both-track keeps first- and second-round states separate. Bridge concepts do
not transfer mastery. It may begin only after separately proven authenticated
acceptance for both tracks.

## 11. Owner gates

| Gate | Owns |
|---|---|
| O1 | product order, canonical authority, scoped supersession |
| O2 | Production measurement, consent, retention, telemetry |
| O3 | content rights, Gold reviewers, public/shared content |
| O4 | migration, secret, provider, price, payment, real users, flags |
| O5 | randomization, research opt-in, offline training, efficacy claims |

An approval packet states exact scope, non-goals, owner action, evidence,
unapproved safe state, and expiry. O1 is approved only for this reset. O2–O5
remain future gates.

## 12. Roadmap, locks, and WIP

This reset itself is one global-exclusive docs/contracts/roadmap PR with
mutation WIP one. The root/owner agent is the sole mutation writer and
additional agents are read-only auditors. This boundary is manually
Owner-enforced; the flat roadmap runner does not enforce global exclusivity
automatically.

Primary statuses use only runner-supported values. Future gated work is
`queued` with unmet dependencies; it is not marked `blocked` or
`human_decision`, because those values consume WIP.

`program.wipLimit` is two. Shared source-of-truth, schema, auth/RLS, billing,
and other control-plane mutations are serialized at overall WIP one.

The runner enforces only one flat exact-string `lockGroup`. It has no global,
hierarchical, multi-lock, cross-run reservation, or owned-file-overlap
enforcement. Global exclusivity therefore requires dependency ordering or a
manual Owner gate. Prose never claims automatic global enforcement.

Each lock group permits one concurrent writer and zero additional concurrent
writers. Any Work must declare an exact owned-file manifest; overlap is
resolved before mutation. Shared source-of-truth, schema, auth/RLS, billing,
and control-plane mutation remain overall WIP one even when program WIP is
two.

After this reset, exactly these two items are ready:

- `S235A`: second-round owner-private Golden 3 readiness only;
- `S235B`: first-round Adaptive MCQ Foundation only.

Selection is metadata-only. It does not start or reserve either item.

## 13. Brand and home

Mineral Cobalt `#4653A6`, the approved Figma assets, and home work remain
queued. They are not implemented or completed by this reset.
