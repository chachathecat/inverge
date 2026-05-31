export type SmartClozeInput = {
  statement: string;
  trapWords?: string[];
  conceptCandidate?: string | null;
};

export type SmartClozeRender = {
  stage: "빈칸";
  prompt: string;
  answer: string;
  source: "trap_word" | "concept_candidate";
} | {
  stage: "O/X";
  prompt: string;
  answer: null;
  source: "fallback";
};

function uniqueSafeCandidates(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value && value.length >= 2 && value.length <= 24))
    .filter((value) => !/[{}\[\]<>]/.test(value))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildSmartCloze(input: SmartClozeInput): SmartClozeRender {
  const statement = input.statement.trim().replace(/\s+/g, " ");
  if (!statement) return { stage: "O/X", prompt: "O/X로 다시 판단합니다.", answer: null, source: "fallback" };

  const trapCandidates = uniqueSafeCandidates(input.trapWords ?? []);
  const conceptCandidates = uniqueSafeCandidates([input.conceptCandidate]);
  const candidate = trapCandidates.find((word) => statement.includes(word));
  const source: "trap_word" | "concept_candidate" = candidate ? "trap_word" : "concept_candidate";
  const blank = candidate ?? conceptCandidates.find((word) => statement.includes(word));

  if (!blank) {
    return { stage: "O/X", prompt: statement, answer: null, source: "fallback" };
  }

  const prompt = statement.replace(new RegExp(escapeRegExp(blank), "u"), "____");
  if (prompt === statement || !prompt.includes("____")) {
    return { stage: "O/X", prompt: statement, answer: null, source: "fallback" };
  }

  return { stage: "빈칸", prompt, answer: blank, source };
}
