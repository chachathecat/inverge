import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("problem snap learner flow exposes camera-first premium inputs", async () => {
  const source = await readFile(new URL("../app/problem-snap/problem-snap-client.tsx", import.meta.url), "utf8");
  const subjectSource = await readFile(new URL("../lib/review-os/types.ts", import.meta.url), "utf8");
  assert.ok(source.includes("문제 사진 찍기"));
  assert.ok(source.includes("PDF/사진 불러오기"));
  assert.ok(source.includes("텍스트 붙여넣기"));
  assert.ok(source.includes("<select className=\"mt-1 w-full rounded border p-2\" value={subject}"));
  assert.ok(source.includes("감정평가실무"));
  assert.ok(source.includes("감정평가이론"));
  assert.ok(subjectSource.includes("감정평가 및 보상법규"));
  assert.ok(source.includes("APPRAISAL_FIRST_SUBJECTS"));
  assert.ok(source.includes("StandaloneLearnerToolNav"));
});

test("problem snap result hero, save CTA, and grounding copy are rendered", async () => {
  const source = await readFile(new URL("../app/problem-snap/problem-snap-client.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("가장 먼저 이해할 1가지"));
  assert.ok(source.includes("지금 다시 풀 행동 1개"));
  assert.ok(source.includes("주의할 함정 1개"));
  assert.ok(source.includes("자세히 보기"));
  assert.ok(source.includes("유사 기출 Skeleton을 참고해 정리했습니다."));
  assert.ok(source.includes("입력 자료 기준으로 정리했습니다."));
  assert.equal(source.includes("복습 큐에 저장</button>"), true);
  assert.equal(source.includes("<button disabled className"), false);
});

test("recognition confirmation, file remove/retake, and save states labels exist", async () => {
  const source = await readFile(new URL("../app/problem-snap/problem-snap-client.tsx", import.meta.url), "utf8");
  ["문제 인식 확인", "인식 내용 확정", "삭제", "다시 찍기", "저장 중", "저장됨", "저장 실패", "로컬 임시 저장"].forEach((label) =>
    assert.ok(source.includes(label), `Missing ${label}`),
  );
});

test("quality checklist is kept inside details", async () => {
  const source = await readFile(new URL("../app/problem-snap/problem-snap-client.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("정상"));
  assert.ok(source.includes("품질 점검"));
});

test("problem snap learner copy avoids endorsement, grading, and payment claims", async () => {
  const source = await readFile(new URL("../app/problem-snap/problem-snap-client.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("공식 보증"), false);
  assert.equal(source.includes("결제"), false);
  assert.equal(source.includes("checkout"), false);
  assert.equal(source.includes("합격 보장"), false);
  assert.equal(source.includes("공식 채점"), false);
});


test("recognition labels are Korean and camelCase labels are hidden", async () => {
  const source = await readFile(new URL("../app/problem-snap/problem-snap-client.tsx", import.meta.url), "utf8");
  ["문제 요약", "요구 유형", "읽은 조건", "숫자·단위", "불명확한 부분"].forEach((label) => assert.ok(source.includes(label)));
  ["problemSummaryDraft:", "askTypeDraft:", "missingOrUnclearParts:"].forEach((label) => assert.equal(source.includes(label), false));
});

test("local storage fallback uses the expected queue key", async () => {
  const source = await readFile(new URL("../app/problem-snap/problem-snap-client.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('const key = "inverge.problemSnap.localQueue"'));
  assert.ok(source.includes('localStorage.setItem(key, JSON.stringify(queue));'));
});

test("placeholder extraction values do not count as normal", async () => {
  const source = await readFile(new URL("../app/problem-snap/problem-snap-client.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('const hasMeaningfulValue = (items?: string[]) =>'));
  ["확인 필요", "검토 필요", "없음"].forEach((value) => assert.ok(source.includes(value)));
  assert.ok(source.includes('{hasMeaningfulValue(result.extractedNumbersAndUnits) ? "정상" : "확인 필요"}'));
});

test("subject-specific views and retry mode labels exist", async () => {
  const source = await readFile(new URL("../app/problem-snap/problem-snap-client.tsx", import.meta.url), "utf8");
  ["view === \"practice\"", "view === \"theory\"", "view === \"law\"", "해설 가리고 다시 풀기", "해설 다시 보기", "Answer Review로 내 풀이 검토하기"].forEach((label) => assert.ok(source.includes(label), `Missing ${label}`));
  ["조건 정리", "핵심 산식", "계산 순서", "CASIO 입력", "단위/반올림", "답안에 적을 값"].forEach((label) => assert.ok(source.includes(label), `Missing practice label ${label}`));
  ["개념 정의", "비교/대립 논점", "답안 목차", "필수 키워드", "사례 적용 문장"].forEach((label) => assert.ok(source.includes(label), `Missing theory label ${label}`));
  ["쟁점", "조문/요건", "절차", "사안 포섭", "결론 문장"].forEach((label) => assert.ok(source.includes(label), `Missing law label ${label}`));
  ["개념 확인", "체크포인트", "다시 풀 행동"].forEach((label) => assert.ok(source.includes(label), `Missing first-stage label ${label}`));
  assert.ok(source.includes("!retryMode ? <div><h3 className=\"font-medium\">{resultHeading}</h3><p>{result.easyExplanation}</p></div> : null"));
  assert.ok(source.includes("!retryMode ? ("));
  assert.ok(source.includes("showCalculatorGuide && calculatorEvidenceAnalysis ? ("));
  assert.ok(source.includes(") : null}"));
  assert.ok(source.includes("renderPrimarySubjectCards"));
  assert.ok(source.includes("const renderSubjectSpecificCards = ("));
  assert.ok(source.includes("view: \"practice\" | \"theory\" | \"law\" | \"first\""));
  assert.ok(source.includes("currentResult: ProblemSnapResult"));
  assert.ok(source.includes("const cards = renderSubjectSpecificCards(view, currentResult, analysis);"));
  assert.ok(source.includes("return cards.slice(0, 4);"));
  assert.equal(source.includes("const renderSubjectSpecificCards = (view: \"practice\" | \"theory\" | \"law\" | \"first\") =>"), false);
  assert.equal(source.includes("return Array.isArray(cards) ? cards.slice(0, 4) : cards;"), false);
  assert.ok(source.includes("`/answer-review?mode=${currentExamMode}&subject=${encodeURIComponent(currentSubject)}&source=problem-snap`"));
  assert.ok(source.includes('try {'));
  assert.ok(source.includes('sessionStorage.setItem("inverge.problemSnap.answerReviewHandoff", JSON.stringify(handoffPayload));'));
  assert.ok(source.includes('} catch {'));
  assert.ok(source.includes('source: "problem-snap"'));
  assert.ok(source.includes("calculatorRoutineId: calculatorRoutineDraftReference?.routineId"));
  assert.ok(source.includes("calculatorRoutineDraftKey: calculatorRoutineDraftReference?.draftKey"));
  assert.equal(source.includes("mode=second&examMode="), false);
});

test("calculation routine is primary before collapsed calculator reference and generic explanation", async () => {
  const source = await readFile(new URL("../app/problem-snap/problem-snap-client.tsx", import.meta.url), "utf8");
  const trainer = await readFile(new URL("../components/review-os/calculator-routine-trainer.tsx", import.meta.url), "utf8");
  const combined = `${source}\n${trainer}`;
  const routineIndex = source.indexOf("<CalculatorRoutineTrainer");
  const calculatorIndex = source.indexOf("data-problem-snap-calculator-step");
  const genericIndex = source.indexOf('<div><h3 className="font-medium">{resultHeading}</h3><p>{result.easyExplanation}</p></div>');

  assert.ok(routineIndex >= 0, "calculator routine trainer should exist");
  assert.ok(calculatorIndex >= 0, "calculator step panel should exist");
  assert.ok(genericIndex >= 0, "generic explanation should exist");
  assert.ok(source.indexOf("<CalculatorRoutineTrainer") < source.indexOf("renderCalculatorStepPanel(calculatorEvidenceAnalysis,"));
  assert.ok(source.indexOf("renderCalculatorStepPanel(calculatorEvidenceAnalysis,") < genericIndex);
  assert.ok(source.includes("data-problem-snap-calculator-reference-locked"));
  assert.ok(source.includes("shouldUnlockProblemSnapCalculatorReference"));
  assert.ok(source.includes("routineReferenceUnlocked: calculatorRoutineReferenceUnlocked"));
  assert.ok(source.includes("retryMemo,"));
  assert.ok(source.includes("getProblemSnapCalculatorEvidenceAnalysis(result)"));
  assert.equal(source.includes("hasCalculatorGuideData"), false);
  assert.equal(source.includes("isMeaningfulCalculatorValue"), false);
  assert.ok(source.includes("먼저 계산·검산 루틴에서 한 단계 입력하거나 막힘을 선택하면 전체 참고 신호를 열 수 있습니다."));
  assert.ok(source.includes("먼저 해설 가리고 다시 풀기에서 내 풀이 메모를 남긴 뒤 전체 참고 신호를 열 수 있습니다."));
  assert.ok(source.includes("setCalculatorRoutineDraftReference(null);"));
  assert.ok(source.includes("setCalculatorRoutineRunId(null);"));
  assert.ok(source.includes('setCalculatorRoutineRunId(createCalculatorRoutineRunId("problem-snap"));'));
  ["계산·검산 루틴", "계산·검산 루틴 시작", "정답 판정이 아니라 내 계산 과정을 점검하는 훈련입니다.", "참고 신호 보기", "AI 생성 초안입니다. 원문·숫자·단위를 직접 대조해 주세요.", "계산/CASIO 참고 신호", "계산 목적", "추천 모드", "계산 순서", "CASIO 입력", "화면에 보여야 할 값", "답안에 적을 값", "단위/반올림 주의"].forEach((label) =>
    assert.ok(combined.includes(label), label),
  );
  assert.ok(source.includes("계산/CASIO 스텝은 확인이 필요합니다. 원문 숫자와 단위를 직접 확인해 주세요."));
});

test("guardrails remain intact in learner flow copy", async () => {
  const source = await readFile(new URL("../app/problem-snap/problem-snap-client.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("공식 채점"), false);
  assert.equal(source.includes("pass/fail"), false);
  assert.equal(source.includes("합격/불합격"), false);
  assert.equal(source.includes("결제"), false);
  assert.equal(source.includes("CASIO 공식"), false);
  assert.equal(source.includes("기출 아카이브"), false);
});
