# S236B OCR benchmark harness

This directory contains a benchmark-only harness and bodyless evidence. It does
not implement learner capture, navigation, persistence, telemetry, onboarding,
pricing, or any Production dependency.

The recorded run happened without the S235B entry packet. It is explicitly
disposable, unauthorized pre-entry exploration and cannot qualify as S236B
acceptance evidence. A qualifying run requires either a current passing
16-input S235B packet before execution or an explicit Owner disposition; it
must then be regenerated at that exact head and tree.

## Frozen candidate identities

- OpenCV: `opencv-python-headless==4.13.0.92`, runtime `cv2==4.13.0`.
- PaddleOCR family reference:
  `PaddlePaddle/PaddleOCR@v3.7.0#b03f46425e8ff4442b268ce449e3eef758146cd4`.
- Executed model: `korean_PP-OCRv5_mobile_rec`, archive SHA-256
  `a6261f800ad335aa6ef77b6f7c4dcedfd5e11b95f4d70982d41ee31c2ace5e66`.
- Inference engine: `paddlepaddle==3.3.1`, CPU, FP32, batch 1, one thread.

The PaddleOCR repository source and stock `paddleocr` package were not
executed. The measured path was this repository's pinned adapter plus the
exported recognition model through direct Paddle inference. `paddlex` and
`aistudio-sdk` were absent. No full-page layout, structural-table,
formula-model, Production-fitness, or PaddleOCR-source claim is made.

| Identity | SHA-256 |
|---|---|
| Candidate set | `68bed995d8e8bd1cb76ec59a8daacbb9423f4b71b69858c3146f07986d068993` |
| Candidate configuration | `87e2db2aae8fc129d1104916bb83b0a80b23e2128e4eab325c5652782ddc1ee9` |
| Benchmark configuration bundle | `42b440d63b6ac2a7b81147bba3a03d5d4d76c5781abeccded68c8a94fe18107e` |
| Candidate lock file | `2be5422b02e89d37cc1fb1c4cad7ca94d73b4e1282d77e7bd730777f59b20a93` |

## Safe execution boundary

Use distinct, non-nested disposable runner and authority roots outside the Git
worktree. The generator creates path-bound owner sentinels. The runner never
receives the authority path. Candidate streams are suppressed, output is
committed before expectation open, and all raw images, expected values, OCR
values, keys, canaries, and revision bodies stay in those disposable roots.

The SBOM scanner self-verifies and inventories all 17 isolated Python
distributions. The generator and runner match selected installed-distribution
inventories and imported module origins; the runner checks every model hash
before and after inference. This does not bind the Python executable, native
dependency closure, wheel-to-install provenance, an allowlisted `sys.path`, or
a read-only model mount. Those remain explicit supply-chain and isolation
blockers.

Current execution identities:

```text
generator  3b6d973567faec7b272f700ede21f4ade653ef6a127333621344dcdd64c1a718
runner     b19fda61e284ccf913e78bd01a133b24a8b0543467395412cbc7bfb4fc89a4fd
evaluator  0bff5e08576ad855a0e74bf845fdf88153f9003750aae5647315549eeb7e6139
cleanup    3710044d780932ef73356b4b397300972fcdfb18a1674268f91fb5bddef84620
fault tool bda1d768537119e023176ecc9b39cd50b7bb3c480a0842f50c00c886a11da210
SBOM scan  c1e059f5a52d09585f743b9b8c65ead6fe1d7f0aed6ddc4b66a5c73ae21aabaf
```

Run `scan_runtime_sbom.py`, `generate_synthetic.py`, `run_candidate.py`, and
`evaluate_bodyless.py` in that order. Every required digest and version is a
mandatory CLI argument; use `--help` for the complete command shape. The
evaluator refuses unresolved privacy evidence unless
`--allow-incomplete-exploratory-evidence` is explicit.

`network_deny.c` blocks process-level IPv4/IPv6 socket creation and DNS in the
tested preload path. It does not cover inherited descriptors, direct syscalls,
or provide kernel/provider isolation. The recorded process environment was
not allowlist-sanitized, so absence of secret exposure is not claimed.

Only the bodyless outputs copied from disposable roots may be staged into Git:
the field manifest and benchmark result. Candidate lock, SBOM, rights, and
rollback JSON are separate bodyless contract artifacts. Never print, upload,
screenshot, cache, or corpus-import a disposable root.

## Ground truth and scoring

The field manifest covers 60 fields across 32 synthetic images: negation,
numbers, signs, percentages, five-choice order, Law dates, tables, and
formulas. Five-choice and 2x2 table correctness requires exact
candidate-produced ordered structure. Expected coordinates never substitute
for candidate output.

Mismatch causes are assigned only where the observed token difference supports
the cause. Ambiguous mismatches are
`unclassified_review_required`; fixture risk labels are not treated as causes.

## Native fallback and cleanup

The benchmark creates machine originals exclusively and keeps revisions in a
separate authenticated journal. The original stayed unchanged during the
test, and expected-head/HMAC checks rejected duplicate, predecessor, edit,
truncate, delete, and stale-state attempts. OS write-once enforcement is
false, and the journal storage itself is not append-only; only the in-process
locked authenticated chain was tested. No named-human fallback receipt exists.

`exercise_rollback_fault.py` produces machine-observed missing-model,
network-denial, timeout, and interruption fixtures. `cleanup_ephemeral.py`
accepts only direct children of an approved parent with exact path, basename,
root-instance nonce, owner, producer, scenario evidence, and non-metadata
payload bindings. Receipts must be new and outside the target.

The normal runner and authority roots ended at the same empty-state SHA-256.
The other four records are generic fault-producer/cleanup probes on proxy
`s236b-fault-*` roots, not end-to-end candidate-runner failure recovery.
Actual pre-evaluator failure cleanup of both raw runner and authority roots is
unproven and blocks a qualifying rollback receipt. The common observed
empty-state SHA-256 was:
`84e9b2125391f4d68a6f50bac3d0b1d55c41764c464d47cba50ba5d8dada7aaa`.

## Fail-closed status

The local run found zero raw-body residuals, but 39 members or sink proofs are
unresolved, including repository symlinks and provider-level sinks. Remote
exact-head and post-merge scans are pending. Rights, license policy, native
SBOM, vulnerability, trusted isolation, held-out, named-human, root-trust, and
signed seven-dimension coherence receipts are absent.

Do not merge from these files alone. Do not start O3B, S237B, or learner
runtime.
