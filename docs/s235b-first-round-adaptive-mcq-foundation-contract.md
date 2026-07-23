# S235B First-Round Adaptive MCQ Foundation Contract

## Status

- Roadmap item: `S235B`
- Contract version: `dabangil.first_round_foundation.v1`
- Selected: 2026-07-23
- Live start: `9150aa788ca33be613640bfbe6e531d9993eb983`
- Live start tree: `9199ac07bb664fd6f0926314a26b94d7c235b7e7`
- Machine-readable contract:
  `config/s235b-first-round-adaptive-mcq-foundation-contract.json`
- Tracking issue: `#653`
- State: contracts and evidence requirements only
- Reconciled base after S235A priority merge:
  `dac5777dab76c95a1451e2adef147b976909c4bd`
- Reconciled base tree: `5bad82f70346adfaa7dbe71268c5cb07769756aa`
- Closeout state: S235A PR `#656` merged; the exact 17-path intersection
  (roadmap plus 16 shared roadmap-status tests) was released before the
  serialized S235B closeout was applied

This Work defines a bounded first-round Foundation. It does not implement,
expose, activate, or claim a learner runtime.

## Authority and boundary

The authority order in `AGENTS.md` applies. The current Owner instruction
selects S235B only. The dated Owner decision and unified program contract
authorize first-round metadata and contracts but keep runtime and activation
gated.

This Work does not:

- run an OCR benchmark or add OpenCV/PaddleOCR dependencies;
- persist, import, or commit question sheets, answer files, notice
  attachments, OCR output, learner captures, or any other raw content;
- start S236B, O3B, S237B, O4B, or a first-round learner runtime;
- change routes, navigation, onboarding, UI, pricing, billing, entitlements,
  public claims, schema, persistence, migrations, RLS, auth, providers,
  models, prompts, dependencies, environments, flags, allowlists, Preview, or
  Production;
- claim QTI, xAPI, or Caliper conformance, certification, interoperability,
  transport, storage, delivery, or Production telemetry;
- authorize redistribution merely because an official source is public or
  displays a public-license notice.

Legacy first-round compatibility code and routes remain present and unaudited.
Their presence is neither removed nor treated as authorization.

S235A issue `#654` and merged PR `#656` owned the shared roadmap and shared
control-plane files during its priority lane. The four S235B lane files were
disjoint. After that priority squash merge, S235B rebased onto exact main
`dac5777dab76c95a1451e2adef147b976909c4bd`, tree
`5bad82f70346adfaa7dbe71268c5cb07769756aa`, reread the governing sources, and
confirmed the writer reservation was released. The serialized shared mutation
is `S235B.status: queued -> completed` in `roadmap/active-program.yml`; the 16
existing source tests that asserted its live status, ready set, or report-only
planner target are updated only to expect `O3A` and `S236B` as the next
metadata-ready selections and to use queued `S236B` instead of completed
`S235B` for that report-only target. Selection starts neither item, and every
downstream item stays queued. All pre-rebase and earlier-head test/review
evidence is obsolete, so exact-head validation and a fresh hostile review are
required.

The machine closeout records the exact intersection of PR `#656`'s changed
files and this Work's owned manifest: those 16 tests plus the roadmap, 17
paths total. The four S235B contract/doc/test lane files are the exact
disjoint set.

## 1. Verified 2026 official rule profile

The Foundation pins a dated rule profile rather than a timeless “current”
profile. `verified` below means an exact official representation and
field-level locator were observed. S235B did not persist, import, commit, or
hash the raw notice-asset bytes, and verification is not a redistribution
clearance.

| Field | Verified metadata |
|---|---|
| Qualification | 감정평가사 / Certified Appraiser |
| Related ministry | 국토교통부 |
| Administering agency | 한국산업인력공단 |
| Annual notice | 2026년도 제37회 감정평가사 국가자격시험 시행계획 공고 |
| Notice number/date | 공고 제2026-002호 / 2026-01-02 |
| First-round exam date | 2026-04-04 |
| Scored form | paper-based, single-select, five choices |
| Questions | 40 per scored subject, 200 total |
| Session 1 | 2026-04-04 09:30–11:30 Asia/Seoul, 120 minutes, 3 subjects / 120 questions |
| Session 2 | 2026-04-04 12:00–13:20 Asia/Seoul, 80 minutes, 2 subjects / 80 questions |
| Passing threshold | every scored subject at least 40/100 and scored-subject average at least 60/100 |
| Version basis | Law and K-IFRS in force on the exam date |

Primary official evidence:

- [Q-Net 2026 annual notice](https://www.q-net.or.kr/man004.do?ARTL_SEQ=5250965&BOARD_ID=Q001&gId=60&gSite=L&id=man00402),
  post `5250965`, board `Q001`, PDF asset `2247053`;
- [Q-Net stable execution-notice view](https://www.q-net.or.kr/crf002.do?gId=60&gSite=L&id=crf00201);
- [Q-Net qualification detail](https://www.q-net.or.kr/crf005.do?id=crf00503&jmCd=9745);
- [Article 9 direct view](https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0009&lsiSeq=265547&urlMode=lsScJoRltInfoR);
- [Annex 1 direct view](https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsiSeq=265547&lsNm=%EA%B0%90%EC%A0%95%ED%8F%89%EA%B0%80+%EB%B0%8F+%EA%B0%90%ED%8F%89%EA%B0%80%EC%82%AC%EC%97%90+%EA%B4%80%ED%95%9C+%EB%B2%95%EB%A5%A0+%EC%8B%9C%ED%96%89%EB%A0%B9&bylNo=0001&bylBrNo=00&bylCls=BE&bylEfYd=20240926&bylEfYdYn=Y);
- [Annex 2 direct view](https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsiSeq=265547&lsNm=%EA%B0%90%EC%A0%95%ED%8F%89%EA%B0%80+%EB%B0%8F+%EA%B0%90%ED%8F%89%EA%B0%80%EC%82%AC%EC%97%90+%EA%B4%80%ED%95%9C+%EB%B2%95%EB%A5%A0+%EC%8B%9C%ED%96%89%EB%A0%B9&bylNo=0002&bylBrNo=00&bylCls=BE&bylEfYd=20240926&bylEfYdYn=Y).

The exact field anchors are:

| Verified fields | Official representation | Exact locator |
|---|---|---|
| Notice identity, number, date, attachment IDs | Q-Net post `5250965` rendered HTML | title, attachment list, announcement-number/date block |
| Notice identity | Q-Net `crf002` rendered HTML | 감정평가사 시행공고, 공고 제2026-002호, 2026-01-02 |
| First-round date | Q-Net post `5250965`, PDF asset `2247053` | printed p.2, §2 시험일정 및 시행지역, 제1차 시험 row |
| Six statutory subjects, five scored subjects, relationship Laws, five-choice form, exam-date Law/K-IFRS basis | same official PDF asset | printed p.2, §3 가. 시험과목, 제1차 시험 row and following notes |
| 40 questions per subject and the two timed sessions | same official PDF asset | printed p.3, §3 나. 과목별 시험시간, 제1차 시험 rows |
| 40/60 pass rule and English exclusion | same official PDF asset | printed p.4, §5 가. 합격자 결정, 제1차 시험 paragraph |
| English recognition window, accepted tests, thresholds, verification | same official PDF asset | printed pp.1 and 8, 주요 강조사항 and §8 가. 기준점수 |
| Statutory structure and five-year English rule | Law.go `lsiSeq=265547` Article view | Article 9(1), (4), and (5), `joNo=0009` |
| Relationship-Law subject scope | Law.go `lsiSeq=265547` Annex 1 view | `bylNo=0001`, `bylEfYd=20240926` |
| English tests and thresholds | Law.go `lsiSeq=265547` Annex 2 view | `bylNo=0002`, `bylEfYd=20240926` |
| Qualification identity, ministry, and agency | Q-Net qualification detail | `jmCd=9745` identity block |

The HTML and locator observations are recorded as metadata. No raw attachment
body was retained, imported, committed, or hashed by S235B; its digest remains
null and O3B must fail closed until the exact official bytes and rights are
reviewed.

### English and the five scored subjects

The statutory subject list includes English. English is replaced by a
qualifying external language-test score and is not one of the five scored MCQ
subjects. Therefore the contract keeps these concepts separate:

- `statutorySubjectCount = 6`;
- `scoredMcqSubjectCount = 5`;
- `englishRule = external_qualifying_score_replacement`.

For the 2026 round, the official profile applies the statutory five-year
recognition rule, with eligible tests taken on or after 2022-08-20 and results
published by 2026-04-03, subject to official verification. The general
minimums are TOEFL PBT 530, TOEFL iBT 71, TOEIC 700, TEPS 340, G-TELP
Level 2 65, FLEX 625, TOSEL Advanced 640, and IELTS Overall 4.5. The
official notice separately defines listening-excluded thresholds for
qualifying severe hearing disability; the machine contract records those
values and nulls where no threshold applies.

The five scored subjects are:

| Stable subject ID | Official label | Verified scope | Contract-only validator boundary |
|---|---|---|---|
| `civil_law` | 민법 | 총칙 및 물권 | exam-date Law snapshot |
| `economics_principles` | 경제학원론 | subject level | deterministic formula, graph, and unit checks |
| `real_estate_principles` | 부동산학원론 | subject level | source-grounded concept and calculation checks |
| `appraiser_related_law` | 감정평가 관계 법규 | 시행령 별표 1 | exam-date multi-Law snapshot |
| `accounting` | 회계학 | K-IFRS | deterministic journal, measurement, and calculation checks |

This verifies official subject identity and statutory scope. It does not
promote the repository's legacy concept nodes to an official syllabus.
Detailed concept taxonomy remains a later reviewed contract.

The verified relationship-Law scope is:

1. 국토의 계획 및 이용에 관한 법률;
2. 건축법;
3. 공간정보의 구축 및 관리 등에 관한 법률 중 지적에 관한 규정;
4. 국유재산법;
5. 도시 및 주거환경정비법;
6. 부동산등기법;
7. 감정평가 및 감정평가사에 관한 법률;
8. 부동산 가격공시에 관한 법률;
9. 동산·채권 등의 담보에 관한 법률.

## 2. Q-Net source and rights manifests

Official availability is not a redistribution decision. Each post and every
attached asset receives an independent record. The effective item decision is
the most restrictive post-or-asset decision.

### 2026 annual-notice post

| Field | Evidence |
|---|---|
| Post | `5250965`, board `Q001` |
| Exact title | 2026년도 제37회 감정평가사 국가자격시험 시행계획 공고 |
| Official URL | [Q-Net post](https://www.q-net.or.kr/man004.do?ARTL_SEQ=5250965&BOARD_ID=Q001&gId=60&gSite=L&id=man00402) |
| Q-Net registration / announcement | 2025-12-29 / 2026-01-02 |
| Observed | 2026-07-23 |
| Post-specific license evidence | no KOGL label observed |
| Current S235B decision | rights unresolved, Owner legal/O3B review required, metadata and link only |

The exact post lists two separate assets:

| Asset ID | Filename | S235B raw-byte/digest state | License/attribution status | Rights decision |
|---|---|---|---|---|
| `2247052` | 2026년도 제37회 감정평가사 국가자격시험 시행계획 공고.hwpx | not retained/imported; no digest | unknown / unresolved | O3B review required |
| `2247053` | 2026년도 제37회 감정평가사 국가자격시험 시행계획 공고.pdf | not retained/imported; no digest | unknown / unresolved | O3B review required |

### 2026 question-sheet post

| Field | Evidence |
|---|---|
| Post | `5258924`, board `Q004` |
| Exact title | 2026년 제37회 감정평가사 1차시험 기출문제 |
| Official URL | [Q-Net post](https://www.q-net.or.kr/cst003.do?artlSeq=5258924&boardId=Q004&gId=60&gSite=L&id=cst00302) |
| Board-list date | 2026-04-04 |
| Detail page displayed registration date | 2026-07-07 |
| Observed | 2026-07-23 |
| Post notice | 공공누리 제1유형, 출처표시 |
| Current S235B decision | post-level label observed; per-asset rights unresolved; Owner O3B unapproved; metadata and link only |

The exact post lists two separate assets:

| Asset ID | Filename | Fetch/hash status | Rights decision |
|---|---|---|---|
| `2253620` | 2026년 제37회 감정평가사 1차 1교시.pdf | not retained/imported; no digest | O3B review required |
| `2253621` | 2026년 제37회 감정평가사 1차 2교시.pdf | not retained/imported; no digest | O3B review required |

### 2026 final-answer post

| Field | Evidence |
|---|---|
| Post | `5262739`, board `Q004` |
| Exact title | 2026년 제37회 감정평가사 1차시험 최종정답 |
| Official URL | [Q-Net post](https://www.q-net.or.kr/cst003.do?artlSeq=5262739&boardId=Q004&gId=60&gSite=L&id=cst00302) |
| Board-list date | 2026-05-06 |
| Detail page displayed registration date | 2026-07-09 |
| Observed | 2026-07-23 |
| Post notice | 공공누리 제1유형, 출처표시 |
| Current S235B decision | post-level label observed; per-asset rights unresolved; Owner O3B unapproved; metadata and link only |

The exact post lists one asset:

| Asset ID | Filename | Fetch/hash status | Rights decision |
|---|---|---|---|
| `2256457` | [붙임] 감정평가사 1차 최종 정답.hwp | not retained/imported; no digest | O3B review required |

### Rights decision rules

For each post, record:

- exact canonical URL, post and board identifiers;
- exact title and department;
- board-list date and detail-page displayed registration date separately;
- observation time;
- exact license label and evidence;
- attribution requirement;
- owner/reviewer and decision.

The future O3B post receipt also binds the retrieved representation:
retrieval time, MIME type, positive byte count, SHA-256, a transport receipt,
and a content-identity receipt. Transport must prove HTTP 200, HTTPS
requested/final URLs, a verified official Q-Net host, and matching content
type. Identity fields must match the post URL and exact title.
Every future post or asset receipt is a closed, versioned, self-digested
receipt. References use the immutable tuple
`(evidence_id, evidence_version, evidence_sha256)`, projected from
`(receipt_id, receipt_version, receipt_sha256)`. Reusing a receipt ID with a
different version or digest fails closed.

For each asset, record:

- exact asset ID and filename;
- MIME/type, byte count, and SHA-256 only after an authorized private fetch;
- whether the license basis is asset-explicit, the exact post clearly
  encompasses the listed attachment, or unknown;
- third-party-rights review;
- attribution and final permitted-use decision.

Every asset receipt likewise binds artifact kind, exact asset ID/filename,
retrieval time, MIME type, positive byte count, SHA-256, transport receipt,
and content-identity receipt. The transport must terminate on a verified
official Q-Net host with HTTP 200. The representation magic must match PDF,
HWP, or HWPX as declared; an HTML error or unrelated download cannot satisfy
the receipt.

A decision label alone never grants a use. Each receipt also has a closed
decision scope naming the allowed plane, use, audience, source IDs, source
digest, exact attribution, policy basis, reviewer, review time, and expiry.
The machine field `allowed_scope_tuples` is an ordered set of closed
`(plane, use, audience)` records—not three independent allowlists or their
Cartesian product. The requested tuple must be an exact member. Post and
asset scopes are evaluated independently and the most restrictive result
wins. Only a named Owner-authorized human rights reviewer may issue or review
the receipt; a model may not do so.

Evidence kind and primary-basis status are also one closed decision, not two
independent vocabularies. The machine crosswalk binds the evidence kind,
evidence decision, basis type, basis decision, maximum final decisions,
maximum exact scope tuples, authoritative/official URL shapes, locator, and
attribution. No-basis evidence can produce only a rejected basis with empty
scope; metadata/citation policy can produce only metadata-and-link use with
empty scope; owner-private policy can reach at most the single Personal Raw
Vault tuple; and an official-license basis can use only tuples individually
proved at the exact locator in the hashed official evidence. Any unlisted
combination fails closed.

Later source verification must also cover exactly seven official
representations: the annual-notice HTML, stable execution-notice HTML,
annual-notice PDF, Law Article 9, Law Annex 1, Law Annex 2, and the Q-Net
qualification-detail HTML. Each representation has separate current
transport, content-identity/hash, field-anchor extraction, and rights
evidence. The PDF digest covers only its declared PDF field-evidence
projection and cannot stand in for HTML or Law anchors.

The Type 1 notices on the two Q004 posts are evidence, not an automatic S235B
grant. No post-specific KOGL label was observed for the Q001 annual notice.
Q-Net's general terms and any third-party material must be reviewed at O3B.
Every post and asset therefore carries the same explicit conservative
decision authority, `S235B_conservative_default_not_legal_approval`, with a
null reviewer/review time, `pending_O3B` status, and
`finalDecisionAllowedByS235B=false`. These fields document who did *not* make
a legal approval; O3B must record the eventual named reviewer and decision.
Until then:

- raw download and learner publication are not authorized;
- display is metadata and official deep link only;
- no question or answer body enters Git, logs, telemetry, test fixtures,
  screenshots, or a shared corpus;
- missing per-asset digest or rights evidence fails closed.

## 3. Exam-date Law and K-IFRS status

Historical official answer position and present/exam-date applicability are
different fields. A verified official key does not prove that a statement is
currently valid, and a current source does not prove the version applicable
on 2026-04-04.

### Law manifest

The Foundation requires one record for Civil Law and one for each of the nine
relationship Laws. Every record must contain:

- canonical official name;
- MST or `lsiSeq`;
- official URL;
- promulgation number and date;
- `effective_from` and `effective_to`;
- exam date;
- retrieval time and content SHA-256;
- exact exam scope;
- amendment disposition;
- reviewer and release decision.

`content_sha256` means the SHA-256 of the exact raw bytes returned by a named
official Law.go XML/download representation. The manifest must retain the
representation kind, request URL, content type, retrieval time, and byte
count. A transcoded, copied, or browser-rendered text digest is not a
substitute.

The later applicability proof must select the unique interval for which
`effective_from <= 2026-04-04 < effective_to`, treating a null end as open.
It binds the selected predecessor/successor, official version-history URL,
raw artifact digest, successful official-host transport, content identity,
and complete amendment-chain digest. The proof and official-history receipt
are closed ID/version/SHA evidence objects. The history receipt binds the
exact ordered version entries; the proof carries the complete ordered chain
records and count, and the chain's identity, promulgation, and
effective-interval projection must equal the history receipt exactly. The
top-level selected identity, interval, digest, transport, and identity
receipts must equal the unique selected chain row. Gaps, overlaps, omitted or
reordered entries, login/interstitial bodies, stale evidence, or any decision
other than
`verified_in_force_on_exam_date` fail closed.
Only a named Owner-authorized human Law reviewer may sign the proof.

S235B intentionally records every exam-date snapshot as
`unresolved_requires_exact_official_snapshot`. It does not use model memory,
a current-law landing page, or a historical official key as a substitute.
Release while unresolved is prohibited.

### K-IFRS manifest

Official metadata sources:

- [KASB active standards](https://www.kasb.or.kr/front/board/ingAccountingList.do);
- [KASB archive](https://www.kasb.or.kr/front/board/List2001.do);
- [KASB enactment/amendment status](https://www.kasb.or.kr/front/board/List2006.do).

The observed active archive is
`한국채택국제회계기준(시행중)_2026.zip`, effective as of 2026-01-01.
That alone does not prove completeness through the 2026-04-04 exam date.
The later evidence must review amendments and corrections through that date.
That review must include the known
`한국채택국제회계기준 수정목록 26-1` entry and every other official index
entry in the inclusive 2026-01-01 through 2026-04-04 window.

S235B did not retain, import, commit, or hash the archive bytes, store
standard text, or establish redistribution rights. Its exam-date
completeness and rights status remain unresolved, metadata-and-link only, and
release-blocking.
The future archive digest must cover the exact raw bytes of the named official
KASB ZIP; an extracted or repacked archive is not equivalent.

The archive receipt requires the expected filename, ZIP magic, nonempty
central directory, and ZIP/octet-stream transport. Index, amendment, and
correction artifacts use separately typed HTML/PDF/binary identity checks.
An always-required index-coverage receipt binds every page (or a proved
complete unpaginated listing), its ordered page digests, query window,
matched count, and every matched entry to the ordered inventory. A zero-match
decision and a positive-match fully-bound decision are distinct; neither a
partial listing nor a free-form negative assertion proves completeness.
The required index set is exactly the active-standards index and the
enactment/amendment-status index. Active-standard rows form their own closed
inventory; amendment/correction rows form a separate inventory. The active
inventory must map one-to-one to the ZIP's complete canonical member
inventory, including each member path, byte count, media type, and raw member
SHA-256. Every index page has transport and content-identity evidence. The
ordered union for each index must equal its corresponding inventory with no
omitted, duplicate, extra, or unclassified entry. Only a named
Owner-authorized human K-IFRS reviewer may sign the proof.

K-IFRS rights and version completeness are separate. Metadata-and-link-only
evidence may establish exam-date version status, but it cannot authorize
standard text, excerpts, corrections, explanations, or redistribution.
Private or cleared content use needs a separate current rights receipt whose
scope explicitly contains the requested plane, use, and audience. Rejected,
unknown, missing, or expired rights evidence fails closed.

## 4. Intake contracts

### Q-Net official

The common intake accepts a post ID, asset ID, source/version record, rights
decision, and verified official-key state. S235B supplies only the contract
and metadata. It imports no body.

### User private capture

Every photo, scan, private text, OCR revision, answer, or note is
`private_personal_use_only` in the Personal Raw Vault.

- Its only allowed purpose is future personal-service processing under an
  approved vault policy.
- It is ineligible for Shared Signal, model evaluation, training, or tuning.
- Actor and item references are vault-scoped, opaque, non-exportable, and
  may not become cross-vault equality handles.
- Source resolution does not reclassify it.
- Answer resolution does not reclassify it.
- It never promotes into the Cleared Content Bank.
- A separately authored work for which the user actually owns rights must be
  a distinct contribution object, with separate consent, rights review,
  quarantine, and O3 approval.
- This Work implements no upload or persistence behavior.
- Any future retention, user deletion, revocation, or irreversible tombstone
  behavior requires a separately Owner-approved policy; none exists here.
- Collection is disabled now. The fail-closed rule is “no approved policy, no
  collection,” even for the Personal Raw Vault.

### Rapid answer grid

The bodyless grid uses a vault-scoped opaque item reference; it does not
duplicate problem text and cannot be used outside the Personal Raw Vault.
Its contract fields are:

- grid and user-item references;
- subject ID;
- choice `1..5` or blank;
- confidence;
- elapsed milliseconds;
- answer-change state and previous choice;
- eliminated choice IDs;
- exposure and assistance state;
- answer time.

Raw question, answer, OCR, and source excerpts are forbidden.
The base grid is a closed twelve-field schema: unknown fields and unknown
enum values fail closed. Subject, confidence, exposure, and assistance use
closed vocabularies; elapsed time is a nonnegative integer; choice and
eliminated-choice values are limited to `1..5`; eliminated choices are
unique. Answer-change state must agree with a distinct previous choice, and
a blank current choice cannot claim an answer change.

No collection or export adapter is authorized. A future Shared Signal adapter
would require explicit O2 approval, purpose/consent/retention/revocation
receipts, and a rights-cleared global item ID or approved closed pseudonym.
It must exclude the vault reference, selected or previous choice, official
key, free text, raw content, and cross-vault actor identity.
Its output is also a closed twelve-field bodyless schema. Before any future
export it needs O2, consent, purpose/retention, revocation/deletion,
rights-or-pseudonymization, and nonreconstructiveness receipts. The latter
is a closed ID/version/SHA receipt binding adapter/schema/fixture,
attack-suite/configuration, and result receipt identities. It must pass
prohibited-field, content reconstruction, selected-choice reconstruction,
and cross-vault linkage checks with zero unresolved attacks. A named
Owner-authorized human privacy reviewer must sign it; a model cannot.

The adapter derivation is deterministic: blank maps to
`skipped`/`unanswered`; a selected unchanged answer maps to
`answered`/`selected`; a changed selected answer maps to
`answered`/`changed`. Confidence copies exactly. Elapsed time uses the pinned
`0..29999`, `30000..59999`, `60000..119999`, and `120000+` buckets. The raw
choice, prior choice, eliminated choices, timestamps, grid ID, and
vault-scoped item reference are never projected. Unknown or
nondeterministic branches fail closed. S235B creates no receipt or adapter.

## 5. Five-choice feedback and K/C/A/R/T/G

Each item has exactly five choice records. Each record separates:

- stable choice ID and position;
- `true`, `false`, or `unresolved` verdict;
- correction status and bodyless correction reference;
- explanation status and bodyless explanation reference;
- source anchors;
- Law or K-IFRS version status;
- uncertainty codes.

Choice IDs are unique, positions are exactly `1..5`, and a verified key
requires exactly one true verdict at the same position and exactly four false
verdicts; no unresolved verdict may remain. An unresolved key cannot release.
The state/plane matrix is closed: unresolved, no-correction,
withheld, and unavailable states carry no reference; a private draft can
resolve only in the Personal Raw Vault; a cleared explanation can resolve
only in the Cleared Content Bank.

An LLM cannot establish the official key. The historical Q-Net key,
deterministic validation, explanatory prose, and exam-date applicability are
separate states.

Correction states are `unresolved`, `verified_no_correction`,
`verified_correction_available`, and `withheld_rights_or_version`.
Explanation states are `unavailable`, `draft_private`,
`verified_cleared_available`, and `withheld_rights_or_version`. A bodyless
reference contains an immutable object ID/version/SHA tuple, authorized
plane, and immutable rights- and source-version-decision tuples. Bare mutable
decision IDs are not accepted. Both decisions must be current, unexpired,
and authorize the exact object version, plane, use, and audience. A reference
cannot contain body text or cross planes.

An approved release also carries one closed attribution projection for every
content-bearing rights receipt it uses: question post, question asset,
question object, official-key post and asset, and every non-null correction
or explanation. Each row binds the immutable rights reference and its exact
attribution byte-for-byte. The release retains first occurrence order while
deduplicating only byte-identical strings; differing question, key, or
feedback attributions remain separate. Each string must render verbatim as
its own attribution block. The verified-key receipt and feedback bundle carry
their component projections and digests, so the question attribution cannot
stand in for different key or feedback terms.

A correction or explanation may resolve only in the Personal Raw Vault or
the Cleared Content Bank. Release requires a verified official key, resolved
source rights, resolved *applicable* exam-date Law/K-IFRS state, and an
authorized object plane. Civil Law and relationship-Law items require a
verified Law status; Accounting requires a verified K-IFRS status. Economics
and Real Estate Principles require the explicit
`not_applicable_verified` state backed by their subject-validator receipt;
absence of a status is never an implicit bypass, and a model cannot set
not-applicable. An unresolved prerequisite withholds both body and reference.
Model output cannot create a verified state.

Every validator in the selected subject matrix has exactly one applicability
receipt. Applicable rows require a current input-derivation artifact and a
passing validator receipt; a `verified_not_applicable` row requires its
closed reason and forbids both. The full applicability-reference set covers
the matrix, while release pass references equal only the applicable
projection. At least one correctness validator remains applicable per item;
missing, duplicate, unknown, reviewer-selected, or implicit applicability
fails closed.

Every release requires a versioned receipt binding the item/version, source
post/asset, official round/session/subject/question identity and source
anchor, verified-key receipt, requested plane/use/audience, post and asset
rights scopes, source-version manifests, applicability or subject-validator
receipt, digest of all five choices,
correction/explanation object digests, authorship/model-assistance
provenance, deterministic validators, attribution, named human reviewer, and
decision. Missing or stale receipts fail closed; only
`approved_cleared_release` authorizes cleared release.
For a cleared release the exact tuple is Cleared Content Bank /
`cleared_redistribution` / `authorized_learner`; for a personal release it is
Personal Raw Vault / `personal_service_processing` /
`owner_user_private`. Both the question post/asset and final-key post/asset
scopes must be current, unexpired, and contain that tuple. A referenced
correction or explanation must use the same authorized plane.

The referenced official-key receipt binds the exact final-answer Q-Net
post/asset and raw digest, transport/content-identity receipts, and the
official round, session, subject, question number, question-sheet post/asset
digest and anchor, final-answer row locator, answer position,
retrieval/review times, and human decision. It also resolves a closed,
content-addressed 200-row key-table mapping receipt. That table covers
questions 1–40 exactly once in each of the five pinned subject/session
positions; the selected key row must match the item identity and both source
locators exactly. This prevents a valid answer row from being attached to the
wrong item. A model may not issue or review either key receipt. The
five-choice digest is
lowercase SHA-256 over RFC 8785 canonical JSON containing item identity and
exactly five position-ordered records, including referenced object IDs and
versions. Receipt/key/digest equality and freshness are mandatory.

The project-native cause taxonomy is:

| Code | Meaning |
|---|---|
| `K` | knowledge |
| `C` | concept |
| `A` | application |
| `R` | reading |
| `T` | time |
| `G` | guessing |

Feedback may identify at most one primary cause, one biggest gap, and one next
action. Secondary cause codes are not retained. Neither a correction nor a
supported success changes mastery in this Foundation.

K/C/A/R/T/G is 답안길 vocabulary, not QTI, xAPI, or Caliper vocabulary. Its
namespace is `urn:inverge:dabangil:first-round:cause:v1:` and its extension
property is `urn:inverge:dabangil:first-round:v1:cause-code`. Null means no
supported primary cause was assigned. A future adapter must use the exact six
codes or null. Cause is never serialized into QTI; it may appear only in the
named xAPI or reviewed Caliper extension location.

## 6. Standards mapping-ready shapes

All three profiles are mapping targets only. The versioned internal schema is
`dabangil.first_round.bodyless_event.v1` under
`urn:inverge:dabangil:first-round:v1:`. Every machine mapping record names a
source field, target field, target type, cardinality, constraint, extension
placement, and future enrichment. This is enough to review an adapter shape;
it is not implementation or a conformance claim.

Both internal schemas and the shared event envelope deny unknown fields; the
enumerated field set is exact. This prevents undeclared raw content or notes
from bypassing mapping coverage.

The xAPI and Caliper adapters share an exact ten-row project-extension table.
Each row fixes one source field, absolute property IRI, value type,
cardinality, null encoding, and target placement. Nullable confidence,
elapsed-time, and cause values are omitted rather than encoded as null; no
wildcard project property may be invented by an adapter.

### QTI 3.0.1

Target: [QTI 3.0.1](https://www.1edtech.org/standards/qti/index).

This is a static QTI item/content-package mapping shape. It is not an adaptive
delivery, importer/exporter, player, or conformance implementation.

The QTI mapping contract requires:

- the QTI assessment-item namespace
  `http://www.imsglobal.org/xsd/imsqtiasi_v3p0`, XML Schema Instance
  namespace, and pinned assessment-item schema location;
- `qti-assessment-item@identifier` from a rights-cleared stable item ID, a
  nonempty rights-cleared `@title`, `adaptive=false`, and
  `time-dependent=false`;
- exactly one future-authorized `qti-item-body` resolver; S235B carries no
  item body;
- a shared `RESPONSE` identifier between `qti-response-declaration` and
  `qti-choice-interaction`, with `cardinality=single`,
  `base-type=identifier`, `min-choices=1`, and `max-choices=1`;
- exactly five unique `qti-simple-choice@identifier` values;
- a correct-response value and one selected custom inline-processing mode only
  after the verified-key/rights/version release gate; that mode omits the
  `@template` attribute and uses two exact branches: matching `RESPONSE` to
  the verified correct identifier assigns `SCORE=1`; every other submitted
  response assigns `SCORE=0`; both assign
  `FEEDBACK=FEEDBACK_AVAILABLE`;
- a `SCORE` outcome with single/float/default-zero semantics;
- a `FEEDBACK` single/identifier outcome and at most one released modal with
  `identifier=FEEDBACK_AVAILABLE`, `outcome-identifier=FEEDBACK`,
  `show-hide=show`, and future authorized `qti-content-body` resolution that
  may combine the correction and explanation references; the feedback array
  is exactly the ordered non-null projection of correction then explanation,
  so an inconsistent second content reference cannot be substituted;
- an immutable release reference plus the exact attribution-row digest,
  ordered unique attribution values, and their digest in the internal QTI
  shape. Both the resolved item body and feedback modal must render each
  distinct value verbatim as a separate attribution block; normalization,
  collapse, reordering, or omission fails closed;
- bodyless source-version-manifest metadata only in the QTI Content Package
  `imscp:resource/imscp:metadata/inverge:first-round-metadata`, where the
  manifest and resource identifiers are valid unique XML IDs/NCNames,
  resource/file `href` values are valid URI references, the package namespace is
  `http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p1`, resource type is
  `imsqti_item_xmlv3p0`, schema metadata is `QTI Package` / `3.0.0`, and
  `inverge` is bound to `urn:inverge:dabangil:first-round:v1:`—never as an
  unrecognized assessment-item child; K/C/A/R/T/G cause metadata is excluded
  from QTI entirely.

The Content Package wildcard is treated as strict. Custom Inverge metadata
therefore remains non-emittable until a future pinned
`schemas/inverge-first-round-metadata-v1.xsd` exists, its raw SHA-256 and
target namespace are receipt-bound, its namespace/schema pair is added to
manifest `xsi:schemaLocation`, and strict validation verifies the exact
global element, named complex type, simple type, order, and cardinality
declarations. The future XSD root binds `xs` and `inverge` exactly, uses
`elementFormDefault=qualified` and
`attributeFormDefault=unqualified`, and permits no wildcard or extra
attribute. Its verification receipt is a closed immutable evidence object
signed by a named human reviewer. The schema and receipt are not created by
S235B.

The selected inline rule is an exact QName AST, not prose: an outer
`qti-not/qti-is-null` gate ensures a submitted `RESPONSE`; the nested
`qti-match` against `qti-correct` sets score/feedback for the correct branch,
and `qti-response-else` sets score zero with the same feedback outcome. The
AST has no `template` attribute and must be serialized exactly.

S235B implements no XML/JSON exporter, importer, player, test runner, Results
Reporting, Usage Data, or CAT. An item mapping does not imply adaptive runtime.
The standard score-only `match_correct.xml` template is documented as the
unselected alternative and cannot be combined with modal feedback; processing
modes are mutually exclusive.

### xAPI

Target: [IEEE 9274.1.1-2023](https://standards.ieee.org/ieee/9274.1.1/7321/).

The xAPI Statement shape maps UUID, actor, verb, Activity, bodyless result and
context extensions, timestamp, authority, and provenance. Attempt kinds map
exactly to the ADL `initialized`, `answered`, `completed`, and `skipped` verb
IRIs. Actor and Activity export require O2-approved closed pseudonyms or
rights-cleared global IDs; vault-local references never leave the vault.
An exported actor has `objectType=Agent` and exactly one Account IFI, with
both an approved absolute-IRI `account.homePage` and opaque `account.name`;
other IFI forms are absent. Authority uses the same exact Account shape as a
closed service Agent, never learner identity, and the receiving LRS verifies
and may overwrite submitted authority. Completed statements select the
assessment reference, while item attempts select the item reference. The
cause code is only
`Statement.context.extensions[urn:inverge:dabangil:first-round:v1:cause-code]`.
`Statement.result.extensions` is one exact map with answer-state and
answer-changed required plus zero to two optional confidence/elapsed keys.
`Statement.context.extensions` is one exact union map with five required
subject/exposure/assistance/contract-version/manifest keys plus optional
cause. There are not two competing context maps, and no other key is allowed.
The internal `occurred_at` value is a valid Gregorian/RFC 3339 UTC instant
spelled with uppercase `Z` and exactly three fractional-second digits.
The mapping compares it with a trusted adapter clock and rejects a future
time; it does not clamp, coerce, rewrite, substitute, or normalize an offset.
The exact validated source string becomes `Statement.timestamp`. This
mapping-only rule follows the pinned
[IEEE xAPI Content snapshot](https://opensource.ieee.org/xapi/xapi-base-standard-documentation/-/blob/24586e13b897697537fb73b9818d86ba403ab787/9274.1.1%20xAPI%20Base%20Standard%20for%20Content.md),
which requires UTC formatting, prohibits a future Statement timestamp from
an LRP, and recommends millisecond precision. It is not an adapter or
conformance claim.
S235B implements no LRS, transport, storage, query, delivery, or Production
collection.

### Caliper Analytics 1.2

Target: [Caliper Analytics 1.2](https://www.imsglobal.org/spec/caliper/v1p2).

The contract pins `AssessmentProfile` and the mandatory context
`http://purl.imsglobal.org/ctx/caliper/v1p2`. Started, answered, completed,
and skipped map respectively to reviewed Assessment/AssessmentItem event,
action, object, and generated-entity combinations. Every event maps `id`,
`type`, `profile`, `actor`, `action`, `object`, `eventTime`, and `edApp`;
bodyless generated Response/Attempt entities and absolute-IRI project
extensions remain conditional. A completed event requires a non-null
assessment reference for its Assessment object and may not substitute the
item reference; started, answered, and skipped use the item reference. Project
`object` serializes as an inline entity with exactly `id` and mapped `type`.
When the event map names a generated type, `generated` is likewise an inline
entity with exactly `id` and `type`; when that type is null, `generated` is
absent. Extra entity keys fail closed. Project
extensions use absolute IRI keys only under
`Event.extensions[urn:inverge:dabangil:first-round:v1:*]`. If a future context
array is used, the Caliper context remains last. The extension map has
exactly seven required keys and zero to three optional
confidence/elapsed/cause keys; no other extension key is allowed. S235B
implements no Sensor,
Envelope transport, delivery, analytics system, or efficacy claim.

### Shared event boundary

The contract-only internal event includes IDs, versions, vault-local actor and
service-authority references, optional pre-adapter Account fields,
subject/item/assessment/generated references, attempt kind, answer state,
confidence and elapsed-time buckets, answer change, exposure, assistance,
cause code, source/version provenance, pinned Caliper context, and the
canonical UTC-`Z` millisecond event time described above.

It contains no raw content, selected choice, official key, or free text. It
remains in the Personal Raw Vault for personal-service processing only.
Collection itself is disabled until explicit consent, approved retention, and
revocation/deletion receipts exist. Shared Signal, model
evaluation/training/tuning, cross-vault actor resolution, and standards export
are disabled. Any export remains blocked pending explicit O2 approval of a
closed, nonreconstructive adapter, and it is not collected in Production.

## 7. Gold, held-out, timed, and OMR readiness

Contract-level physical and logical separation is mandatory:

| Class | Boundary / future root | Access | Purpose |
|---|---|---|---|
| Gold | `first-round-gold-vault-v1` / `vault://first-round-gold-v1/` | gold curator + quality-validation workload | reviewed quality and deterministic validation |
| Readiness held-out | `first-round-heldout-vault-v1` / `vault://first-round-heldout-v1/` | held-out evaluator + readiness-runner workload only | unseen timed evaluation only |

The storage boundary IDs, roots, encryption-key classes, principal classes,
dataset IDs, access classes, manifest paths, and purposes must remain
distinct. Each displayed future manifest path is relative to its separate
future vault root and is not a Git path. Copying either direction, sharing a
key or principal, or disclosing
held-out membership to developers is forbidden. Git may contain only a
nonidentifying attestation and manifest/access-policy/contamination digests,
never bodies or membership. This Work defines that requirement; it does not
create a store, dataset, key, principal, or enforcement claim.

Held-out material may not enter learning, tuning, prompting, ordinary review,
development inspection, application builds, ordinary CI, developer
workstations, or Preview. Every future manifest needs source post/asset IDs,
content digest, rights decision, answer status, Law/K-IFRS status, reviewer,
physical-separation attestation, and decision. Gold additionally requires an
exact Gold ingress receipt and Gold provenance receipt; held-out additionally
requires exact held-out ingress, split-provenance, access-log, and
contamination receipts. Opposite-class fields are forbidden, and no ingress
receipt may be reused across classes.

Private material cannot be implicitly promoted. Gold or held-out ingress is
allowed only from the Cleared Content Bank when both post and asset rights
receipts authorize the exact target boundary, purpose, and principal class.
Each ingress receipt binds item/version, source plane, both rights tuples,
effective decision/scope, target dataset/version/root/key class, principals,
policies, reviewer, and decision. Personal Raw Vault ingress is explicitly
rejected.

Each future ingress is target-vault specific. It requires a bodyless target
object reference, a write/content-identity receipt, and a read-after-write
receipt proving that the exact target bytes, digest, boundary root, object
version, and key class match the authorized source object. Question items,
official keys, corrections, and explanations each carry their exact
per-object rights projection; a manifest-level decision cannot substitute for
one missing object receipt. Each per-object ingress binding also carries its
exact byte-preserving attribution set. Gold and held-out receipts copy the
release attribution rows, unique display order, and both digests exactly.
The unordered set/cardinality union of per-object attributions must equal the
release set; ingress record class order cannot contradict the release's
authoritative display order.

The Gold provenance receipt binds its actual dataset/version, manifest
digest, storage root, key class and nonsecret key fingerprint, principal set,
access-policy tuple, membership digest, and every Gold ingress tuple. The
cross-boundary physical-separation attestation binds both actual datasets,
roots, manifest digests, key classes/fingerprints, principal sets, and
access-policy digests. Dataset IDs, manifests, boundaries, roots, keys,
policies, and principal sets must be different; the principal sets must be
disjoint. A named human separation reviewer signs it.

The held-out access receipt covers every ordered access event from boundary
creation through evaluation, with only allowed principals and zero
unauthorized, developer, or unclassified events. The contamination receipt
binds held-out identity, comparison-set manifests, tool/version/configuration,
ordered results, and exact aggregate counts. Exact, near-duplicate, semantic,
and unresolved counts must all be zero. Both are immutable ID/version/SHA
receipts and must carry their required decisions.

Readiness requires:

- verified source, rights, official key, and applicable version;
- an unseen item or verified variant;
- an independent, unassisted attempt;
- timed completion;
- a held-out contamination pass.

Repeated-item memorization and assisted success cannot establish readiness.
The current readiness state is `insufficient_evidence`.

The timed/OMR contract pins:

- Session 1: 120 questions / 120 minutes;
- Session 2: 80 questions / 80 minutes;
- exact session profile IDs and canonical 40-question subject-position ranges;
- selected-mark arrays over `1..5`;
- mark state: `single`, `blank`, `multiple`, `ambiguous`, or `unreadable`;
- transfer state, answer-change state, previous marks, correction-history
  reference, correction resolution, and its receipt;
- form/session/item/subject identity, source clock, elapsed time, marked,
  transferred, and finalized timestamps, and a timing-provenance receipt;
- a timed-session receipt reference and receipt fields for start/final time,
  elapsed time, record count, complete unique position coverage, exact
  subject-position mapping, clock, split, independent-attempt, assistance,
  and timing provenance;
- exposure, assistance, independent-attempt, split, variant, and applicable
  version/subject-validator evidence.

The OMR response record is a closed exact-field schema and explicitly forbids
question/answer/OCR bodies, source excerpts, and free-text notes.

Only `mark_state=single` with exactly one selected mark and a matching,
non-null final choice can proceed. Every other mark state requires a null
final choice. A finalized transfer requires non-null transferred/finalized
times ordered `marked_at <= transferred_at <= finalized_at`, no unresolved
correction, and every cross-field invariant to pass. An answer change requires
distinct previous marks, a correction-history reference, an applied/resolved
state, and a non-null resolution receipt even after finalization; no change
requires all of those references/receipts to be null. The referenced
correction receipt binds session/form/item, before/after mark digests,
history, resolution, resolver/reviewer, timestamps, receipt digest, and
decision. A corrected transfer cannot count before finalization. The record
must bind to a known
session, an in-range position and its exact subject, nonnegative elapsed time
within 7,200,000 ms or 4,800,000 ms, and timestamps inside the session
receipt. The receipt must cover positions `1..120` or `1..80` exactly once
with no missing or duplicate record. Blank, multiple, ambiguous, unreadable,
corrected-but-not-finalized, in-progress, invalid, incomplete-session, or
otherwise unresolved records
fail closed and cannot count toward readiness.

The session receipt has its own ID, and every response reference must equal
it. Start must precede finalization; elapsed milliseconds must be a
nonnegative exact difference on the named source clock and no more than the
selected profile maximum. Form, clock, timing, split, independent-attempt,
assistance, exposure, record count, and ordered position digest are bound
between records and receipts. `unseen` pairs only with `original_unseen`;
`verified_variant` requires the matching variant state and receipt; `seen`
is not eligible.

Personal answer handling also requires a five-phase consent, purpose
limitation, retention, revocation, and deletion evidence chain tied to the
pre-session event-log precommit and one actor-vault scope. Phase ordinals,
timestamps, nullability, and common fields are closed; deletion must be
independently evidenced with zero residual copies across memory, buffers,
logs, caches, and backups. Evaluation uses a nonidentifying salted choice
commitment: a unique 32-byte salt is required in the Personal-vault
commitment and opening, and may enter only the future Owner-approved
memory-only comparison bridge. Neither salt nor raw marks may be retained in
an evaluator receipt, log, cache, backup, or store. The short-lived bridge
and separately signed raw-choice destruction receipt must prove that boundary.
These are future receipt contracts, not a learner runtime or a claim that
processing occurred.

It makes no pass-probability claim.

## 8. S236B OCR benchmark contract

OpenCV and PaddleOCR remain `proposed` candidates. The maximum future target
is a benchmark under a later, manually selected S236B; execution cannot start
automatically.

| Candidate | Contract role | Current state |
|---|---|---|
| OpenCV | crop, deskew, perspective, shadow, and noise preprocessing | proposed / not executed |
| PaddleOCR | text, table, formula, and layout candidate | proposed / not executed |

Future S236B evidence must address negation, numbers, signs, percentages,
choice order, Law dates, tables, and formulas. Benchmark entry first requires
the exact set of pinned candidate versions, license and SBOM receipt, model
asset rights receipt, isolated environment, native manual fallback, named
benchmark owner, and tested rollback receipt. Later results additionally need
an authorized fixture manifest, field-level ground truth, accuracy/latency
metrics, failure taxonomy, and rollback execution result.

The supply-chain receipt carries closed candidate rows in contract order,
their recomputed candidate-set/configuration roots, component rows with
current license evidence, and model-asset rows with current per-asset rights
evidence. A candidate with an empty component or model-asset inventory must
instead provide a current, typed `verified_none_required` receipt; absence is
never treated as an empty verified inventory. The accepted benchmark
execution projection is recomputed from those exact candidate rows and binds
candidate name, pinned version, and per-candidate configuration digest in
order. The isolated environment binds both its identity and configuration
digest.

S235B adds no dependency, model asset, benchmark result, or performance claim.

## 9. Later gates

### S236B

S236B remains queued and requires manual Owner selection. Its input packet
must name the merged S235B SHA/tree, contract versions, private-capture
boundary, OCR risk fields, a synthetic or separately authorized private
fixture manifest, source/rights manifest, proof of no real-content import,
and explicit selection. Every input is bound by evidence ID, version,
SHA-256, status, decision, issuer/reviewer, observation time, and expiry;
the ordered tuple has a packet digest. Any identity, content, status, or
decision change expires the packet, including fixture authorization/digest.

The S236B cross-input contract has seven dimensions: candidate-set preimage
and scalar carriers, candidate-configuration preimage and scalar carriers,
fixture-manifest digest, environment identity/configuration, and rollback
state. Every matrix position resolves one exact versioned derivation
specification and transformation; direct JSON pointers and array-field
projections are closed and evaluated at one head/tree. Scalar carriers are
compared only as complete roots and are never inverted into hidden fields.
The benchmark-execution evidence used for S236B has no S236B gate-packet
dependency, so the entry proof is acyclic.

### O3B

O3B remains queued and unapproved. Its exact future packet must include:

- exact approved scope and excluded actions;
- S235B and S236B SHA/tree;
- official rule and subject-taxonomy versions;
- per-post rights evidence;
- each asset's digest, rights basis, attribution, and decision;
- official-answer status;
- exam-date Law and K-IFRS status;
- Gold reviewer identity and decision;
- held-out separation and contamination evidence;
- unresolved rights/version count;
- safe deferred state and expiry triggers.

Future packet evidence is cryptographically rooted. An Owner-approved key
registry pins authority class, algorithm, canonical public-key encoding,
fingerprint, activation, rotation, and revocation. Root-authority receipts
sign domain-separated RFC 8785 UTF-8 bytes with canonical Ed25519 or
low-S P-256/P1363 encoding. A gate-specific trust-anchor projection, every
input derivation, cross-input coherence result, and the final gate packet
share the exact scope, head, tree, currentness horizon, and non-null expiry.

The cross-plane readiness path additionally requires one current,
non-revoked Owner decision for the exact O3B scope and exclusions. Its closed
root-attestation schema signs the exact scope ID, decision type, included and
excluded action arrays, cross-plane authorization boundary, Owner-scope
contract digest, ordered contract-pointer digest rows, trust-anchor
projection, decision-payload digest, and decision time; unknown or
wrong-typed fields fail closed. The nested authorization-boundary schema also
requires the action-time currentness object and closes its exact fields and
literals, and its decision-payload digest contract is in the same mechanically
recomputed nested registry. The signed object is invalid if either nested
contract is absent, altered, or extended. The executed Owner virtual assertion
also reads the packet-selected root-anchor projection reference and digest as
two closed gate-context sources and requires exact equality with the signed
Owner values. A retained key cannot replay an approval across an anchor
projection change. The ordered digest rows bind exactly:

1. `timedOmrReadinessContract.dataBoundary`;
2. `goldHeldOutSeparationContract.heldOutIngressReceiptShape`;
3. `goldHeldOutSeparationContract.crossBoundaryRules`.

The exact Owner virtual receipt is the first evidence projection in all five
relevant O3B inputs: scope/exclusions, privacy lifecycle, Personal event-log
chain, timed/evaluation chain, and cross-plane comparison/final binding.
Their `owner_scope_decision_identity` coherence dimension compares the same
immutable `evidence_id`, `evidence_version`, and `evidence_sha256`. Each
derivation reads that projected virtual receipt and its currentness receipt
directly; it never reads the enclosing gate-input receipt or a digest that
depends on itself. The digest-covered carrier field is only a mirror, so
self-reference and digest cycles fail closed.

Approval is re-resolved immediately before collection, processing, commitment
opening or bridge activation, evaluation/scoring, and output. The resolved
status must still be current and not revoked or superseded, and its non-null
expiry must be later than each concrete action timestamp. A policy
`reviewed_at` value alone is insufficient. Owner-decision identity, status,
decision, reviewer/time, revocation, supersession, or expiry changes expire
the privacy, Personal-log, timed/evaluation, and cross-plane O3B inputs.

Privacy and timed-session evidence are joined by immutable precommit identity,
not merely by actor scope. A dedicated O3B coherence dimension requires all
five privacy lifecycle rows to carry one identical
`timed_session_precommit_reference` and compares its exact `evidence_id`,
`evidence_version`, and `evidence_sha256` with the directly projected
Personal-session event-log precommit receipt. The existing timed-session
identity dimension then binds that Personal-log precommit to the timed,
evaluation, and cross-plane chains. Privacy for session A therefore cannot be
combined with timed/evaluation evidence for session B.

O3B benchmark evidence is post-S236 only. It must reference a current passing
S236B gate packet, that packet's exact coherence receipt, and a trusted
merged-S236B Git snapshot whose commit/tree equal the packet evaluation
head/tree. Its candidate execution rows remain bound to the earlier
supply-chain preimage. “Zero unresolved” requires an explicit closed
population manifest: ordered member rows, member-status evidence, recomputed
manifest digest/count, and an exact unresolved-member projection. A signed
opaque zero or empty unresolved list is insufficient.

The packet expires if a source URL or asset ID/digest, rights label or terms,
attribution, answer status, Law/K-IFRS version, reviewer, rule anchor,
taxonomy, Gold/held-out boundary or receipt, five-choice release receipt,
timed/OMR receipt, privacy-policy receipt, benchmark fixture/configuration,
unresolved count, safe state, packet digest, or PR head changes. Each required
input uses the same immutable evidence tuple and ordered packet digest.
O3B never approves itself.

All of these are future evidence shapes required by S236B or O3B. S235B did
not execute them and makes no passing-gate, benchmark, runtime, or Production
telemetry claim.

## Safe state after S235B

After this contract merges:

- S235A remains completed by its separate PR `#656` and is untouched by this
  Work;
- S236B is queued and not started;
- O3B is queued and unapproved;
- S237B and O4B remain queued;
- first-round learner runtime, navigation, pricing, billing, and public claims
  remain unstarted and unauthorized;
- no downstream item transitions automatically.
