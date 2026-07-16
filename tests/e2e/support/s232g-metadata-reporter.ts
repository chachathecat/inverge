import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

const allowedTestStatuses = new Set([
  "passed",
  "failed",
  "timedOut",
  "skipped",
  "interrupted",
]);

const allowedRunStatuses = new Set([
  "passed",
  "failed",
  "timedout",
  "interrupted",
]);

const safeS232GFailurePattern =
  /(?:^|\n)(?:Error: )?S232G (?:static stage failed|acceptance failed): ([a-z0-9-]{1,64})\b/;

function classifyTest(test: TestCase) {
  if (test.title === "S232G final aggregate exact-head authenticated parity") {
    return "aggregate";
  }
  if (
    /^S232C\.1 exact CalculatorStep matrix at (?:mobile|tablet|desktop|desktop-200-percent-equivalent)$/.test(
      test.title,
    )
  ) {
    return "calculator-step";
  }
  return "unknown";
}

function safeFailureCode(result: TestResult) {
  for (const error of result.errors) {
    const match = typeof error.message === "string"
      ? error.message.match(safeS232GFailurePattern)
      : null;
    if (match?.[1]) return match[1];
  }
  return "unknown";
}

export default class S232GMetadataReporter implements Reporter {
  onBegin(_config: FullConfig, suite: Suite) {
    process.stdout.write(`[S232G] metadata-only run started; tests=${suite.allTests().length}\n`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const status = allowedTestStatuses.has(result.status) ? result.status : "unknown";
    const failureCode = status === "passed" ? "none" : safeFailureCode(result);
    process.stdout.write(
      `[S232G] test completed; class=${classifyTest(test)}; status=${status}; failure-code=${failureCode}\n`,
    );
  }

  onEnd(result: FullResult) {
    const status = allowedRunStatuses.has(result.status) ? result.status : "unknown";
    process.stdout.write(`[S232G] metadata-only run completed; status=${status}\n`);
  }

  printsToStdio() {
    return true;
  }
}
