You are the lead product designer, design-system architect, UX strategist, and implementation owner for Inverge.

Implement directly. Do not ask follow-up questions. Do not give partial suggestions. Do not stop at a design critique. Build the improved product.

PROJECT IDENTITY
Inverge is a premium Pass Management OS for 감정평가사 1차 and 감정평가사 2차 only.
It is not a generic study platform.
It is not a public landing page once logged in.
It is not an AI grading machine.
It is an operating system that remembers study traces, identifies where the user gets stuck, and turns those signals into next actions.

PRIMARY PRODUCT RULES
- Scope ONLY:
  - 감정평가사 1차
  - 감정평가사 2차
- Hide / remove / suppress:
  - 계리사
  - universal exam framing
  - broad “all exams” messaging
  - generic dashboard SaaS behavior
- AI role:
  - transforms signals into next action
  - does not act like authoritative grader
  - does not over-claim

CURRENT PRODUCT PROBLEMS TO FIX
1. Logged-in users still experience public-shell energy.
2. Public CTA logic and authenticated work surfaces are not separated strongly enough.
3. The UI is still too mentally noisy.
4. 1차 and 2차 need clearer persistent separation.
5. 1차 capture and 2차 capture must feel structurally different.
6. The product needs a world-class education UX system, not just prettier cards.
7. The interface must feel more premium, more calm, more focused, and more cognitively efficient.

TOP-LEVEL UX PHILOSOPHY
Design for:
- low extraneous cognitive load
- fast orientation
- strong retrieval/review loop visibility
- implementation-intention style action framing
- quiet premium trust
- deep study focus
- minimal but meaningful use of color

ONE-SCREEN RULE
Every major screen must have one primary action.
No screen should feel like a dashboard with many equal-priority things competing for attention.

SHELL MODEL
There must be exactly 3 shells.

1. PUBLIC SHELL
- only for non-authenticated public pages
- can include hero, brand message, pricing CTA, login CTA

2. AUTHENTICATED OPERATING SHELL
- for /app and all authenticated pages
- must NOT include public hero
- must NOT include login CTA
- must NOT include marketing footer CTA
- must feel like a premium work product immediately

3. EXECUTION SHELL
- for capture / compare / rewrite / review actions
- chrome minimized
- task-first layout
- focused controls only

MODE SYSTEM (HARD REQUIREMENT)
There must be a persistent, clearly visible 1차 | 2차 mode switch throughout authenticated app surfaces.

MODE A: 감정평가사 1차
Subjects:
- 민법
- 경제학원론
- 회계학
- 부동산학원론

Core mental model:
- wrong-answer operating loop
- review queue
- repeated errors
- overrun / time drift
- confidence mismatch
- weak topic consolidation

Primary action:
- 오답 기록 시작

Secondary action:
- review queue 보기

MODE B: 감정평가사 2차
Subjects:
- 감정평가실무
- 감정평가이론
- 감정평가 및 보상법규

Core mental model:
- write
- compare
- rewrite
- correction note
- missing issue reinforcement
- structure / reasoning improvement

Primary action:
- 답안 비교 시작

Secondary action:
- 최근 교정 보기

The selected mode must visibly change:
- page title
- subtitle
- CTA
- empty state
- summary copy
- capture form structure
- subject options
- preview cards

Do not mix 1차 and 2차 copy on the same main surface.

DESIGN SYSTEM OBJECTIVE
Build a cognitively optimized premium education design system that feels:
- calm
- expensive
- focused
- precise
- restrained
- highly legible
- intentionally minimal

Not flashy.
Not colorful in a decorative way.
Not dashboard-heavy.
Not startup-marketing.

VISUAL DIRECTION
- Apple + Dieter Rams restraint
- Warm neutral background
- Deep navy brand anchor
- Large whitespace
- Thin borders
- Quiet surfaces
- Little to no shadows
- Clear typography hierarchy
- No clutter
- No card explosion

DESIGN TOKENS
Implement these as the main design tokens and actually apply them to the authenticated app.

Use CSS variables / tailwind theme tokens / design token source of truth as appropriate.

COLOR TOKENS
:root {
  /* neutrals */
  --bg-canvas: #F7F6F3;
  --bg-surface: #FFFFFF;
  --bg-subtle: #F2F0EA;
  --bg-elevated: #FCFBF8;

  --border-subtle: #E6E1D7;
  --border-strong: #D7D1C4;

  --text-primary: #141821;
  --text-secondary: #5A6472;
  --text-tertiary: #8791A0;
  --text-inverse: #F9FBFF;

  /* brand */
  --brand-900: #10233F;
  --brand-800: #163053;
  --brand-700: #23456F;
  --brand-050: #EEF4FB;

  /* semantic */
  --cue-review: #B56B16;
  --cue-review-bg: #FEF4E7;

  --cue-focus: #2B5C9A;
  --cue-focus-bg: #EDF4FC;

  --cue-risk: #B24D45;
  --cue-risk-bg: #FDEDEC;

  --cue-stable: #2E6E58;
  --cue-stable-bg: #EAF6F0;

  --cue-compare: #6B53A6;
  --cue-compare-bg: #F2EEFB;

  /* subject colors: low-saturation only */
  --sub-civil: #5268A5;
  --sub-econ: #3D7E7B;
  --sub-accounting: #A9751D;
  --sub-realestate: #6E7D45;

  --sub-practice: #3F679E;
  --sub-theory: #7457A8;
  --sub-law: #A35B45;
}

COLOR USAGE RULES
- 85~90% of authenticated screens should remain neutral.
- Brand navy is for primary CTA, active state, active mode, key header cues only.
- Review amber is only for review/revisit/re-due signals.
- Compare violet is only for 2차 compare/rewrite/correction flow.
- Risk muted red is only for repeated mistakes, overdue, missing issue warnings.
- Stable green is only for stabilized / done / recovered signals.
- Subject colors are only allowed in pills, chips, thin borders, mini dots, or left accents.
- Do not fill entire cards with saturated subject colors.
- Do not use more than one strong accent family per block.

TYPOGRAPHY TOKENS
Use Pretendard Variable or the current Korean-first font stack if Pretendard is already integrated.
Use tabular figures for timers, counts, and monthly usage values.

Type scale:
- display: 56 / 1.08 / 700
- h1: 44 / 1.12 / 700
- h2: 32 / 1.18 / 700
- h3: 24 / 1.24 / 650
- title: 20 / 1.32 / 600
- body-lg: 17 / 1.68 / 500
- body: 15 / 1.66 / 400
- label: 13 / 1.45 / 500
- micro: 12 / 1.4 / 500

TYPOGRAPHY RULES
- Body text blocks must not exceed ~60–66 characters per line in Korean layout equivalents.
- Descriptive paragraphs on work surfaces must stay within 2–3 lines.
- Action copy must be short, precise, and directive.
- Remove verbose explanation wherever possible.

SPACING / LAYOUT TOKENS
Base unit: 4px
Primary rhythm: 8 / 12 / 16 / 24 / 32 / 48 / 64

Shell widths:
- public shell max width: 1200px
- authenticated home max width: 1120px
- execution screen max width: 980px

Padding:
- mobile: 16px
- tablet: 24px
- desktop: 32px

BORDER / SHAPE TOKENS
- radius-card: 20px
- radius-input: 16px
- radius-pill: 999px
- border default: 1px solid var(--border-subtle)
- minimal shadow only when truly needed

MOTION RULES
- duration: 140–180ms
- easing: ease-out
- use opacity + slight translateY
- no aggressive pulse
- no blinking timers
- no pressure-heavy warning motion
- success feedback should be subtle

COMPONENT RULES

HEADER
Authenticated header must be compact and work-focused.
If logged in:
- never show 로그인 CTA
- never show 시작하기 CTA
- show brand mark + Inverge
- show compact mode context or “오늘”
- show account email or account menu
- show subtle logout

MODE SWITCH
- visible on all authenticated main surfaces
- pill segmented control
- height around 40px
- inactive = neutral background
- active = brand-900 background + inverse text

CARDS
- white or subtle-tint surfaces only
- thin border
- low/no shadow
- max one primary CTA per card
- never place 4 equally weighted cards fighting for attention if the screen can be simplified

TAGS / CHIPS
- low-saturation
- semantic or subject based
- 24–28px high
- concise labels only

CTA RULES
- one primary CTA per major section
- max two CTAs in a block
- primary = brand navy
- secondary = quiet border button
- no bright multi-color CTA competition

COPY SYSTEM
All copy must sound:
- calm
- intelligent
- premium
- concise
- action-oriented
- non-hype
- non-salesy
- non-generic

Use implementation-intention style phrasing when possible:
- what to do
- how much
- what to leave behind

Examples of good direction:
- 오늘은 민법 review queue 3개 중 1개만 다시 봅니다.
- 20분 안에 다시 풀고, 헷갈린 차이 5줄을 남깁니다.
- 전체 답안보다 누락 논점 1개를 먼저 고칩니다.

Avoid:
- motivational fluff
- broad AI hype
- generic “효율적인 학습”
- duplicated explanation
- long landing-page style persuasion on authenticated pages

AUTHENTICATED HOME SPEC (/app)
Rebuild /app as a true operating home.

Required order:
1. persistent mode switch
2. page title
3. one sentence explanation
4. 오늘의 우선순위
5. 다음 행동 1개
6. review queue preview or recent compare/rewrite preview
7. current flow summary
8. weekly summary

The home should not feel like a generic dashboard.
It should feel like:
“this is where I decide what to do next.”

HOME LAYOUT RULE
Desktop:
- main column ~700px
- side rail ~300px

Main column:
- today priority
- next action
- review / recent preview
- weekly summary

Side rail:
- current flow
- due count
- quiet metrics only

Do not surface noisy diagnostic information in production UI.

EMPTY STATES
Empty states must not simply say there is no data.
They must push the first meaningful action.

1차 empty examples:
- 민법 오답 1개를 입력하고 첫 review queue를 만드세요.
- 오늘은 새 문제보다 이미 틀린 항목 1개를 먼저 고정하세요.

2차 empty examples:
- 답안 비교 1건을 넣고 누락 논점 1개를 잡아보세요.
- 전체 답안보다 보강할 논점 1개를 먼저 남겨 보세요.

CAPTURE SYSTEM
The product must visibly support user-led study capture and future OCR-ready input.

Do not pretend OCR is fully implemented if it is not.
But the input architecture and UI must clearly support:
- question image upload
- answer image upload
- PDF upload
- stored raw input for future extraction
- future signal generation from uploaded content

1차 CAPTURE PAGE
Title: 1차 오답 기록

Structure:
Block 1. 문제 / 세트 정보
- 과목
- 문제/세트 요약
- 선택한 답
- 정답

Block 2. 왜 틀렸는지
- wrong reason
- confidence
- time spent
- optional note

Block 3. review 설정
- next review date
- optional image/PDF upload
- one calm save CTA

Mental model:
- capture mistake
- preserve retrieval target
- generate future review

2차 CAPTURE PAGE
Title: 2차 답안 비교

Structure:
Block 1. 사례 / 문제
- 과목
- 사례/논점 요약

Block 2. 기준 답안 / 강평
- reference answer
- commentary / rubric notes

Block 3. 내 답안
- my answer text
- optional answer image / PDF upload

Block 4. 보강할 핵심 논점 1개
- one reinforcement point
- weakness tags
- confidence
- time spent
- one calm save CTA

Mental model:
- compare
- detect missing issue
- prepare rewrite
- record correction target

REVIEW PAGE
Make review feel lighter and more focused.
- emphasize due items
- reduce clutter
- show one next review action at a time when possible
- use amber review cue consistently
- do not make it feel like a spreadsheet

ITEM DETAIL PAGE
1차 detail:
- original mistake
- why wrong
- next review
- recurrence / repeated signal
- review action

2차 detail:
- problem summary
- reference answer / commentary
- my answer
- missing issue / correction target
- rewrite path

WEEKLY PAGE
Weekly page is not analytics theater.
It should answer:
- what repeated this week
- what to reduce next week
- what to keep stable
- what action pattern should continue

Use quiet summaries, not noisy charts unless a chart is truly helpful.

SETTINGS / ONBOARDING
- force explicit 1차 vs 2차 decision first
- then show only relevant subject options and examples
- preserve mode in study profile
- allow switching later from settings or mode switch
- onboarding copy should be minimal and mode-specific

PRODUCTION CLEANUP
- authenticated surfaces must not render public marketing header/footer
- logged-in users must not see 로그인 CTA
- remove public “시작하기” CTA from app shell
- hide dev diagnostics in production
- keep dev-only diagnostics behind explicit development guard

SOURCE OF TRUTH
Create or preserve a single source of truth for:
- mode definitions
- subject definitions
- mode-specific page titles
- mode-specific copy
- CTA text
- empty states
- semantic tone

Do not scatter 1차/2차 strings ad hoc across many components.

TECHNICAL / IMPLEMENTATION REQUIREMENTS
- implement directly
- reuse current code where it is sensible
- avoid unnecessary abstraction
- preserve schema compatibility unless migration is truly required
- if adding token system, do it in a maintainable way
- keep raw upload structure OCR-ready without inventing fake full OCR behavior
- ensure all authenticated app routes use the authenticated shell only

STRICT ACCEPTANCE CRITERIA
1. Logged-in users never see public 로그인 / 시작하기 CTA on authenticated pages.
2. /app feels like an operating home, not a public landing page.
3. 1차 and 2차 are clearly separated and both feel first-class.
4. 1차 home, 2차 home, 1차 capture, and 2차 capture all feel meaningfully different.
5. Design tokens are implemented and applied consistently.
6. Color is used as semantic cue, not decoration.
7. Typography and spacing feel premium, quiet, and highly readable.
8. Empty states drive first action.
9. OCR-ready upload structure is visible in capture flows.
10. Production surfaces hide dev diagnostics.
11. lint and build pass.

DELIVERY FORMAT
After implementation, output exactly:
1. Summary of what changed
2. Files changed
3. Any migrations added
4. Remaining risks / limitations
5. Smoke test results for:
   - /app logged-in, 1차 mode
   - /app logged-in, 2차 mode
   - 1차 capture flow
   - 2차 capture flow
   - login state vs non-login header behavior