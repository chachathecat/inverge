export type ScreenshotBoundaryChannel =
  | "semantic-text"
  | "content-attribute"
  | "structural-reference"
  | "form-value"
  | "generated-content"
  | "background-reference";

export const screenshotBoundaryLengthFamilies = [
  "1",
  "2-7",
  "8-31",
  "32+",
] as const;

export type ScreenshotBoundaryLengthFamily =
  (typeof screenshotBoundaryLengthFamilies)[number];

export const screenshotBoundaryOriginClasses = [
  "direct-field",
  "known-nested-field",
  "unknown-nested-field",
] as const;

export type ScreenshotBoundaryOriginClass =
  (typeof screenshotBoundaryOriginClasses)[number];

export const screenshotBoundaryRiskClasses = [
  "identifier",
  "learner-content",
  "unknown-content",
] as const;

export type ScreenshotBoundaryRiskClass =
  (typeof screenshotBoundaryRiskClasses)[number];

export const screenshotBoundaryContentKinds = [
  "answer",
  "reason",
  "question",
  "title",
  "identifier",
  "label",
  "unknown",
] as const;

export type ScreenshotBoundaryContentKind =
  (typeof screenshotBoundaryContentKinds)[number];

export type ScreenshotBoundaryFragmentOrigin = {
  fieldOrPathFamily: string;
  originClass: ScreenshotBoundaryOriginClass;
  riskClass: ScreenshotBoundaryRiskClass;
  contentKind: ScreenshotBoundaryContentKind;
};

export type ScreenshotBoundaryFragmentDescriptor = {
  value: string;
  sourceItemIds: string[];
  origins: ScreenshotBoundaryFragmentOrigin[];
  lengthFamily: ScreenshotBoundaryLengthFamily;
};

export const screenshotBoundaryOriginPathFamilyPatternSource =
  "^(?:direct\\.(?:answer|reason|question|title|identifier|label|unknown)|(?:raw|derived)\\.(?:known\\.(?:answer|reason|question|title|identifier|label|unknown)|unknown))$";

export function screenshotBoundaryLengthFamily(
  value: string,
): ScreenshotBoundaryLengthFamily {
  const length = Array.from(value).length;
  if (length === 1) return "1";
  if (length <= 7) return "2-7";
  if (length <= 31) return "8-31";
  return "32+";
}

export function classifyScreenshotBoundaryFragmentDescriptor(
  descriptor: unknown,
): ScreenshotBoundaryProvenanceState {
  if (!descriptor || typeof descriptor !== "object") return "missing";
  const candidate = descriptor as Partial<ScreenshotBoundaryFragmentDescriptor>;
  const value =
    typeof candidate.value === "string"
      ? candidate.value.normalize("NFKC").replace(/\s+/g, " ").trim()
      : "";
  if (
    !value ||
    !Array.isArray(candidate.sourceItemIds) ||
    candidate.sourceItemIds.length === 0 ||
    !candidate.sourceItemIds.every(
      (itemId) => typeof itemId === "string" && itemId.trim().length > 0,
    ) ||
    !Array.isArray(candidate.origins) ||
    candidate.origins.length === 0
  )
    return "missing";
  const originPathPattern = new RegExp(
    screenshotBoundaryOriginPathFamilyPatternSource,
    "u",
  );
  const originClasses = new Set<string>(screenshotBoundaryOriginClasses);
  const riskClasses = new Set<string>(screenshotBoundaryRiskClasses);
  const contentKinds = new Set<string>(screenshotBoundaryContentKinds);
  const originsValid = candidate.origins.every(
    (origin) =>
      origin !== null &&
      typeof origin === "object" &&
      typeof origin.fieldOrPathFamily === "string" &&
      originPathPattern.test(origin.fieldOrPathFamily) &&
      originClasses.has(origin.originClass) &&
      riskClasses.has(origin.riskClass) &&
      contentKinds.has(origin.contentKind),
  );
  if (
    !originsValid ||
    !screenshotBoundaryLengthFamilies.includes(
      candidate.lengthFamily as ScreenshotBoundaryLengthFamily,
    ) ||
    candidate.lengthFamily !== screenshotBoundaryLengthFamily(value)
  )
    return "malformed";
  return "valid";
}

export const screenshotBoundaryProvenanceStates = [
  "valid",
  "missing",
  "malformed",
] as const;

export type ScreenshotBoundaryProvenanceState =
  (typeof screenshotBoundaryProvenanceStates)[number];

export const screenshotBoundaryHardBlockReasons = [
  "none",
  "source-reference",
  "exact-surface",
  "semantic-label",
  "form-value",
  "generated-content",
  "background-reference",
  "shadow-aria-reference",
  "select-value",
  "unknown-surface",
] as const;

export type ScreenshotBoundaryHardBlockReason =
  (typeof screenshotBoundaryHardBlockReasons)[number];

export const screenshotBoundaryPositiveEvidence = [
  "none",
  "presentation-syntax",
  "instrumentation-syntax",
  "progress-aria-syntax",
  "id-reference-syntax",
  "svg-geometry",
  "ordinal-counter",
  "public-semantic-substring",
  "synthetic-form-value",
] as const;

export type ScreenshotBoundaryPositiveEvidence =
  (typeof screenshotBoundaryPositiveEvidence)[number];

export const screenshotBoundaryPolicySchema = {
  hardBlockPriority: screenshotBoundaryHardBlockReasons.filter(
    (reason) => reason !== "none",
  ),
  positiveEvidencePriority: screenshotBoundaryPositiveEvidence.filter(
    (evidence) => evidence !== "none",
  ),
} as const;

export type ScreenshotBoundaryPolicyInput = {
  provenanceState: ScreenshotBoundaryProvenanceState;
  lengthFamily: ScreenshotBoundaryLengthFamily;
  hardBlockReason: ScreenshotBoundaryHardBlockReason;
  positiveEvidence: ScreenshotBoundaryPositiveEvidence;
};

export type ScreenshotBoundaryPolicyDecision = {
  block: boolean;
  reason: string;
};

export type StructuralCollisionSchema =
  | "none"
  | "presentation-syntax"
  | "instrumentation-syntax"
  | "progress-aria-syntax"
  | "id-reference-syntax"
  | "svg-geometry";

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
    attributeNamePatternSource:
      "^data-(?:testid|v3-[a-z0-9-]+|s\\d+[a-z0-9-]*|capture-[a-z0-9-]+|feedback-presentation|calculator-routine-[a-z0-9-]+)$",
    valuePatternSource:
      "^(?:[a-z][a-z0-9]*(?:[-_.:][a-z0-9]+){0,16}|[0-9]+(?:[,:./-][0-9]+){0,8})$",
  },
  {
    attributeNamePatternSource: "^data-controller-label$",
    valuePatternSource:
      "^Step [1-9]\\d*\\.\\s[\\p{L}\\p{N}/ ]{1,80}$",
  },
] as const;

const exactInstrumentationSchemas = provenanceBoundInstrumentationSchemas.map(
  (schema) => ({
    attributeName: new RegExp(schema.attributeNamePatternSource, "u"),
    value: new RegExp(schema.valuePatternSource, "u"),
  }),
);

export const provenanceBoundArbitraryPresentationUtilityPattern =
  /^(?:(?:(?:[a-z][a-z0-9-]*|\[[A-Za-z0-9&>_:=.-]+\]):)*-?[a-z][a-z0-9-]*-\[[A-Za-z0-9_#%(),.:/+*=\- ]{1,180}\]|\[[a-z][a-z-]{0,40}:[A-Za-z0-9_#%(),.:/+*=\- ]{1,180}\])$/i;

export const provenanceBoundPresentationUtilityPattern =
  /^(?:(?:sm|md|lg|xl|2xl|max-(?:sm|md|lg|xl)|min-(?:sm|md|lg|xl)|hover|focus|focus-visible|focus-within|active|disabled|group-(?:hover|focus|open)|peer-(?:checked|focus|disabled)|first|last|odd|even|before|after|dark|print|motion-safe|motion-reduce|aria-[a-z-]+|data-[a-z-]+):)*(?:v3(?:-[a-z0-9]+)+|text-h[1-6]|(?:block|inline|inline-block|inline-flex|flex|grid|hidden|table|contents|static|fixed|absolute|relative|sticky|isolate|truncate|antialiased|subpixel-antialiased|border|shadow|ring|outline|grow|shrink|uppercase|lowercase|capitalize|normal-case|italic|not-italic|underline|overline|line-through|no-underline|sr-only|not-sr-only)|-?(?:m[trblxy]?|p[trblxy]?|space-[xy]|gap(?:-[xy])?|w|min-w|max-w|h|min-h|max-h|size|flex|grid-cols|grid-rows|col(?:-span|-start|-end)?|row(?:-span|-start|-end)?|top|right|bottom|left|inset(?:-[xy])?|z|order|rounded(?:-[trbl]{1,2})?|border(?:-[trblxy])?|divide|text|font|leading|tracking|opacity|duration|delay|scale(?:-[xy])?|rotate|translate-[xy]|skew-[xy]|shadow|ring|ring-offset|outline|outline-offset|basis|grow|shrink|scroll-m[trblxy]?|scroll-p[trblxy]?|aspect|columns|bg|underline-offset|line-clamp|stroke|fill|blur|brightness|contrast|saturate|hue-rotate|drop-shadow|items|justify|content|self|place-(?:items|content|self)|overflow(?:-[xy])?|object|whitespace|break|cursor|select|pointer-events|transition|ease|animate)-[a-z0-9][a-z0-9_./-]*)$/i;

export function isProvenanceBoundPresentationUtilityToken(token: string) {
  return token.includes("[")
    ? provenanceBoundArbitraryPresentationUtilityPattern.test(token)
    : provenanceBoundPresentationUtilityPattern.test(token);
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

export function isValidatedPresentationStyleCollision(
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
  elementTagName,
}: {
  attributeName: string;
  normalizedValue: string;
  normalizedFragment: string;
  elementRole: string | null;
  resolvesIdReference: boolean;
  decorativeGraphic: boolean;
  progressbarFillStyle: boolean;
  elementTagName: string;
}): StructuralCollisionSchema {
  const name = attributeName.toLowerCase();
  if (
    exactInstrumentationSchemas.some(
      (schema) =>
        schema.attributeName.test(name) && schema.value.test(normalizedValue),
    )
  )
    return "instrumentation-syntax";
  if (
    /^aria-value(?:min|max|now)$/i.test(name) &&
    elementRole?.toLowerCase() === "progressbar"
  )
    return "progress-aria-syntax";
  if (name === "tabindex" && /^(?:-1|0)$/u.test(normalizedValue))
    return "presentation-syntax";
  if (
    name === "rows" &&
    elementTagName.toLowerCase() === "textarea" &&
    normalizedValue === "3"
  )
    return "presentation-syntax";
  if (name === "class" && normalizedValue !== normalizedFragment) {
    const matchingTokens = normalizedValue
      .split(/\s+/)
      .filter((token) => token.includes(normalizedFragment));
    if (
      matchingTokens.length > 0 &&
      matchingTokens.every(isProvenanceBoundPresentationUtilityToken)
    )
      return "presentation-syntax";
  }
  if (
    name === "style" &&
    progressbarFillStyle &&
    normalizedValue !== normalizedFragment &&
    /^width:\s*(?:0|[1-9]\d?|100)%;?$/u.test(normalizedValue)
  )
    return "presentation-syntax";
  if (
    name === "style" &&
    isValidatedPresentationStyleCollision(
      normalizedValue,
      normalizedFragment,
    )
  )
    return "presentation-syntax";
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
    return "id-reference-syntax";
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
    return "svg-geometry";
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
      /^\s*(?:개|단계|차|줄|분|회|가지|문장|문단|페이지|항목|초|점|%)(?![\p{L}\p{N}_])/u.test(
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

export const screenshotBoundarySemanticLabelPatternSources = {
  answer:
    "(?:(?:내\\s*답(?:안)?|정답|응답|답안|선택지|선지|보기|고른\\s*번호|선택(?:한\\s*번호)?|(?:^|\\s)답)(?:은|는|이|가)?\\s*[:=：]?\\s*__FRAGMENT__(?:\\s*번)?(?![\\p{L}\\p{N}_])|(?:\\banswer\\b|\\bchoice\\b|\\boption\\b|\\bselected\\b|\\bselection\\b|\\bresponse\\b|(?:user|correct)[_-]?answer)\\s*[:=：#-]?\\s*__FRAGMENT__(?![\\p{L}\\p{N}_])|__FRAGMENT__\\s*번\\s*(?:내\\s*답(?:안)?|정답|응답|선택지|선지|고른\\s*번호|선택|제출))",
  reason:
    "(?:(?:이유|근거|사유|판단\\s*이유|reason|rationale|basis)(?:은|는|이|가)?\\s*[:=：#-]?\\s*__FRAGMENT__(?![\\p{L}\\p{N}_])|__FRAGMENT__\\s*(?:이유|근거|사유|reason|rationale|basis))",
  question:
    "(?:(?:문제|문항|질문|쟁점|question|prompt)(?:은|는|이|가)?\\s*[:=：#-]?\\s*__FRAGMENT__(?:\\s*번)?(?![\\p{L}\\p{N}_])|__FRAGMENT__\\s*번?\\s*(?:문제|문항|질문|쟁점|question|prompt))",
} as const;

export function hasSemanticContentLabel(
  normalizedValue: string,
  normalizedFragment: string,
  contentKinds: readonly ScreenshotBoundaryContentKind[],
) {
  if (!normalizedFragment) return false;
  const escaped = normalizedFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const kinds = new Set(contentKinds);
  const labelKinds = (
    kinds.has("unknown")
      ? (["answer", "reason", "question"] as const)
      : (["answer", "reason", "question"] as const).filter((kind) =>
          kinds.has(kind),
        )
  );
  return labelKinds.some((kind) =>
    new RegExp(
      screenshotBoundarySemanticLabelPatternSources[kind].replaceAll(
        "__FRAGMENT__",
        escaped,
      ),
      "iu",
    ).test(normalizedValue),
  );
}

export function hasSemanticAnswerLabel(
  normalizedValue: string,
  normalizedFragment: string,
) {
  return hasSemanticContentLabel(normalizedValue, normalizedFragment, [
    "answer",
  ]);
}

export function screenshotBoundaryPolicyKey(
  input: ScreenshotBoundaryPolicyInput,
) {
  return [
    input.provenanceState,
    input.lengthFamily,
    input.hardBlockReason,
    input.positiveEvidence,
  ].join(":");
}

export function decideScreenshotBoundaryPolicy(
  input: ScreenshotBoundaryPolicyInput,
): ScreenshotBoundaryPolicyDecision {
  if (input.provenanceState !== "valid")
    return {
      block: true,
      reason:
        input.provenanceState === "missing"
          ? "missing-provenance"
          : "malformed-provenance",
    };
  if (input.hardBlockReason !== "none")
    return { block: true, reason: input.hardBlockReason };
  if (input.positiveEvidence === "synthetic-form-value")
    return { block: false, reason: "synthetic-form-value" };
  if (input.lengthFamily === "8-31" || input.lengthFamily === "32+")
    return { block: true, reason: "long-unclassified-substring" };
  if (input.positiveEvidence === "none")
    return { block: true, reason: "unclassified-substring" };
  return { block: false, reason: input.positiveEvidence };
}

export function buildScreenshotBoundaryPolicyTable() {
  const table: Record<string, ScreenshotBoundaryPolicyDecision> = {};
  for (const provenanceState of screenshotBoundaryProvenanceStates) {
    for (const lengthFamily of screenshotBoundaryLengthFamilies) {
      for (const hardBlockReason of screenshotBoundaryHardBlockReasons) {
        for (const positiveEvidence of screenshotBoundaryPositiveEvidence) {
          const input = {
            provenanceState,
            lengthFamily,
            hardBlockReason,
            positiveEvidence,
          };
          table[screenshotBoundaryPolicyKey(input)] =
            decideScreenshotBoundaryPolicy(input);
        }
      }
    }
  }
  return table;
}

export function shouldBlockSerializedPolicyDecision(
  decision: ScreenshotBoundaryPolicyDecision | undefined,
) {
  return decision?.block !== false;
}
