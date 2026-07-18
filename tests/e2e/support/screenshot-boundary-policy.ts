export const provenanceBoundDirectAnswerFields = [
  "correctAnswer",
  "userAnswer",
] as const;

export type ProvenanceBoundDirectAnswerField =
  (typeof provenanceBoundDirectAnswerFields)[number];

export type ScreenshotBoundaryChannel =
  | "semantic-text"
  | "content-attribute"
  | "structural-reference"
  | "form-value"
  | "generated-content"
  | "background-reference";

export type StructuralCollisionSchema =
  | "none"
  | "presentation"
  | "instrumentation";

export type ProvenanceBoundMatchInput = {
  channel: ScreenshotBoundaryChannel;
  exact: boolean;
  sourceReferenced: boolean;
  semanticAnswerLabel: boolean;
  structuralSchema: StructuralCollisionSchema;
  incidentalTextSchema: boolean;
  exactSyntheticFixtureFormValue: boolean;
};

export function provenanceBoundaryScalarPath(
  value: unknown,
  keyPath: readonly string[],
) {
  if (typeof value === "string") return [...keyPath];
  if (typeof value === "number" && Number.isFinite(value))
    return [...keyPath, "<number>"];
  return null;
}

export const provenanceBoundContentAttributeNames = [
  "aria-label",
  "aria-description",
  "aria-valuetext",
  "aria-valuenow",
  "aria-placeholder",
  "title",
  "alt",
  "placeholder",
  "value",
] as const;

const contentAttributeNames = new Set<string>(
  provenanceBoundContentAttributeNames,
);

export const provenanceBoundInstrumentationSchemas = [
  {
    attributeName: "data-testid",
    valuePatternSource:
      "^(?:calculator-step-runner-v3|answer-review-trust-layer-v3|s220c-first-five-minute-magic|s220e-cognitive-learning-actions|s232f4a-(?:today|review|notes|items|agenda|weekly)-(?:empty|error|loading)-state|s232f4a-(?:today|review|notes|items|agenda|weekly)-local-check-loading|s232f4b-agenda-(?:empty-state|local-check-loading)|s232f6-(?:session|first_ox)-source-unavailable)$",
  },
  {
    attributeName: "data-v3-mobile-node",
    valuePatternSource: "^(?:56:3|57:34)$",
  },
  { attributeName: "data-v3-desktop-node", valuePatternSource: "^59:63$" },
  {
    attributeName: "data-s224v-primary-cta-count-above-fold",
    valuePatternSource: "^1$",
  },
  {
    attributeName: "data-s224v-visible-primary-work-items-max",
    valuePatternSource: "^(?:1|3|8)$",
  },
  {
    attributeName: "data-s224v-visible-trust-layer-count",
    valuePatternSource: "^[01]$",
  },
  {
    attributeName: "data-s230-primary-action-count",
    valuePatternSource: "^1$",
  },
  {
    attributeName: "data-s230-responsive-viewports",
    valuePatternSource: "^390,768,1440$",
  },
  {
    attributeName: "data-s232e-capture-step",
    valuePatternSource: "^[1-4]$",
  },
  {
    attributeName: "data-s232e-second-write-progress-step",
    valuePatternSource: "^[1-6]$",
  },
  {
    attributeName: "data-s232e-second-write-panel",
    valuePatternSource: "^[1-6]$",
  },
  {
    attributeName: "data-s232e-second-write-primary-action",
    valuePatternSource: "^[1-6]$",
  },
  {
    attributeName: "data-s232e4-entry-actions-scoped",
    valuePatternSource: "^step-1$",
  },
  { attributeName: "data-capture-stage", valuePatternSource: "^[1-4]$" },
  {
    attributeName: "data-capture-stage-current",
    valuePatternSource: "^[1-4]$",
  },
  { attributeName: "data-feedback-presentation", valuePatternSource: "^v3$" },
  {
    attributeName: "data-calculator-routine-sync-presentation",
    valuePatternSource: "^v3$",
  },
  {
    attributeName: "data-controller-label",
    valuePatternSource:
      "^Step (?:1\\. 쟁점 회상|2\\. 목차 작성|3\\. 내 답안 작성|4\\. 강의/교재 정리 입력|5\\. 가장 큰 약점 1개)$",
  },
  { attributeName: "data-s226-trust-evidence", valuePatternSource: "^s226$" },
  { attributeName: "data-s228-trust-evidence", valuePatternSource: "^s228$" },
] as const;

const exactInstrumentationSchemas = new Map<string, RegExp>(
  provenanceBoundInstrumentationSchemas.map((schema) => [
    schema.attributeName,
    new RegExp(schema.valuePatternSource, "u"),
  ]),
);

export const provenanceBoundArbitraryPresentationUtilityTokens = [
  "-translate-y-[200%]",
  "[&>figure]:min-h-[190px]",
  "[animation-delay:120ms]",
  "before:left-[0.4375rem]",
  "bg-[#eef2fb]",
  "bg-[color:color-mix(in_srgb,var(--background)_92%,transparent)]",
  "bg-[color:color-mix(in_srgb,var(--surface)_82%,var(--background))]",
  "bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)]",
  "bg-[color:color-mix(in_srgb,var(--surface)_94%,transparent)]",
  "bg-[color:rgba(158,74,70,0.08)]",
  "bg-[color:var(--brand-050)]",
  "bg-[var(--brand-050)]",
  "border-[#1E2A46]",
  "border-[#27375f]",
  "border-[#b7c1dd]",
  "border-[#c9d1e7]",
  "border-[#cbd3e2]",
  "border-[color:rgba(158,74,70,0.24)]",
  "border-[color:rgba(166,87,78,0.24)]",
  "border-[color:rgba(168,121,42,0.24)]",
  "border-[color:rgba(178,77,69,0.24)]",
  "border-[color:rgba(181,107,22,0.24)]",
  "border-[color:rgba(46,110,88,0.22)]",
  "border-[color:rgba(46,110,88,0.24)]",
  "border-[color:rgba(79,125,112,0.24)]",
  "divide-[#cbd3e2]",
  "grid-cols-[1.25rem_minmax(0,1fr)]",
  "grid-cols-[44px_minmax(0,1fr)_44px]",
  "grid-cols-[44px_minmax(0,1fr)_auto]",
  "grid-cols-[minmax(0,1fr)_auto]",
  "h-[3px]",
  "h-[calc(56px+env(safe-area-inset-top))]",
  "leading-[1.08]",
  "leading-[1.12]",
  "leading-[1.14]",
  "leading-[18px]",
  "leading-[22px]",
  "left-[max(1rem,env(safe-area-inset-left))]",
  "lg:grid-cols-[1.08fr_0.92fr]",
  "lg:grid-cols-[1.15fr_0.85fr]",
  "lg:grid-cols-[1fr_0.82fr]",
  "lg:grid-cols-[1fr_280px]",
  "lg:grid-cols-[1fr_340px]",
  "lg:grid-cols-[1fr_360px]",
  "lg:grid-cols-[1fr_auto]",
  "lg:grid-cols-[280px_1fr]",
  "lg:grid-cols-[300px_1fr]",
  "lg:grid-cols-[minmax(0,1fr)_18rem]",
  "lg:grid-cols-[minmax(0,1fr)_220px]",
  "lg:grid-cols-[minmax(0,1fr)_260px]",
  "lg:grid-cols-[minmax(0,1fr)_280px]",
  "lg:grid-cols-[minmax(0,1fr)_300px]",
  "lg:grid-cols-[minmax(0,1fr)_minmax(288px,400px)]",
  "lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]",
  "lg:h-[calc(72px+env(safe-area-inset-top))]",
  "lg:min-h-[84px]",
  "lg:w-[300px]",
  "max-h-[240px]",
  "max-lg:pb-[calc(136px+env(safe-area-inset-bottom))]",
  "max-lg:shadow-[0_-6px_20px_-8px_rgba(20,23,33,0.08)]",
  "max-w-[1000px]",
  "max-w-[1040px]",
  "max-w-[1048px]",
  "max-w-[1080px]",
  "max-w-[1120px]",
  "max-w-[1180px]",
  "max-w-[180px]",
  "max-w-[300px]",
  "max-w-[390px]",
  "max-w-[44rem]",
  "max-w-[552px]",
  "max-w-[62ch]",
  "max-w-[820px]",
  "max-w-[920px]",
  "md:pb-[calc(152px+env(safe-area-inset-bottom))]",
  "md:h-[72px]",
  "md:pr-[max(32px,env(safe-area-inset-right))]",
  "md:pt-[calc(var(--space-32)+env(safe-area-inset-top))]",
  "min-h-[100px]",
  "min-h-[116px]",
  "min-h-[120px]",
  "min-h-[124px]",
  "min-h-[132px]",
  "min-h-[140px]",
  "min-h-[160px]",
  "min-h-[170px]",
  "min-h-[180px]",
  "min-h-[18px]",
  "min-h-[210px]",
  "min-h-[22px]",
  "min-h-[255px]",
  "min-h-[260px]",
  "min-h-[380px]",
  "min-h-[38px]",
  "min-h-[46px]",
  "min-h-[50vh]",
  "min-h-[52px]",
  "min-h-[56vh]",
  "min-h-[58vh]",
  "min-h-[62vh]",
  "min-h-[72px]",
  "min-h-[84px]",
  "min-h-[calc(100vh-168px)]",
  "min-h-[calc(100vh-72px)]",
  "mt-[11px]",
  "outline-offset-[-1px]",
  "pb-[calc(136px+env(safe-area-inset-bottom))]",
  "pb-[calc(152px+env(safe-area-inset-bottom))]",
  "pb-[calc(var(--space-32)+env(safe-area-inset-bottom))]",
  "pb-[max(20px,env(safe-area-inset-bottom))]",
  "pl-[max(0.25rem,env(safe-area-inset-left))]",
  "pl-[max(20px,env(safe-area-inset-left))]",
  "pl-[max(4rem,env(safe-area-inset-left))]",
  "pr-[max(0.25rem,env(safe-area-inset-right))]",
  "pr-[max(20px,env(safe-area-inset-right))]",
  "pr-[max(4rem,env(safe-area-inset-right))]",
  "pt-[calc(var(--space-20)+env(safe-area-inset-top))]",
  "py-[15px]",
  "rounded-[14px]",
  "rounded-[var(--v3-radius-card)]",
  "rounded-[var(--v3-radius-control)]",
  "rounded-[var(--v3-radius-full)]",
  "rounded-[var(--v3-radius-mark)]",
  "rounded-[var(--v3-radius-panel)]",
  "shadow-[0_-6px_20px_-8px_rgba(20,23,33,0.08)]",
  "shadow-[0_4px_14px_rgba(19,34,56,0.08)]",
  "sm:grid-cols-[112px_minmax(0,1fr)]",
  "sm:grid-cols-[130px_1fr_auto]",
  "sm:grid-cols-[180px_1fr]",
  "sm:grid-cols-[180px_minmax(0,1fr)]",
  "sm:grid-cols-[1fr_1.4fr]",
  "sm:grid-cols-[1fr_auto]",
  "sm:grid-cols-[1fr_auto_auto]",
  "sm:grid-cols-[80px_1fr_auto]",
  "sm:grid-cols-[80px_minmax(0,1fr)]",
  "sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]",
  "sm:min-h-[350px]",
  "sm:min-w-[7.5rem]",
  "sm:min-w-[8.5rem]",
  "sm:min-w-[9.5rem]",
  "sm:text-[30px]",
  "sm:text-[36px]",
  "sm:text-[40px]",
  "sm:text-[44px]",
  "sm:text-[46px]",
  "sm:text-[52px]",
  "sm:text-[58px]",
  "sm:w-[272px]",
  "text-[#1E2A46]",
  "text-[#1e2a46]",
  "text-[#3f4c66]",
  "text-[#7a5a2a]",
  "text-[12px]",
  "text-[13px]",
  "text-[15px]",
  "text-[16px]",
  "text-[24px]",
  "text-[28px]",
  "text-[30px]",
  "text-[32px]",
  "text-[36px]",
  "text-[40px]",
  "text-[44px]",
  "top-[calc(100%+8px)]",
  "top-[max(1rem,env(safe-area-inset-top))]",
  "tracking-[-0.025em]",
  "tracking-[-0.02em]",
  "tracking-[-0.035em]",
  "tracking-[-0.03em]",
  "tracking-[-0.045em]",
  "tracking-[-0.04em]",
  "tracking-[-0.055em]",
  "tracking-[-0.05em]",
  "tracking-[0.12em]",
  "tracking-[0.1em]",
  "tracking-[0.1px]",
  "w-[min(256px,calc(100vw-20px))]",
  "z-[100]",
] as const;

const exactArbitraryPresentationUtilityTokens = new Set<string>(
  provenanceBoundArbitraryPresentationUtilityTokens,
);

export const provenanceBoundPresentationUtilityPattern =
  /^(?:(?:sm|md|lg|xl|2xl|max-(?:sm|md|lg|xl)|min-(?:sm|md|lg|xl)|hover|focus|focus-visible|focus-within|active|disabled|group-(?:hover|focus|open)|peer-(?:checked|focus|disabled)|first|last|odd|even|before|after|dark|print|motion-safe|motion-reduce|aria-[a-z-]+|data-[a-z-]+):)*(?:v3(?:-[a-z]+)+|text-h[1-6]|-?(?:m[trblxy]?|p[trblxy]?|space-[xy]|gap(?:-[xy])?|w|min-w|max-w|h|min-h|max-h|size|flex|grid-cols|grid-rows|col(?:-span|-start|-end)?|row(?:-span|-start|-end)?|top|right|bottom|left|inset(?:-[xy])?|z|order|rounded(?:-[trbl]{1,2})?|border(?:-[trblxy])?|divide|text|leading|tracking|opacity|duration|delay|scale(?:-[xy])?|rotate|translate-[xy]|skew-[xy]|shadow|ring|ring-offset|outline|outline-offset|basis|grow|shrink|scroll-m[trblxy]?|scroll-p[trblxy]?|aspect|columns|bg|underline-offset|line-clamp|stroke|fill|blur|brightness|contrast|saturate|hue-rotate|drop-shadow)-(?:\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?|[2-9]?xl|h[1-6]|xs|sm|md|lg|px|full|screen|auto|min|max|fit|none|normal|tight|snug|relaxed|loose|thin|extralight|light|medium|semibold|bold|extrabold|black|white|transparent|current|inherit|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|brand)-\d{2,3}(?:\/\d{1,3})?))$/i;

export function isProvenanceBoundPresentationUtilityToken(token: string) {
  return token.includes("[")
    ? exactArbitraryPresentationUtilityTokens.has(token)
    : provenanceBoundPresentationUtilityPattern.test(token);
}

export function classifyProvenanceBoundDirectAnswer(
  field: string,
  normalized: string,
): ProvenanceBoundDirectAnswerField | null {
  if (
    !provenanceBoundDirectAnswerFields.includes(
      field as ProvenanceBoundDirectAnswerField,
    ) ||
    Array.from(normalized).length !== 1 ||
    !/^[1-5]$/u.test(normalized)
  )
    return null;
  return field as ProvenanceBoundDirectAnswerField;
}

export function isExactMirroredDirectAnswerPath(
  field: ProvenanceBoundDirectAnswerField,
  path: readonly string[],
) {
  const expected = [
    "rawPayload",
    "user_confirmed_fields",
    field === "correctAnswer" ? "correct_answer" : "user_answer",
  ];
  return (
    path.length === expected.length &&
    path.every((segment, index) => segment === expected[index])
  );
}

export function hasCompleteExactMirroredDirectAnswerPaths(
  fields: readonly ProvenanceBoundDirectAnswerField[],
  paths: readonly (readonly string[])[],
) {
  if (fields.length === 0 || paths.length === 0) return false;
  return (
    fields.every((field) =>
      paths.some((path) => isExactMirroredDirectAnswerPath(field, path)),
    ) &&
    paths.every((path) =>
      fields.some((field) => isExactMirroredDirectAnswerPath(field, path)),
    )
  );
}

export function shouldBlockProvenanceBoundMatch({
  channel,
  exact,
  sourceReferenced,
  semanticAnswerLabel,
  structuralSchema,
  incidentalTextSchema,
  exactSyntheticFixtureFormValue,
}: ProvenanceBoundMatchInput) {
  if (sourceReferenced) return true;
  if (channel === "generated-content" || channel === "background-reference")
    return true;
  if (channel === "form-value")
    return semanticAnswerLabel || !exactSyntheticFixtureFormValue;
  if (channel === "structural-reference") {
    if (structuralSchema === "instrumentation") return semanticAnswerLabel;
    if (structuralSchema === "presentation") return semanticAnswerLabel;
    return true;
  }
  if (exact) return true;
  if (channel === "semantic-text" || channel === "content-attribute")
    return semanticAnswerLabel || !incidentalTextSchema;
  return false;
}

export function shouldBlockSerializedPolicyDecision(
  decision: boolean | undefined,
) {
  return decision !== false;
}

export function isExactProvenanceBoundMatch(
  channel: ScreenshotBoundaryChannel,
  normalizedCandidate: string,
  normalizedSemanticTextSurface: string,
  normalizedFragment: string,
) {
  return (
    (channel === "semantic-text"
      ? normalizedSemanticTextSurface
      : normalizedCandidate) === normalizedFragment
  );
}

export function classifyScreenshotBoundaryAttributeChannel(
  attributeName: string,
  elementRole: string | null,
): "content-attribute" | "structural-reference" {
  if (
    attributeName.toLowerCase() === "aria-valuenow" &&
    elementRole?.toLowerCase() === "progressbar"
  )
    return "structural-reference";
  return contentAttributeNames.has(attributeName.toLowerCase())
    ? "content-attribute"
    : "structural-reference";
}

export function isExactAnswerReviewMotionStyleCollision(
  normalizedValue: string,
  normalizedFragment: string,
) {
  const matchingDeclarations = normalizedValue
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(
      (declaration) =>
        declaration.length > 0 && declaration.includes(normalizedFragment),
    );
  if (matchingDeclarations.length === 0) return false;
  return matchingDeclarations.every((declaration) => {
    const separator = declaration.indexOf(":");
    if (separator < 1) return false;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (property === "opacity")
      return /^(?:0(?:\.\d+)?|1(?:\.0+)?)$/u.test(value);
    if (property === "height")
      return /^(?:auto|0|(?:0|[1-9]\d*)(?:\.\d+)?(?:px|%))$/u.test(value);
    if (property === "transform-origin")
      return /^(?:-?\d+(?:\.\d+)?(?:px|%))(?:\s+-?\d+(?:\.\d+)?(?:px|%)){1,2}$/u.test(
        value,
      );
    if (property === "transform")
      return /^(?:none|(?:(?:translate(?:x|y|3d)?|scale(?:x|y|3d)?|rotate(?:x|y|z)?|matrix(?:3d)?)\([-+0-9.eE,%pxdeg\s]+\)\s*)+)$/iu.test(
        value,
      );
    return false;
  });
}

export function classifyStructuralCollisionSchema({
  attributeName,
  normalizedValue,
  normalizedFragment,
  elementRole,
  resolvesIdReference,
  decorativeGraphic,
  progressbarFillStyle,
  answerReviewMotionStyle,
  elementTagName,
}: {
  attributeName: string;
  normalizedValue: string;
  normalizedFragment: string;
  elementRole: string | null;
  resolvesIdReference: boolean;
  decorativeGraphic: boolean;
  progressbarFillStyle: boolean;
  answerReviewMotionStyle: boolean;
  elementTagName: string;
}): StructuralCollisionSchema {
  const name = attributeName.toLowerCase();
  if (exactInstrumentationSchemas.get(name)?.test(normalizedValue))
    return "instrumentation";
  if (
    /^aria-value(?:min|max|now)$/i.test(name) &&
    elementRole?.toLowerCase() === "progressbar"
  )
    return "presentation";
  if (name === "tabindex" && /^(?:-1|0)$/u.test(normalizedValue))
    return "presentation";
  if (
    name === "rows" &&
    elementTagName.toLowerCase() === "textarea" &&
    normalizedValue === "3"
  )
    return "presentation";
  if (name === "class" && normalizedValue !== normalizedFragment) {
    const matchingTokens = normalizedValue
      .split(/\s+/)
      .filter((token) => token.includes(normalizedFragment));
    if (
      matchingTokens.length > 0 &&
      matchingTokens.every(isProvenanceBoundPresentationUtilityToken)
    )
      return "presentation";
  }
  if (
    name === "style" &&
    progressbarFillStyle &&
    normalizedValue !== normalizedFragment &&
    /^width:\s*(?:0|[1-9]\d?|100)%;?$/u.test(normalizedValue)
  )
    return "presentation";
  if (
    name === "style" &&
    answerReviewMotionStyle &&
    isExactAnswerReviewMotionStyleCollision(
      normalizedValue,
      normalizedFragment,
    )
  )
    return "presentation";
  if (
    [
      "id",
      "for",
      "aria-controls",
      "aria-labelledby",
      "aria-describedby",
      "aria-owns",
      "aria-activedescendant",
    ].includes(name) &&
    normalizedValue !== normalizedFragment &&
    resolvesIdReference
  )
    return "presentation";
  if (
    decorativeGraphic &&
    [
      "width",
      "height",
      "x",
      "y",
      "x1",
      "x2",
      "y1",
      "y2",
      "cx",
      "cy",
      "r",
      "rx",
      "ry",
      "d",
      "points",
      "viewbox",
      "transform",
      "stroke-width",
      "stroke-dasharray",
      "stroke-dashoffset",
    ].includes(name)
  )
    return "presentation";
  return "none";
}

export function isIncidentalOrdinalOrCounter({
  normalizedValue,
  normalizedFragment,
  orderedListItem,
}: {
  normalizedValue: string;
  normalizedFragment: string;
  orderedListItem: boolean;
}) {
  if (
    !normalizedFragment ||
    normalizedValue === normalizedFragment ||
    !normalizedValue.includes(normalizedFragment)
  )
    return false;
  const occurrences: number[] = [];
  for (
    let index = normalizedValue.indexOf(normalizedFragment);
    index >= 0;
    index = normalizedValue.indexOf(normalizedFragment, index + 1)
  )
    occurrences.push(index);
  return occurrences.every((index) => {
    const before = normalizedValue.slice(0, index);
    const after = normalizedValue.slice(index + normalizedFragment.length);
    const previous = before.at(-1) ?? "";
    const next = after.at(0) ?? "";
    const adjacentNumber =
      /\d/u.test(previous) ||
      /\d/u.test(next) ||
      ((/[.,/%:+-]/u.test(previous) || /[.,/%:+-]/u.test(next)) &&
        /\d/u.test(`${before.slice(-2)}${after.slice(0, 2)}`));
    const counterSuffix =
      /^\s*(?:개|단계|차|줄|분|회|가지|문장|문단|페이지|항목|초|점|%)/u.test(
        after,
      );
    const ordinalPunctuation = /^[.)]/u.test(after);
    const labelledOrdinal =
      /(?:제|단계|순서|항목|페이지|문항|문제|step|stage|page|item|question|phase|level|week)\s*$/iu.test(
        before,
      );
    const orderedListOrdinal =
      orderedListItem &&
      before.trim().length === 0 &&
      /^(?:\s|[.)])/u.test(after);
    return (
      adjacentNumber ||
      counterSuffix ||
      ordinalPunctuation ||
      labelledOrdinal ||
      orderedListOrdinal
    );
  });
}

export function hasSemanticAnswerLabel(
  normalizedValue: string,
  normalizedFragment: string,
) {
  if (!normalizedFragment) return false;
  const escaped = normalizedFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?:(?:내\\s*답(?:안)?|정답|응답|답안|선택지|선지|보기|고른\\s*번호|선택(?:한\\s*번호)?|(?:^|\\s)답)(?:은|는|이|가)?\\s*[:=：]?\\s*${escaped}(?:\\s*번)?(?![\\p{L}\\p{N}_])|(?:\\banswer\\b|\\bchoice\\b|\\boption\\b|\\bselected\\b|\\bselection\\b|\\bresponse\\b|(?:user|correct)[_-]?answer)\\s*[:=：#-]?\\s*${escaped}(?![\\p{L}\\p{N}_])|${escaped}\\s*번\\s*(?:내\\s*답(?:안)?|정답|응답|선택지|선지|고른\\s*번호|선택|제출))`,
    "iu",
  ).test(normalizedValue);
}

export function provenanceBoundPolicyKey(
  input: ProvenanceBoundMatchInput,
) {
  return [
    input.channel,
    input.exact ? "exact" : "substring",
    input.sourceReferenced ? "source" : "unlinked",
    input.semanticAnswerLabel ? "answer-label" : "unlabelled",
    input.structuralSchema,
    input.incidentalTextSchema ? "incidental-text" : "unclassified-text",
    input.exactSyntheticFixtureFormValue
      ? "synthetic-form"
      : "unclassified-form",
  ].join(":");
}

export function buildProvenanceBoundPolicyTable() {
  const channels: readonly ScreenshotBoundaryChannel[] = [
    "semantic-text",
    "content-attribute",
    "structural-reference",
    "form-value",
    "generated-content",
    "background-reference",
  ];
  const table: Record<string, boolean> = {};
  for (const channel of channels) {
    for (const exact of [false, true]) {
      for (const sourceReferenced of [false, true]) {
        for (const semanticAnswerLabel of [false, true]) {
          for (const structuralSchema of [
            "none",
            "presentation",
            "instrumentation",
          ] as const) {
            for (const incidentalTextSchema of [false, true]) {
              for (const exactSyntheticFixtureFormValue of [false, true]) {
                const input = {
                  channel,
                  exact,
                  sourceReferenced,
                  semanticAnswerLabel,
                  structuralSchema,
                  incidentalTextSchema,
                  exactSyntheticFixtureFormValue,
                };
                table[provenanceBoundPolicyKey(input)] =
                  shouldBlockProvenanceBoundMatch(input);
              }
            }
          }
        }
      }
    }
  }
  return table;
}
