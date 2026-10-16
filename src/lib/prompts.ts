import type { GenerateMode } from "./submission-storage";

const STYLE_GUIDE = `Render a realistic Anaplan New UX dashboard page (Board page style) as a high-fidelity screenshot. Strict requirements:
- Pure white canvas (#FFFFFF), clean enterprise look, no gradients, no decorative effects, no glassmorphism.
- Anaplan-blue accents (#1F6FEB / #0F62FE) used sparingly for KPI deltas, selected filters, and small chart highlights.
- Typography: clean sans-serif, small caps for labels, generous whitespace.
- Top app bar: subtle Anaplan-style header with workspace breadcrumb on the left and a small avatar circle on the right. Below it a context-selector strip with 2-4 dropdown selectors (Version, Period, Region, etc.).
- KPI strip near the top, primary chart (column or line), a tidy data grid with row headers and numeric columns with alternating subtle row tint, plus a secondary chart or breakdown.
- Filters: small chip-style filters in a left rail or above the grid.
- Information hierarchy: most important metric reads first; supporting detail below; no clutter, no fake logos, no decorative imagery.
- Avoid: Dribbble aesthetics, dark mode, neon colors, 3D charts, photo backgrounds, marketing visuals, Figma component shelves, oversized icons.
The result must look like a real Anaplan consultant's working dashboard, not a concept mockup.`;

export function buildPrototypePrompt(opts: {
  mode: GenerateMode;
  businessFunction: string;
  audience: string;
  requirement: string;
  notes: string;
  hasScreenshot: boolean;
}) {
  const bf = opts.businessFunction;
  const aud = opts.audience;
  const intent =
    opts.mode === "improve"
      ? `Produce an IMPROVED version of an existing dashboard for ${bf} aimed at a ${aud}. Reduce density, clarify hierarchy, and surface the KPIs that drive decisions.`
      : opts.mode === "both"
        ? `Produce an IMPROVED Anaplan New UX dashboard for ${bf} aimed at a ${aud}, incorporating the supplied requirements and addressing the weaknesses of the uploaded screenshot.`
        : `Design a NEW Anaplan New UX dashboard for ${bf} aimed at a ${aud}.`;

  const req = opts.requirement.trim()
    ? `\n\nRequirement provided by the user:\n${opts.requirement.trim()}`
    : "";
  const notes = opts.notes.trim() ? `\n\nAdditional notes:\n${opts.notes.trim()}` : "";

  return `${intent}\n\n${STYLE_GUIDE}${req}${notes}\n\nOutput: a single high-resolution dashboard screenshot, 16:9, landscape.`;
}

export function buildRecommendationsPrompt(opts: {
  mode: GenerateMode;
  businessFunction: string;
  audience: string;
  requirement: string;
  notes: string;
  hasScreenshot: boolean;
}) {
  return `You are a senior Anaplan UX consultant and model builder. Audience: ${opts.audience}. Business function: ${opts.businessFunction}. Mode: ${opts.mode}.

${opts.requirement ? `Requirement:\n${opts.requirement}\n\n` : ""}${opts.notes ? `Notes:\n${opts.notes}\n\n` : ""}${opts.hasScreenshot ? "An existing dashboard screenshot is attached for review.\n\n" : ""}

PRIORITISE ANAPLAN FEASIBILITY OVER CREATIVITY. Only recommend things achievable in Anaplan New UX. If something is not natively supported, mark it accordingly and suggest the closest achievable Anaplan alternative.

Return STRICT JSON only (no prose, no markdown). Shape:
{
  "summary": "one concise executive sentence (<= 30 words)",
  "findings": ["short finding 1", "..."],   // max 5; only when a screenshot is provided, else []
  "topRecommendations": [                    // max 5, ordered by impact
    {
      "text": "actionable recommendation, <= 14 words",
      "compatibility": "supported" | "common" | "workaround" | "unsupported",
      "alternative": "closest Anaplan-achievable alternative, <= 16 words, ONLY when compatibility is 'workaround' or 'unsupported', else omit",
      "complexity": "low" | "medium" | "high"
    }
  ],
  "uxHierarchy": [                           // 3-5 items, STRUCTURE only — no component counts, no 'X KPI cards'
    { "priority": 1, "title": "Executive Summary", "purpose": "why this lives here, <= 12 words" }
  ],
  "buildGuide": [                            // 4-6 implementation steps
    { "step": 1, "title": "Create Board Page", "detail": "concrete builder action, <= 18 words" }
  ],
  "blueprint": {
    "pageType": "Board" | "Worksheet" | "Report",
    "keyDecisions": ["<= 12 words", "..."],          // 3-5
    "buildSequence": ["<= 8 words", "..."],          // mirrors buildGuide titles
    "complexity": "low" | "medium" | "high",
    "compatibilityNotes": ["<= 16 words", "..."]     // 1-3
  }
}

Rules:
- Be terse and business-focused. No essays, no scores, no fluff.
- uxHierarchy describes layout PRIORITIES (Executive Summary, Trend Analysis, Variance Analysis, Detailed Planning View, etc.), never component counts.
- buildGuide is implementation-oriented (Create Board Page, Configure Filters, Validate UX, etc.).
- Compatibility values: supported = native New UX card; common = standard consultant practice; workaround = possible via line-items / hidden modules / page builder tricks; unsupported = not achievable today.`;
}
