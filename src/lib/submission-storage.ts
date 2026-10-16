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

const KEY = "anaplan-ux-copilot:last";

export function saveSubmission(s: StoredSubmission) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    const slim: StoredSubmission = { ...s, screenshotDataUrl: null };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(slim));
    } catch {
      // give up silently
    }
  }
}

export function loadSubmission(): StoredSubmission | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSubmission;
  } catch {
    return null;
  }
}

export function clearSubmission() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
