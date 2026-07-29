# S236B First-Round Capture and OCR Benchmark Evidence

- Evidence date: 2026-07-29
- Reconciled main: `a49b51acef38a9901789b9e2037c5cbbb31605fe`
- Reconciled main tree: `59aa044b3975165e3e612bd9e1d2bb128cd3b7bb`
- S235B contract file:
  `fcc8c806492e5f0f585fc64a68bf9dd5d11167cbf2c63de9a5ee28662eb224b6`
- Result artifact:
  `e17707dac4ee89b2e4263622098923f5de672dee8506097bc0c0bdbb18950a8e`
- Fixture manifest:
  `34f70ca7a4c9e343c840ae11d70f83ccb8e2020269dd47fe48d7c78905939c73`
- Decision: disposable pre-entry run; not accepted S236B evidence

## Start-gate reconciliation

- The branch was five commits behind `main`; the Owner explicitly authorized
  a non-force reconciliation.
- Live `main` was merged without force at the exact commit and tree above.
- S235B is merged #657 plus corrective #658.
- Lane B's `first-capture-benchmark` lock is independent from Lane A.
- Relative to reconciled `main`, only the 19 S236B-owned files differ.

The required S235B entry packet did not exist before execution. The Owner's
fast-iteration authorization permits this accuracy work but does not convert
the run into qualifying S236B gate evidence.

## Candidate identity

| Identity | SHA-256 |
|---|---|
| Candidate set | `68bed995d8e8bd1cb76ec59a8daacbb9423f4b71b69858c3146f07986d068993` |
| Candidate configuration | `f06aff888510e2a5cd71a93c6360a8b52386baa7ab9170927dbaeb9f8ff9b327` |
| Benchmark bundle | `b89a61d6938a51828b13c71585e13ac045dc58bc98559d2096002fa8d3bd82c6` |
| Candidate rows | `8d4f00815be0bc6cd00a089e5695e826fec98ee91acb5490aa166007df3f2021` |
| Runtime component set | `d723a41e8a02496e195bf9851e5eab9d3d6d316d50d2871f8ba9f1d9b154a328` |
| Generator | `995be9eac085be5062455484fbe137ee3f4bc801e62212c85fb4b083e2924952` |
| Runner | `bdbfbb2e3af2a3d64c041071ec424840aefe0c241707736508d0e7e08e691496` |

The scanner inventoried 17 installed distributions. The generator and runner
matched selected installed-distribution inventories and imported module
origins; model hashes were checked before and after inference. Python
executable bytes, native dependency closure, wheel-to-install provenance,
allowlisted `sys.path`, and read-only mount enforcement were not verified.

## Accuracy

The run used 32 synthetic images and 60 fields: 15 calibration and 45 hidden.
Real learner and copyrighted private-content counts are zero. Korean
pseudo-words are sampled only from a closed 70-syllable, author-created set.
The runner receives field count but no risk label, expected value, or expected
coordinates. It uses field count and image aspect ratio to recognize five-row
and 2x2 layouts in visual order.

| Risk | Correct | Miss | Abstain | Total | Accuracy |
|---|---:|---:|---:|---:|---:|
| Negation | 3 | 1 | 0 | 4 | 75% |
| Numbers | 4 | 0 | 0 | 4 | 100% |
| Signs | 0 | 4 | 0 | 4 | 0% |
| Percentages | 4 | 0 | 0 | 4 | 100% |
| Five-choice order | 5 | 15 | 0 | 20 | 25% |
| Law dates | 1 | 3 | 0 | 4 | 25% |
| Tables | 16 | 0 | 0 | 16 | 100% |
| Formulas | 0 | 4 | 0 | 4 | 0% |
| **Overall** | **33** | **27** | **0** | **60** | **55%** |

Candidate-produced structure was observed for all four choice groups and all
four table groups. One choice group and all four table groups were exact.
Ground-truth coordinates were not substituted.

The controlled same-fixture A/B comparison was:

| Runner | Correct | Miss | Abstain | Accuracy |
|---|---:|---:|---:|---:|
| PR #660 pre-change runner | 12 | 12 | 36 | 20% |
| Segmented runner | 33 | 27 | 0 | 55% |

This is a +35 percentage-point change with 36 fewer abstentions. The original
PR evidence was 7/60 (11.6666%) on a different random fixture set and is not
used as the causal A/B baseline.

## Failure taxonomy

The 27 non-correct fields partition into:

| Failure code | Count |
|---|---:|
| `sign_loss_or_flip` | 3 |
| `choice_omission_or_reorder` | 10 |
| `formula_token_or_structure_loss` | 4 |
| `unclassified_review_required` | 10 |
| Every other code | 0 |

Causes are inferred only from supported token differences. Fixture risk labels
are never used as causes. Status failures outrank semantic equality. There was
no process failure or timeout, but per-fixture timeout supervision was absent.

## Latency

Clock: monotonic `time.perf_counter_ns`; CPU; one thread; FP32; batch 1.

| Stage | p50 | p95 | p99 / max |
|---|---:|---:|---:|
| OpenCV preprocess | 25.695 ms | 111.451 ms | 111.895 ms |
| Paddle model-direct | 95.058 ms | 461.085 ms | 475.343 ms |
| End to end | 121.728 ms | 577.082 ms | 589.852 ms |

Model load was 85.039 ms and peak RSS was 388,740 KiB. These are local machine
observations, not public performance claims.

## Held-out and revision boundary

- Runner and authority roots were distinct and non-nested.
- Authority root supplied to runner: false.
- Output committed before evaluator expectation open: true.
- Prior expectation-open exclusion: unverified.
- Post-open retry/tuning counts: unknown (`null`).
- Readiness eligibility: false.
- Original unchanged during revision: true.
- OS write-once enforcement: false.
- Revision storage append-only enforcement: false.
- Locked authenticated expected-head chain: passed.
- Valid second append and edit/truncate/delete/ordinal/predecessor rejection:
  passed.
- Edited revision used for accuracy: false.

This is a native-boundary mechanism test, not verified held-out integrity or a
named-human fallback receipt.

## Supply chain and rights

SBOM self-digest:
`9f1233064bc3047b126224a3c9e993cf1f43a7d904f7d539fd57c95bf2417400`.

Unexpected, missing, and version-mismatched Python distributions are zero.
Native OS/drivers, declared wheel pins for 15 components, verified
wheel-to-install receipts for the two declared pins, an approved vulnerability
snapshot, and named-human license review are missing. All 17 components remain
unresolved; the
forbidden-license count is `null`.

The Korean model and Noto font remain unresolved. Exact source/license
representations and named-human rights approvals are absent. No asset is
redistributed or activated.

## Isolation and rollback

| Identity | SHA-256 |
|---|---|
| Environment | `27472ae2a56db64c43690a49426177cfb70e73eeb105e93b32413bb17d3023c8` |
| Environment configuration | `41f6321f3c6b96b0f260b15e5d477c1e91a8c1ff9213acef98ad5f1a85c24dd9` |
| Rollback target/state | `84e9b2125391f4d68a6f50bac3d0b1d55c41764c464d47cba50ba5d8dada7aaa` |
| Receipt set | `e738ef265c498e3ba21e5cec570f5632e2a456abe00ac6fb626db1add0ec0e93` |

Normal runner and authority roots cleaned with zero residual files and bytes.
The missing-model, network-denial, timeout, and interruption receipts are
generic fault-producer/cleanup probes on proxy roots, not actual candidate
runner or authority failure recovery. Actual pre-evaluator two-root cleanup is
unproven and blocks a qualifying rollback receipt. Every recorded receipt was
outside its target and bound its exact parent, target, root nonce, owner,
producer, scenario evidence, configuration, fixture manifest, and non-metadata
payload.

The preload shim passed IPv4, IPv6, and DNS denial probes. Inherited
descriptors, direct syscalls, kernel/provider isolation, and secret-exposure
absence are not proven. The execution environment inherited non-allowlisted
process variables, so trusted isolation remains open.

These rollback identities were produced by the earlier adapter configuration.
They remain truthful historical evidence, but are not a current signed
coherence receipt for the segmented runner.

## Privacy

The evaluator disabled replacement objects, bound its own repository plus
pre/post HEAD/tree/status identity, scanned the worktree/`.git`, and decoded
all local Git blobs. A protocol log and cache under the runner root were also
scanned. Raw-container canaries and exact raw-artifact byte hashes produced
zero residual matches.

The scan is incomplete:

- protocol-redirection and cache-environment execution bindings remain
  unresolved even when selected bytes scan clean;
- provider/host sink proofs and direct raw-text provenance remain unresolved;
- exact-head GitHub PR/review/check/artifact scans are pending;
- the post-merge GitHub/cache scan is pending.

The evaluator recorded nine unresolved members or sink proofs and required
explicit incomplete-exploratory mode. Complete zero-residual/no-import proof
is false.

## Exact gate status

The contract binds the full S235B 16-input and seven-dimension semantics,
including comparison operators, canonical preimages, derivation specs,
registries, and expiry triggers. All coherence common values remain `null`;
the displayed local hashes are observations, not signed S235B coherence.

No passing packet exists. Rights, supply chain, isolation, held-out, privacy,
named owner/reviewers, root trust, final exact-head CI, and P0/P1-zero hostile
review are missing. Main reconciliation itself is complete.

PR disposition must remain draft and non-mergeable. O3B, S237B, learner
runtime, Production activation, and downstream automatic start remain off.
