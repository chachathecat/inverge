# APP-1 validation

## Final persistence-boundary review correction

The exact-head formal review at `842530d9cbb419cfaf23e6fc1a0f1b4ffc6ff8de`
identified that the generic wrong-answer write boundary could accept caller-supplied
APP-1 metadata after trusted-repair access or subject authorization had changed.
The repository insertion boundary now fails closed before acquiring its persistence
client unless the request has the exact closed APP-1 metadata set, a confirmed
same-session state with no mastery or transfer claim, the authenticated current user
still has trusted-repair authority for the exact second-stage subject, and the exact
owned source item still exists with matching subject identity. Ordinary non-APP-1
Review OS writes retain their prior behavior. Focused, inherited, build, exact-head
CI, and final review results below are refreshed only from the corrected head. The
most recent authenticated browser receipt remains bound to its stated prior head;
the persistence gate itself is exercised by the focused server-boundary regression
and clean-checkout exact-head checks rather than reusing that browser receipt.

## Frozen scope

- Base SHA: `761b7f6b7648d19845ab3385665e92046165dddd`
- Base tree: `c6c6a8ad876c2f40b5276a26485b088656addf49`
- Tracking issue: `#874`
- APP-1 core changed paths: 15
- Aggregate PR changed paths: 18 (`15` APP-1 core paths plus the separately governed `tests/s232f2-access-availability.test.mjs` access-inventory correction, the inherited `tests/wcv-c3r-p-practice-common-durable-runtime.test.mjs` frozen-identity alignment, and its directly coupled `tests/e2e/wcv-c3r-p-practice-common-runtime.spec.ts` frozen evidence-time correction)
- New API, migration, database, RLS, auth, package, lockfile, workflow and public-navigation paths: 0

## Focused contract evidence

Run:

```text
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/app1-owner-capture-repair-vertical-v1.test.mjs tests/answer-submission-ocr-save-contract.test.mjs tests/s225x-founder-grade-visual-taste-reset.test.mjs tests/ux-surface-reset-v1-answer-road.test.mjs
```

The APP-1 suite uses only author-created synthetic records. The final candidate run passed `41/41`, including `APP1-API-001`, `APP1-API-002`, `APP1-PERMISSION-001`, `APP1-UI-002A`, `APP1-UI-003`, the final-batch `APP1-VM-004A`, `APP1-VM-004B`, `APP1-VM-005`, and `APP1-UI-004` regressions, plus the final repository-authority placeholder, out-of-vocabulary target, and exhaustive item-specific Queue cases. The permission regression binds `canConfirmInput` to valid Capture input while keeping APP-1 quick save disabled, preserves unauthorized/non-APP-1 behavior, and keeps the 15-path core contract separate from the shared access-inventory correction. `APP1-API-002` freezes the closed metadata shape, current-session Owner and subject authorization, exact owned source binding, and pre-client ordering at the final insertion boundary. The route regression proves that the repair transition remains behind the exact durable-receipt gate and is not raced by an immediate refresh. Focused deterministic tests also exercise all five honest verification states through the public APP-1 evaluator: confirmed, one connection still missing, guided path needed, deferred, and blocked by OCR/source uncertainty. `APP1-UI-002A` proves that a failed verification request materializes the deterministic guided fallback, exposes no save action, and permits an explicit retry without fabricating a successful verification. Target-profile cases fail closed for unchanged, paraphrased, generic, unrelated, ambiguous, prospective, conditional, displaced, and model-only evidence while accepting completed target-specific equivalent wording. Persisted source-answer precedence skips only the exact placeholders `-`, `–`, and `—`, preserves substantive multiline source bodies, and does not inherit the repair-input `4,000`-character limit. Multiline Theory, Law, and Practice repair bodies preserve LF paragraph or calculation structure, enforce the normalized `4,000`/`4,001` repair boundary, and omit stale source scheduling. Item-specific Queue evidence exhaustively reads the exact private item identity with stable paging, preserves distinct semantic duplicates, fails closed on count or paging drift, and must cross-bind the repair item, durable persistence operation/work revision, exactly one Queue row, and a due time not before persistence. The guided and blocked cases prove that no mastery, transfer, durable or Queue receipt is fabricated. The same suite covers the Owner/default-off gate, exact OCR warning and CTAs, editable confirmation, bounded summary, one-gap invariant, learner-entered repair, durable-receipt enforcement, dedupe conflict, reload truth and forbidden-path/source boundaries.

## Final request-purpose and input-chooser evidence

The answer-review structure endpoint now accepts only the closed purposes `learning_analysis` and `repair_verification`; an absent purpose remains backward-compatible `learning_analysis`. Repair verification requires an authenticated user and email, canonical source item ID, a current-user item read, exact second-stage subject binding, and the existing subject-specific trusted-repair feature flag plus Owner allowlist. Unknown purpose, missing source ID, anonymous access, another-account ID, first-stage mode, and subject mismatch all failed before the local model seam. Usage metadata retained exactly `examMode`, `explanationLevel`, and `requestPurpose`.

One disposable local DB/Auth/REST/Kong integration run produced one eligible ordinary learning signal, then five successful repair-verification calls—including three repeated retries and one unresolved input—with zero additional `learning_signal_events`. Usage-purpose counts were exactly `learning_analysis=1` and `repair_verification=5`; repair responses were explicitly `skipped / repair_verification`. The exact body-free integration and browser receipt is `sha256:c7a5cf6338e9792ec080024c0f2f399325b53f1be1e8d7faab8aff949cf061b4`.

The gated Capture entry now opens one inline chooser with exactly `사진 찍기`, `PDF 선택`, and `텍스트 붙여넣기`. The primary CTA owns `aria-expanded` and `aria-controls`, moves focus to the photo option, preserves sequential keyboard focus through PDF and text, and focuses the editable textarea after text selection. Photo and PDF use their existing file inputs through real file-chooser events. The non-APP-1 disclosure remains unchanged and is not duplicated in APP-1 mode.

The complete checked-in browser specification passed `1/1` with zero skip across `390x844` text, `768x900` photo, and `1440x1024` PDF. Keyboard/focus, 200% reflow, zero horizontal overflow, and axe serious/critical zero passed. The 390 repair sequence remained `synthetic_repair_save_503 → synthetic_dedupe_conflict → synthetic_durable_success`; 768 and 1440 each received `synthetic_durable_success`. Next's development-only npm version check was answered locally with a synthetic 503 before transmission; unauthorized APP-1 application contacts and successful remote Supabase, Production, provider, and payment contacts were zero. Ephemeral users and all local runtime resources were removed.

## Representative browser evidence

`tests/e2e/app1-owner-capture-repair-vertical-v1.spec.ts` is an executable authenticated, synthetic-fixture specification. It mocks only the existing OCR, learner-private item, structure and queue seams. Its authenticated browser coverage is explicitly limited to these encoded assertions:

- text, photo and PDF Capture inputs through editable OCR confirmation, durable save and the gated repair redirect;
- exactly one gap and no prefilled repair answer;
- direct learner repair and same-session-only language;
- durable item and queue receipts before scheduling copy;
- truthful OCR, initial-analysis and direct-repair-verification failure plus unsaved-repair reload behavior;
- at 390px, the exact repair-save sequence `HTTP 503 → dedupe conflict → durable success`, with no learner-visible internal error, persistence receipt, Queue receipt, schedule claim or completed state before the final success;
- 390, 768 and 1440 pixel widths without horizontal overflow;
- 200% text scaling;
- keyboard reachability and visible focus;
- zero serious or critical axe violations;
- no external write or unregistered endpoint.

The browser spec remains skipped unless `APP1_AUTH_RUNTIME=1` and the bounded local authenticated runtime inputs are present. Merely adding or typechecking the specification is not browser evidence. The final-batch authenticated execution passed through repository-local Playwright `1.62.1` and Playwright-managed Chromium revision `1234`, against Next.js `16.2.12` production Webpack and an ephemeral loopback-only local Supabase DB/Auth/REST/Kong Owner fixture. An initial local access bootstrap attempt stopped at the truthful pending-invite surface and created no APP-1 acceptance evidence; after the same disposable profile was set to the existing `active` fixture state, the one substantive complete checked-in run passed `1/1` in `25.230` seconds with zero skip across `390x844` text, `768x900` photo and `1440x1024` PDF. The spec binds the initial click to its `/api/os/items` response, waits for the component's semantic post-failure focus state before keyboard retry, selects the exact non-camera gallery input instead of a positional image input, preserves the multiline repair body, rejects a paraphrased unresolved defect before accepting target-specific completed evidence, ignores an omitted repair item in the general Queue presentation, and proves an item-detail failure becomes `saved_without_queue` without describing the durable record as unsaved.

The `390` repair responses were exactly `synthetic_repair_save_503 → synthetic_dedupe_conflict → synthetic_durable_success`; `768` and `1440` each received exactly `synthetic_durable_success`. Every initial Capture save received `synthetic_source_save_success`, unknown item saves were zero, the general Queue presentation endpoint was not used as receipt authority, and the mutation endpoint set remained exactly `/api/inverge/ocr`, `/api/answer-review/structure` and `/api/os/items`. Horizontal overflow was zero, keyboard and visible-focus assertions passed, 200% reflow passed, and axe serious/critical violations were zero. Browser non-loopback application requests were fail-closed through a dead local proxy, the Next application guard recorded zero unauthorized attempts, and successful remote Supabase, Production, provider and payment contacts were zero. The first sanitized metadata-only final-batch runtime receipt digest is `sha256:1a6f941d1b6dab4731da65720932738fc7131fe908bf93e680d805e1fcc0f92c`.

The authorized exact-head review self-correction removed unchanged retry as a resolution for a real dedupe conflict: conflict now returns to editable repair input, clears the old same-session verification, and requires a distinct repair plus fresh verification before another durable save. It also replaced the fabricated fallback label `답안 문단 1` with honest whole-answer/unlocated provenance, and stopped applying the `4,000`-character repair-input limit to the captured source answer used for bounded analysis. Focused regressions cover all three boundaries. The corrected complete authenticated specification then passed `1/1` in `29.795` seconds across `390x844` text, `768x900` photo and `1440x1024` PDF. The `390` case proved `HTTP 503 → unchanged retry allowed → dedupe conflict → edit → reverify → durable success`; the normal save action was absent during conflict and the old input was preserved for correction. Keyboard/focus, 200% reflow, zero horizontal overflow, zero axe serious/critical violations, item-specific Queue evidence and `saved_without_queue` behavior all remained green. The sanitized self-correction runtime receipt digest is `sha256:e71bafdb4a2c4c3930629df0349ef49b5429a5bdfe561e5a502258bcd45bb11d`.

The terminal three-finding root correction makes the source-answer placeholder set exact, requires literal and contextual evidence plus a closed completed-action profile for unknown repair targets, and moves item-specific Queue receipt lookup to an exhaustive private exact-item query rather than any bounded general presentation. The final authenticated run passed `1/1` with zero skip across `390x844` text, `768x900` photo and `1440x1024` PDF. It proved that placeholder-backed persisted records send the substantive multiline rewrite body into analysis, unresolved out-of-vocabulary wording fails closed while exact completed evidence confirms, and one exact target Queue row remains authoritative despite 21 higher-priority unrelated rows; unrelated and cross-user rows were absent from the item-bound result. The separate item-detail failure still truthfully rendered `saved_without_queue`. Keyboard and visible focus passed, 200% reflow passed, horizontal overflow was zero, axe serious/critical violations were zero, browser and Next unauthorized application attempts were zero, and successful remote Supabase, Production, provider and payment contacts were zero. The sanitized terminal runtime receipt digest is `sha256:35b4c5ff4417953fc99d8ddd8ff73901f4495ae74fa448d72f131b8fdfe184cf`.

The inherited C3R-P access-identity regression was first aligned from historical `repository.ts` blob `f7f20117c5e3acb14eeb331d8f45a9b97d66c8c2` to the exhaustive item-specific Queue successor and is finally pinned to audited APP-1 persistence-authority blob `8f219df8567c2967aee02e7b610bdbe2e4684134`. The cumulative semantic diff replaces the globally bounded item-detail Queue lookup with a private exact-user/exact-item query and adds the exact pre-insert trusted-Owner, subject and owned-source binding for closed APP-1 metadata. Every other frozen production-access blob remains unchanged. The regression still hashes every exact file and proves both that `getWrongAnswerDetail` no longer calls `listReviewQueue(userId, 20)` and that APP-1 persistence authority is revalidated before any write client is acquired.

The first two exact-head C3R-P runtime runs exposed one inherited wall-clock family: direct post-D+1 reads and the two-context pre-D+7 response interception omitted the existing `evidenceStep` seam, so the fixed D+7 due time had naturally become eligible by the September CI date. The direct reads and both browser contexts now bind the already-defined `d1Rescheduled` instant (`2026-08-25T00:09:00.000Z`), which remains before the D+7 due time; the later pre-recurrence read likewise binds `d7`. These corrections preserve the intended fail-closed pre-D+7 and pre-recurrence assertions. No C3R-P product, persistence, schema, RLS, authentication or runtime behavior changed.

The fresh exact-head review then found that a direct-repair verification service failure returned to editable repair instead of materializing its own `guided_path_needed` result. The correction preserves the preliminary public evaluator result, renders the subject-specific guided route, provides a separate explicit direct-retry action, and gates persistence on the exact `repair_confirmed_for_this_session` state. The first local browser execution proved that the source save and repair-route transition succeeded but exposed a stale response-event wait in the specification; the locator was narrowed to the stable repair URL transition while the semantic fixture counters continue to prove the exact source-save response. The corrected complete authenticated specification passed `1/1` in `24.184` seconds with zero skip across `390x844` text, `768x900` photo and `1440x1024` PDF. It proved the safe verification-failure copy, guided Theory link, absent save authority, preserved-input retry, exact `503 → conflict → durable` 390 sequence, durable 768/1440 saves, keyboard/focus, 200% reflow, zero horizontal overflow and zero axe serious/critical violations. The sanitized metadata-only guided-fallback runtime receipt digest is `sha256:90817ead42ccd25521944943e7aa4abcbf12c35f10bc05f523c1ad228b20fee8`; successful remote Supabase, Production, provider and payment contacts remained zero.

The post-reopen formal review then found that recognized repair facets could be repeated inside a self-reported completion sentence without reconstructing the missing fact-to-reason content. The bounded correction now requires every recognized target facet, a closed completion action, and at least two distinct substantive words in the same sentence after excluding facet labels, action roots, unresolved/discussion-only cues and target-displacement cues. The hostile self-report remains `one_connection_still_missing`; concrete Theory, Law and Practice reconstruction fixtures remain confirmable. The focused APP-1 and required-adjacent suite passed `40/40`, the directly adjacent suite passed `59/59`, and S232F.2 passed `6/6`. A fresh authenticated local browser execution passed `1/1` in `22.379` seconds with zero skip across `390x844` text, `768x900` photo and `1440x1024` PDF. The existing `503 → conflict → durable` sequence, keyboard/focus, 200% reflow, zero horizontal overflow and zero axe serious/critical violations remained green. Local DB/Auth/REST/Kong were healthy, Next application guard attempts were zero, and successful non-loopback, remote Supabase, Production, provider and payment contacts remained zero. The sanitized metadata-only runtime receipt digest is `sha256:46a59d7911261ab2f904c209b2d3dc6c3d0449aac8c3f758ce4f3ed8254a1646`.

After each runtime, the ephemeral Owner was deleted; Next, Chromium, DB/Auth/REST/Kong, containers, volume, bridge, listeners, temporary guards, reports and artifacts were removed with zero matching runtime resources remaining. Fixture bodies remain synthetic and no raw body is retained in evidence.

## Corrective evidence inventory

- Safe learner-error boundary: focused deterministic source contract, executed and passed; arbitrary `/api/answer-review/structure` payload errors are ignored and the two exact Korean fallbacks are bound.
- `guided_path_needed`: public evaluator focused regression, executed and passed; no confirmed repair, D+7, mastery, transfer, persistence or Queue receipt is created.
- Verification-service guided fallback: `APP1-UI-002A` and the authenticated browser scenario executed and passed; the safe error is followed by the exact subject-guided route and explicit retry, while persistence remains unavailable until exact same-session confirmation.
- `blocked_by_ocr_or_source_uncertainty`: public evaluator plus route-boundary focused regression, executed and passed; source confirmation is the only continuation and successful repair save is excluded.
- Input-confirm versus quick-save permission: `APP1-PERMISSION-001` executed and passed `1/1`; valid APP-1 input may proceed to editable confirmation while quick save remains disabled.
- Shared access inventory: S232F.2 executed and passed `6/6`; the APP-1 repair page remains separately accounted outside the 15-path core contract.
- Authenticated HTTP repair-save failure, conflict and success: targeted `390` and complete `390/768/1440` executions passed with the exact semantic response sequences and no false completion.
- Fail-closed repair confirmation: target-profile deterministic regressions and browser paraphrase rejection passed; model wording, generic strength, ambiguous/prospective evidence, and unrelated changes create no confirmation authority.
- Body and schedule boundary: multiline Theory/Law/Practice preservation, normalized `4,000`/`4,001` limits, and omission of inherited stale or past review dates passed.
- Post-save Queue boundary: a durable save settles before item-detail Queue confirmation; missing/failed item-specific evidence preserves the record in `saved_without_queue` and creates no Queue receipt or false retry state.
- Dedupe-conflict resolution: an actual conflict cannot loop unchanged; it returns to editable input, invalidates the previous verification, and requires a distinct repair plus fresh verification before retry.
- Honest source provenance: when exact anchor metadata is absent, the UI identifies only the whole confirmed answer with the detailed position explicitly unlocated; it never invents paragraph 1.
- Source/repair size separation: captured source answers may exceed the `4,000`-character repair-input limit while repair input remains bounded and fail-closed.
- Exact placeholder source precedence: only `-`, `–`, and `—` are skipped; meaningful short or multiline source bodies retain `userAnswer → rawAnswerText → rewriteParagraph` precedence and the terminal browser run proved the multiline rewrite reached analysis.
- Unknown-target completion boundary: an out-of-vocabulary target requires two literal anchors, two distinct context anchors, and one closed strong completion action in the same sentence; unresolved, discussion-only, displaced, contradictory, conditional, learner-only, or draft-only evidence fails closed.
- Exhaustive private Queue authority: stable 100-row paging is bound to the exact user, exam mode, lifecycle, source kind and repair item; count drift, overrun, incomplete pages, duplicate row IDs and more than one exact semantic row fail closed. The local API saturation run proved the exact target survives 21 higher-priority unrelated rows and excludes cross-user data.
- Directly adjacent Capture, persistence, Queue and trusted-repair behavior: `59/59` passed on the completed local candidate; the earlier `61/61` prose was corrected to the actual current four-file TAP count.
- Combined read-only hostile review of all five final-batch findings: actionable `P0/P1/P2 = 0/0/0`.
- Inherited C3R-P/T/L deterministic identity and receipt bundle: `129/129` passed after the exact successor-blob alignment.
- Read-only hostile review of the inherited identity alignment: actionable `P0/P1/P2 = 0/0/0`; no frozen identity was weakened and no unrelated C3R authority changed.

## Final candidate checks

- APP-1 focused and required-adjacent tests: `41/41` passed;
- inherited C3R-P/T/L deterministic tests: `129/129` passed;
- directly adjacent Capture, persistence, Queue and trusted-repair tests: `59/59` passed;
- S232F.2 route-inventory tests: `6/6` passed, including `app/app/capture/repair/page.tsx`;
- changed-file lint: passed;
- typecheck: passed;
- production Webpack build: passed for the final application-source bytes;
- exact 15-path APP-1 core manifest plus one separately governed shared access-inventory path, one directly coupled inherited C3R-P identity regression, and its frozen evidence-time runtime-spec correction (`18` aggregate): passed;
- `git diff --check`: passed;
- repository-required exact-head CI and fresh formal review.

The linked-worktree local build used explicit Webpack; clean-checkout CI remains authoritative for the repository's default Turbopack path. The authenticated runtime used only an isolated disposable local Supabase fixture. Remote Supabase, Production, provider and payment mutation remained zero.
