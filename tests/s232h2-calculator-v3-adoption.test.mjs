import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("S232H.2 enables focus chrome only for the second-round CASIO practice route", () => {
  const shell = read("components/learner/learner-ui.tsx");

  assert.match(shell, /const ledgerFocusMode = pathname\.startsWith\("\/app\/items\/"\)/);
  assert.match(shell, /const calculatorFocusMode =/);
  assert.match(shell, /pathname === "\/app\/calculator"/);
  assert.match(shell, /searchParams\.get\("mode"\) === "second"/);
  assert.match(shell, /searchParams\.get\("focus"\) === "casio"/);
  assert.match(shell, /calculatorContext === null \|\| calculatorContext === "practice"/);
  assert.match(shell, /const focusMode = ledgerFocusMode \|\| calculatorFocusMode/);
  assert.match(shell, /"#study-ledger-content"[\s\S]*"#calculator-routine-content"[\s\S]*"#learner-main"/);
  assert.match(shell, /계산·검산 내용으로 바로가기/);
});

test("S232H.2 adopts the Mobile Calculator representative contract without changing calculator truth", () => {
  const page = read("components/review-os/calculator-workflow-page.tsx");
  const route = read("app/app/calculator/page.tsx");

  assert.match(page, /if \(isCasioFocus\)/);
  assert.match(page, /const isCasioFocus = workflow\.mode === "second" && workflow\.context === "practice"/);
  assert.match(page, /data-calculator-focus-contract=\{focus === "casio" \? "canonical" : "normalized"\}/);
  assert.match(page, /data-v3-mobile-node="57:34"/);
  assert.match(page, /id="calculator-routine-content"/);
  assert.match(page, /data-calculator-routine-identity/);
  assert.match(page, /<h1 id="calculator-focus-title" className="v3-type-screen/);
  assert.match(page, /fx-9860GIII 계산 루틴/);
  assert.match(page, /계산 루틴/);
  assert.match(page, /<TrustEvidenceBar/);
  assert.match(page, /kind: "review_requirement", reviewRequired: true/);
  assert.match(page, /입력 순서 직접 확인 · 기기 검증 전/);
  assert.match(page, /presentation="focus"/);
  assert.match(page, /<V3QuietDisclosure/);
  assert.doesNotMatch(page, /<Link[^>]*>[\s\S]*?<Button/);
  assert.match(page, /자동 계산이나 공식 타건 안내가 아니며/);
  assert.match(route, /mode === "second"/);
  assert.match(route, /params\?\.context !== "practice"/);
  assert.match(route, /params\?\.focus !== "casio"/);
  assert.match(route, /redirect\(`\/app\/calculator\?\$\{canonicalParams\.toString\(\)\}`\)/);
  assert.match(route, /canonicalParams\.set\("recoveryRoutineId"/);
  assert.match(route, /canonicalParams\.set\("recoverySource"/);
});

test("S232H.2 keeps one calculator step dominant and uses the canonical dock action", () => {
  const trainer = read("components/review-os/calculator-routine-trainer.tsx");

  assert.match(trainer, /presentation\?: "embedded" \| "embedded-v3" \| "focus"/);
  assert.match(trainer, /data-calculator-routine-presentation=\{presentation\}/);
  assert.match(trainer, /isV3Presentation[\s\S]*\? "border-0 bg-transparent"/);
  assert.match(trainer, /calculatorStepPresentation[\s\S]*\? "border-0 p-0 shadow-none"/);
  assert.match(trainer, /<CalculatorStep/);
  assert.match(trainer, /data-calculator-routine-adjacent-steps/);
  assert.match(trainer, /<StickyAction/);
  assert.match(trainer, /responsive/);
  assert.match(trainer, /onAction=\{goNext\}/);
  assert.match(trainer, /state="Disabled"/);
  assert.match(trainer, /serializeCalculatorRoutineDraftForSession\(draft\)/);
  assert.match(trainer, /buildCalculatorRoutineCompletionSignal\(draft\)/);
  assert.match(trainer, /정답 판정이나 결과 확정이 아닙니다/);
});

test("S232H.2 keeps Answer Review calculator V3-embedded without a competing dock or primary action", () => {
  const answerReview = read("app/answer-review/answer-review-client.tsx");
  const trainer = read("components/review-os/calculator-routine-trainer.tsx");
  const syncStatus = read("components/review-os/calculator-routine-sync-status.tsx");

  assert.match(
    answerReview,
    /presentation=\{\s*examMode === "second"\s*\?\s*"embedded-v3"\s*:\s*"embedded"\s*\}/,
  );
  assert.match(answerReview, /presentation=\{examMode === "second" \? "v3" : "legacy"\}/);
  assert.match(answerReview, /로그인하고 기록 저장[\s\S]*?tone="secondary"|tone="secondary"[\s\S]*?로그인하고 기록 저장/);
  assert.match(trainer, /const isEmbeddedV3Presentation = presentation === "embedded-v3"/);
  assert.match(trainer, /\{isFocusPresentation && trainerState !== "completed" \? \(/);
  assert.match(trainer, /tone=\{isEmbeddedV3Presentation \? "secondary" : "primary"\}/);
  assert.match(trainer, /data-v3-system-state="error"/);
  assert.match(trainer, /<RoutineCompletedSurface[\s\S]*?focusPresentation=\{isV3Presentation\}[\s\S]*?storageFailed=\{storageStatus === "failed"\}/);
  assert.match(syncStatus, /presentation\?: "legacy" \| "v3"/);
  assert.match(syncStatus, /data-v3-component="UtilityState"/);
  assert.match(syncStatus, /tone="secondary" onClick=\{onRetry\}/);
});

test("S232H.2 extends StickyAction additively for a real button controller", () => {
  const sticky = read("components/learner/study-ledger-ui.tsx");

  assert.match(sticky, /onAction: \(\) => void/);
  assert.match(sticky, /onClick=\{props\.onAction\}/);
  assert.match(sticky, /"href" in props && props\.href/);
  assert.match(sticky, /data-v3-component="StickyAction"/);
  assert.match(sticky, /fixed inset-x-0 bottom-0/);
  assert.match(sticky, /lg:static/);
});
