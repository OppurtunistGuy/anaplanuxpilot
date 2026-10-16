export type GenerateMode = "create" | "improve" | "both";
export type Compatibility = "supported" | "common" | "workaround" | "unsupported";
export type Complexity = "low" | "medium" | "high";

export interface TopRecommendation {
  text: string;
  compatibility: Compatibility;
  complexity: Complexity;
  alternative?: string;
}

export interface HierarchyItem {
  priority: number;
  title: string;
  purpose: string;
}

export interface BuildStep {
  step: number;
  title: string;
  detail: string;
}

export interface Blueprint {
  pageType: string;
  keyDecisions: string[];
  buildSequence: string[];
  complexity: Complexity;
  compatibilityNotes: string[];
}

export interface StoredSubmission {
  mode: GenerateMode;
  businessFunction: string;
  audience: string;
  requirement: string;
  notes: string;
  screenshotDataUrl: string | null;
  screenshotName: string | null;
  prototypeDataUrl: string;
  // New structured output
  topRecommendations: TopRecommendation[];
  uxHierarchy: HierarchyItem[];
  buildGuide: BuildStep[];
  blueprint: Blueprint | null;
  findings: string[];
  summary: string;
  // Legacy field — older entries may still carry this
  recommendations?: string[];
  generatedAt: string;
}

let lastSubmission: StoredSubmission | null = null;

export function saveSubmission(s: StoredSubmission) {
  if (typeof window !== "undefined") lastSubmission = s;
}

export function loadSubmission(): StoredSubmission | null {
  return typeof window === "undefined" ? null : lastSubmission;
}

export function clearSubmission() {
  lastSubmission = null;
}
