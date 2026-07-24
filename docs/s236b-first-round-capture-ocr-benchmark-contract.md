# S236B First-Round Capture and OCR Benchmark Contract

- Selected: 2026-07-24
- Lane / lock: B / `first-capture-benchmark`
- Live start: `f28ef275d918c3b6ee2afcd0a393959fd4763fb3`
- Live-start tree: `95d1efcf5e3eed12516fbd58da2dcc81bf604064`
- Tracking issue: #659
- State: disposable pre-entry exploration; S236B entry gate not satisfied

The machine-readable source of truth is
`config/s236b-first-round-capture-ocr-benchmark-contract.json`.

## Authority and scope

S235B is merged PR #657 plus corrective PR #658. This Work owns only Lane B's
benchmark contracts, local harness, and bodyless exploratory evidence. It does
not start O3B or S237B; implement learner runtime; expose navigation,
onboarding, pricing, or public claims; activate Production dependencies,
models, telemetry, or content; change shared schema, persistence, auth/RLS, or
billing; claim QTI, xAPI, or Caliper conformance; or automatically start a
downstream item.

Lane A has priority over the 19 shared roadmap/control-plane closeout files.
This branch changes none of them. Any Lane A merge requires a rebase,
reconciliation, and complete exact-head evidence regeneration.

The benchmark execution was not authorized by a passing S235B entry packet.
It cannot be repaired retroactively or used as qualifying S236B evidence. A
fresh qualifying run is required after a passing packet, or after an explicit
Owner disposition that acknowledges the deviation without backdating it.

## Candidate and configuration lock

OpenCV and PaddleOCR remain `proposed`.

| Identity | SHA-256 |
|---|---|
| Candidate set | `68bed995d8e8bd1cb76ec59a8daacbb9423f4b71b69858c3146f07986d068993` |
| Candidate configuration | `87e2db2aae8fc129d1104916bb83b0a80b23e2128e4eab325c5652782ddc1ee9` |
| Benchmark bundle | `42b440d63b6ac2a7b81147bba3a03d5d4d76c5781abeccded68c8a94fe18107e` |
| Candidate rows | `66218a91b90f95d0282c006fb1107e0827065195bc7ba8d21f1fc2913aa8594e` |
| Runtime component set | `d1c80b368062b00a8afa1e18d049a11f1ddcbf6951bdbf4f79762cf7e42c8d8c` |

The executed path was `opencv-python-headless==4.13.0.92`, this repository's
adapter, `paddlepaddle==3.3.1`, and the exact
`korean_PP-OCRv5_mobile_rec` archive. The stock PaddleOCR/PaddleX source path
was not executed. This is field-crop text-recognition evidence only.

All isolated Python distributions were inventoried before fixture generation.
Selected installed-distribution inventories and imported module origins were
matched. Model hashes were checked before and after inference, and the
rendering font was hash-checked. The Python executable, native dependency
closure, wheel-to-install provenance, allowlisted `sys.path`, and read-only
model-mount enforcement were not verified.

## Fixtures, held-out boundary, and scoring

The run used 32 newly generated synthetic images with 60 fields. Real learner,
copyrighted private, and separately authorized private fixture counts are all
zero. The committed manifest contains only IDs, hashes, HMACs, dimensions,
and structure coordinates.

Runner and authority roots were distinct and non-nested. The authority path
was not supplied to the runner, and output was committed before evaluator
expectation open. Trusted prior-access exclusion and post-open retry/tuning
counts remain unverified, so all 15 calibration and 45 hidden fields are
readiness-ineligible.

Failure causes are diagnosed from observed token differences. Ambiguous
mismatches are unclassified. Five-choice and table success requires exact
candidate-produced ordered structure.

## Original and native revision boundary

The machine-original file was exclusive-created and stayed unchanged during
revision testing. Revisions use a separate, locked, authenticated expected-head
chain. Valid second append, duplicate ordinal, predecessor, edit, truncate, and
delete checks passed, and metrics remained bound to the original.

This does not provide filesystem immutability: OS write-once enforcement is
false and revision storage is not append-only. No product UI or named-human
fallback receipt exists.

## Isolation, rollback, and privacy

Normal runner and authority cleanup used path-, nonce-, owner-, producer-,
scenario-, and payload-bound controls and ended with no target. Missing model,
network denial, timeout, and interruption were generic fault-producer cleanup
probes on proxy roots, not actual candidate-runner/authority failure recovery.
Actual pre-evaluator two-root failure cleanup remains unproven and is a gate
blocker. All recorded cleanup receipts ended at the common empty-state root
`84e9b2125391f4d68a6f50bac3d0b1d55c41764c464d47cba50ba5d8dada7aaa`.
The richer receipt-set digest is separate and does not replace the S235B
rollback-state scalar.

The preload shim passed IPv4, IPv6, and DNS denial probes but remains partial
process isolation. It does not cover direct syscalls, inherited descriptors,
kernel namespaces, or provider controls. The inherited process environment
was not allowlist-sanitized; secret-exposure absence is not claimed.

The local scanner disabled Git replacement objects, bound the evaluator's
repository path and pre/post HEAD/tree/status identity, decoded every local
Git blob, and scanned the worktree, `.git`, a runner-root protocol log, and a
runner-root cache. Protocol redirection and cache-environment execution
bindings are still absent, so they remain unresolved even when their selected
bytes scan clean. Provider-level, remote PR/check/artifact, and post-merge
proofs remain pending.

## Supply chain and rights

The SBOM contains 17 exact Python distributions. Native OS/driver inventory,
declared wheel pins for 15 components, install receipts for the two declared
pins, an approved vulnerability snapshot, and named license-policy review
remain missing. The forbidden-license count is `null`; all 17 components
remain unresolved for the gate.

The Korean model and Noto rendering font remain unresolved because immutable
source/license representation bindings and named-human rights approvals are
absent. Neither is redistributed or activated by this Work.

## Exact S235B contract

A passing packet must use:

- scope `s235b_to_s236b_ocr_benchmark_entry_v1`;
- gate `S236B`;
- schema `appraiser.first.gate-evidence-packet.v1`;
- decision `verified_complete_current_S236B_gate_packet`;
- exact head/tree and the exact 16 ordered inputs from S235B;
- zero missing, extra, duplicate, expired, or unreviewed rows.

The contract binds the complete S235B immutable-input, acceptance,
evidence-registry, projection-registry, expiry-trigger, and seven-dimension
matrix digests. Each local coherence row copies the exact comparison operator,
canonical preimage, participant order, and per-input derivation spec.

Every `machineCommonValueOrNull` is `null`. Local candidate, fixture,
environment, and rollback values are raw observations only—not current signed
S235B coherence. The global status is `not_constructed_fail_closed`.

## Fail-closed decision

There is no passing packet, named benchmark owner, signed owner selection,
root-key registry, trust-anchor projection, current per-input receipt set, or
signed coherence receipt. Rights, supply chain, isolation, held-out, privacy,
Lane A serialization, exact-head CI, and hostile review also remain open.

Merge is not approved. Auto-merge is prohibited. The only eventual method is
explicit squash after every exact-head gate passes and a final live-state
reread. O3B, S237B, and learner runtime remain unstarted.
