export type RiskLevel = "Stable" | "Watch" | "Risk" | "Recovery Needed";

export type SubmissionMode =
  | "full-diagnostic"
  | "todays-mission"
  | "weakness-repair"
  | "rewrite-submission";

export type TrendEntry = {
  label: string;
  relativePosition: number;
  submittedAt: string;
};

export type RepeatedWeakness = {
  name: string;
  repeats: number;
  lastSeen: string;
  impact: string;
  recoveryPriority: "Immediate" | "High" | "Moderate";
};

export type Mission = {
  title: string;
  whyThisMatters: string;
  estimatedTime: string;
  mode: SubmissionMode;
  focus: string;
  instructions: string[];
  ctaLabel: string;
};

export type Prescription = {
  id: string;
  weakPoint: string;
  whyItMatters: string;
  howToImprove: string;
  expectedImpact: string;
};

export type AnnotatedSentence = {
  text: string;
  highlight?: boolean;
};

export type ComparisonBlock = {
  id: string;
  heading: string;
  focusAxis: string;
  myScore: number;
  topScore: number;
  mySentences: AnnotatedSentence[];
  topSentences: AnnotatedSentence[];
  gapNote: string;
  improvementNote: string;
};

export type WeeklyHeatCell = {
  day: string;
  value: 0 | 1 | 2 | 3;
};

export type WeeklyBriefing = {
  weeklySubmissions: number;
  weeklyTarget: number;
  completionRate: number;
  repeatedWeaknessHeatmap: WeeklyHeatCell[];
  recoveredWeaknesses: string[];
  unresolvedPatterns: string[];
  nextFocusRecommendation: string;
  coachSummary: string;
};

export type ControlRoomState = {
  contextId: string;
  currentState: string;
  dDay: number;
  currentRelativePosition: number;
  passingZoneTarget: number;
  previousPosition: number;
  deltaFromPrevious: number;
  recentTrend: TrendEntry[];
  submissionGapDays: number;
  inactivitySignal: string;
  repeatedWeaknesses: RepeatedWeakness[];
  weeklyTarget: number;
  weeklyCompleted: number;
  weeklyCompletionRate: number;
  riskLevel: RiskLevel;
  recoveryPriority: string;
  coachBriefing: string;
  summaryDiagnosis: string;
  mission: Mission;
  prescriptions: Prescription[];
  topComparison: ComparisonBlock[];
  weeklyBriefing: WeeklyBriefing;
};

export type SubjectDraft = {
  answer: string;
  uploadedFiles: string[];
  ocrPreview: string;
  submissionMode: SubmissionMode;
  updatedAt: string;
};
