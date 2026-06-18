import OpenAI from "openai";

import type { WrongAnswerItemInput } from "@/lib/review-os/types";

export type GeneratedWrongAnswerArtifacts = {
  note: {
    aiSummary: string;
    keyDistinction: string;
    reviewCheckpoint: string;
    nextTryTip: string;
    generationSource: "ai" | "fallback";
  };
  tags: {
    topicTag: string;
    mistakeType: string;
    taskType: string;
    classifierSource: "ai" | "rules";
    confidence: number;
    recurrenceCandidate: boolean;
  };
};

function inferMistakeType(input: WrongAnswerItemInput) {
  if (input.userReasonPreset) return input.userReasonPreset;

  const reasonText = input.userReasonText?.trim() ?? "";
  const text = `${reasonText} ${input.rawQuestionText ?? ""}`.toLowerCase();
  if (/무효|취소/.test(reasonText)) return "무효와 취소 구분 / 개념 혼동";
  if (/함정|표현|선지|오독/.test(reasonText)) return "trap_word";
  if (/예외|원칙/.test(reasonText)) return "rule_exception_confusion";
  if (reasonText) {
    if (/계산|숫자|산식|템플릿/.test(reasonText)) return "calculation_template_error";
    if (/조건|누락/.test(reasonText)) return "조건 누락";
    return reasonText.length <= 32 ? reasonText : "concept_confusion";
  }
  if (input.correctAnswer && input.userAnswer && input.correctAnswer.trim() !== input.userAnswer.trim()) return "wrong_answer";
  if (text.includes("계산") || text.includes("숫자")) return "계산 실수";
  if (text.includes("조건") || text.includes("누락")) return "조건 누락";
  if (text.includes("판례") || text.includes("논점")) return "판례/논점 적용 부족";
  if (text.includes("구조") || text.includes("목차")) return "구조 약함";
  if (/시간\s*(관리|부족|압박)|시간이\s*(부족|모자)/.test(text)) return "time_management";
  if (text.includes("암기")) return "암기 누락";
  return "개념 혼동";
}

function inferTopicTag(input: WrongAnswerItemInput) {
  const title = input.problemTitle?.trim();
  if (title) return title;
  const raw = input.rawQuestionText?.trim();
  if (raw) return raw.split(/[.\n]/)[0]!.slice(0, 28);
  return input.subjectLabel;
}

function isSecondExam(input: WrongAnswerItemInput) {
  return input.examName === "감정평가사 2차";
}

function buildFallback(input: WrongAnswerItemInput): GeneratedWrongAnswerArtifacts {
  const topicTag = inferTopicTag(input);
  const mistakeType = inferMistakeType(input);
  const second = isSecondExam(input);

  return {
    note: {
      aiSummary: second
        ? `${input.subjectLabel} 답안에서 먼저 보강할 지점은 ${mistakeType}입니다. 전체를 다시 쓰기보다 핵심 논점 하나를 고정해 다시 작성하세요.`
        : `${input.subjectLabel}에서 ${mistakeType}이 확인되었습니다. 같은 유형을 다시 틀리지 않도록 조건과 근거를 짧게 고정하세요.`,
      keyDistinction: second
        ? `참고 정리와 내 답안의 차이는 점수보다 누락된 논점과 답안 구조에서 먼저 봐야 합니다.`
        : `정답 자체보다 왜 그 선택지가 배제되거나 선택되는지 한 줄 근거를 남기는 것이 우선입니다.`,
      reviewCheckpoint: second
        ? `${topicTag}를 다시 볼 때 목차, 핵심 논점, 사례 적용 문장을 각각 한 번씩 확인하세요.`
        : `${topicTag}를 다시 풀 때 문제 조건, 적용 개념, 마지막 판단 근거를 순서대로 확인하세요.`,
      nextTryTip: second
        ? `다음 rewrite에서는 ${mistakeType} 하나만 고쳐서 8~10줄로 다시 작성하세요.`
        : `다음 회독에서는 ${mistakeType}이 보이면 바로 표시하고 같은 근거를 30초 안에 말해 보세요.`,
      generationSource: "fallback",
    },
    tags: {
      topicTag,
      mistakeType,
      taskType: second ? "2차 답안 보강" : "1차 오답 관리",
      classifierSource: "rules",
      confidence: 0.58,
      recurrenceCandidate: true,
    },
  };
}

export async function generateWrongAnswerArtifacts(
  input: WrongAnswerItemInput,
): Promise<GeneratedWrongAnswerArtifacts> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return buildFallback(input);

  const client = new OpenAI({ apiKey });
  const payload = {
    examName: input.examName,
    subjectLabel: input.subjectLabel,
    problemTitle: input.problemTitle ?? "",
    rawQuestionText: input.rawQuestionText ?? "",
    correctAnswer: input.correctAnswer,
    userAnswer: input.userAnswer,
    userReasonText: input.userReasonText ?? "",
    userReasonPreset: input.userReasonPreset ?? "",
    confidence: input.confidence,
    timeSpentSeconds: input.timeSpentSeconds ?? null,
  };

  try {
    const response = await client.responses.create({
      model: process.env.REVIEW_OS_OPENAI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are an appraisal-exam learning operations assistant for Korean 감정평가사 candidates. Do not grade generously or motivationally. Identify the next concrete review or rewrite action. For first-mode objective notes, learner-provided mistake reason and correct/user answer mismatch outrank time spent. Treat time spent as metadata only unless the learner explicitly says time management was the problem; never infer 시간 부족 from 소요시간 alone. Output Korean JSON only.",
            },
          ],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: JSON.stringify(payload) }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "appraisal_review_artifacts",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              note: {
                type: "object",
                additionalProperties: false,
                properties: {
                  aiSummary: { type: "string" },
                  keyDistinction: { type: "string" },
                  reviewCheckpoint: { type: "string" },
                  nextTryTip: { type: "string" },
                },
                required: ["aiSummary", "keyDistinction", "reviewCheckpoint", "nextTryTip"],
              },
              tags: {
                type: "object",
                additionalProperties: false,
                properties: {
                  topicTag: { type: "string" },
                  mistakeType: { type: "string" },
                  taskType: { type: "string" },
                  confidence: { type: "number" },
                  recurrenceCandidate: { type: "boolean" },
                },
                required: ["topicTag", "mistakeType", "taskType", "confidence", "recurrenceCandidate"],
              },
            },
            required: ["note", "tags"],
          },
        },
      },
    });

    if (!response.output_text) return buildFallback(input);

    const parsed = JSON.parse(response.output_text) as {
      note: Omit<GeneratedWrongAnswerArtifacts["note"], "generationSource">;
      tags: Omit<GeneratedWrongAnswerArtifacts["tags"], "classifierSource">;
    };

    return {
      note: { ...parsed.note, generationSource: "ai" },
      tags: { ...parsed.tags, classifierSource: "ai" },
    };
  } catch {
    return buildFallback(input);
  }
}
