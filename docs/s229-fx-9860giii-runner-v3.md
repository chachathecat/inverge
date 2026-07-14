# S229 fx-9860GIII Runner v3

Status: implementation ready for review; real-device acceptance remains open.

## Runtime contract

- Reuses `CalculatorRoutineTrainer`, the canonical nine ordered steps, session draft key, local completion history, and completion-to-learning-signal bridge.
- Makes one current step and one primary continuation action visually dominant.
- The direct `focus=casio` calculator route and recovery route use the same trainer; the older three-step calculator surface is not rendered alongside it.
- Supports ready/empty, loading, offline, unsupported/error, active, and completed presentation states.
- Unsupported exam or subject contexts fail closed and do not synthesize a routine.

## Evidence boundary

- Formula, extracted values, input sequence, expected display, unit/rounding, answer transfer, mistakes, and reset-safe hints appear only from the existing learner draft or supported reference-hint contract.
- Raw learner entries remain session-scoped. Durable completion remains metadata-only.
- The runner does not claim automatic solving, official grading, verified keystrokes, stored-program use, score, or pass/fail.

## Accessibility and responsive gate

- Interactive targets are at least 44px.
- Keyboard focus uses a visible focus ring.
- Supporting copy is at least 12px.
- The nine-step rail uses a fixed responsive grid and does not require horizontal scrolling at 390px or 1440px.

## Real-device gate — not completed

The learner UI must continue to show `기기 검증 전` until a sanitized real fx-9860GIII run records:

- model and OS/version context;
- reset-safe starting state;
- exact keys pressed;
- expected and observed display;
- unit and rounding result;
- recovery from at least one common input mistake.

Source-only tests and browser checks do not satisfy this gate.

## Pull request acceptance

The pull request remains Draft until its exact head passes the repository PR contract, source checks, production build, and responsive browser evidence. Human approval is still required.

Authenticated Preview evidence is collected only through the PR-scoped S229 workflow. Its hidden one-run marker is removed immediately after evidence inspection.
