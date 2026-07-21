import type {
  OwnerAlphaCalculationCheck,
  OwnerAlphaCalculationNode,
  OwnerAlphaNumericExpression,
} from "./owner-alpha-practice-contract";

const MAX_EXPRESSION_DEPTH = 12;
const MAX_EXPRESSION_NODES = 80;
const MAX_ABSOLUTE_INPUT = 1e18;
const DAYS_PER_YEAR = 365.2425;
const DAYS_PER_MONTH = DAYS_PER_YEAR / 12;

const UNIT_TO_BASE: Readonly<Record<string, { dimension: string; factor: number }>> =
  Object.freeze({
    m: { dimension: "length", factor: 1 },
    cm: { dimension: "length", factor: 0.01 },
    mm: { dimension: "length", factor: 0.001 },
    km: { dimension: "length", factor: 1_000 },
    "m²": { dimension: "area", factor: 1 },
    m2: { dimension: "area", factor: 1 },
    "㎡": { dimension: "area", factor: 1 },
    "평": { dimension: "area", factor: 3.305785 },
    ha: { dimension: "area", factor: 10_000 },
    won: { dimension: "currency", factor: 1 },
    krw: { dimension: "currency", factor: 1 },
    "원": { dimension: "currency", factor: 1 },
    thousand_won: { dimension: "currency", factor: 1_000 },
    "천원": { dimension: "currency", factor: 1_000 },
    million_won: { dimension: "currency", factor: 1_000_000 },
    "백만원": { dimension: "currency", factor: 1_000_000 },
  });

class CalculationValidationError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

function finite(value: number, code = "non_finite_input") {
  if (!Number.isFinite(value) || Math.abs(value) > MAX_ABSOLUTE_INPUT) {
    throw new CalculationValidationError(code);
  }
  return value;
}

function nonZero(value: number) {
  finite(value);
  if (Math.abs(value) < Number.EPSILON) {
    throw new CalculationValidationError("division_by_zero");
  }
  return value;
}

function rate(value: number, input: "decimal" | "percent") {
  return finite(input === "percent" ? value / 100 : value, "invalid_rate");
}

function evaluateExpression(
  expression: OwnerAlphaNumericExpression,
  depth = 0,
  counter = { value: 0 },
): number {
  counter.value += 1;
  if (depth > MAX_EXPRESSION_DEPTH || counter.value > MAX_EXPRESSION_NODES) {
    throw new CalculationValidationError("expression_limit_exceeded");
  }
  if (expression.kind === "literal") return finite(expression.value);
  if (!Array.isArray(expression.operands) || expression.operands.length < 1) {
    throw new CalculationValidationError("invalid_expression_operands");
  }
  const values = expression.operands.map((operand) =>
    evaluateExpression(operand, depth + 1, counter),
  );
  if (expression.operator === "add") {
    return finite(values.reduce((sum, value) => sum + value, 0));
  }
  if (expression.operator === "subtract") {
    return finite(values.slice(1).reduce((result, value) => result - value, values[0]));
  }
  if (expression.operator === "multiply") {
    return finite(values.reduce((result, value) => result * value, 1));
  }
  if (expression.operator === "divide") {
    return finite(
      values.slice(1).reduce((result, value) => result / nonZero(value), values[0]),
    );
  }
  if (values.length !== 2) {
    throw new CalculationValidationError("power_requires_two_operands");
  }
  return finite(values[0] ** values[1]);
}

function parseUtcDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new CalculationValidationError("invalid_date");
  }
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) throw new CalculationValidationError("invalid_date");
  const normalized = new Date(timestamp).toISOString().slice(0, 10);
  if (normalized !== value) throw new CalculationValidationError("invalid_date");
  return timestamp;
}

function roundAt(value: number, digits: number, mode: "round" | "truncate") {
  if (!Number.isInteger(digits) || digits < -12 || digits > 12) {
    throw new CalculationValidationError("invalid_rounding_digits");
  }
  const factor = 10 ** digits;
  const scaled = finite(value * factor);
  const rounded = mode === "round" ? Math.round(scaled) : Math.trunc(scaled);
  return finite(rounded / factor);
}

function significantDigits(value: number, digits: number) {
  finite(value);
  if (!Number.isInteger(digits) || digits < 1 || digits > 15) {
    throw new CalculationValidationError("invalid_significant_digits");
  }
  if (value === 0) return 0;
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  return roundAt(value, digits - magnitude - 1, "round");
}

export function evaluateOwnerAlphaCalculationNode(
  node: OwnerAlphaCalculationNode,
): number {
  if (node.primitive === "expression_order") {
    return evaluateExpression(node.expression);
  }
  if (node.primitive === "sum") {
    if (node.values.length < 1 || node.values.length > 100) {
      throw new CalculationValidationError("invalid_sum_values");
    }
    return finite(node.values.reduce((sum, value) => sum + finite(value), 0));
  }
  if (node.primitive === "subtraction") {
    return finite(
      node.subtrahends.reduce(
        (result, value) => result - finite(value),
        finite(node.minuend),
      ),
    );
  }
  if (node.primitive === "ratio") {
    return finite(finite(node.numerator) / nonZero(node.denominator));
  }
  if (node.primitive === "percentage_direction") {
    const normalizedRate = rate(node.rate, node.rateInput);
    return finite(
      finite(node.baseValue) *
        (node.direction === "increase" ? 1 + normalizedRate : 1 - normalizedRate),
    );
  }
  if (node.primitive === "unit_conversion") {
    const from = UNIT_TO_BASE[node.fromUnit.toLowerCase()] ?? UNIT_TO_BASE[node.fromUnit];
    const to = UNIT_TO_BASE[node.toUnit.toLowerCase()] ?? UNIT_TO_BASE[node.toUnit];
    if (!from || !to || from.dimension !== to.dimension) {
      throw new CalculationValidationError("unsupported_unit_conversion");
    }
    return finite((finite(node.value) * from.factor) / to.factor);
  }
  if (node.primitive === "elapsed_period") {
    const days =
      (parseUtcDate(node.toDate) - parseUtcDate(node.fromDate)) / 86_400_000;
    if (days < 0) throw new CalculationValidationError("negative_elapsed_period");
    if (node.basis === "days") return days;
    if (node.basis === "months") return finite(days / DAYS_PER_MONTH);
    return finite(days / DAYS_PER_YEAR);
  }
  if (node.primitive === "rounding") {
    return roundAt(node.value, node.digits, node.mode);
  }
  if (node.primitive === "significant_digits") {
    return significantDigits(node.value, node.digits);
  }
  if (node.primitive === "area_times_unit_price") {
    return finite(finite(node.area) * finite(node.unitPrice));
  }
  if (node.primitive === "allocation") {
    return finite(finite(node.total) * rate(node.ratio, node.ratioInput));
  }
  if (node.primitive === "residual") {
    return finite(
      node.deductions.reduce(
        (result, deduction) => result - finite(deduction),
        finite(node.total),
      ),
    );
  }
  if (node.primitive === "index_ratio") {
    return finite(finite(node.targetIndex) / nonZero(node.baseIndex));
  }
  if (node.primitive === "present_value") {
    const normalizedRate = rate(node.rate, node.rateInput);
    if (normalizedRate <= -1 || node.periods < 0) {
      throw new CalculationValidationError("invalid_present_value_inputs");
    }
    return finite(
      finite(node.futureValue) / (1 + normalizedRate) ** finite(node.periods),
    );
  }
  if (node.primitive === "annuity_factor") {
    const normalizedRate = rate(node.rate, node.rateInput);
    if (node.periods < 0 || normalizedRate <= -1) {
      throw new CalculationValidationError("invalid_annuity_inputs");
    }
    if (Math.abs(normalizedRate) < Number.EPSILON) return finite(node.periods);
    return finite(
      (1 - (1 + normalizedRate) ** -finite(node.periods)) / normalizedRate,
    );
  }
  if (node.primitive === "capitalization") {
    const normalizedRate = rate(node.capitalizationRate, node.rateInput);
    if (normalizedRate <= 0) {
      throw new CalculationValidationError("invalid_capitalization_rate");
    }
    return finite(finite(node.netIncome) / normalizedRate);
  }
  return finite(finite(node.remainingLife) / nonZero(node.totalLife));
}

function toleranceFor(value: number) {
  return Math.max(1e-8, Math.abs(value) * 1e-7);
}

export function validateOwnerAlphaCalculationGraph(input: {
  nodes: OwnerAlphaCalculationNode[];
}): OwnerAlphaCalculationCheck[] {
  const seen = new Set<string>();
  return input.nodes.slice(0, 100).map((node) => {
    if (!node.nodeId || seen.has(node.nodeId)) {
      return {
        nodeId: node.nodeId || "invalid-node",
        primitive: node.primitive,
        claimedResult: node.claimedResult,
        deterministicResult: null,
        status: "invalid",
        absoluteDifference: null,
        tolerance: 0,
        critical: node.critical,
        errorCode: "duplicate_or_missing_node_id",
      };
    }
    seen.add(node.nodeId);
    try {
      const deterministicResult = evaluateOwnerAlphaCalculationNode(node);
      finite(node.claimedResult, "invalid_claimed_result");
      const absoluteDifference = Math.abs(
        deterministicResult - node.claimedResult,
      );
      const tolerance = toleranceFor(deterministicResult);
      return {
        nodeId: node.nodeId,
        primitive: node.primitive,
        claimedResult: node.claimedResult,
        deterministicResult,
        status: absoluteDifference <= tolerance ? "validated" : "conflict",
        absoluteDifference,
        tolerance,
        critical: node.critical,
        errorCode:
          absoluteDifference <= tolerance ? null : "deterministic_result_conflict",
      };
    } catch (error) {
      const errorCode =
        error instanceof CalculationValidationError
          ? error.code
          : "unsupported_calculation";
      return {
        nodeId: node.nodeId,
        primitive: node.primitive,
        claimedResult: node.claimedResult,
        deterministicResult: null,
        status: errorCode.startsWith("unsupported") ? "unsupported" : "invalid",
        absoluteDifference: null,
        tolerance: 0,
        critical: node.critical,
        errorCode,
      };
    }
  });
}

export function ownerAlphaCalculationReleaseBlockers(
  checks: OwnerAlphaCalculationCheck[],
) {
  return checks
    .filter(
      (check) =>
        check.critical &&
        (check.status === "conflict" ||
          check.status === "invalid" ||
          check.status === "unsupported"),
    )
    .map((check) => `calculation:${check.nodeId}:${check.errorCode ?? check.status}`);
}
