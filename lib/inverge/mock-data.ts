import type {
  ComparisonBlock,
  ControlRoomState,
  RiskLevel,
  SubjectDraft,
} from "@/lib/inverge/types";
import { buildPositionCopy, buildTargetCopy } from "@/lib/inverge/utils";

export const DEFAULT_EXAM_ID = "appraiser-second";
export const DEFAULT_SESSION_ID = "2026-1";
export const DEFAULT_SUBJECT_ID = "practice";

const ko = (value: string) => JSON.parse(`"${value}"`) as string;

export type InvergeSubject = {
  id: string;
  name: string;
  shortName: string;
  focusAxis: string;
  expectedTime: string;
  inputPlaceholder: string;
};

export type InvergeSession = {
  id: string;
  label: string;
};

export type InvergeExam = {
  id: string;
  name: string;
  shortName: string;
  sessions: InvergeSession[];
  subjects: InvergeSubject[];
};

export const APPRAISER_SECOND_EXAM: InvergeExam = {
  id: DEFAULT_EXAM_ID,
  name: ko("\\uac10\\uc815\\ud3c9\\uac00\\uc0ac 2\\ucc28"),
  shortName: ko("\\uac10\\ud3c9 2\\ucc28"),
  sessions: [{ id: DEFAULT_SESSION_ID, label: ko("2026\\ub144 1\\ud68c \\ub300\\ube44") }],
  subjects: [
    {
      id: "practice",
      name: ko("\\uc2e4\\ubb34"),
      shortName: ko("\\uc2e4\\ubb34"),
      focusAxis: ko("\\uacc4\\uc0b0-\\ub17c\\ub9ac \\uc5f0\\uacb0"),
      expectedTime: ko("28\\ubd84"),
      inputPlaceholder: ko(
        "\\uc2e4\\ubb34 \\ub2f5\\uc548\\uc744 \\ubb38\\ub2e8 \\ub610\\ub294 \\uacc4\\uc0b0 \\ud750\\ub984 \\ub2e8\\uc704\\ub85c \\ubd99\\uc5ec \\ub123\\uc5b4 \\uc8fc\\uc138\\uc694. \\uacc4\\uc0b0 \\uacb0\\uacfc\\uc640 \\uacb0\\ub860 \\ubb38\\uc7a5\\uc744 \\ud568\\uaed8 \\ub0a8\\uae30\\uba74 \\ube44\\uad50 \\uc815\\ud655\\ub3c4\\uac00 \\ub192\\uc544\\uc9d1\\ub2c8\\ub2e4.",
      ),
    },
    {
      id: "theory",
      name: ko("\\uc774\\ub860"),
      shortName: ko("\\uc774\\ub860"),
      focusAxis: ko("\\ub17c\\uc810 \\uad6c\\uc870\\ud654"),
      expectedTime: ko("24\\ubd84"),
      inputPlaceholder: ko(
        "\\uc774\\ub860 \\ub2f5\\uc548\\uc744 \\ubb38\\ub2e8\\ubcc4\\ub85c \\ubd99\\uc5ec \\ub123\\uc5b4 \\uc8fc\\uc138\\uc694. \\uccab \\ubb38\\uc7a5\\uc5d0 \\uc8fc\\uc7a5 \\ub610\\ub294 \\ub17c\\uc810\\uc774 \\ubcf4\\uc774\\uba74 \\ube44\\uad50\\uac00 \\ub354 \\uc120\\uba85\\ud574\\uc9d1\\ub2c8\\ub2e4.",
      ),
    },
    {
      id: "law",
      name: ko("\\ubc95\\uaddc"),
      shortName: ko("\\ubc95\\uaddc"),
      focusAxis: ko("\\uc870\\ubb38-\\uc0ac\\uc548 \\uc5f0\\uacb0"),
      expectedTime: ko("26\\ubd84"),
      inputPlaceholder: ko(
        "\\ubc95\\uaddc \\ub2f5\\uc548\\uc744 \\uc7c1\\uc810 \\ub2e8\\uc704\\ub85c \\ubd99\\uc5ec \\ub123\\uace0, \\uc870\\ubb38\\uacfc \\uacb0\\ub860\\uc744 \\uc5f0\\uacb0\\ud558\\ub294 \\uc9c0\\uc810\\uc744 \\ud3ec\\ud568\\ud574 \\uc8fc\\uc138\\uc694.",
      ),
    },
  ],
};

function createSingleSubjectExam({
  id,
  name,
  shortName,
  sessionLabel,
  subjectName,
  focusAxis,
  expectedTime,
  inputPlaceholder,
}: {
  id: string;
  name: string;
  shortName: string;
  sessionLabel: string;
  subjectName: string;
  focusAxis: string;
  expectedTime: string;
  inputPlaceholder: string;
}): InvergeExam {
  return {
    id,
    name,
    shortName,
    sessions: [{ id: DEFAULT_SESSION_ID, label: sessionLabel }],
    subjects: [
      {
        id: "core",
        name: subjectName,
        shortName: subjectName,
        focusAxis,
        expectedTime,
        inputPlaceholder,
      },
    ],
  };
}

export const CPA_SECOND_EXAM = createSingleSubjectExam({
  id: "cpa-second",
  name: ko("\\ud68c\\uacc4\\uc0ac 2\\ucc28"),
  shortName: "CPA 2",
  sessionLabel: ko("2026\\ub144 2\\ucc28 \\ub300\\ube44"),
  subjectName: ko("\\uc11c\\uc220\\ud615 \\ub2f5\\uc548"),
  focusAxis: ko("\\uacb0\\ub860 \\uba85\\ub8cc\\ub3c4"),
  expectedTime: ko("25\\ubd84"),
  inputPlaceholder: ko(
    "\\ud68c\\uacc4\\uc0ac 2\\ucc28 \\uc11c\\uc220\\ud615 \\ub2f5\\uc548\\uc744 \\ubd99\\uc5ec \\ub123\\uc5b4 \\uc8fc\\uc138\\uc694. \\uacc4\\uc0b0 \\uadfc\\uac70\\uc640 \\uacb0\\ub860 \\ubb38\\uc7a5\\uc744 \\ud568\\uaed8 \\ub0a8\\uae30\\uba74 \\uc88b\\uc2b5\\ub2c8\\ub2e4.",
  ),
});

export const TAX_SECOND_EXAM = createSingleSubjectExam({
  id: "tax-second",
  name: ko("\\uc138\\ubb34\\uc0ac 2\\ucc28"),
  shortName: ko("\\uc138\\ubb34 2"),
  sessionLabel: ko("2026\\ub144 2\\ucc28 \\ub300\\ube44"),
  subjectName: ko("\\uc138\\ubc95 \\ub2f5\\uc548"),
  focusAxis: ko("\\ubc95\\ub839 \\uc5f0\\uacb0"),
  expectedTime: ko("26\\ubd84"),
  inputPlaceholder: ko(
    "\\uc138\\ubb34\\uc0ac 2\\ucc28 \\ub2f5\\uc548\\uc744 \\uc7c1\\uc810 \\ub2e8\\uc704\\ub85c \\ubd99\\uc5ec \\ub123\\uc5b4 \\uc8fc\\uc138\\uc694. \\ubc95\\ub839 \\uadfc\\uac70\\uc640 \\uc0ac\\uc548 \\uc801\\uc6a9 \\ubb38\\uc7a5\\uc744 \\ud3ec\\ud568\\ud574 \\uc8fc\\uc138\\uc694.",
  ),
});

export const TOEFL_ESSAY_EXAM = createSingleSubjectExam({
  id: "toefl-essay",
  name: "TOEFL Essay",
  shortName: "TOEFL",
  sessionLabel: "Task 1 & 2",
  subjectName: "Essay",
  focusAxis: ko("\\uadfc\\uac70 \\ud655\\uc7a5"),
  expectedTime: ko("22\\ubd84"),
  inputPlaceholder: ko(
    "TOEFL Essay \\ub2f5\\uc548\\uc744 \\ubd99\\uc5ec \\ub123\\uc5b4 \\uc8fc\\uc138\\uc694. \\ubcf8\\ubb38 \\ubb38\\ub2e8\\uacfc \\uadfc\\uac70 \\uc804\\uac1c\\uac00 \\ubcf4\\uc774\\ub3c4\\ub85d \\uc791\\uc131\\ud574 \\uc8fc\\uc138\\uc694.",
  ),
});

export const SAT_ESSAY_EXAM = createSingleSubjectExam({
  id: "sat-essay",
  name: "SAT Essay",
  shortName: "SAT",
  sessionLabel: "Reading & Analysis",
  subjectName: "Essay",
  focusAxis: ko("\\ubd84\\uc11d \\ubc00\\ub3c4"),
  expectedTime: ko("24\\ubd84"),
  inputPlaceholder: ko(
    "SAT Essay \\ub2f5\\uc548\\uc744 \\ubd99\\uc5ec \\ub123\\uc5b4 \\uc8fc\\uc138\\uc694. \\uc81c\\uc2dc\\ubb38 \\ud574\\uc11d, \\uc124\\ub4dd \\uc804\\ub7b5 \\ubd84\\uc11d, \\ubb38\\ub2e8 \\uc5f0\\uacb0\\uc774 \\ubcf4\\uc774\\ub3c4\\ub85d \\uc791\\uc131\\ud574 \\uc8fc\\uc138\\uc694.",
  ),
});

export const INVERGE_EXAMS: InvergeExam[] = [
  APPRAISER_SECOND_EXAM,
  CPA_SECOND_EXAM,
  TAX_SECOND_EXAM,
  TOEFL_ESSAY_EXAM,
  SAT_ESSAY_EXAM,
];

export type ExamSelectionSummary = {
  id: string;
  name: string;
  sessionLabel: string;
  recommended?: boolean;
  axes: string[];
  description: string;
  proof: string;
};

export const EXAM_SELECTION_SUMMARIES: ExamSelectionSummary[] = [
  {
    id: "appraiser-second",
    name: ko("\\uac10\\uc815\\ud3c9\\uac00\\uc0ac 2\\ucc28"),
    sessionLabel: ko("\\uc2e4\\ubb34 · \\uc774\\ub860 · \\ubc95\\uaddc"),
    recommended: true,
    axes: [
      ko("\\uacc4\\uc0b0-\\ub17c\\ub9ac \\uc5f0\\uacb0"),
      ko("\\ub17c\\uc810 \\uad6c\\uc870\\ud654"),
      ko("\\uc870\\ubb38-\\uc0ac\\uc548 \\uc5f0\\uacb0"),
    ],
    description: ko(
      "\\uacfc\\ubaa9\\ubcc4 \\ub2f5\\uc548 \\uad6c\\uc870\\uc640 \\uc0c1\\uc704 10% \\ub2f5\\uc548\\uc758 \\ucc28\\uc774\\ub97c \\ubb38\\ub2e8 \\ub2e8\\uc704\\ub85c \\uc9c4\\ub2e8\\ud569\\ub2c8\\ub2e4.",
    ),
    proof: ko("\\ucd5c\\uadfc \\ubd84\\uc11d\\uc774 \\uac00\\uc7a5 \\ub9ce\\uc740 \\ud2b8\\ub799"),
  },
  {
    id: "cpa-second",
    name: ko("\\ud68c\\uacc4\\uc0ac 2\\ucc28"),
    sessionLabel: ko("\\uc11c\\uc220\\ud615 \\ub2f5\\uc548"),
    axes: [ko("\\uacb0\\ub860 \\uba85\\ub8cc\\ub3c4"), ko("\\uacc4\\uc0b0 \\uadfc\\uac70"), ko("\\uc11c\\uc220 \\uc77c\\uad00\\uc131")],
    description: ko(
      "\\uacc4\\uc0b0 \\uacb0\\uacfc\\uc640 \\uacb0\\ub860 \\ubb38\\uc7a5\\uc774 \\ud3c9\\uac00 \\ud750\\ub984 \\uc548\\uc5d0\\uc11c \\uc77c\\uad00\\ub418\\uac8c \\uc774\\uc5b4\\uc9c0\\ub294\\uc9c0 \\ud655\\uc778\\ud569\\ub2c8\\ub2e4.",
    ),
    proof: ko("\\uc804\\ubb38\\uc9c1 \\uc11c\\uc220\\ud615 \\ub2f5\\uc548 \\uc9c0\\uc6d0"),
  },
  {
    id: "tax-second",
    name: ko("\\uc138\\ubb34\\uc0ac 2\\ucc28"),
    sessionLabel: ko("\\uc138\\ubc95 \\ub2f5\\uc548"),
    axes: [ko("\\ubc95\\ub839 \\uc5f0\\uacb0"), ko("\\uc7c1\\uc810 \\ubd84\\ub9ac"), ko("\\uacb0\\ub860 \\uc555\\ucd95")],
    description: ko(
      "\\ubc95\\ub839 \\uadfc\\uac70, \\uc7c1\\uc810 \\ubd84\\ub9ac, \\uc0ac\\uc548 \\uc801\\uc6a9 \\ubb38\\uc7a5\\uc758 \\ubc00\\ub3c4\\ub97c \\uae30\\uc900\\uc73c\\ub85c \\uc0c1\\ub300 \\uc704\\uce58\\ub97c \\uc9c4\\ub2e8\\ud569\\ub2c8\\ub2e4.",
    ),
    proof: ko("\\uc7c1\\uc810\\ud615 \\ub2f5\\uc548 \\ube44\\uad50 \\uc9c0\\uc6d0"),
  },
  {
    id: "toefl-essay",
    name: "TOEFL Essay",
    sessionLabel: "Task 1 & 2",
    axes: [ko("\\uadfc\\uac70 \\ud655\\uc7a5"), ko("\\ubb38\\uc7a5 \\ub2e4\\uc591\\uc131"), ko("\\uc751\\uc9d1\\ub825")],
    description: ko(
      "\\uadfc\\uac70 \\uc804\\uac1c\\uc640 \\ubb38\\ub2e8 \\uc751\\uc9d1\\ub825\\uc744 \\uae30\\uc900\\uc73c\\ub85c \\uc0c1\\uc704\\uad8c \\uc0d8\\ud50c \\ub2f5\\uc548\\uacfc \\ube44\\uad50\\ud569\\ub2c8\\ub2e4.",
    ),
    proof: ko("\\uc601\\uc5b4 \\uc5d0\\uc138\\uc774 \\ud2b8\\ub799"),
  },
  {
    id: "sat-essay",
    name: "SAT Essay",
    sessionLabel: "Reading & Analysis",
    axes: [ko("\\uadfc\\uac70 \\ud574\\uc11d"), ko("\\ubd84\\uc11d \\ubc00\\ub3c4"), ko("\\ubb38\\uc7a5 \\uc751\\uc9d1\\ub825")],
    description: ko(
      "\\uc81c\\uc2dc\\ubb38 \\ud574\\uc11d, \\uc124\\ub4dd \\uc804\\ub7b5 \\ubd84\\uc11d, \\ubb38\\ub2e8 \\uad6c\\uc870\\uc640 \\ubb38\\uc7a5 \\uc751\\uc9d1\\ub825\\uc744 \\ud568\\uaed8 \\ubd05\\ub2c8\\ub2e4.",
    ),
    proof: ko("\\uc0c1\\uc704\\uad8c \\ub2f5\\uc548 \\ube44\\uad50 \\uc9c0\\uc6d0"),
  },
];

export function getExamSelectionSummary(examId = DEFAULT_EXAM_ID) {
  return EXAM_SELECTION_SUMMARIES.find((exam) => exam.id === examId) ?? EXAM_SELECTION_SUMMARIES[0];
}

export function getDefaultSubjectIdForExam(examId = DEFAULT_EXAM_ID) {
  return getExam(examId).subjects[0]?.id ?? DEFAULT_SUBJECT_ID;
}

export function getDefaultSessionIdForExam(examId = DEFAULT_EXAM_ID) {
  return getExam(examId).sessions[0]?.id ?? DEFAULT_SESSION_ID;
}

export function getExamHomePath(examId = DEFAULT_EXAM_ID) {
  return `/exams/${examId}/${getDefaultSessionIdForExam(examId)}/${getDefaultSubjectIdForExam(examId)}`;
}

export function getWritePath(examId = DEFAULT_EXAM_ID, subjectId?: string) {
  const sessionId = getDefaultSessionIdForExam(examId);
  const resolvedSubjectId = subjectId ?? getDefaultSubjectIdForExam(examId);
  return `/exams/${examId}/${sessionId}/${resolvedSubjectId}/write`;
}

function makeComparison(subjectId: string): ComparisonBlock[] {
  const focus =
    subjectId === "theory"
      ? ko("\\ub17c\\uc810 \\uad6c\\uc870\\ud654")
      : subjectId === "law"
        ? ko("\\uc870\\ubb38-\\uc0ac\\uc548 \\uc5f0\\uacb0")
        : ko("\\uacc4\\uc0b0-\\ub17c\\ub9ac \\uc5f0\\uacb0");

  return [
    {
      id: `${subjectId}-1`,
      heading:
        subjectId === "law"
          ? ko("\\uc870\\ubb38 \\uc801\\uc6a9 \\ubb38\\ub2e8")
          : subjectId === "theory"
            ? ko("\\ub17c\\uc810 \\uc120\\uc5b8 \\ubb38\\ub2e8")
            : ko("\\uacb0\\ub860\\uc73c\\ub85c \\ub118\\uc5b4\\uac00\\ub294 \\ubb38\\ub2e8"),
      focusAxis: focus,
      myScore: subjectId === "theory" ? 64 : subjectId === "law" ? 68 : 66,
      topScore: subjectId === "theory" ? 91 : subjectId === "law" ? 89 : 90,
      mySentences: [
        {
          text: ko(
            "\\ub0b4 \\ub2f5\\uc548\\uc740 \\ud575\\uc2ec \\uadfc\\uac70\\ub97c \\ubcf4\\uc5ec\\uc8fc\\uc9c0\\ub9cc \\ud3c9\\uac00 \\ud310\\ub2e8\\uc73c\\ub85c \\uc774\\uc5b4\\uc9c0\\ub294 \\ubb38\\uc7a5\\uc774 \\uc57d\\ud569\\ub2c8\\ub2e4.",
          ),
          highlight: true,
        },
        {
          text: ko("\\ubb38\\ub2e8\\uc758 \\ubc29\\ud5a5\\uc131\\uc774 \\ub2a6\\uac8c \\ubcf4\\uc5ec \\ub2f5\\uc548\\uc758 \\ud798\\uc774 \\uc904\\uc5b4\\ub4ed\\ub2c8\\ub2e4."),
        },
      ],
      topSentences: [
        {
          text: ko(
            "\\uc0c1\\uc704 10% \\ub2f5\\uc548\\uc740 \\ud575\\uc2ec \\uadfc\\uac70 \\uc9c1\\ud6c4 \\uc774\\uac83\\uc774 \\uc65c \\ud310\\ub2e8 \\uae30\\uc900\\uc774 \\ub418\\ub294\\uc9c0 \\ud55c \\ubb38\\uc7a5\\uc73c\\ub85c \\uace0\\uc815\\ud569\\ub2c8\\ub2e4.",
          ),
          highlight: true,
        },
        {
          text: ko("\\uadf8\\ub798\\uc11c \\uac19\\uc740 \\ub0b4\\uc6a9\\ub3c4 \\uacb0\\ub860\\uc744 \\uc9c0\\uc9c0\\ud558\\ub294 \\uadfc\\uac70\\ub85c \\uc77d\\ud799\\ub2c8\\ub2e4."),
        },
      ],
      gapNote: ko(
        "\\ub0b4 \\ub2f5\\uc548\\uc740 \\uc124\\uba85\\uc5d0\\uc11c \\uba48\\ucd94\\uace0, \\uc0c1\\uc704 10% \\ub2f5\\uc548\\uc740 \\uc124\\uba85\\uc744 \\ud310\\ub2e8 \\uadfc\\uac70\\ub85c \\uc804\\ud658\\ud569\\ub2c8\\ub2e4.",
      ),
      improvementNote: ko(
        "\\ud575\\uc2ec \\uadfc\\uac70 \\ub2e4\\uc74c\\uc5d0 '\\ub530\\ub77c\\uc11c \\ubcf8 \\uc0ac\\uc548\\uc5d0\\uc11c\\ub294...'\\uc73c\\ub85c \\uc2dc\\uc791\\ud558\\ub294 \\uacb0\\ub860 \\ubb38\\uc7a5\\uc744 \\ubd99\\uc5ec \\ubcf4\\uc138\\uc694.",
      ),
    },
  ];
}

const SUBJECT_COPY: Record<
  string,
  {
    position: number;
    target: number;
    previous: number;
    risk: RiskLevel;
    state: string;
    weakness: string;
    missionTitle: string;
    summary: string;
  }
> = {
  practice: {
    position: 29,
    target: 18,
    previous: 33,
    risk: "Watch",
    state: ko("\\uacc4\\uc0b0 \\ud750\\ub984\\uc740 \\ubcf4\\uc774\\uc9c0\\ub9cc \\uacb0\\ub860 \\uc5f0\\uacb0\\uc774 \\uc57d\\ud55c \\uad6c\\uac04"),
    weakness: ko("\\uacc4\\uc0b0 \\uacb0\\uacfc\\uac00 \\ud3c9\\uac00 \\ud310\\ub2e8\\uc73c\\ub85c \\ucda9\\ubd84\\ud788 \\uc774\\uc5b4\\uc9c0\\uc9c0 \\uc54a\\uc74c"),
    missionTitle: ko("\\uacc4\\uc0b0 \\ud6c4 \\uacb0\\ub860 \\ubb38\\uc7a5 \\ub2e4\\uc2dc \\uc4f0\\uae30"),
    summary: ko(
      "\\uacc4\\uc0b0 \\uacfc\\uc815\\uc740 \\ub530\\ub77c\\uac00\\uace0 \\uc788\\uc9c0\\ub9cc \\ub9c8\\uc9c0\\ub9c9 \\ud310\\ub2e8 \\ubb38\\uc7a5\\uc774 \\uc57d\\ud574 \\ub2f5\\uc548\\uc758 \\ud798\\uc774 \\uc904\\uc5b4\\ub4ed\\ub2c8\\ub2e4. \\uc9c0\\uae08\\uc740 \\uacc4\\uc0b0\\ub7c9\\ubcf4\\ub2e4 \\uacb0\\ub860 \\uc5f0\\uacb0\\uc744 \\uba3c\\uc800 \\uace0\\uce58\\ub294 \\ud3b8\\uc774 \\uc88b\\uc2b5\\ub2c8\\ub2e4.",
    ),
  },
  theory: {
    position: 27,
    target: 18,
    previous: 31,
    risk: "Watch",
    state: ko("\\ub17c\\uc810\\uc740 \\ubcf4\\uc774\\uc9c0\\ub9cc \\ubb38\\ub2e8 \\uccab \\ubb38\\uc7a5\\uc758 \\ud798\\uc774 \\uc57d\\ud55c \\uad6c\\uac04"),
    weakness: ko("\\ubb38\\ub2e8 \\uccab \\ubb38\\uc7a5\\uc5d0\\uc11c \\ub17c\\uc810\\uc744 \\ubc14\\ub85c \\uc120\\uc5b8\\ud558\\uc9c0 \\uc54a\\uc74c"),
    missionTitle: ko("\\uccab \\ubb38\\uc7a5\\uc5d0 \\ub17c\\uc810 \\uba3c\\uc800 \\uace0\\uc815\\ud558\\uae30"),
    summary: ko(
      "\\ub2f5\\uc548\\uc758 \\ubc29\\ud5a5\\uc740 \\ub9de\\uc9c0\\ub9cc \\ubb38\\ub2e8 \\uc2dc\\uc791\\uc5d0\\uc11c \\ub17c\\uc810\\uc774 \\ub2a6\\uac8c \\ub4dc\\ub7ec\\ub0a9\\ub2c8\\ub2e4. \\uc9c0\\uae08\\uc740 \\uc804\\uccb4 \\ubd84\\ub7c9\\ubcf4\\ub2e4 \\uccab \\ubb38\\uc7a5 \\uad6c\\uc870\\ub97c \\uace0\\uce58\\ub294 \\uac83\\uc774 \\uc6b0\\uc120\\uc785\\ub2c8\\ub2e4.",
    ),
  },
  law: {
    position: 30,
    target: 19,
    previous: 32,
    risk: "Stable",
    state: ko("\\uc870\\ubb38\\uc740 \\ubcf4\\uc774\\uc9c0\\ub9cc \\uc0ac\\uc548 \\uc5f0\\uacb0\\uc774 \\ub354 \\ud544\\uc694\\ud55c \\uad6c\\uac04"),
    weakness: ko("\\uc870\\ubb38 \\uc778\\uc6a9\\uc774 \\uacb0\\ub860\\uc758 \\uc9c1\\uc811 \\uadfc\\uac70\\ub85c \\uc5f0\\uacb0\\ub418\\uc9c0 \\uc54a\\uc74c"),
    missionTitle: ko("\\uc870\\ubb38 \\ub2e4\\uc74c\\uc5d0 \\uc0ac\\uc548 \\uc801\\uc6a9 \\ubb38\\uc7a5 \\ubd99\\uc774\\uae30"),
    summary: ko(
      "\\uc870\\ubb38 \\uc790\\uccb4\\ub294 \\ub4f1\\uc7a5\\ud558\\uc9c0\\ub9cc \\uadf8 \\uc870\\ubb38\\uc774 \\ud604\\uc7ac \\uc0ac\\uc548\\uc758 \\uacb0\\ub860\\uc744 \\uc5b4\\ub5bb\\uac8c \\uc9c0\\uc9c0\\ud558\\ub294\\uc9c0 \\ud55c \\ub2e8\\uacc4 \\ub354 \\uc5f0\\uacb0\\ud574\\uc57c \\ud569\\ub2c8\\ub2e4.",
    ),
  },
};

function buildState(subject: InvergeSubject): ControlRoomState {
  const copy = SUBJECT_COPY[subject.id] ?? SUBJECT_COPY.practice;
  const weeklyTarget = 4;
  const weeklyCompleted = 2;

  return {
    contextId: `subject:${DEFAULT_SESSION_ID}:${subject.id}`,
    currentState: copy.state,
    dDay: 73,
    currentRelativePosition: copy.position,
    passingZoneTarget: copy.target,
    previousPosition: copy.previous,
    deltaFromPrevious: copy.position - copy.previous,
    recentTrend: [
      { label: ko("3\\ud68c \\uc804"), relativePosition: copy.previous + 3, submittedAt: ko("12\\uc77c \\uc804") },
      { label: ko("\\uc9c1\\uc804 \\uc81c\\ucd9c"), relativePosition: copy.previous, submittedAt: ko("6\\uc77c \\uc804") },
      { label: ko("\\ud604\\uc7ac"), relativePosition: copy.position, submittedAt: ko("\\uc624\\ub298") },
    ],
    submissionGapDays: subject.id === "law" ? 3 : 5,
    inactivitySignal: ko("\\ucd5c\\uadfc \\uc81c\\ucd9c \\uac04\\uaca9\\uc774 \\uc870\\uae08 \\uae38\\uc5b4\\uc84c\\uc2b5\\ub2c8\\ub2e4."),
    repeatedWeaknesses: [
      {
        name: copy.weakness,
        repeats: subject.id === "law" ? 2 : 3,
        lastSeen: ko("\\uc624\\ub298"),
        impact: ko("\\ubc18\\ubcf5\\ub418\\ub294 \\uad6c\\uc870 \\uc57d\\uc810\\uc774 \\ub2f5\\uc548\\uc758 \\uc0c1\\ub300 \\uc704\\uce58\\ub97c \\ub04c\\uc5b4\\ub0b4\\ub9ac\\uace0 \\uc788\\uc2b5\\ub2c8\\ub2e4."),
        recoveryPriority: subject.id === "law" ? "High" : "Immediate",
      },
    ],
    weeklyTarget,
    weeklyCompleted,
    weeklyCompletionRate: Math.round((weeklyCompleted / weeklyTarget) * 100),
    riskLevel: copy.risk,
    recoveryPriority: copy.missionTitle,
    coachBriefing: copy.summary,
    summaryDiagnosis: copy.summary,
    mission: {
      title: copy.missionTitle,
      whyThisMatters: ko(
        "\\uac00\\uc7a5 \\ud070 \\ucc28\\uc774\\uac00 \\ub098\\ub294 \\ubb38\\ub2e8 \\ud558\\ub098\\ub97c \\uba3c\\uc800 \\uace0\\uce58\\uba74 \\ub2e4\\uc74c \\uc81c\\ucd9c\\uc758 \\uc9c4\\ub2e8 \\uae30\\uc900\\uc774 \\ub354 \\uc120\\uba85\\ud574\\uc9d1\\ub2c8\\ub2e4.",
      ),
      estimatedTime: subject.expectedTime,
      mode: "todays-mission",
      focus: subject.focusAxis,
      instructions: [
        ko("\\uac00\\uc7a5 \\ud070 \\ucc28\\uc774\\uac00 \\ub09c \\ubb38\\ub2e8 \\ud558\\ub098\\ub9cc \\uace0\\ub974\\uc138\\uc694."),
        ko("\\uccab \\ubb38\\uc7a5 \\ub610\\ub294 \\uacb0\\ub860 \\ubb38\\uc7a5\\uc744 \\uba3c\\uc800 \\ub2e4\\uc2dc \\uc4f0\\uc138\\uc694."),
        ko("\\uc791\\uc131\\ubcf8\\uc744 \\uc81c\\ucd9c\\ud574 \\uac19\\uc740 \\uae30\\uc900\\uc73c\\ub85c \\ube44\\uad50 \\uacb0\\uacfc\\ub97c \\ud655\\uc778\\ud558\\uc138\\uc694."),
      ],
      ctaLabel: ko("\\uc7ac\\uc791\\uc131 \\uc2dc\\uc791"),
    },
    prescriptions: [
      {
        id: `${subject.id}-p1`,
        weakPoint: copy.weakness,
        whyItMatters: ko("\\uc774 \\uc9c0\\uc810\\uc774 \\uc0c1\\uc704 10% \\ub2f5\\uc548\\uacfc \\uac00\\uc7a5 \\ud06c\\uac8c \\uac08\\ub9ac\\ub294 \\ubd80\\ubd84\\uc785\\ub2c8\\ub2e4."),
        howToImprove: makeComparison(subject.id)[0].improvementNote,
        expectedImpact: ko("\\ud575\\uc2ec \\ud3c9\\uac00\\ucd95\\uc774 \\ub354 \\uc120\\uba85\\ud574\\uc9d1\\ub2c8\\ub2e4."),
      },
      {
        id: `${subject.id}-p2`,
        weakPoint: ko("\\ubb38\\ub2e8 \\uc804\\uccb4\\ubcf4\\ub2e4 \\ud575\\uc2ec \\ubb38\\uc7a5 \\ud558\\ub098\\ub97c \\uba3c\\uc800 \\uace0\\ucccd\\uc57c \\ud569\\ub2c8\\ub2e4."),
        whyItMatters: ko("\\uc218\\uc815 \\ubc94\\uc704\\uac00 \\uc791\\uc744\\uc218\\ub85d \\uc7ac\\uc81c\\ucd9c \\ub8e8\\ud504\\uac00 \\ube68\\ub77c\\uc9d1\\ub2c8\\ub2e4."),
        howToImprove: ko("\\ubb38\\ub2e8 \\uccab \\ubb38\\uc7a5 \\ub610\\ub294 \\ub9c8\\uc9c0\\ub9c9 \\ubb38\\uc7a5 \\ud558\\ub098\\ub9cc \\uba3c\\uc800 \\ubc14\\uafd4 \\ubcf4\\uc138\\uc694."),
        expectedImpact: ko("\\uc7ac\\uc791\\uc131 \\uc18d\\ub3c4\\uc640 \\ube44\\uad50 \\uc815\\ud655\\ub3c4\\uac00 \\ud568\\uaed8 \\uc62c\\ub77c\\uac11\\ub2c8\\ub2e4."),
      },
    ],
    topComparison: makeComparison(subject.id),
    weeklyBriefing: {
      weeklySubmissions: weeklyCompleted,
      weeklyTarget,
      completionRate: Math.round((weeklyCompleted / weeklyTarget) * 100),
      repeatedWeaknessHeatmap: [
        { day: ko("\\uc6d4"), value: 1 },
        { day: ko("\\ud654"), value: 0 },
        { day: ko("\\uc218"), value: 2 },
        { day: ko("\\ubaa9"), value: 0 },
        { day: ko("\\uae08"), value: 1 },
        { day: ko("\\ud1a0"), value: 0 },
        { day: ko("\\uc77c"), value: 0 },
      ],
      recoveredWeaknesses: [ko("\\ubb38\\ub2e8 \\uad6c\\uc870\\uac00 \\uc9c0\\ub09c \\uc81c\\ucd9c\\ubcf4\\ub2e4 \\uc870\\uae08 \\ub354 \\uc548\\uc815\\uc801\\uc785\\ub2c8\\ub2e4.")],
      unresolvedPatterns: [copy.weakness],
      nextFocusRecommendation: copy.missionTitle,
      coachSummary: copy.summary,
    },
  };
}

export function getExam(examId = DEFAULT_EXAM_ID) {
  return INVERGE_EXAMS.find((exam) => exam.id === examId) ?? APPRAISER_SECOND_EXAM;
}

export function getSubject(examId = DEFAULT_EXAM_ID, subjectId = DEFAULT_SUBJECT_ID) {
  const exam = getExam(examId);
  return exam.subjects.find((subject) => subject.id === subjectId) ?? exam.subjects[0];
}

export function getWorkContext({
  examId = DEFAULT_EXAM_ID,
  sessionId = DEFAULT_SESSION_ID,
  subjectId = DEFAULT_SUBJECT_ID,
}: {
  examId?: string;
  sessionId?: string;
  subjectId?: string;
} = {}) {
  const exam = getExam(examId);
  const session = exam.sessions.find((item) => item.id === sessionId) ?? exam.sessions[0];
  const subject = getSubject(exam.id, subjectId);
  const state = buildState(subject);

  return {
    exam,
    session,
    subject,
    state,
    positionCopy: buildPositionCopy(state.currentRelativePosition),
    targetCopy: buildTargetCopy(state.passingZoneTarget, subject.focusAxis),
  };
}

export const DEFAULT_DRAFT: SubjectDraft = {
  answer: "",
  uploadedFiles: [],
  ocrPreview: "",
  submissionMode: "full-diagnostic",
  updatedAt: "",
};
