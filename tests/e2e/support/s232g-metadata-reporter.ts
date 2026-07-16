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

export default class S232GMetadataReporter implements Reporter {
  onBegin(_config: FullConfig, suite: Suite) {
    process.stdout.write(`[S232G] metadata-only run started; tests=${suite.allTests().length}\n`);
  }

  onTestEnd(_test: TestCase, result: TestResult) {
    const status = allowedTestStatuses.has(result.status) ? result.status : "unknown";
    process.stdout.write(`[S232G] test completed; status=${status}\n`);
  }

  onEnd(result: FullResult) {
    const status = allowedRunStatuses.has(result.status) ? result.status : "unknown";
    process.stdout.write(`[S232G] metadata-only run completed; status=${status}\n`);
  }

  printsToStdio() {
    return true;
  }
}
