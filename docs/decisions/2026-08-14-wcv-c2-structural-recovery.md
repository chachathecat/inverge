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
supersession does not weaken complete-vertical requirements inside any
runtime-producing replacement stage, bounded review, rights, source, privacy,
evidence, learner-outcome, rollback, or activation gates. The first two stages
are independently complete source-contract outcomes; the remaining three are
independently deployable, learner-visible subject runtime outcomes, never
horizontal implementation layers.

## 4. Authoritative replacement chain

| Order | Stage | Issue | Exact scope | Terminal predecessor |
|---:|---|---:|---|---|
| 1 | C2R-A | #702 | independently complete rights-safe source-firewall contract | this authority PR |
| 2 | C2R-B | #714 | independently complete cognitive-architecture and typed proof-obligation contract | terminal C2R-A |
| 3 | C2R-C-P | #703 lead; #704/#705 contributions | complete Practice trusted-repair learner outcome | terminal C2R-B |
| 4 | C2R-C-T | #703 lead; #704/#705 contributions | complete Theory trusted-repair learner outcome | terminal C2R-C-P |
| 5 | C2R-C-L | terminal #703/#704/#705 | complete Law trusted-repair learner outcome and WCV-C2 closeout | terminal C2R-C-T |

The five-stage sequence is strictly serial. C2R-A and C2R-B are not parallel.
#703 runtime cannot begin before terminal #702 and terminal #714. C2R-C-P and
C2R-C-T may record explicit acceptance contributions to #703, #704 and #705,
but they cannot close those issues or declare WCV-C2 complete. Only terminal
C2R-C-L may complete #703, #704 and #705, close WCV-C2, and unblock #706/C3.

Standalone #702 and standalone #714 are authorized only as the exact
source-contract stages C2R-A and C2R-B. This decision does not start either
stage and does not authorize their implementation in this PR.

### C2R-C-P complete outcome

The Practice PR must include every changed layer required for an independently
deployable Practice trusted-repair learner outcome: the shared tutor episode
kernel it needs; a typed calculation-relation validator; matching Practice
Golden and Owner-Gold fixtures; persistence, forced RLS, server,
idempotency/CAS, API and learner UI; focused and hostile tests; actual browser
→ Next → Supabase/Postgres evidence; a safe-deferred capability boundary; and
independent rollback. The common runtime substrate may first land only inside
this complete Practice outcome, never as a separate foundation or
persistence-only completion.

### C2R-C-T complete outcome

The Theory PR must include the typed target-scoped predicate validator,
matching Theory Golden and Owner-Gold fixtures, every necessary
persistence/server/API/UI integration delta, complete browser-to-database
evidence, a safe-deferred Theory capability boundary, and rollback that does
not require reverting the merged Practice outcome.

### C2R-C-L complete outcome

The Law PR must include the exact source-anchor-locator/effective-version/
applicable-date validator, matching Law Golden and Owner-Gold fixtures, every
necessary persistence/server/API/UI integration delta, complete
browser-to-database evidence, a safe-deferred Law capability boundary, and
rollback that does not require reverting Practice or Theory. This is the only
stage that may terminally complete #703, #704 and #705 and WCV-C2.

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

A future replacement-stage PR may change only its assigned rows from
`uncovered` to `candidate_coverage_pending_exact_merge`. Each changed row must
record the finding/thread ID, covering stage, covering PR number, exact
regression assertion ID, exact future test path, inherited-regression
obligations where applicable, and receipt policy
`github_exact_head_pinned_squash_merge_v1`. A candidate declaration is not
effective coverage. A stage must not commit its own reviewed head, reviewed
tree, or not-yet-created squash-merge commit when that would make the commit
self-referential.

The exact candidate identity instead exists outside the candidate commit. It
is the covering PR number, exact final reviewed head and tree, fresh check IDs,
final review ID anchored to that head, actionable P0/P1/P2 exactly `0/0/0`,
and the exact covered finding IDs and regression paths in the PR evidence.
Every coverage-producing stage must use an expected-head-pinned squash merge.
If the live PR head differs from the final reviewed head, merge fails closed.
The successful merge operation supplies the resulting merge commit SHA.

After a successful expected-head-pinned merge, the same replacement-stage
Work may publish exactly one machine-readable `MergeCoverageReceiptV1` comment
to Tracker #717. It records at least the receipt version, stage ID, covering
PR, reviewed head and tree, final review ID, merge commit and tree, covered
finding/thread IDs, regression paths, base branch, and merged-at timestamp.
The tracker comment is an index, not an independent source of truth. Live
GitHub verification must prove that the PR is merged, the reviewed head was
the merge input, the live PR merge commit equals the receipt, that commit is
on `main`, its tree is compatible with the candidate evidence, and the final
review and required checks belonged to the reviewed head.

A row is effectively covered only when all six predicates hold:

1. the row contains its exact candidate coverage declaration;
2. the named regression exists and passed on the exact reviewed head;
3. the final exact-head review reported actionable `0/0/0`;
4. the expected-head-pinned squash merge succeeded;
5. the live GitHub merge receipt validates; and
6. the matching Tracker #717 `MergeCoverageReceiptV1` index exists.

No donor test, unmerged candidate, stale review, old CI result, or tracker text
alone creates coverage. A false receipt, mismatched merge commit, stale head,
or missing receipt fails closed.

C2R-C-P owns Practice and common-runtime rows 1, 2, 4, 6, 8, 9, 10, 11, 12,
14 and 19. C2R-C-T owns Theory rows 5, 13, 16, 18 and 20. C2R-C-L owns Law
source/drift/blocker/anchor/version rows 3, 7, 15, 17 and 21. Common rows 1,
4, 6, 8, 11 and 14 first covered in C2R-C-P remain mandatory inherited
regressions in both C2R-C-T and C2R-C-L. All 21 statuses remain `uncovered`.

Terminal C2R-C-L can declare candidate coverage in its own PR, pass fresh
exact-head checks and final review, merge with the reviewed head pinned,
publish its receipt, verify effective coverage for all required rows, and only
then close #703, #704, #705 and #717 and unblock #706/C3. It needs no successor
repository PR. If its receipt cannot be written or validated, the merge remains
factual but the issues stay open and C3 stays blocked pending separately
authorized receipt-only recovery, never a code or bookkeeping PR.

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
- #703, #704 and #705 remain open until terminal C2R-C-L;
- #706 remains blocked by terminal C2R-C-L;
- V13 remains the sole active master;
- WCV 1.0.8 remains subordinate; and
- all runtime, learner, provider, payment, cohort, and Production activation
  remains unauthorized.

## 10. Exact owned-path manifest

This authority PR owns exactly these twelve paths:

1. `AGENTS.md`
2. `roadmap/active-program.yml`
3. `config/dabangil-unified-program-contract.json`
4. `docs/dabangil-unified-program-contract.md`
5. `docs/inverge-master-roadmap.md`
6. `docs/decisions/2026-08-14-wcv-c2-structural-recovery.md`
7. `docs/qa/wcv-c2-replacement-regression-matrix.md`
8. `tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs`
9. `tests/wcv-c2r-structural-recovery-authority.test.mjs`
10. `tests/dabangil-premium-alignment.test.mjs`
11. `tests/s234r-owner-dogfood-private-plane-schedule-amendment.test.mjs`
12. `scripts/run-node-tests.mjs`

No other path is authorized in this PR.
