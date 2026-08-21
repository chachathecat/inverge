# WCV-C3R-A1 Serial Program Authority Validation

## Scope

This ledger validates the source-only C3R-A1 authority that installs
`C3R-P → C3R-T → C3R-L`. It records no runtime, migration, Supabase,
Production, payment, provider or learner operation.

## Read-only start gate

Validated on 2026-08-21 KST before branch creation:

| Observation | Live result |
|---|---|
| `main` SHA | `3a7047cf4c7fc68247137bafbca2434abdadbc7f` |
| `main` tree | `543f8dfb5fdd026c1361e1a502376945912e6c5c` |
| PR #785 | merged, unreverted |
| PR #785 reviewed head | `f7f959368525f8a5895026f1361f6e13fd6226e0` |
| PR #785 reviewed tree | `543f8dfb5fdd026c1361e1a502376945912e6c5c` |
| PR #785 squash merge | `3a7047cf4c7fc68247137bafbca2434abdadbc7f` |
| PR #785 final actionable | P0/P1/P2 `0/0/0` |
| PR #785 unresolved actionable threads | `0` |
| Governed issues | #706/#707/#708/#714/#781 all open |
| Overlapping C3R writer | none |
| Package blobs | `33a8d29b52ac225c6e957c71fce1f28f2eaba16d` / `70f85fb69c39aa73cf572082c4d38eb426c0b398` |
| Remote/Production/payment/learner mutation | `0/0/0/0` |

The live `main-pr-only` ruleset is active, has no bypass actor, permits squash
only, requires review-thread resolution and an up-to-date base, and requires:

1. `pr-contract`
2. `risk-classifier`
3. `runtime-gate`
4. `fast-ci`
5. `full-ci`
6. `full-ci-windows`
7. `Learner Loop Health`
8. `security-audit-sbom`
9. `Vercel`

The open PR inventory contained no WCV-C3R, C3R-A1, C3R-P, C3R-T or C3R-L
candidate. Older unrelated drafts, dependabot PRs and the historical unrelated
PR #67 are not active WCV merge-producing writers and overlap none of this
authority scope.

## Immutable A0 audit

The reviewed-head and current-main Git blobs matched for all four upstream A0
files:

| Path | Git blob | SHA-256 |
|---|---|---|
| `docs/decisions/2026-08-21-owner-wcv-c3r-a0-migration-dependency-authority.md` | `8996f6c61f6cf0c5f7c908e97437a2f24bc65f8f` | `f3be7b829539fa51c9037a58f05ed5a7c3fccbfcae28b3bb7b716330865b2ba6` |
| `config/dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json` | `49916703d0a144647d6abce8cc98971042a35e1c` | `e6e6d741d47732137860c0efc5c0dddc6b75e54fbd0ed6f2b1bcbe88e9f9d8e9` |
| `scripts/automation/wcv-c3r-a0-migration-dependency-closure.mjs` | `23ba3b9f2af452b250cea0cbbbc5f135e8643b2d` | `85751e62c300465b205f5e6d19357261af892a0072e06de2c4322258290fa6ec` |
| `tests/wcv-c3r-a0-migration-dependency-authority.test.mjs` | `04c5e3254ac03712a0fde27ef068329299305c40` | `fa7e388a0f785b41661ac4fff342de7afe9dc05e03dee0e7afb0d3548bc6daaa` |

The unchanged focused A0 suite passed 37/37. It independently validates all
25 migration filenames, exact occurrence/role-specific dependencies,
extension and external-function closure, producer/predecessor ordering, and
the fail-closed UNKNOWN/KNOWN_APPLIED mutation gate. A1 neither invokes nor
duplicates the analyzer.

## A1 graph and state audit

The machine contract is authoritative for these exact edges:

```text
validated A1 merge receipt
  → C3R-P authorized_unstarted
validated C3R-P merge receipt
  → C3R-T eligible to start under a later Work
validated C3R-P + C3R-T merge receipts
  → C3R-L eligible to start under a later Work
```

Issue state, issue closure, branch state, candidate code/tests, closed-unmerged
PRs, donor CI and tracker prose are invalid dependency substitutes. Only
C3R-L may complete WCV-C3, close #706/#707/#708/#781, complete #714 allocation
C3, advance the active selector or publish the terminal receipt. C4 and C6
allocations remain open.

The roadmap keeps WCV-C3 as the queued, selected and unstarted campaign
envelope. Additive C3R fields select only C3R-P as the post-A1 runtime stage;
the generic completed-C2 replacement fields remain historical and unchanged.

## Changed-path ownership

The candidate is limited to the eleven paths declared in the machine
contract. Each has the matching A1-only reason in the Owner decision. The
A0 analyzer/manifest/test, `supabase/migrations/**`, workflows, learner
runtime, package and lockfile remain unchanged.

## Focused hostile coverage

The focused suite rejects at least:

- replacing the A0 or stage receipt with issue closure;
- removing or drifting the exact A0 merge identity;
- swapping Practice and Theory;
- allowing Theory without Practice;
- allowing Law without both Practice and Theory;
- allowing Practice or Theory to close governed issues;
- completing WCV-C3 before Law;
- starting C3R-P in A1;
- weakening Production, remote, payment or learner gates;
- adding another merge-producing writer;
- promoting a donor PR as current evidence; or
- omitting the focused suite from the default runner.

## Validation commands

The final candidate must record actual results for:

```text
node --test tests/wcv-c3r-a1-serial-program-authority.test.mjs
node scripts/run-node-tests.mjs <affected authority suites> --workers=1
node scripts/run-node-tests.mjs --workers=1
npm run typecheck
npm run lint
npm run build
git diff --check
```

Package/lockfile identity, immutable A0 files, changed-path ownership and both
independent hostile audits are blocking. Candidate head/tree, check run IDs,
review ID and merge receipt stay in live PR evidence because committing a
future self-identity would be self-referential.

## Source-freeze results

The pre-publication source freeze completed with:

- focused C3R-A1: `15/15` pass;
- affected roadmap, unified-program, GitHub-delivery, WCV campaign, A0 and
  C2R authority set: `152/152` pass;
- full default Node suite: pass, exit `0`;
- typecheck: pass;
- lint: pass with `0` errors and 11 pre-existing warnings outside the A1
  changed paths;
- production build: pass, including 54/54 static pages, with one pre-existing
  Turbopack whole-project trace warning outside the A1 changed paths;
- `git diff --check`: pass;
- exact 11-path ownership: pass;
- package and lockfile unchanged: pass;
- all four immutable A0 files unchanged at their bound Git blobs and SHA-256
  digests: pass;
- independent stage-graph hostile audit: pass;
- independent authority/mirror hostile audit: pass; and
- local actionable P0/P1/P2: `0/0/0`.

No runtime evidence is claimed because A1 is source authority only.

## Non-claims

Passing this ledger proves only coherent source authority. It proves no
runtime behavior, migration compatibility execution, RLS, storage, API,
learner outcome, content correctness, Production readiness, payment readiness
or activation.
