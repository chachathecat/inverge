import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  OWNER_ALPHA_AI_REFERENCE_DISCLAIMER,
  OWNER_ALPHA_AI_REFERENCE_LABEL,
  type OwnerAlphaPracticeSession,
  type OwnerAlphaPracticeView,
} from "../../lib/review-os/owner-alpha-practice-contract";
import type {
  OwnerAlphaPracticeProviderPort,
  OwnerAlphaReferenceDraft,
} from "../../lib/review-os/owner-alpha-practice-provider-contract";
import type { OwnerAlphaPracticeRepositoryPort } from "../../lib/review-os/owner-alpha-practice-repository";
import { OwnerAlphaPracticeRuntime } from "../../lib/review-os/owner-alpha-practice-runtime";

const enabled = process.env.OWNER_ALPHA_RUNTIME_E2E === "1";
const expectedSha = process.env.PR_HEAD_SHA ?? "";
const userId = "11111111-1111-4111-8111-111111111111";
const ownerEmail = "codex-smoke@localhost.test";

function memoryRepository(): OwnerAlphaPracticeRepositoryPort {
  const rows = new Map<string, OwnerAlphaPracticeSession>();
  return {
    async create(session: OwnerAlphaPracticeSession) {
      rows.set(session.sessionId, structuredClone(session));
      return structuredClone(session);
    },
    async load(sessionId: string) {
      return structuredClone(rows.get(sessionId) ?? null);
    },
    async save(session: OwnerAlphaPracticeSession, expectedRecordVersion: number) {
      const current = rows.get(session.sessionId);
      if (!current || current.recordVersion !== expectedRecordVersion) throw new Error("cas");
      const next = {
        ...structuredClone(session),
        recordVersion: expectedRecordVersion + 1,
        updatedAt: new Date(Date.parse(current.updatedAt) + 1).toISOString(),
      };
      rows.set(session.sessionId, next);
      return structuredClone(next);
    },
    async listRecentSessions() {
      return [...rows.values()].map((row) => structuredClone(row));
    },
    async saveIndependentAttempt() {},
    async saveRewrite() {},
    async recordReferenceUsage() {},
    async projectCompletion() {},
  };
}

function fakeProvider(): OwnerAlphaPracticeProviderPort {
  return {
    async extractProblem() {
      throw new Error("file OCR is not used in this synthetic UI runtime");
    },
    async generateReference(input): Promise<OwnerAlphaReferenceDraft> {
      const node = {
        nodeId: "calc-cost-area",
        claimId: "claim-cost-area",
        label: "면적 × 단가",
        primitive: "area_times_unit_price" as const,
        area: 100,
        unitPrice: 2_000_000,
        claimedResult: 200_000_000,
        resultUnit: "원",
        critical: true,
      };
      return {
        reference: {
          referenceId: `${input.sessionId}-reference`,
          label: OWNER_ALPHA_AI_REFERENCE_LABEL,
          disclaimer: OWNER_ALPHA_AI_REFERENCE_DISCLAIMER,
          modelProfileId: "synthetic-exact-head.v1",
          promptVersion: "synthetic.v1",
          schemaVersion: "synthetic.v1",
          generatedAt: input.generatedAt,
          hints: ([1, 2, 3, 4] as const).map((level) => ({
            hintId: `hint-${level}`,
            level,
            text: `자료 역할과 단위를 확인하는 힌트 ${level}`,
          })),
          l1: { title: "L1", sections: [{ heading: "회상 뼈대", body: "요구사항 → 방법 → 산식 → 단위" }] },
          l2: { title: "L2", sections: [{ heading: "시험 분량", body: "면적과 단가를 확인하고 감가수정 순서를 적는다." }] },
          l3: { title: "L3", sections: [{ heading: "개념 주석", body: "자료 역할이 달라지면 같은 숫자도 산식 위치가 달라진다." }] },
          claims: [{
            claimId: "claim-cost-area",
            claimType: "formula" as const,
            summary: "면적과 단가의 곱",
            state: "ai_inference" as const,
            critical: true,
            evidenceRefIds: [],
            calculationNodeId: node.nodeId,
            resolutionCode: "provider_only" as const,
          }],
          calculationGraph: { nodes: [node] },
          releaseStatus: "released" as const,
          blockerCodes: [],
        },
        biggestGap: {
          gapId: "gap-cost",
          title: "자료 역할과 산식 입력",
          reasonSelected: "독립 시도에서 단가의 역할 설명이 가장 크게 비었습니다.",
          inferredMisunderstanding: "재조달원가 단가와 감가수정 입력 순서를 혼동했습니다.",
          successCriteria: "자료 역할·산식·단위를 독립적으로 다시 설명합니다.",
          conceptIds: ["cost-input-role"],
          state: "ai_candidate" as const,
        },
        misconceptionGraph: {
          graphId: "misconception-cost",
          nodes: [{
            conceptId: "cost-input-role",
            label: "재조달원가 입력 역할",
            state: "suspected" as const,
            evidenceRefIds: ["independent-attempt"],
          }],
          edges: [],
        },
        rootCauseCandidates: [{
          rootCauseId: "root-cost",
          label: "자료 역할 선행 구분 부족",
          rationale: "독립 시도에서 단가의 역할 설명이 없었습니다.",
          confidence: "medium" as const,
          evidenceRefIds: ["independent-attempt"],
          conceptIds: ["cost-input-role"],
          state: "candidate" as const,
        }],
        variant: {
          variantId: "variant-cost",
          kind: "numeric" as const,
          changedOneThing: "면적만 120㎡로 변경",
          prompt: "다른 조건은 같고 면적만 120㎡라면 다시 계산하세요.",
          verificationState: "ai_inference" as const,
          calculationGraph: { nodes: [] },
        },
      };
    },
  };
}

type RuntimeCommand = {
  action: string;
  sessionId: string;
  recordVersion: number;
  confirmedProblemText: string;
  attemptText: string;
  elapsedTimeMs: number;
  confidence: "low" | "medium" | "high";
  questionText: string | null;
  mode: "rewrite" | "recalculate";
  rewriteText: string;
  inferredMisunderstanding: string;
  successCriteria: string;
};

function createRuntime() {
  let id = 0;
  return new OwnerAlphaPracticeRuntime({
    repository: memoryRepository(),
    provider: fakeProvider(),
    assertReferenceEntitlement: async () => {},
    now: () => new Date("2026-07-22T00:00:00.000Z"),
    createId: () => `runtime-id-${++id}`,
    userId,
  });
}

async function assertAccessible(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );
  expect(blocking, `${label}: ${blocking.map((item) => item.id).join(", ")}`).toEqual([]);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${label}: horizontal overflow`).toBeLessThanOrEqual(2);
}

test.describe("owner alpha universal practice exact-head runtime", () => {
  test.skip(!enabled, "OWNER_ALPHA_RUNTIME_E2E=1 is required");

  test("keeps one primary action through capture, attempt, bounded reveal, rewrite, and D+1", async ({ page, context }) => {
    expect(expectedSha).toMatch(/^[0-9a-f]{40}$/);
    const runtime = createRuntime();
    let latestSessionId: string | null = null;
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    await context.addCookies([{
      name: "__inverge_dev_smoke_auth",
      value: Buffer.from(JSON.stringify({ userId, email: ownerEmail }), "utf8").toString("base64url"),
      url: "http://127.0.0.1:3000",
      sameSite: "Lax",
    }]);

    await page.route("**/api/problem-snap/owner-alpha**", async (route) => {
      const request = route.request();
      try {
        if (request.method() === "GET") {
          const session = latestSessionId ? await runtime.get(latestSessionId) : null;
          await route.fulfill({ status: session ? 200 : 404, contentType: "application/json", body: JSON.stringify({ ok: Boolean(session), session }) });
          return;
        }
        const contentType = request.headers()["content-type"] ?? "";
        if (contentType.includes("multipart/form-data")) {
          const session = await runtime.create({
            problemText: "대상건물의 면적은 100㎡이고 재조달원가 단가는 200만원/㎡이다. 감가수정 후 적산가격을 산정하시오.",
            files: [],
            inputModality: "typed",
          });
          latestSessionId = session.sessionId;
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, session }) });
          return;
        }
        const body = request.postDataJSON() as RuntimeCommand;
        let session: OwnerAlphaPracticeView;
        if (body.action === "confirm_problem") {
          session = await runtime.confirmProblem({
            sessionId: body.sessionId,
            recordVersion: body.recordVersion,
            confirmedProblemText: body.confirmedProblemText,
          });
        } else if (body.action === "save_attempt") {
          session = await runtime.saveIndependentAttempt({
            sessionId: body.sessionId,
            recordVersion: body.recordVersion,
            attemptText: body.attemptText,
            elapsedTimeMs: body.elapsedTimeMs,
            confidence: body.confidence,
          });
        } else if (body.action === "request_assistance" || body.action === "reveal_reference") {
          session = (await runtime.requestAssistance({
            sessionId: body.sessionId,
            recordVersion: body.recordVersion,
            questionText: body.questionText,
            revealFull: body.action === "reveal_reference",
          })).view;
        } else if (body.action === "complete_rewrite") {
          session = await runtime.completeRewrite({
            sessionId: body.sessionId,
            recordVersion: body.recordVersion,
            mode: body.mode,
            rewriteText: body.rewriteText,
            inferredMisunderstanding: body.inferredMisunderstanding,
            successCriteria: body.successCriteria,
          });
        } else {
          throw new Error("unsupported synthetic action");
        }
        latestSessionId = session.sessionId;
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, session }) });
      } catch {
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false, error: "synthetic_runtime_failure" }) });
      }
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/problem-snap?ownerAlpha=universal-practice-v0");
    await expect(page.getByRole("heading", { name: "감정평가실무 범용 학습 루프" })).toBeVisible();
    await assertAccessible(page, "capture");

    const version = await page.evaluate(async () => {
      const response = await fetch("/api/runtime/version", { cache: "no-store" });
      return { status: response.status, body: await response.json() };
    });
    expect(version.status).toBe(200);
    expect(version.body).toEqual({ ready: true, deploymentSha: expectedSha });

    await page.getByLabel("문제 텍스트").fill("원가방식 문제를 입력합니다.");
    await page.getByRole("button", { name: "문제 구조화 시작" }).click();
    await expect(page.getByRole("heading", { name: "2. 문제·자료 역할 확인" })).toBeVisible();
    await expect(page.getByText("원가방식·감가수정", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "핵심 OCR 확인 완료" }).click();
    await expect(page.getByRole("heading", { name: "3. 먼저 풀기" })).toBeVisible();
    await expect(page.getByText("아직 AI 기준안은 생성·노출되지 않았습니다.", { exact: false })).toBeVisible();
    await page.getByLabel("내 독립 시도").fill("면적과 단가를 곱한 뒤 감가수정 순서를 적용하겠습니다.");
    await page.getByRole("button", { name: "독립 시도 저장" }).click();

    for (let level = 1; level <= 4; level += 1) {
      await expect(page.getByRole("button", { name: `힌트 ${level} 요청` })).toBeVisible();
      if (level === 1) await page.getByLabel("지금 막힌 질문").fill("단가는 어느 단계에 적용하나요?");
      await page.getByRole("button", { name: `힌트 ${level} 요청` }).click();
      await expect(page.getByText(`자료 역할과 단위를 확인하는 힌트 ${level}`)).toBeVisible();
      await expect(page.getByText(OWNER_ALPHA_AI_REFERENCE_LABEL, { exact: true })).toHaveCount(0);
    }
    await page.getByRole("button", { name: `${OWNER_ALPHA_AI_REFERENCE_LABEL} L1/L2/L3 열기` }).click();
    await expect(page.getByRole("heading", { name: OWNER_ALPHA_AI_REFERENCE_LABEL })).toBeVisible();
    await expect(page.getByText("결정론 검증 완료", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "6. 가장 큰 간극 하나 → 다시 풀기" })).toBeVisible();
    await assertAccessible(page, "reference and rewrite");

    await page.getByLabel("내 재작성·재계산").fill("자료 역할을 구분하고 면적과 단가를 다시 곱해 단위까지 검산했습니다.");
    await page.getByRole("button", { name: "재학습 완료 및 D+1 예약" }).click();
    await expect(page.getByRole("heading", { name: "7. 다음 복습 연결 완료" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Queue" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Today" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Records" })).toBeVisible();

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 900 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await assertAccessible(page, `completed ${viewport.width}px`);
    }
    expect(consoleErrors).toEqual([]);
  });
});
