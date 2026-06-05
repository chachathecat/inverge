import { readFileSync } from "node:fs";
import path from "node:path";

export type AppraiserExamMode = "first" | "second";
export type AppraiserExamLabel = "감정평가사 1차" | "감정평가사 2차";

export type CurriculumSourceReference = {
  label: string;
  url: string;
  reviewedAt: string;
  scope: string;
};

export type CurriculumVerificationMetadata = {
  sourceStatus: string;
  needsOfficialVerification: boolean;
  verificationNote: string;
};

export type CurriculumReferenceMetadata = CurriculumVerificationMetadata & {
  schemaVersion: string;
  lastReviewedAt: string;
  storagePolicy: string;
  sourceReferences?: CurriculumSourceReference[];
};

export type ExcludedOfficialSubject = Partial<CurriculumVerificationMetadata> & {
  name: string;
  reason: string;
};

export type CurriculumImportance = "low" | "medium" | "high";
export type CurriculumRiskLevel = "low" | "medium" | "high";
export type CurriculumReviewPattern = string;

export type CurriculumUnitPlanningMetadata = {
  importance: CurriculumImportance;
  coreConcepts: string[];
  trapWords?: string[];
  mistakePatterns?: string[];
  defaultReviewPattern: CurriculumReviewPattern;
  riskLevel: CurriculumRiskLevel;
  secondExamBridge?: string;
};

export type CurriculumUnit = CurriculumUnitPlanningMetadata & Partial<CurriculumVerificationMetadata> & {
  id: string;
  name: string;
  taskTypes: string[];
};

export type CurriculumSubject = Partial<CurriculumVerificationMetadata> & {
  id: string;
  name: string;
  units: CurriculumUnit[];
};

export type CurriculumDocument = CurriculumReferenceMetadata & {
  exam: AppraiserExamLabel;
  officialExamSubjects?: string[];
  activeLearningSubjects?: string[];
  excludedOfficialSubjects?: ExcludedOfficialSubject[];
  subjects: CurriculumSubject[];
};

export type StudyTrackId = "first_30" | "first_60" | "first_90" | "first_120" | "second_90" | "second_180" | "second_365";

export type StudyTrack = Partial<CurriculumVerificationMetadata> & {
  examMode: AppraiserExamMode;
  days: number;
  label: string;
  phase: string;
  goal: string;
  dailyFocus: string[];
  weeklyFocus: string[];
  riskHandling: string[];
  recommendedTaskMix: string[];
};

export type StudyTracksDocument = CurriculumReferenceMetadata & {
  tracks: Record<StudyTrackId, StudyTrack>;
  dailyTemplates: Record<string, string[]>;
  todayPlanMaxPrimaryTasks: number;
  prioritizationSignals: string[];
};

export type ExplanationLabel = {
  id: string;
  label: string;
  purpose: string;
};

export type ExplanationTemplate = {
  concept: string;
  taskTypes: string[];
  ladder: Record<string, string>;
};

export type ExplanationLadderDocument = CurriculumReferenceMetadata & {
  labels: ExplanationLabel[];
  templates: ExplanationTemplate[];
};

export type AppraiserCurriculumReference = {
  firstExam: CurriculumDocument;
  secondExam: CurriculumDocument;
  studyTracks: StudyTracksDocument;
  explanationLadder: ExplanationLadderDocument;
  verificationStatus: CurriculumVerificationStatus;
};

export type CurriculumVerificationStatus = {
  isOfficiallyVerified: boolean;
  sourceStatuses: Array<{ sourceName: string; sourceStatus: string; needsOfficialVerification: boolean }>;
  lastReviewedAt: Array<{ sourceName: string; lastReviewedAt: string }>;
  blockingReason: string | null;
};

export type CurriculumReferenceLoaderConfig = {
  sourceDir?: string;
};

const DEFAULT_SOURCE_PATH_PARTS = ["reference_corpus", "curriculum", "appraiser"] as const;
const ALLOWED_EXAM_LABELS = new Set<AppraiserExamLabel>(["감정평가사 1차", "감정평가사 2차"]);
const EXAM_LABEL_BY_MODE: Record<AppraiserExamMode, AppraiserExamLabel> = {
  first: "감정평가사 1차",
  second: "감정평가사 2차",
};
const ALLOWED_STUDY_TRACK_IDS = new Set<StudyTrackId>([
  "first_30",
  "first_60",
  "first_90",
  "first_120",
  "second_90",
  "second_180",
  "second_365",
]);
const RAW_TEXT_FIELD_NAMES = new Set([
  "rawText",
  "rawUserText",
  "rawOcrText",
  "rawAnswerText",
  "rawProblemText",
  "ocrText",
  "userAnswerText",
  "answerText",
  "problemText",
  "questionText",
  "uploadedProblemText",
  "copyrightedText",
  "originalText",
  "fullText",
  "sourceText",
]);

function sourceDir(config: CurriculumReferenceLoaderConfig = {}) {
  const customSource = config.sourceDir ?? process.env.INVERGE_APPRAISER_CURRICULUM_REFERENCE_DIR;
  if (customSource) return path.resolve(/* turbopackIgnore: true */ process.cwd(), customSource);
  return path.join(process.cwd(), ...DEFAULT_SOURCE_PATH_PARTS);
}

function readJsonFile(fileName: string, config: CurriculumReferenceLoaderConfig = {}) {
  const fullPath = path.join(sourceDir(config), fileName);
  return JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, sourceName: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${sourceName} must be a JSON object`);
}

function assertString(value: unknown, fieldName: string, sourceName: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${sourceName} is missing required string field ${fieldName}`);
  }
  return value;
}

function assertStringArray(value: unknown, fieldName: string, sourceName: string) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    throw new Error(`${sourceName} field ${fieldName} must be a non-empty string array`);
  }
  return value as string[];
}

function assertImportance(value: unknown, fieldName: string, sourceName: string): CurriculumImportance {
  const importance = assertString(value, fieldName, sourceName);
  if (importance !== "low" && importance !== "medium" && importance !== "high") {
    throw new Error(`${sourceName} field ${fieldName} must be low, medium, or high`);
  }
  return importance;
}

function assertRiskLevel(value: unknown, fieldName: string, sourceName: string): CurriculumRiskLevel {
  const riskLevel = assertString(value, fieldName, sourceName);
  if (riskLevel !== "low" && riskLevel !== "medium" && riskLevel !== "high") {
    throw new Error(`${sourceName} field ${fieldName} must be low, medium, or high`);
  }
  return riskLevel;
}

function assertNoRawTextFields(value: unknown, sourceName: string, trail = "root") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoRawTextFields(entry, sourceName, `${trail}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, nestedValue] of Object.entries(value)) {
    if (RAW_TEXT_FIELD_NAMES.has(key)) {
      throw new Error(`${sourceName} contains rejected raw text field ${key} at ${trail}`);
    }
    assertNoRawTextFields(nestedValue, sourceName, `${trail}.${key}`);
  }
}

function validateSourceReferences(value: unknown, sourceName: string) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${sourceName} sourceReferences must be a non-empty array when present`);
  }
  return value.map((entry, index) => {
    const referenceName = `${sourceName}.sourceReferences[${index}]`;
    assertRecord(entry, referenceName);
    return {
      label: assertString(entry.label, "label", referenceName),
      url: assertString(entry.url, "url", referenceName),
      reviewedAt: assertString(entry.reviewedAt, "reviewedAt", referenceName),
      scope: assertString(entry.scope, "scope", referenceName),
    };
  });
}

function optionalVerificationMetadata(raw: Record<string, unknown>, sourceName: string) {
  const output: Partial<CurriculumVerificationMetadata> = {};
  if (raw.sourceStatus !== undefined) output.sourceStatus = assertString(raw.sourceStatus, "sourceStatus", sourceName);
  if (raw.needsOfficialVerification !== undefined) {
    if (typeof raw.needsOfficialVerification !== "boolean") {
      throw new Error(`${sourceName} field needsOfficialVerification must be boolean when present`);
    }
    output.needsOfficialVerification = raw.needsOfficialVerification;
  }
  if (raw.verificationNote !== undefined) output.verificationNote = assertString(raw.verificationNote, "verificationNote", sourceName);
  return output;
}

function validateExcludedOfficialSubjects(value: unknown, sourceName: string) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`${sourceName} excludedOfficialSubjects must be an array when present`);
  }
  return value.map((entry, index) => {
    const exclusionName = `${sourceName}.excludedOfficialSubjects[${index}]`;
    assertRecord(entry, exclusionName);
    return {
      name: assertString(entry.name, "name", exclusionName),
      reason: assertString(entry.reason, "reason", exclusionName),
      ...optionalVerificationMetadata(entry, exclusionName),
    };
  });
}

function validateMetadata(raw: Record<string, unknown>, sourceName: string): CurriculumReferenceMetadata {
  assertNoRawTextFields(raw, sourceName);
  const schemaVersion = assertString(raw.schemaVersion, "schemaVersion", sourceName);
  const sourceStatus = assertString(raw.sourceStatus, "sourceStatus", sourceName);
  if (typeof raw.needsOfficialVerification !== "boolean") {
    throw new Error(`${sourceName} is missing required boolean field needsOfficialVerification`);
  }
  const lastReviewedAt = assertString(raw.lastReviewedAt, "lastReviewedAt", sourceName);
  const verificationNote = assertString(raw.verificationNote, "verificationNote", sourceName);
  const storagePolicy = assertString(raw.storagePolicy, "storagePolicy", sourceName);
  if (!storagePolicy.includes("metadata_only")) {
    throw new Error(`${sourceName} storagePolicy must include metadata_only`);
  }
  const sourceReferences = validateSourceReferences(raw.sourceReferences, sourceName);
  return {
    schemaVersion,
    sourceStatus,
    needsOfficialVerification: raw.needsOfficialVerification,
    lastReviewedAt,
    verificationNote,
    storagePolicy,
    ...(sourceReferences === undefined ? {} : { sourceReferences }),
  };
}

export function validateCurriculumDocument(raw: unknown, expectedExam: AppraiserExamLabel, sourceName = "curriculum"): CurriculumDocument {
  assertRecord(raw, sourceName);
  const metadata = validateMetadata(raw, sourceName);
  const exam = assertString(raw.exam, "exam", sourceName) as AppraiserExamLabel;
  if (!ALLOWED_EXAM_LABELS.has(exam) || exam !== expectedExam) {
    throw new Error(`${sourceName} has unsupported exam label ${exam}`);
  }
  if (!Array.isArray(raw.subjects) || raw.subjects.length === 0) {
    throw new Error(`${sourceName} subjects must be a non-empty array`);
  }
  const officialExamSubjects = raw.officialExamSubjects === undefined
    ? undefined
    : assertStringArray(raw.officialExamSubjects, "officialExamSubjects", sourceName);
  const activeLearningSubjects = raw.activeLearningSubjects === undefined
    ? undefined
    : assertStringArray(raw.activeLearningSubjects, "activeLearningSubjects", sourceName);
  const excludedOfficialSubjects = validateExcludedOfficialSubjects(raw.excludedOfficialSubjects, sourceName);
  const subjects = raw.subjects.map((subject, subjectIndex) => {
    const subjectName = `${sourceName}.subjects[${subjectIndex}]`;
    assertRecord(subject, subjectName);
    if (!Array.isArray(subject.units) || subject.units.length === 0) {
      throw new Error(`${subjectName}.units must be a non-empty array`);
    }
    return {
      id: assertString(subject.id, "id", subjectName),
      name: assertString(subject.name, "name", subjectName),
      ...optionalVerificationMetadata(subject, subjectName),
      units: subject.units.map((unit, unitIndex) => {
        const unitName = `${subjectName}.units[${unitIndex}]`;
        assertRecord(unit, unitName);
        const basePlanning = {
          importance: assertImportance(unit.importance, "importance", unitName),
          coreConcepts: assertStringArray(unit.coreConcepts, "coreConcepts", unitName),
          defaultReviewPattern: assertString(unit.defaultReviewPattern, "defaultReviewPattern", unitName),
          riskLevel: assertRiskLevel(unit.riskLevel, "riskLevel", unitName),
        };
        const examSpecificPlanning = expectedExam === "감정평가사 1차"
          ? {
              trapWords: assertStringArray(unit.trapWords, "trapWords", unitName),
              ...(unit.secondExamBridge === undefined ? {} : { secondExamBridge: assertString(unit.secondExamBridge, "secondExamBridge", unitName) }),
            }
          : {
              mistakePatterns: assertStringArray(unit.mistakePatterns, "mistakePatterns", unitName),
            };
        return {
          id: assertString(unit.id, "id", unitName),
          name: assertString(unit.name, "name", unitName),
          taskTypes: assertStringArray(unit.taskTypes, "taskTypes", unitName),
          ...optionalVerificationMetadata(unit, unitName),
          ...basePlanning,
          ...examSpecificPlanning,
        };
      }),
    };
  });
  return {
    ...metadata,
    exam,
    ...(officialExamSubjects === undefined ? {} : { officialExamSubjects }),
    ...(activeLearningSubjects === undefined ? {} : { activeLearningSubjects }),
    ...(excludedOfficialSubjects === undefined ? {} : { excludedOfficialSubjects }),
    subjects,
  };
}

export function validateStudyTracks(raw: unknown, sourceName = "study_tracks"): StudyTracksDocument {
  assertRecord(raw, sourceName);
  const metadata = validateMetadata(raw, sourceName);
  const rawTracks = raw.tracks;
  assertRecord(rawTracks, `${sourceName}.tracks`);
  const trackIds = Object.keys(rawTracks);
  const unsupportedTrackId = trackIds.find((trackId) => !ALLOWED_STUDY_TRACK_IDS.has(trackId as StudyTrackId));
  if (unsupportedTrackId) throw new Error(`${sourceName} has unsupported study track id ${unsupportedTrackId}`);
  for (const requiredTrackId of ALLOWED_STUDY_TRACK_IDS) {
    if (!(requiredTrackId in rawTracks)) throw new Error(`${sourceName} is missing study track id ${requiredTrackId}`);
  }

  const tracks = Object.fromEntries(trackIds.map((trackId) => {
    const trackName = `${sourceName}.tracks.${trackId}`;
    const track = rawTracks[trackId];
    assertRecord(track, trackName);
    const examMode = assertString(track.examMode, "examMode", trackName);
    if (examMode !== "first" && examMode !== "second") throw new Error(`${trackName} has unsupported examMode ${examMode}`);
    return [trackId, {
      examMode,
      days: typeof track.days === "number" && Number.isFinite(track.days) ? track.days : Number(assertString(track.days, "days", trackName)),
      label: assertString(track.label, "label", trackName),
      ...optionalVerificationMetadata(track, trackName),
      phase: assertString(track.phase, "phase", trackName),
      goal: assertString(track.goal, "goal", trackName),
      dailyFocus: assertStringArray(track.dailyFocus, "dailyFocus", trackName),
      weeklyFocus: assertStringArray(track.weeklyFocus, "weeklyFocus", trackName),
      riskHandling: assertStringArray(track.riskHandling, "riskHandling", trackName),
      recommendedTaskMix: assertStringArray(track.recommendedTaskMix, "recommendedTaskMix", trackName),
    }];
  })) as Record<StudyTrackId, StudyTrack>;

  const rawDailyTemplates = raw.dailyTemplates;
  assertRecord(rawDailyTemplates, `${sourceName}.dailyTemplates`);
  const dailyTemplates = Object.fromEntries(Object.entries(rawDailyTemplates).map(([templateId, template]) => [
    templateId,
    assertStringArray(template, `${templateId}`, `${sourceName}.dailyTemplates`),
  ]));
  const todayPlanMaxPrimaryTasks = typeof raw.todayPlanMaxPrimaryTasks === "number" && Number.isFinite(raw.todayPlanMaxPrimaryTasks)
    ? raw.todayPlanMaxPrimaryTasks
    : Number.NaN;
  if (!Number.isFinite(todayPlanMaxPrimaryTasks)) throw new Error(`${sourceName} todayPlanMaxPrimaryTasks must be a finite number`);

  return {
    ...metadata,
    tracks,
    dailyTemplates,
    todayPlanMaxPrimaryTasks,
    prioritizationSignals: assertStringArray(raw.prioritizationSignals, "prioritizationSignals", sourceName),
  };
}

export function validateExplanationLadder(raw: unknown, sourceName = "explanation_ladder"): ExplanationLadderDocument {
  assertRecord(raw, sourceName);
  const metadata = validateMetadata(raw, sourceName);
  if (!Array.isArray(raw.labels) || raw.labels.length === 0) throw new Error(`${sourceName}.labels must be a non-empty array`);
  if (!Array.isArray(raw.templates)) throw new Error(`${sourceName}.templates must be an array`);
  return {
    ...metadata,
    labels: raw.labels.map((label, index) => {
      const labelName = `${sourceName}.labels[${index}]`;
      assertRecord(label, labelName);
      return {
        id: assertString(label.id, "id", labelName),
        label: assertString(label.label, "label", labelName),
        purpose: assertString(label.purpose, "purpose", labelName),
      };
    }),
    templates: raw.templates.map((template, index) => {
      const templateName = `${sourceName}.templates[${index}]`;
      assertRecord(template, templateName);
      const rawLadder = template.ladder;
      assertRecord(rawLadder, `${templateName}.ladder`);
      return {
        concept: assertString(template.concept, "concept", templateName),
        taskTypes: assertStringArray(template.taskTypes, "taskTypes", templateName),
        ladder: Object.fromEntries(Object.entries(rawLadder).map(([label, text]) => [
          label,
          assertString(text, label, `${templateName}.ladder`),
        ])),
      };
    }),
  };
}

export function loadFirstExamCurriculum(config: CurriculumReferenceLoaderConfig = {}) {
  return validateCurriculumDocument(readJsonFile("first_exam_curriculum.json", config), "감정평가사 1차", "first_exam_curriculum.json");
}

export function loadSecondExamCurriculum(config: CurriculumReferenceLoaderConfig = {}) {
  return validateCurriculumDocument(readJsonFile("second_exam_curriculum.json", config), "감정평가사 2차", "second_exam_curriculum.json");
}

export function loadStudyTracks(config: CurriculumReferenceLoaderConfig = {}) {
  return validateStudyTracks(readJsonFile("study_tracks.json", config), "study_tracks.json");
}

export function loadExplanationLadder(config: CurriculumReferenceLoaderConfig = {}) {
  return validateExplanationLadder(readJsonFile("explanation_ladder.json", config), "explanation_ladder.json");
}

export function loadAppraiserCurriculumReference(config: CurriculumReferenceLoaderConfig = {}): AppraiserCurriculumReference {
  const reference = {
    firstExam: loadFirstExamCurriculum(config),
    secondExam: loadSecondExamCurriculum(config),
    studyTracks: loadStudyTracks(config),
    explanationLadder: loadExplanationLadder(config),
  };
  return {
    ...reference,
    verificationStatus: getCurriculumVerificationStatus(reference),
  };
}

export function getCurriculumVerificationStatus(reference: Omit<AppraiserCurriculumReference, "verificationStatus">): CurriculumVerificationStatus {
  const sources = [
    { sourceName: "firstExam", metadata: reference.firstExam },
    { sourceName: "secondExam", metadata: reference.secondExam },
    { sourceName: "studyTracks", metadata: reference.studyTracks },
    { sourceName: "explanationLadder", metadata: reference.explanationLadder },
  ];
  const unverifiedSources = sources.filter((source) => source.metadata.needsOfficialVerification);
  return {
    isOfficiallyVerified: unverifiedSources.length === 0,
    sourceStatuses: sources.map((source) => ({
      sourceName: source.sourceName,
      sourceStatus: source.metadata.sourceStatus,
      needsOfficialVerification: source.metadata.needsOfficialVerification,
    })),
    lastReviewedAt: sources.map((source) => ({
      sourceName: source.sourceName,
      lastReviewedAt: source.metadata.lastReviewedAt,
    })),
    blockingReason: unverifiedSources.length > 0
      ? "Draft curriculum metadata still needs official verification before production-facing engines may treat it as official."
      : null,
  };
}

function curriculumForExamMode(examMode: AppraiserExamMode, reference = loadAppraiserCurriculumReference()) {
  if (examMode !== "first" && examMode !== "second") throw new Error(`Unsupported exam mode ${examMode}`);
  const curriculum = examMode === "first" ? reference.firstExam : reference.secondExam;
  if (curriculum.exam !== EXAM_LABEL_BY_MODE[examMode]) throw new Error(`Unsupported exam label ${curriculum.exam}`);
  return curriculum;
}

export function listSubjects(examMode: AppraiserExamMode, reference = loadAppraiserCurriculumReference()) {
  return curriculumForExamMode(examMode, reference).subjects;
}

export function listUnits(examMode: AppraiserExamMode, subjectId: string, reference = loadAppraiserCurriculumReference()) {
  const subject = listSubjects(examMode, reference).find((entry) => entry.id === subjectId);
  return subject?.units ?? [];
}

export function findUnitById(examMode: AppraiserExamMode, unitId: string, reference = loadAppraiserCurriculumReference()) {
  return listSubjects(examMode, reference).flatMap((subject) => subject.units).find((unit) => unit.id === unitId) ?? null;
}

export function listAllowedTaskTypes(examMode: AppraiserExamMode, unitId: string, reference = loadAppraiserCurriculumReference()) {
  return findUnitById(examMode, unitId, reference)?.taskTypes ?? [];
}

export function listStudyTracks(examMode: AppraiserExamMode, reference = loadAppraiserCurriculumReference()) {
  if (examMode !== "first" && examMode !== "second") throw new Error(`Unsupported exam mode ${examMode}`);
  return Object.entries(reference.studyTracks.tracks)
    .filter(([, track]) => track.examMode === examMode)
    .map(([id, track]) => ({ id: id as StudyTrackId, ...track }));
}

export function getExplanationLabels(reference = loadAppraiserCurriculumReference()) {
  return reference.explanationLadder.labels;
}
