import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

import { buildAnswerReviewReferenceGrounding } from "@/lib/review-os/answer-review-reference-grounding";
import {
  buildCasioFx9860GiiiGuide,
  BuildCasioFx9860GiiiGuideInput,
  isCasioFx9860GiiiMode,
} from "@/lib/evaluate/casio-fx9860giii-guide";

export const dynamic = "force-dynamic";

function getFiles(formData: FormData, fieldName: string) {
  return formData.getAll(fieldName).filter((item): item is File => item instanceof File && item.size > 0);
}

function fileToPart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return file.arrayBuffer().then((buffer) => ({
    inlineData: { data: Buffer.from(buffer).toString("base64"), mimeType: file.type || "image/jpeg" },
  }));
}

function createModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash" });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const problemFiles = getFiles(formData, "problemFiles");
  const problemText = formData.get("problemText")?.toString() ?? "";
  const examMode = formData.get("examMode")?.toString() === "first" ? "first" : "second";
  const subject = formData.get("subject")?.toString() || "감정평가실무";
  const explanationLevel = formData.get("explanationLevel")?.toString() || "standard";

  if (problemFiles.length === 0 && !problemText.trim()) {
    return NextResponse.json({ ok: false, error: "문제 파일 또는 텍스트를 입력해 주세요." }, { status: 400 });
  }
  const model = createModel();
  if (!model) return NextResponse.json({ ok: false, error: "Gemini 설정이 필요합니다." }, { status: 503 });

  const referenceGrounding = buildAnswerReviewReferenceGrounding({ examMode, subject, questionText: problemText });
  const problemParts = await Promise.all(problemFiles.map((file) => fileToPart(file)));

  const response = await model.generateContent({
    contents: [{
      role: "user",
      parts: [{ text: [
        "너는 감정평가사 문제 스냅 학습 튜터다.",
        "모든 출력은 한국어.",
        `explanationLevel: ${explanationLevel}`,
        "중고등학생도 이해할 수 있게 설명( easy 일 때 ).",
        "standard는 일반 수험생 복습용 핵심 개념·풀이 순서.",
        "exam은 실제 답안 목차와 필수 키워드 중심.",
        "공식/산식은 왜곡하지 말 것.",
        "모르면 검토 필요라고 표기할 것.",
        "공식 채점, 점수, 합격 판정 금지.",
        "계산이 필요한 문제라면 CASIO fx-9860GIII 입력 순서를 제시한다.",
        "버튼 순서는 실제로 누르는 단위로 짧게 나눈다.",
        "RUN-MAT 일반 계산을 우선한다.",
        "검증되지 않은 특수 기능 경로는 단정하지 않는다.",
        "모르면 추천 모드를 검토 필요로 둔다.",
        "반올림/단위 표시를 따로 적는다.",
        "산식과 단위를 왜곡하지 않는다.",
        "CASIO가 공식 보증한 안내처럼 표현하지 않는다.",
        "정답 확정처럼 말하지 말 것.",
        "reference_only 맥락은 원문 복사 없이 skeleton/checkpoint/gap만 활용.",
        `problemText:\n${problemText || "[없음]"}`,
        `referenceGroundingContext:\n${referenceGrounding.promptContext}`,
      ].join("\n") }, ...problemParts],
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          problemSummary: { type: SchemaType.STRING }, askType: { type: SchemaType.STRING },
          requiredConcepts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          formulas: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          easyExplanation: { type: SchemaType.STRING },
          stepByStepSolution: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          examStyleStructure: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          commonMistakes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          nextPracticeAction: { type: SchemaType.STRING }, caution: { type: SchemaType.STRING },
          calculatorGuide: {
            type: SchemaType.OBJECT,
            properties: {
              calculatorModel: { type: SchemaType.STRING },
              calculationPurpose: { type: SchemaType.STRING },
              recommendedMode: { type: SchemaType.STRING },
              keystrokeSteps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              expectedDisplay: { type: SchemaType.STRING },
              answerRounding: { type: SchemaType.STRING },
              caution: { type: SchemaType.STRING },
            },
          },
        },
      },
    },
  });

  const result = JSON.parse(response.response.text() || "{}") as Record<string, unknown>;
  const rawGuide = (result.calculatorGuide ?? {}) as Record<string, unknown>;
  const rawSteps = Array.isArray(rawGuide.keystrokeSteps) ? rawGuide.keystrokeSteps.filter((step): step is string => typeof step === "string") : [];
  const hasCalculationSignal = rawSteps.length > 0
    || typeof rawGuide.calculationPurpose === "string"
    || isCasioFx9860GiiiMode(rawGuide.recommendedMode);
  if (hasCalculationSignal) {
    const guideInput: BuildCasioFx9860GiiiGuideInput = {
      keystrokeSteps: rawSteps,
    };
    if (typeof rawGuide.calculationPurpose === "string") {
      guideInput.calculationPurpose = rawGuide.calculationPurpose;
    }
    if (isCasioFx9860GiiiMode(rawGuide.recommendedMode)) {
      guideInput.recommendedMode = rawGuide.recommendedMode;
    }
    if (typeof rawGuide.expectedDisplay === "string") {
      guideInput.expectedDisplay = rawGuide.expectedDisplay;
    }
    if (typeof rawGuide.answerRounding === "string") {
      guideInput.answerRounding = rawGuide.answerRounding;
    }
    result.calculatorGuide = buildCasioFx9860GiiiGuide(guideInput);
  } else {
    result.calculatorGuide = buildCasioFx9860GiiiGuide({
      recommendedMode: "검토 필요",
      calculationPurpose: "계산기 입력이 필요한 문제인지 검토가 필요합니다.",
      keystrokeSteps: ["계산기 입력 없음"],
    });
  }
  return NextResponse.json({ ok: true, result, referenceGrounding: { used: referenceGrounding.references.length > 0, displayLabel: referenceGrounding.displayLabel } });
}
