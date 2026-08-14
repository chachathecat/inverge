---
document_title: "Owner Decision — WCV-C2 Structural Recovery and Serial Replacement Authority"
status: "owner-decision/approved-source-contract-only"
decision_id: "owner_wcv_c2r_structural_recovery_2026_08_14"
dated: "2026-08-14 KST"
repository: "chachathecat/inverge"
lead_issue: 717
terminal_pr: 716
terminal_pr_merged: false
active_master_plan: "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md"
subordinate_execution_standard: "config/dabangil-appraiser-second-world-class-vertical-v1.json@1.0.8"
unified_program_contract: "dabangil.unified_program.v4"
runtime_authorization: "none"
application_authorization: "none"
real_content_authorization: "none"
learner_activation_authorization: "none"
provider_authorization: "none"
payment_authorization: "none"
production_authorization: "none"
automatic_replacement_start: false
---

# Owner Decision — WCV-C2 Structural Recovery and Serial Replacement Authority

## 1. Decision

PR #716 exhausted its final correction authority and is structurally closed
without merge. WCV-C2 remains incomplete. The PR branch is retained unchanged
as a read-only donor, not as merged authority and not as a source of
main-branch runtime readiness.

Structural recovery tracker #717 is the lead authority record for the exact
serial WCV-C2R replacement chain. The 2026-08-11 C1 delivery decision remains
authoritative for unaffected scope, including V13 supremacy, WCV 1.0.8
subordination, and the global one-writer limit.

No replacement stage starts automatically. Each stage requires a new explicit
Work, a fresh exact-main gate, and the terminal merge of every listed
predecessor.

## 2. Terminal donor state

| Field | Exact value |
|---|---|
| PR | #716 |
| State | closed, Draft, unmerged |
| Head | `ca5193526ab0e1ca2f75660066b5a0da8f668ec1` |
| Tree | `8f470e82e5545f4caddb3d902b08f6a15eb31e48` |
| Base/main | `03a3886de105de104de04672ffaa6507b2ead592` |
| Main tree | `e14c019b8a49c5dca822ea81b95639b09543a668` |
| Final review | `PRR_kwDOSMHn8M8AAAABJhaiDA`, anchored to the exact head |
| Final actionable result | P0/P1/P2 = 0/0/3 |
| Review threads | 21 total; 2 historically resolved; 19 intentionally unresolved |
| Merge | none |
| Replacement tracker | #717 |

The exact-head PR Contract, Risk Gate, Runtime Gate, Fast CI, Full CI, Learner
Loop Health, WCV C2 Runtime, and Vercel checks succeeded on their first fresh
runs. C2 runtime run `31769235665`, job `94671482095`, attempt `1`,
artifact `9207557502`, and digest
`sha256:bd27176ef554c68bfb47869235fa1d81d468d33c54c3921c5a854d86fb780261`
remain donor evidence only. They are not promoted into main and establish no
WCV-C2 completion or runtime readiness.

## 3. Exact supersession

For WCV-C2 recovery only, this decision supersedes:

- the prior atomic #702–#705 single-PR requirement;
- the prohibition on standalone #702 source-only work;
- the prohibition on standalone #714 prerequisite source-only work;
- the designation of #702 as the sole direct C2 implementation lead; and
- any representation of PR #716 as mergeable completion evidence.

The prior decision remains historical and controls unaffected scope. This
supersession does not weaken complete-vertical requirements inside each
runtime-producing replacement stage, bounded review, rights, source,
privacy, evidence, learner-outcome, rollback, or activation gates.

## 4. Authoritative replacement chain

| Order | Stage | Issue | Exact scope | Terminal predecessor |
|---:|---|---:|---|---|
| 1 | C2R-A | #702 | rights-safe source firewall, source-contract only | this authority PR |
| 2 | C2R-B | #714 | cognitive architecture contract, source-contract only | terminal C2R-A |
| 3 | C2R-C-P | #703 | shared tutor kernel plus typed Practice validator | terminal C2R-B |
| 4 | C2R-C-T | #703 | typed Theory target-scope validator | terminal C2R-C-P |
| 5 | C2R-C-L | #703 | typed Law exact source-anchor-version validator | terminal C2R-C-T |
| 6 | C2R-D | #704 | Golden 3 and Owner Gold fixtures | terminal C2R-C-L |
| 7 | C2R-E | #705 | persistence, forced RLS, and server | terminal C2R-D |
| 8 | C2R-F | #705 | API, learner UI, runtime evidence, and terminal closeout | terminal C2R-E |

The sequence is strictly serial. C2R-A and C2R-B are not parallel. #703 cannot
begin before terminal #702 and terminal #714. #704 cannot complete before all
three #703 validator stages terminate. #705 runtime cannot begin before
terminal #702, #714, #703, and #704. #706/C3 remains blocked until terminal
C2R-F merges and therefore terminal #705 is established.

Standalone #702 and standalone #714 are authorized only as the exact
source-contract stages C2R-A and C2R-B. This decision does not start either
stage and does not authorize their implementation in this PR.

## 5. Typed proof obligations

The replacement chain must remove the generic evaluator's three conflated
proof obligations:

1. Practice validates calculation relations, including typed operands,
   operator, result, units, and rounding, rather than disconnected numeric
   presence.
2. Theory validates predicates inside the exact target subject/scope and does
   not borrow positive evidence from another explicit scope.
3. Law validates exact official source, selected anchor, locator/effective
   version, applicable date, currentness, and active blocker state as one
   release predicate.

These validators remain fail-closed and subject-specific. No generic
substring, status-only, or unrelated-scope inference may establish verified
release.

## 6. Regression carry-forward

`docs/qa/wcv-c2-replacement-regression-matrix.md` is the authoritative
carry-forward ledger for all 21 PR #716 review threads. Every row begins
`uncovered`, including the two historically resolved donor threads. No donor
commit, test, CI run, runtime artifact, or thread resolution covers a row in
main.

A future stage may cover a row only when its merged commit contains the named
regression or a stricter exact successor, the matrix records the final test
path, and the matrix records the merged commit.

## 7. Writer, start, and activation boundaries

The maximum remains exactly one merge-producing Work, writing branch, writing
PR, and mutation writer. Read-only inspection may run concurrently; a second
writer may not.

Runner selection is metadata-only. It does not start, reserve, provision,
author, review, or merge a replacement stage. Every stage has
`automaticStartAllowed: false`.

This authority grants no:

- PR #716 correction, rerun, review, reopen, merge, or thread resolution;
- C2R-A implementation;
- C3/#706 implementation;
- learner or provider activation;
- real content, cohort, payment, billing, or Production activation;
- remote Supabase, migration, secret, environment, or deployment mutation; or
- promotion of PR #716 runtime evidence into main.

## 8. Authority-PR acceptance

This source-contract PR may change only docs, config, roadmap, directly
related authority tests, and default test registration. It must contain no
application, trusted-repair runtime, Supabase, workflow, package, lockfile,
provider, prompt, billing, payment, environment, or Production mutation.

Merge requires exact owned-path equality; JSON/YAML parse; roadmap and
authority tests; affected Agent Factory tests; the default Node suite;
typecheck; lint; build when repository contracts require it; `git diff
--check`; fresh exact-head CI; and one final review with actionable
P0/P1/P2 = 0/0/0.

## 9. Resulting state

After this authority PR merges:

- WCV-C2 is still incomplete;
- PR #716 remains closed and unmerged;
- #717 remains the structural recovery tracker;
- C2R-A is the first authorized but unstarted replacement stage;
- every later stage remains dependency-blocked and unstarted;
- #706 remains blocked by terminal C2R-F;
- V13 remains the sole active master;
- WCV 1.0.8 remains subordinate; and
- all runtime, learner, provider, payment, cohort, and Production activation
  remains unauthorized.

## 10. Exact owned-path manifest

This authority PR owns exactly these eleven paths:

1. `roadmap/active-program.yml`
2. `config/dabangil-unified-program-contract.json`
3. `docs/dabangil-unified-program-contract.md`
4. `docs/inverge-master-roadmap.md`
5. `docs/decisions/2026-08-14-wcv-c2-structural-recovery.md`
6. `docs/qa/wcv-c2-replacement-regression-matrix.md`
7. `tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs`
8. `tests/wcv-c2r-structural-recovery-authority.test.mjs`
9. `tests/dabangil-premium-alignment.test.mjs`
10. `tests/s234r-owner-dogfood-private-plane-schedule-amendment.test.mjs`
11. `scripts/run-node-tests.mjs`

No other path is authorized in this PR.
