# S226 답안길 Visual System Implementation Spec

This file is subordinate to `AGENTS.md`, `docs/inverge-second-round-final-product-spec.md`, `docs/dabangil-second-exam-premium-os.md`, and `roadmap/active-program.yml`.

## Product Scope

답안길 is the learner-facing brand for the 감정평가사 2차 answer operating system.

Current learner-facing scope is fixed to 감정평가사 2차 only:

- 감정평가실무
- 감정평가이론
- 감정평가 및 보상법규

1차 code may remain for internal compatibility, historical regression coverage, and rollback. It must not be newly surfaced in learner-facing landing, onboarding, navigation, pricing, authenticated product framing, or public CTA copy.

Do not introduce generic multi-exam framing, broad AI study copy, public archive framing, or any unsupported exam track.

## Product Identity

Learner-facing product:

- Brand: 답안길
- Product: 답안길 2차 합격관제 OS
- Positioning: 감평 2차 실무·이론·법규 답안을 시험일까지 운영해주는 합격관제 OS

답안길 is a calm premium operating system for the loop:

historical question or learner answer → attempt/input → OCR/text confirmation → Evidence Review → one biggest gap → one next rewrite/recalculation action → verified learning reference where available → rewrite or recalculation → error note/concept state → scheduled review.

답안길 is not an official grader, official model-answer service, pass-probability product, guaranteed-score product, public historical-question archive, generic dashboard SaaS, or human expert-review consumer service.

## Visual Target

The interface should feel:

- warm, minimal, and premium
- Korean-native and highly legible
- operational rather than promotional
- calm under fatigue
- useful, understandable, unobtrusive, honest, and thorough

Avoid:

- flashy gradients
- saturated decorative color
- fuchsia, lime, salmon, neon palettes
- glassmorphism
- dashboard card explosions
- equal-weight CTA grids
- motivational streak mechanics
- long generic AI persuasion

## S226 Density/Taste Gates

Every learner-facing S226 surface must satisfy these gates:

1. One screen has one dominant action.
2. Above the fold has at most one primary CTA.
3. One strong surface per viewport.
4. Secondary diagnostics are collapsed by default.
5. 85-90% of the screen remains neutral.
6. Brand navy is limited to primary CTA, active state, or focus cues.
7. Semantic colors are used only for real status: review, focus, risk, stable, compare.
8. Subject colors are allowed only as chips, dots, thin borders, or left accents.
9. Trust copy is centralized as one Trust Evidence Bar per stage.
10. No official grading, official model answer, confirmed score, pass probability, pass guarantee, or AI final judgment claim appears.
11. Raw learner answer, OCR text, or problem text must not be added to tests, docs, telemetry, issue bodies, screenshots, or fixtures.
12. Authenticated app surfaces must never render public marketing hero, login CTA, or start CTA.

## Visual Tokens

`app/globals.css` is the implementation source for S226 primitives.

Required palette:

```css
:root {
  --bg-canvas: #F7F6F3;
  --bg-surface: #FFFFFF;
  --bg-subtle: #F2F0EA;
  --bg-elevated: #FCFBF8;
  --border-subtle: #E1DED6;
  --border-strong: #C9C5BC;
  --text-primary: #141821;
  --text-secondary: #5A6472;
  --text-tertiary: #647080;
  --text-inverse: #FFFFFF;
  --brand-900: #10233F;
  --brand-800: #163053;
  --brand-700: #23456F;
  --brand-050: #EEF4FB;
  --cue-review: #B56B16;
  --cue-review-bg: #FEF4E7;
  --cue-focus: #2B5C9A;
  --cue-focus-bg: #EDF4FC;
  --cue-risk: #B24D45;
  --cue-risk-text: #8F3832;
  --cue-risk-bg: #FDEDEC;
  --cue-stable: #2E6E58;
  --cue-stable-bg: #EAF6F0;
  --cue-compare: #6B53A6;
  --cue-compare-bg: #F2EEFB;
}
```

Required primitives:

- `.operating-surface`
- `.mission-surface`
- `.evidence-bar`
- `.trust-evidence`
- `.density-quiet`
- `.primary-action`
- `.secondary-action`
- `.status-review`
- `.status-risk`
- `.status-stable`
- `.status-compare`

Preserve:

- `--touch-target-min`
- focus-visible behavior
- `.ko-keep`
- `.hero-balance`
- `.text-readable`
- `.long-token`

## Typography

S232A aligns production foundations with Figma V3 Typography node `44:9`. The pinned, self-hosted roles are:

- UI and headings: Noto Sans KR Variable
- learner prose and evidence excerpts: Noto Serif KR Variable
- calculator notation and numeric progress: IBM Plex Mono 500

V3 type rhythm uses pixel size / pixel line-height / weight / tracking:

- display: 40 / 52 / 700 / -0.6px
- screen heading: 28 / 36 / 700 / -0.4px
- section heading: 20 / 28 / 700 / -0.2px
- item heading: 18 / 26 / 700 / -0.1px
- body: 16 / 26 / 400; strong uses 700
- compact: 14 / 22 / 400
- label: 13 / 20 / 500; strong is 15 / 22 / 700
- caption: 12 / 18 / 500 / +0.1px
- prose: 17 / 30 / 400 or 600, with a 42ch maximum measure
- mono display: 28 / 36 / 500
- mono small: 13 / 20 / 500

Use the `.v3-type-*`, `.v3-prose*`, and `.v3-mono-*` role utilities. Legacy type helpers remain compatibility shims until their owning S232 surface slice is migrated; do not use them as the source for new Figma V3 work.

Keep body copy short. Authenticated explanations should usually stay within two lines.

## Landing

The public landing page must show the transformation story:

답안 올리기 → 근거 확인 → 가장 큰 간극 1개 → 다시 쓸 문단 → 복습 예약.

Required direction:

- primary CTA: `답안 1개 올리기`
- secondary CTA: `검토 예시 보기`
- trust cue: `학습 보조 초안 · 공식 채점 아님`

No 1차 copy, broad exam framing, public archive framing, official grading claims, or generic AI hype.

## Authenticated Operating Shell

The authenticated learner shell is second-round only.

It must show:

- 답안길 brand mark
- compact second-round context
- quiet operational nav
- account email or account menu
- subtle logout

It must not show:

- login CTA
- public start CTA
- public marketing hero
- 1차 navigation
- generic multi-exam switch

Preferred nav tone:

- 오늘
- 답안
- 교정 노트
- 복습
- 기록

## Today Home

`/app` is an operating home, not a dashboard.

Required first surface:

- `오늘의 1개`
- what to do
- why this now
- estimated minutes
- what happens after
- one primary CTA

Diagnostics, queues, details, and explanations belong in quiet disclosure. If a side rail exists, it must be collapsed by default. Today Plan may still show at most three tasks, but the first viewport must feel like one mission.

## Trust Evidence

Trust copy must use a compact evidence/status bar, not a warning stack.

The Trust Evidence Bar must show:

- source: user text / OCR draft / manual
- confidence: stable / needs check
- learner confirmation state
- official grading: no
- editable before save: yes

Generated reference answers are learning references, not official answers or official grading criteria.

## Capture

Capture starts from learner answer input, not metadata.

On mobile:

- `사진 찍기` is the primary action.
- `텍스트 붙여넣기` is secondary.
- PDF and album are quieter secondary options.

Subject confirmation appears after input or as a quiet confirmation step.

Keep:

- OCR/text editable before save
- one primary CTA after input
- future OCR-ready image/PDF structure
- data/privacy boundaries

Keep visually quiet or collapsed unless immediately needed:

- page order
- optional metadata
- attachment state
- calculator routine
- diagnostics

## S224U LEARNER UI/UX GATE

- Learner home must answer “What should I do now?” with one dominant primary action or Today Plan max-3 focus.
- Capture must read as a staged flow: input method → editable OCR/text confirmation → biggest gap + next action → save to Today Plan / Review Queue / Notes.
- Answer Review results must lead with biggest gap, next action, 10초 확인, and continuation before diagnostic details.
- Review Queue must state why each item is present and what action comes next.
- Secondary learner routes must be visually quiet and usually collapsed under “다른 작업 보기.”
- Trust copy must be centralized as a visible trust layer per stage; do not stack repeated warnings.
- CTA, status, focus, spacing, typography, and mobile target rules are implemented through `app/globals.css` primitives:
  - `--cta-primary-*`
  - `--cta-secondary-*`
  - `--trust-layer-*`
  - `--touch-target-min`
  - `.primary-action`
  - `.secondary-action`
  - `.trust-layer`
  - `.status-focus`
  - `.status-review`
  - `.status-stable`
  - `.status-failure`
- Do not add saturated colors or decorative gradients without a documented product reason.

## QA Evidence

S226 visual QA evidence belongs in `docs/qa/s226-world-class-visual-system.md`.

Document screenshot evidence or an honest gap for:

- `/`
- `/login`
- `/app?mode=second`
- `/app/capture?mode=second`
- capture after text input
- saved/result state if feasible

Required viewport checklist:

- 390px
- 768px
- 1440px

Do not claim visual QA is complete without actual screenshots.
