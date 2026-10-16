import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { saveSubmission, type GenerateMode } from "@/lib/submission-storage";
import { buildPrototypePrompt, buildRecommendationsPrompt } from "@/lib/prompts";
import { streamImage } from "@/lib/stream-image";
import { ApiKeyField, useStoredApiKey } from "@/components/generate/ApiKeyField";

export const Route = createFileRoute("/generate")({
  head: () => ({
    meta: [
      { title: "Generate UX — Anaplan UX Copilot" },
      {
        name: "description",
        content:
          "Create a new Anaplan New UX dashboard, improve an existing one, or both — using AI.",
      },
      { property: "og:title", content: "Generate UX — Anaplan UX Copilot" },
      {
        property: "og:description",
        content: "Create or improve an Anaplan New UX dashboard with AI.",
      },
    ],
    links: [{ rel: "canonical", href: "/generate" }],
  }),
  component: GeneratePage,
});

const BUSINESS_FUNCTIONS = [
  "Finance",
  "Sales",
  "Workforce Planning",
  "Supply Chain",
  "Operations",
  "Executive Reporting",
  "Project Management",
  "Custom",
] as const;

const AUDIENCES = ["Executive", "Manager", "Planner", "Analyst", "Leadership Team"] as const;

const MODES: { id: GenerateMode; title: string; desc: string }[] = [
  { id: "create", title: "Create new dashboard", desc: "Generate from requirements only." },
  { id: "improve", title: "Improve existing dashboard", desc: "Upload a screenshot to improve." },
  { id: "both", title: "Requirement + screenshot", desc: "Combine both for sharper results." },
];

const MAX_IMG = 5 * 1024 * 1024;
const IMG_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

function readDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });
}

function GeneratePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<GenerateMode>("create");
  const [businessFunction, setBusinessFunction] = useState("Finance");
  const [customBF, setCustomBF] = useState("");
  const [audience, setAudience] = useState("Manager");
  const [requirement, setRequirement] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [progressImg, setProgressImg] = useState<string | null>(null);
  const [progressFinal, setProgressFinal] = useState(false);
  const [statusText, setStatusText] = useState<string>("");
  const [apiKey, setApiKey] = useStoredApiKey();

  async function onScreenshotChange(file: File | null) {
    setScreenshot(file);
    if (file) {
      try {
        setScreenshotPreview(await readDataUrl(file));
      } catch {
        setScreenshotPreview(null);
      }
    } else setScreenshotPreview(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};

    const bf = businessFunction === "Custom" ? customBF.trim() : businessFunction;
    if (businessFunction === "Custom" && !bf) next.customBusinessFunction = "Enter a custom business function.";
    if (wordCount(requirement) > 750) next.requirement = "Requirement must be 750 words or fewer.";
    if (wordCount(notes) > 300) next.notes = "Notes must be 300 words or fewer.";

    if (screenshot) {
      if (!IMG_TYPES.includes(screenshot.type)) next.screenshot = "Screenshot must be PNG or JPEG.";
      else if (screenshot.size > MAX_IMG) next.screenshot = "Screenshot must be 5MB or smaller.";
    }
    if ((mode === "improve" || mode === "both") && !screenshot) {
      next.screenshot = "This mode requires a screenshot.";
    }
    if (!requirement.trim() && !screenshot) {
      next.form = "Provide at least a requirement or a screenshot.";
    }

    setErrors(next);
    if (Object.keys(next).length) return;

    setGenerating(true);
    setProgressImg(null);
    setProgressFinal(false);
    setStatusText("Generating prototype…");

    try {
      const shotDataUrl = screenshotPreview;

      const prototypePrompt = buildPrototypePrompt({
        mode,
        businessFunction: bf,
        audience,
        requirement,
        notes,
        hasScreenshot: !!screenshot,
      });
      const recsPrompt = buildRecommendationsPrompt({
        mode,
        businessFunction: bf,
        audience,
        requirement,
        notes,
        hasScreenshot: !!screenshot,
      });

      let finalImage = "";
      const userKey = apiKey.trim() || undefined;
      const imagePromise = streamImage(
        "/api/generate-prototype",
        { prompt: prototypePrompt, apiKey: userKey },
        (dataUrl, isFinal) => {
          setProgressImg(dataUrl);
          setProgressFinal(isFinal);
          if (isFinal) finalImage = dataUrl;
        },
      );

      const recsPromise = fetch("/api/generate-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: recsPrompt, screenshotDataUrl: shotDataUrl, apiKey: userKey }),
      }).then(async (r) => {
        if (!r.ok) throw new Error(`Recommendations failed (${r.status})`);
        return (await r.json()) as {
          summary: string;
          findings: string[];
          topRecommendations: import("@/lib/submission-storage").TopRecommendation[];
          uxHierarchy: import("@/lib/submission-storage").HierarchyItem[];
          buildGuide: import("@/lib/submission-storage").BuildStep[];
          blueprint: import("@/lib/submission-storage").Blueprint | null;
        };
      });

      const [, recs] = await Promise.all([imagePromise, recsPromise]);

      setStatusText("Saving result…");
      saveSubmission({
        mode,
        businessFunction: bf,
        audience,
        requirement: requirement.trim(),
        notes: notes.trim(),
        screenshotDataUrl: shotDataUrl,
        screenshotName: screenshot?.name ?? null,
        prototypeDataUrl: finalImage,
        topRecommendations: recs.topRecommendations ?? [],
        uxHierarchy: recs.uxHierarchy ?? [],
        buildGuide: recs.buildGuide ?? [],
        blueprint: recs.blueprint ?? null,
        findings: recs.findings ?? [],
        summary: recs.summary ?? "",
        generatedAt: new Date().toISOString(),
      });

      navigate({ to: "/results" });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Generation failed." });
      setGenerating(false);
    }
  }

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Generate UX"
        title="Create or improve an Anaplan New UX dashboard"
        description="Choose a mode, provide a requirement and/or a screenshot, and let AI generate a realistic Anaplan Board page prototype with concise recommendations."
      />

      <form onSubmit={onSubmit} noValidate className="mt-10 grid gap-8 lg:grid-cols-[1fr,360px]">
        <div className="space-y-8 rounded-lg border border-border bg-card p-6 sm:p-8">
          {/* Mode */}
          <fieldset>
            <legend className="text-sm font-semibold text-foreground">Mode</legend>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {MODES.map((m) => (
                <label
                  key={m.id}
                  className={`cursor-pointer rounded-md border p-3 text-sm transition-colors ${
                    mode === m.id ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    className="sr-only"
                    value={m.id}
                    checked={mode === m.id}
                    onChange={() => setMode(m.id)}
                  />
                  <span className="block font-medium text-foreground">{m.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{m.desc}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Function + audience */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bf">
                Business function <span className="text-destructive">*</span>
              </Label>
              <select
                id="bf"
                value={businessFunction}
                onChange={(e) => setBusinessFunction(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {BUSINESS_FUNCTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              {businessFunction === "Custom" && (
                <Input
                  placeholder="Enter custom business function"
                  value={customBF}
                  onChange={(e) => setCustomBF(e.target.value)}
                  aria-invalid={!!errors.customBusinessFunction}
                />
              )}
              {errors.customBusinessFunction && (
                <p className="text-xs text-destructive">{errors.customBusinessFunction}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="aud">
                Target audience <span className="text-destructive">*</span>
              </Label>
              <select
                id="aud"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {AUDIENCES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Requirement */}
          <div className="space-y-2">
            <Label htmlFor="req">Dashboard requirement</Label>
            <Textarea
              id="req"
              rows={6}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="Describe what the dashboard supports, the KPIs that matter, and the decisions it drives."
              aria-invalid={!!errors.requirement}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Optional. Up to 750 words.</span>
              <span>{wordCount(requirement)}/750</span>
            </div>
            {errors.requirement && <p className="text-xs text-destructive">{errors.requirement}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Constraints, audience nuances, or known issues."
              aria-invalid={!!errors.notes}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Optional. Up to 300 words.</span>
              <span>{wordCount(notes)}/300</span>
            </div>
            {errors.notes && <p className="text-xs text-destructive">{errors.notes}</p>}
          </div>

          {/* Screenshot */}
          <div className="space-y-2">
            <Label htmlFor="shot">Dashboard screenshot</Label>
            <Input
              id="shot"
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => onScreenshotChange(e.target.files?.[0] ?? null)}
              aria-invalid={!!errors.screenshot}
            />
            <p className="text-xs text-muted-foreground">
              Optional for "Create". Required for "Improve" and "Requirement + screenshot". PNG or JPEG, up to 5MB.
            </p>
            {errors.screenshot && <p className="text-xs text-destructive">{errors.screenshot}</p>}
            {screenshotPreview && (
              <div className="mt-2 overflow-hidden rounded-md border border-border">
                <img src={screenshotPreview} alt="Uploaded dashboard preview" className="h-auto w-full" />
              </div>
            )}
          </div>

          <ApiKeyField value={apiKey} onChange={setApiKey} />

          {errors.form && (
            <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {errors.form}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={generating}>
              {generating ? "Generating…" : "Generate UX"}
            </Button>
            <p className="text-xs text-muted-foreground">Generation takes around 30–60 seconds.</p>
          </div>
        </div>

        <aside className="space-y-4 rounded-lg border border-border bg-secondary/30 p-6 text-sm text-muted-foreground lg:sticky lg:top-6 lg:self-start">
          <h2 className="text-sm font-semibold text-foreground">What you'll get</h2>
          <ul className="space-y-2">
            <li>• A realistic Anaplan New UX concept image</li>
            <li>• Up to 5 recommendations with Anaplan compatibility &amp; complexity</li>
            <li>• A recommended UX hierarchy (layout priorities)</li>
            <li>• A step-by-step build guide</li>
            <li>• An implementation blueprint for the model builder</li>
            <li>• Interactive before/after when you upload a screenshot</li>
            <li>• A downloadable PDF report</li>
          </ul>
          <p className="border-t border-border pt-4 text-xs">
            AI does not train on your inputs. Outputs are generated per request.
          </p>
        </aside>
      </form>

      {generating && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-6"
        >
          <div className="w-full max-w-3xl rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
              <p className="text-sm font-medium text-foreground">{statusText}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Rendering a realistic Anaplan New UX prototype. This usually takes 30–60 seconds.
            </p>
            <div className="mt-5 aspect-[3/2] w-full overflow-hidden rounded-md border border-border bg-muted">
              {progressImg ? (
                <img
                  src={progressImg}
                  alt="Prototype preview"
                  className={`h-full w-full object-cover transition-[filter] duration-300 ${
                    progressFinal ? "blur-0" : "blur-xl"
                  }`}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Waiting for first preview…
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
