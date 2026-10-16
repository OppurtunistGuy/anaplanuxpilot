
## Goal

Improve the existing flow (Generate → Results) so the output is structured, implementation-oriented, and Anaplan-feasibility-aware. No new pages, no redesign.

## Changes

### 1. Recommendation schema (server + types)

`src/routes/api/generate-recommendations.ts` — update the Gemini prompt and JSON parser to return a richer, still-strict shape:

```json
{
  "summary": "≤30 words",
  "topRecommendations": [
    { "text": "≤14 words",
      "compatibility": "supported|common|workaround|unsupported",
      "alternative": "≤16 words, only when workaround/unsupported",
      "complexity": "low|medium|high" }
  ],                                  // max 5
  "uxHierarchy": [
    { "priority": 1, "title": "Executive Summary", "purpose": "≤12 words" }
  ],                                  // 3–5 items, no component counts
  "buildGuide": [
    { "step": 1, "title": "Create Board Page", "detail": "≤18 words" }
  ],                                  // 4–6 steps
  "blueprint": {
    "pageType": "Board | Worksheet | Report",
    "keyDecisions": ["≤12 words", "…"],     // 3–5
    "buildSequence": ["≤8 words", "…"],     // mirrors buildGuide titles
    "complexity": "low|medium|high",
    "compatibilityNotes": ["≤16 words", "…"] // 1–3
  }
}
```

Parser validates/clamps each field; unknown enums fall back to `supported` / `medium`. `findings` stays only when a screenshot is provided (max 5, short).

`src/lib/prompts.ts` — rewrite `buildRecommendationsPrompt` to instruct: prioritise Anaplan feasibility over creativity; for anything not natively supported, mark `workaround` or `unsupported` and provide the closest achievable Anaplan alternative; never recommend fixed counts of KPI cards / charts / grids in `uxHierarchy` (structure only); keep everything terse.

`src/lib/submission-storage.ts` — extend `StoredSubmission` with the new fields above (keep `recommendations: string[]` for backward-compat of older entries, but stop writing it; results page handles both shapes).

### 2. Results page restructure

`src/routes/results.tsx` — reorganise into four sections, in this order:

A. **Generated Anaplan UX Concept** — the prototype image. If a screenshot exists, render an interactive before/after slider (single overlay with draggable divider); fall back to the current 2-column comparison if JS is unavailable. Header label changes to `Current Dashboard ↓ Improved Anaplan UX Concept`.

B. **Top Recommendations** — max 5, each row shows: short text, a compatibility chip (`✓ Fully Supported`, `✓ Common Practice`, `⚠ Requires Workaround`, `✕ Not Supported`) and a complexity chip (`Low/Medium/High Complexity`). For workaround/unsupported items, show a one-line "Closest in Anaplan: …" alternative.

C. **Recommended UX Hierarchy** — vertical list of `Priority N — Title` with a one-line purpose. No component counts.

D. **Build Guide** — numbered steps (`Step N — Title`) with a one-line detail.

Plus a compact **Implementation Blueprint** card at the end: Page Type, Key Design Decisions (bullets), Build Sequence (inline ordered list), Complexity Level (chip), Compatibility Notes (bullets).

Remove the standalone "UX review report" block and the separate `summary` paragraph — fold the summary into a single line under the concept image. Keep the PDF download button in the page header.

### 3. Before/after slider

New small client component `src/components/results/BeforeAfter.tsx`: white background, subtle border, draggable vertical divider with keyboard support (←/→), labels `Current` / `Improved Anaplan UX Concept`. No animation library, pure pointer events. Used only when a screenshot exists.

### 4. PDF report

`src/lib/pdf-report.ts` — render the same four sections (Concept, Top Recommendations with compatibility + complexity, UX Hierarchy, Build Guide) and the Blueprint. Keep current minimal typography.

### 5. Generate page sidebar copy

`src/routes/generate.tsx` — update the "What you'll get" list to match the new output (Concept, up to 5 recommendations with Anaplan compatibility, UX Hierarchy, Build Guide, Implementation Blueprint, PDF report). No layout change.

### Out of scope

No new pages, no auth/billing/team/community/chat/analytics, no animation library, no redesign of Home/Header/Footer beyond the sidebar copy above.
