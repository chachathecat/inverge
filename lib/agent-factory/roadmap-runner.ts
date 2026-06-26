export type RoadmapRisk = "low" | "medium" | "high";

export type RoadmapStatusCategory =
  | "completed"
  | "active"
  | "queued"
  | "blocked"
  | "unknown";

export type ReadinessStatus =
  | "completed"
  | "active"
  | "ready"
  | "blocked"
  | "unknown";

export type BlockedReasonCode =
  | "missing_dependency"
  | "lock_group_in_use"
  | "blocked_status"
  | "unknown_status";

export type RoadmapScalar =
  | string
  | number
  | boolean
  | null
  | string[];

export interface RoadmapProgram {
  id?: string;
  completionItem?: string;
  wipLimit?: number;
  maxRepairAttempts?: number;
  [key: string]: RoadmapScalar | undefined;
}

export interface RoadmapItem {
  id: string;
  title?: string;
  status?: string;
  dependencies?: string[];
  lockGroup?: string;
  risk?: RoadmapRisk | string;
  priority?: number;
  [key: string]: unknown;
}

export interface ActiveProgramRoadmap {
  version?: number;
  program: RoadmapProgram;
  items: RoadmapItem[];
}

export interface BlockedReason {
  code: BlockedReasonCode;
  message: string;
  dependencyId?: string;
  lockGroup?: string;
  occupyingItemId?: string;
}

export interface RoadmapItemAnalysis {
  itemId: string;
  itemTitle: string;
  status: string;
  statusCategory: RoadmapStatusCategory;
  readinessStatus: ReadinessStatus;
  priority: number;
  dependencies: string[];
  missingDependencies: string[];
  lockGroup: string | null;
  risk: RoadmapRisk;
  blockedReasons: BlockedReason[];
}

export interface RoadmapSelectedItem {
  itemId: string;
  itemTitle: string;
  priority: number;
  dependencies: string[];
  lockGroup: string | null;
  risk: RoadmapRisk;
  readinessStatus: "ready";
  blockedReasons: BlockedReason[];
}

export interface RoadmapRunnerPlan {
  version: 1;
  programId: string | null;
  completionItem: string | null;
  wipLimit: number;
  wipOccupiedCount: number;
  availableSlots: number;
  selectionSlots: number;
  completedItemIds: string[];
  queuedItemIds: string[];
  blockedItemIds: string[];
  readyItemIds: string[];
  selectedItemIds: string[];
  analyses: RoadmapItemAnalysis[];
  selectedItems: RoadmapSelectedItem[];
}

const COMPLETED_STATUSES = new Set(["completed", "done", "merged", "released"]);
const ACTIVE_STATUSES = new Set(["active", "in_progress", "in_review", "pr_open"]);
const QUEUED_STATUSES = new Set(["queued", "ready"]);
const BLOCKED_STATUSES = new Set(["blocked", "human_decision"]);
const RISK_VALUES = new Set<RoadmapRisk>(["low", "medium", "high"]);

class RoadmapYamlError extends Error {
  readonly lineNumber: number;
  readonly sourceLine: string;

  constructor(
    lineNumber: number,
    message: string,
    sourceLine: string,
  ) {
    super(
      `Invalid roadmap YAML at line ${lineNumber}: ${message}. Source: ${sourceLine}`,
    );
    this.name = "RoadmapYamlError";
    this.lineNumber = lineNumber;
    this.sourceLine = sourceLine;
  }
}

function normalizeStatus(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function normalizeRisk(value: unknown): RoadmapRisk {
  const risk = String(value ?? "medium").trim().toLowerCase();
  return RISK_VALUES.has(risk as RoadmapRisk) ? (risk as RoadmapRisk) : "medium";
}

function statusCategory(value: unknown): RoadmapStatusCategory {
  const status = normalizeStatus(value);

  if (COMPLETED_STATUSES.has(status)) return "completed";
  if (ACTIVE_STATUSES.has(status)) return "active";
  if (QUEUED_STATUSES.has(status)) return "queued";
  if (BLOCKED_STATUSES.has(status)) return "blocked";

  return "unknown";
}

function stripComment(line: string): string {
  let quote: string | null = null;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if ((character === `"` || character === "'") && line[index - 1] !== "\\") {
      quote = quote === character ? null : quote ?? character;
    }

    if (character === "#" && quote === null) {
      return line.slice(0, index);
    }
  }

  return line;
}

function splitInlineArray(body: string, lineNumber: number, sourceLine: string): string[] {
  const entries: string[] = [];
  let quote: string | null = null;
  let current = "";

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];

    if ((character === `"` || character === "'") && body[index - 1] !== "\\") {
      quote = quote === character ? null : quote ?? character;
      current += character;
      continue;
    }

    if (character === "," && quote === null) {
      entries.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  if (quote !== null) {
    throw new RoadmapYamlError(lineNumber, "unterminated quoted array entry", sourceLine);
  }

  if (current.trim() !== "") {
    entries.push(current.trim());
  }

  return entries;
}

function parseScalar(
  rawValue: string,
  lineNumber: number,
  sourceLine: string,
): RoadmapScalar {
  const value = rawValue.trim();

  if (value === "") return "";
  if (value === "[]") return [];

  if (value.startsWith("[") || value.endsWith("]")) {
    if (!value.startsWith("[") || !value.endsWith("]")) {
      throw new RoadmapYamlError(lineNumber, "unterminated inline array", sourceLine);
    }

    const body = value.slice(1, -1).trim();
    if (!body) return [];

    return splitInlineArray(body, lineNumber, sourceLine).map((entry) =>
      String(parseScalar(entry, lineNumber, sourceLine)).trim(),
    );
  }

  if (
    (value.startsWith(`"`) && value.endsWith(`"`)) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  if (value.startsWith(`"`) || value.startsWith("'")) {
    throw new RoadmapYamlError(lineNumber, "unterminated quoted scalar", sourceLine);
  }

  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }

  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;

  return value;
}

export function parseActiveProgramYaml(source: string): ActiveProgramRoadmap {
  const document: ActiveProgramRoadmap = {
    program: {},
    items: [],
  };

  let section: "program" | "items" | null = null;
  let currentItem: RoadmapItem | null = null;

  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const originalLine = lines[index];
    const line = stripComment(originalLine).replace(/\s+$/, "");

    if (!line.trim()) continue;

    const topLevel = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);

    if (topLevel) {
      const [, key, rawValue] = topLevel;

      if (key === "program" || key === "items") {
        if (rawValue.trim() !== "") {
          throw new RoadmapYamlError(
            lineNumber,
            `${key} must be a block in active-program.yml`,
            originalLine,
          );
        }

        section = key;
        currentItem = null;
      } else {
        const scalar = parseScalar(rawValue, lineNumber, originalLine);

        if (key === "version") {
          document.version = typeof scalar === "number" ? scalar : undefined;
        } else {
          (document as unknown as Record<string, RoadmapScalar | undefined>)[key] = scalar;
        }
      }

      continue;
    }

    if (section === "program") {
      const field = line.match(/^\s{2}([A-Za-z][\w-]*):\s*(.*)$/);

      if (field) {
        document.program[field[1]] = parseScalar(field[2], lineNumber, originalLine);
        continue;
      }
    }

    if (section === "items") {
      const itemStart = line.match(/^\s{2}-\s+id:\s*(.*)$/);

      if (itemStart) {
        const id = parseScalar(itemStart[1], lineNumber, originalLine);

        if (typeof id !== "string" || !id.trim()) {
          throw new RoadmapYamlError(lineNumber, "roadmap item id must be a string", originalLine);
        }

        currentItem = { id };
        document.items.push(currentItem);
        continue;
      }

      const field = line.match(/^\s{4}([A-Za-z][\w-]*):\s*(.*)$/);

      if (field && currentItem) {
        currentItem[field[1]] = parseScalar(field[2], lineNumber, originalLine);
        continue;
      }
    }

    throw new RoadmapYamlError(
      lineNumber,
      "unsupported active-program.yml structure",
      originalLine,
    );
  }

  return document;
}

function assertStringArray(value: unknown, label: string): string[] {
  if (value === undefined) return [];

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${label} must be an inline string array.`);
  }

  return value;
}

function numericPriority(value: unknown): number {
  const priority = Number(value);
  return Number.isFinite(priority) ? priority : 999999;
}

export function validateRoadmap(roadmap: ActiveProgramRoadmap): void {
  if (!roadmap.program || typeof roadmap.program !== "object") {
    throw new Error("roadmap.program is required.");
  }

  if (!Array.isArray(roadmap.items) || roadmap.items.length === 0) {
    throw new Error("roadmap.items must contain at least one item.");
  }

  const wipLimit = Number(roadmap.program.wipLimit ?? 1);
  if (!Number.isFinite(wipLimit) || wipLimit < 1) {
    throw new Error("roadmap.program.wipLimit must be a positive number.");
  }

  const ids = new Set<string>();

  for (const item of roadmap.items) {
    if (typeof item.id !== "string" || !item.id.trim()) {
      throw new Error("Every roadmap item must have a string id.");
    }

    if (ids.has(item.id)) {
      throw new Error(`Duplicate roadmap item id: ${item.id}.`);
    }

    if (
      item.risk !== undefined &&
      !RISK_VALUES.has(String(item.risk).trim().toLowerCase() as RoadmapRisk)
    ) {
      throw new Error(`${item.id} has an invalid risk value.`);
    }

    assertStringArray(item.dependencies, `${item.id}.dependencies`);
    ids.add(item.id);
  }

  for (const item of roadmap.items) {
    for (const dependency of assertStringArray(item.dependencies, `${item.id}.dependencies`)) {
      if (!ids.has(dependency)) {
        throw new Error(`${item.id} depends on unknown roadmap item ${dependency}.`);
      }

      if (dependency === item.id) {
        throw new Error(`${item.id} cannot depend on itself.`);
      }
    }
  }

  const byId = new Map(roadmap.items.map((item) => [item.id, item]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(id: string): void {
    if (visited.has(id)) return;

    if (visiting.has(id)) {
      throw new Error(`Roadmap dependency cycle detected at ${id}.`);
    }

    visiting.add(id);

    const item = byId.get(id);
    if (!item) {
      throw new Error(`Roadmap dependency target is missing: ${id}.`);
    }

    for (const dependency of item.dependencies ?? []) {
      visit(dependency);
    }

    visiting.delete(id);
    visited.add(id);
  }

  for (const item of roadmap.items) {
    visit(item.id);
  }
}

function buildAnalysis(
  item: RoadmapItem,
  completedIds: Set<string>,
  wipItems: RoadmapItem[],
): RoadmapItemAnalysis {
  const category = statusCategory(item.status);
  const dependencies = assertStringArray(item.dependencies, `${item.id}.dependencies`);
  const missingDependencies = dependencies.filter((dependency) => !completedIds.has(dependency));
  const blockedReasons: BlockedReason[] = [];

  let readinessStatus: ReadinessStatus;

  if (category === "completed") {
    readinessStatus = "completed";
  } else if (category === "active") {
    readinessStatus = "active";
  } else if (category === "blocked") {
    readinessStatus = "blocked";
    blockedReasons.push({
      code: "blocked_status",
      message: `${item.id} is marked ${normalizeStatus(item.status)} in the roadmap.`,
    });
  } else if (category === "queued") {
    for (const dependency of missingDependencies) {
      blockedReasons.push({
        code: "missing_dependency",
        dependencyId: dependency,
        message: `${item.id} is waiting for dependency ${dependency} to be completed.`,
      });
    }

    const lockGroupOccupant = item.lockGroup
      ? wipItems.find((wipItem) => wipItem.id !== item.id && wipItem.lockGroup === item.lockGroup)
      : undefined;

    if (lockGroupOccupant && item.lockGroup) {
      blockedReasons.push({
        code: "lock_group_in_use",
        lockGroup: item.lockGroup,
        occupyingItemId: lockGroupOccupant.id,
        message: `${item.id} shares lock group ${item.lockGroup} with active item ${lockGroupOccupant.id}.`,
      });
    }

    readinessStatus = blockedReasons.length === 0 ? "ready" : "blocked";
  } else {
    readinessStatus = "unknown";
    blockedReasons.push({
      code: "unknown_status",
      message: `${item.id} has unsupported status ${String(item.status ?? "missing")}.`,
    });
  }

  return {
    itemId: item.id,
    itemTitle: typeof item.title === "string" ? item.title : "Untitled roadmap item",
    status: normalizeStatus(item.status),
    statusCategory: category,
    readinessStatus,
    priority: numericPriority(item.priority),
    dependencies,
    missingDependencies,
    lockGroup: typeof item.lockGroup === "string" ? item.lockGroup : null,
    risk: normalizeRisk(item.risk),
    blockedReasons,
  };
}

function selectedFromAnalysis(analysis: RoadmapItemAnalysis): RoadmapSelectedItem {
  if (analysis.readinessStatus !== "ready") {
    throw new Error(`${analysis.itemId} is not ready and cannot be selected.`);
  }

  return {
    itemId: analysis.itemId,
    itemTitle: analysis.itemTitle,
    priority: analysis.priority,
    dependencies: analysis.dependencies,
    lockGroup: analysis.lockGroup,
    risk: analysis.risk,
    readinessStatus: "ready",
    blockedReasons: analysis.blockedReasons,
  };
}

export function createRoadmapRunnerPlan(roadmap: ActiveProgramRoadmap): RoadmapRunnerPlan {
  validateRoadmap(roadmap);

  const orderedItems = roadmap.items.map((item, order) => ({ item, order }));
  const completedIds = new Set(
    orderedItems
      .filter(({ item }) => statusCategory(item.status) === "completed")
      .map(({ item }) => item.id),
  );
  const wipItems = orderedItems
    .filter(({ item }) => {
      const category = statusCategory(item.status);
      return category === "active" || category === "blocked";
    })
    .map(({ item }) => item);

  const analysesById = new Map<string, RoadmapItemAnalysis>();
  for (const { item } of orderedItems) {
    analysesById.set(item.id, buildAnalysis(item, completedIds, wipItems));
  }

  const analyses = orderedItems.map(({ item }) => {
    const analysis = analysesById.get(item.id);
    if (!analysis) throw new Error(`Missing roadmap analysis for ${item.id}.`);
    return analysis;
  });

  const wipLimit = Math.max(1, Number(roadmap.program.wipLimit ?? 1));
  const wipOccupiedCount = wipItems.length;
  const availableSlots = Math.max(0, wipLimit - wipOccupiedCount);
  const selectionSlots = Math.min(2, availableSlots);

  const readyAnalyses = orderedItems
    .map(({ item, order }) => {
      const analysis = analysesById.get(item.id);
      if (!analysis) throw new Error(`Missing roadmap analysis for ${item.id}.`);
      return { analysis, order };
    })
    .filter(({ analysis }) => analysis.readinessStatus === "ready")
    .sort((left, right) => left.analysis.priority - right.analysis.priority || left.order - right.order);

  const selectedAnalyses: RoadmapItemAnalysis[] = [];
  const selectedLockGroups = new Set<string>();

  for (const { analysis } of readyAnalyses) {
    if (selectedAnalyses.length >= selectionSlots) break;

    if (analysis.lockGroup && selectedLockGroups.has(analysis.lockGroup)) {
      continue;
    }

    selectedAnalyses.push(analysis);

    if (analysis.lockGroup) {
      selectedLockGroups.add(analysis.lockGroup);
    }
  }

  return {
    version: 1,
    programId: typeof roadmap.program.id === "string" ? roadmap.program.id : null,
    completionItem:
      typeof roadmap.program.completionItem === "string" ? roadmap.program.completionItem : null,
    wipLimit,
    wipOccupiedCount,
    availableSlots,
    selectionSlots,
    completedItemIds: analyses
      .filter((analysis) => analysis.statusCategory === "completed")
      .map((analysis) => analysis.itemId),
    queuedItemIds: analyses
      .filter((analysis) => analysis.statusCategory === "queued")
      .map((analysis) => analysis.itemId),
    blockedItemIds: analyses
      .filter((analysis) => analysis.readinessStatus === "blocked")
      .map((analysis) => analysis.itemId),
    readyItemIds: readyAnalyses.map(({ analysis }) => analysis.itemId),
    selectedItemIds: selectedAnalyses.map((analysis) => analysis.itemId),
    analyses,
    selectedItems: selectedAnalyses.map(selectedFromAnalysis),
  };
}

export function createRoadmapRunnerPlanFromYaml(source: string): RoadmapRunnerPlan {
  return createRoadmapRunnerPlan(parseActiveProgramYaml(source));
}
