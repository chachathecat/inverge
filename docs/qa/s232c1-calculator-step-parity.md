# S232C.1 CalculatorStep Figma V3 Parity

Status: source implementation ready; exact-head Preview runtime pending.

Parent: S232 App-wide Figma V3 parity (`#574`)

Delivery issue: CalculatorStep 3×3 primitive parity (`#585`)

## Figma source of truth

File: `jcOKSi2WwhDOAfV2xMv9gO`

- Component set: `53:129`
- Mobile product instance: `57:57`
- Exact variants: Step `KeyInput | Display | Transfer` × State `Current | Error | Complete`

The 3 × 3 component contract is distinct from the existing nine-step learner routine. This slice does not coerce the other six domain steps into unsupported Figma variants.

## Visual contract

- Component specimen: 552 × 350, 24px padding, 12px gap, 16px radius, 1px state border
- Mobile product instance: 350 × 380; the key sequence wraps to two lines inside the 302px inner width
- Header: 22px minimum height
- Calculator display: 124px minimum height, brand background, inverse mono formula and value
- Key sequence: 66px minimum height at specimen width and 86px when the mobile sample wraps
- Hint: 46px minimum height
- Light state colors use the existing S232A focus, risk, and stable semantic tokens

Production uses fluid width up to the 552px specimen and minimum heights rather than clipping Korean text. At 200% zoom the component may grow vertically.

Figma contains no desktop product instance. The 1440px browser check proves responsive resilience only and must not be described as desktop pixel parity.

## Truth and state boundary

- Current requires explicit active-step evidence.
- Error requires explicit typed input-error evidence. Stuck, empty, offline, request failure, or unsupported state is not an input error.
- Complete requires an explicit learner record and means recorded/confirmed by the learner, not correct, graded, or device-verified.
- Verification is fail-closed to `기기 검증 전` in every variant.
- The component is presentation-only: no button, input, keycap control, focus target, or state transition.

No formula, display value, key sequence, unit, rounding rule, or verification claim is synthesized from a variant name. Display and Transfer keep caller-provided evidence; Figma supplies no step-specific authoritative copy.

## Runtime and privacy acceptance

- Preview-only synthetic matrix renders every Step × State pair exactly once.
- A separate fixture uses the real mobile boolean combination: show hint=true, show state label=false, show verification=true.
- Test at 390px, 768px, 1440px, and a 720px desktop-200%-zoom equivalent.
- Require horizontal overflow at most 1px, clipped components 0, unexpected tab stops 0, Axe critical/serious 0, and console/page/unexpected same-origin request errors 0.
- Browser capture is disabled. Runtime evidence is metadata-only and contains no learner answer, OCR, problem text, credentials, DOM, screenshot, trace, or video.

## Deferred integration

S232C.2 will adapt only `casio_input → KeyInput`, `display_value → Display`, and `answer_value → Transfer` in the existing fx-9860GIII runner. It will preserve the existing controller, storage keys, completion signal, learning-signal sync, API/schema, and visible `기기 검증 전` status.
