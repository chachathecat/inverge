# S236B First-Round Capture and OCR Benchmark Evidence

- Evidence date: 2026-07-24
- Live start: `f28ef275d918c3b6ee2afcd0a393959fd4763fb3`
- Live-start tree: `95d1efcf5e3eed12516fbd58da2dcc81bf604064`
- S235B contract file:
  `fcc8c806492e5f0f585fc64a68bf9dd5d11167cbf2c63de9a5ee28662eb224b6`
- Result artifact:
  `6e28d55b9bedce369b622c9fd4d9cf0c5d087eaa51369df811ab303e8e913cb9`
- Fixture manifest:
  `a9493e825e581f2873dacf4b7f7f1c350e3de95f1798bc6ce9c5ba9d355b6630`
- Decision: disposable pre-entry run; not accepted S236B evidence

## Start-gate reconciliation

- Live `main` matched the requested commit and tree.
- S235B is merged #657 plus corrective #658.
- S236B was queued, with no pre-existing S236B/O3B branch or PR.
- Lane B's `first-capture-benchmark` lock is independent from Lane A.
- Shared roadmap/control-plane files remain unchanged for Lane A priority.

The required S235B entry packet did not exist before execution. This run is
non-qualifying history; it cannot be retroactively authorized.

## Candidate identity

| Identity | SHA-256 |
|---|---|
| Candidate set | `68bed995d8e8bd1cb76ec59a8daacbb9423f4b71b69858c3146f07986d068993` |
| Candidate configuration | `87e2db2aae8fc129d1104916bb83b0a80b23e2128e4eab325c5652782ddc1ee9` |
| Benchmark bundle | `42b440d63b6ac2a7b81147bba3a03d5d4d76c5781abeccded68c8a94fe18107e` |
| Candidate rows | `66218a91b90f95d0282c006fb1107e0827065195bc7ba8d21f1fc2913aa8594e` |
| OpenCV artifact | `6d0ebc2c4134a37aacec364f057e91ba9e2fe1814df1ecc7ee3ed9c9f0cc9b50` |
| Paddle adapter/model path | `b1ef804eb5257af61db8a2a844a5447e7a859870d68d1fd7fbf586b12ac4173e` |

The scanner inventoried 17 installed distributions. The generator and runner
matched selected installed-distribution inventories and imported module
origins; model hashes were checked before and after inference. Python
executable bytes, native dependency closure, wheel-to-install provenance,
allowlisted `sys.path`, and read-only mount enforcement were not verified.

## Accuracy

The run used 32 synthetic images and 60 fields: 15 calibration and 45 hidden.
Real learner and copyrighted private-content counts are zero.

| Risk | Correct | Miss | Abstain | Total | Accuracy |
|---|---:|---:|---:|---:|---:|
| Negation | 0 | 4 | 0 | 4 | 0% |
| Numbers | 2 | 2 | 0 | 4 | 50% |
| Signs | 2 | 2 | 0 | 4 | 50% |
| Percentages | 3 | 1 | 0 | 4 | 75% |
| Five-choice order | 0 | 0 | 20 | 20 | 0% |
| Law dates | 0 | 4 | 0 | 4 | 0% |
| Tables | 0 | 0 | 16 | 16 | 0% |
| Formulas | 0 | 4 | 0 | 4 | 0% |
| **Overall** | **7** | **17** | **36** | **60** | **11.6666%** |

Candidate-produced valid choice and table structure counts were both zero.
Ground-truth coordinates were not substituted.

## Failure taxonomy

The 48 non-correct fields partition into:

| Failure code | Count |
|---|---:|
| `digit_or_decimal_substitution` | 1 |
| `sign_loss_or_flip` | 1 |
| `formula_token_or_structure_loss` | 3 |
| `blank_output` | 36 |
| `unclassified_review_required` | 12 |
| Every other code | 0 |

Causes are inferred only from supported token differences. Fixture risk labels
are never used as causes. Status failures outrank semantic equality. There was
no process failure or timeout, but per-fixture timeout supervision was absent.

## Latency

Clock: monotonic `time.perf_counter_ns`; CPU; one thread; FP32; batch 1.

| Stage | p50 | p95 | p99 / max |
|---|---:|---:|---:|
| OpenCV preprocess | 26.840 ms | 86.772 ms | 87.507 ms |
| Paddle model-direct | 90.806 ms | 102.547 ms | 131.813 ms |
| End to end | 122.885 ms | 178.457 ms | 181.394 ms |

Model load was 89.618 ms and peak RSS was 389,456 KiB. These are local machine
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
`bfb6a8aa46fd7a5e45928797594dc5bcdc2e07e2e4ba81e5199d0cd5734a28bf`.

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

## Privacy

The evaluator disabled replacement objects, bound its own repository plus
pre/post HEAD/tree/status identity, scanned the worktree/`.git`, and decoded
all local Git blobs. A protocol log and cache under the runner root were also
scanned. Raw-container canaries and exact raw-artifact byte hashes produced
zero residual matches.

The scan is incomplete:

- 30 repository members were unresolved, primarily symlink boundaries;
- protocol-redirection and cache-environment execution bindings remain
  unresolved even when selected bytes scan clean;
- provider/host sink proofs and direct raw-text provenance remain unresolved;
- exact-head GitHub PR/review/check/artifact scans are pending;
- the post-merge GitHub/cache scan is pending.

The evaluator recorded 39 unresolved members or sink proofs and required
explicit incomplete-exploratory mode. Complete zero-residual/no-import proof
is false.

## Exact gate status

The contract binds the full S235B 16-input and seven-dimension semantics,
including comparison operators, canonical preimages, derivation specs,
registries, and expiry triggers. All coherence common values remain `null`;
the displayed local hashes are observations, not signed S235B coherence.

No passing packet exists. Rights, supply chain, isolation, held-out, privacy,
named owner/reviewers, root trust, Lane A reconciliation, final exact-head CI,
and P0/P1-zero hostile review are missing.

PR disposition must remain draft and non-mergeable. O3B, S237B, learner
runtime, Production activation, and downstream automatic start remain off.
