# S227 Invited-Account Runtime Visual-Density QA

Status: the post-merge integrated matrix passed in reviewed evidence run 29340100500 against the post-#564/#566 Preview. A final exact-head rerun on this closing documentation head remains required before #565 merges. This is Preview/staging software acceptance, not production launch evidence or physical fx-9860GIII verification.

## Scope

- Issue: #558
- Baseline: post-#564/#566 `main`
- Branch: `agent/s227-invited-runtime-qa`
- Runtime suite: `tests/e2e/s227-invited-runtime-acceptance.spec.ts`
- Dedicated Actions workflow: `.github/workflows/s227-runtime.yml`

This QA track changes tests, workflow wiring, and evidence documentation only. It does not change learner UI, calculator behavior, database schemas, migrations, APIs, payments, instructor routes, or shared shell design.

## Safety boundary

- A dedicated invited/test account is required.
- Only synthetic Korean sample data is created.
- The suite refuses known production hosts.
- A protected Vercel Preview requires `VERCEL_AUTOMATION_BYPASS_SECRET`.
- The workflow checks out the exact #565 PR head and requires runner SHA and target deployment SHA to be the same full value.
- The approved #565 Preview alias is fixed in the workflow and Vercel deployment metadata is checked independently.
- Credentials and the runtime URL are redacted from captured diagnostics.
- Playwright trace, video, and implicit failure screenshots are disabled.
- The signed-in identity is covered with a deterministic black mask before capture, and visible email-like text outside that region fails the DOM guard.
- Tesseract locates every generic email-like OCR candidate; ImageMagick redacts each padded bounding box, then a second generic and exact-account OCR scan fails closed on any residual candidate.
- Uploaded artifacts are limited to explicit sanitized `s227-*.png` files and one metadata-only JSON manifest.
- No raw private learner answer or copyrighted question text may be used.

## Accepted automated matrix

| Surface / transition | 390 | 768 | 1440 | Durable assertion |
| --- | --- | --- | --- | --- |
| `/app?mode=second` one mission | Pass | Pass | Pass | Today plan remains capped at three |
| `/app/capture?mode=second` empty | Pass | Pass | Pass | Fresh form state |
| rewrite input and saved confirmation | Pass | — | — | Account-storage confirmation passed |
| `/app/notes?mode=second` | Pass | Pass | Pass | Synthetic source remained visible |
| detail normal | Pass | Pass | Pass | Two evidence excerpts remained readable |
| detail empty-evidence | Pass | Pass | Pass | Honest evidence-empty state rendered |
| detail completed | Pass | Pass | Pass | Rewritten paragraph survived reload |
| detail error / offline | Pass | Pass | Pass | Isolated invalid-ID and offline states rendered honestly |
| `/app/review?mode=second` | Pass | Pass | Pass | Synthetic source reached the queue |
| calculator active / completed | Pass | Pass | Pass | One active step, all nine canonical steps, visible `기기 검증 전` |
| keyboard/focus | Pass | Pass | Pass | Today, rewrite save, Review, and calculator continuation |
| console/page/same-origin failures | 0 | 0 | 0 | Manifest counts remained zero |

The suite checks calculator active/completed and detail normal/empty-evidence/completed/error/offline at every viewport. It also checks the learner shell, horizontal overflow, unsupported authority claims, one dominant Today action, and visible keyboard focus. The deliberate invalid-ID and offline probes run in an isolated authenticated browser context, so expected boundary failures do not weaken the primary page's zero-error gate.

## Exact deployment contract

The workflow runner SHA and target deployment SHA are different concepts:

- runner SHA: the branch revision containing the test;
- target deployment SHA: the application revision behind `E2E_BASE_URL`.

A run is accepted only when both are full SHAs and equal. The Vercel deployment record must independently report the same `githubCommitSha`, be `READY`, and own the fixed #565 Preview alias. Historical #560 evidence is not used as proof of the post-#564/#566 head.

## Exact-head run procedure

The dedicated workflow is one-shot and marker-gated:

1. Confirm Vercel reports the current #565 head as `READY` at the fixed Preview alias and that deployment metadata contains the same SHA.
2. Add the hidden run marker to the #565 body. The workflow includes the `edited` pull-request event, so no empty commit is needed.
3. Keep the marker until the run reaches a terminal state; removing it earlier could create an unnecessary concurrent edited event.
4. Remove the marker immediately after the terminal run, then review the sanitized artifact without changing the head.

The existing repository secrets are reused without inspection:

- `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`
- fallback `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`
- `VERCEL_AUTOMATION_BYPASS_SECRET`

Expected artifact: `s227-invited-runtime-<run-id>`, retained for seven days.

## Acceptance boundary

The #562 / S229 calculator dependency is merged through #564, and the #566 timeline baseline is also merged. The integrated branch consumes those implementations and does not duplicate or change product behavior.

- The closing PR uses `Closes #558`.
- #558 closes when #565 merges after the final exact-head gates pass.
- No public-launch or world-class completion claim is allowed from this Preview evidence alone.
- No calculator/device correctness claim is allowed.
- The calculator must continue to display `기기 검증 전` and the manifest must record `realDeviceVerified: false`.
- Repository policy keeps merge human-approved; the owner must explicitly authorize the direct merge.

## Attempt history

- Run 29328078708: historical #560-only matrix pass; not used as post-merge evidence.
- Run 29338590442: the integrated browser matrix passed, but the generic OCR guard detected an email-like candidate. The privacy gate correctly uploaded no artifact.
- Run 29340100500 / job 87109280095: reviewed pre-finalization pass on exact head `1b62c0116b80c7297472d69b2b27c0f768342722`. Browser matrix, deterministic OCR redaction, post-scan, and sanitized artifact upload all passed.
- Final merge evidence must rerun after this documentation/contract commit. Its run and artifact remain in the closing PR body so recording them does not mutate the verified head.

## Reviewed evidence ledger

| Item | Required value | Reviewed value |
| --- | --- | --- |
| Runner SHA | Exact branch head | `1b62c0116b80c7297472d69b2b27c0f768342722` |
| Target deployment SHA | Exact deployed app head | `1b62c0116b80c7297472d69b2b27c0f768342722` |
| Vercel deployment | Ready and same Git SHA | `dpl_AqBUdjrbyBjGU3hKa9omhuz66RuX` — `READY`, exact SHA |
| Actions run / job | Passing exact-head run | [29340100500](https://github.com/chachathecat/inverge/actions/runs/29340100500) / `87109280095` |
| Artifact | Sanitized PNGs plus one manifest | `s227-invited-runtime-29340100500`, ID `8313782732` |
| Artifact digest | GitHub digest equals downloaded ZIP | `sha256:8c22a9dfe6296c190cc23d45e0b0328666a9c9840d950ca3a1085d1c0c0b1990` |
| Artifact contents | Expected allowlist only | 36 sanitized PNGs and one `s227-runtime.json` |
| Login | Bounded hydrated sign-in | 1 attempt |
| Viewports | 390 / 768 / 1440 | `390x844`, `768x1024`, `1440x1024` |
| Detail matrix | Five states at every viewport | normal, empty-evidence, completed, error, offline — Pass |
| Calculator matrix | Two states at every viewport | active, completed — Pass; nine canonical steps |
| Keyboard/focus | Named actions reachable | detail 10, save 11, Today 8/8/8, Review 9, calculator 12 stops |
| Expected / unexpected boundary failures | 3 / 0 | 3 / 0 |
| Console / page / same-origin failures | 0 / 0 / 0 | 0 / 0 / 0 |
| Durable save/reload | Pass | `durable`; saved comparison survived reload |
| Privacy | Synthetic, redacted, no trace/video | Pass; independent 36-image OCR re-scan found zero email-like text |
| Physical-device claim | Must remain unverified | `기기 검증 전`; `realDeviceVerified: false` |

Representative 390/768/1440 screenshots were visually reviewed for Today, saved Capture, Notes, Review, all detail boundaries, and calculator active/completed. Widths matched the requested viewports, full-page evidence contained no horizontal clipping, and account identity regions remained visibly redacted.
