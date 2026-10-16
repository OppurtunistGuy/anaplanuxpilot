import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { BeforeAfter } from "@/components/results/BeforeAfter";
import {
  loadSubmission,
  clearSubmission,
  type Compatibility,
  type Complexity,
  type StoredSubmission,
  type TopRecommendation,
} from "@/lib/submission-storage";
import { exportReviewPdf } from "@/lib/pdf-report";
import { Download, Trash2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Results — Anaplan UX Copilot" },
      { name: "description", content: "AI-generated Anaplan New UX concept and recommendations." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/results" }],
  }),
  component: ResultsPage,
});

const COMPAT: Record<Compatibility, { label: string; cls: string }> = {
  supported: { label: "✓ Fully Supported", cls: "border-primary/30 bg-primary/5 text-primary" },
  common: { label: "✓ Common Practice", cls: "border-primary/30 bg-primary/5 text-primary" },
  workaround: {
    label: "⚠ Requires Workaround",
    cls: "border-amber-500/40 bg-amber-50 text-amber-700",
  },
  unsupported: {
    label: "✕ Not Supported",
    cls: "border-destructive/40 bg-destructive/5 text-destructive",
  },
};
const COMPLEX: Record<Complexity, string> = {
  low: "Low Complexity",
  medium: "Medium Complexity",
  high: "High Complexity",
};

function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function ResultsPage() {
  const [sub, setSub] = useState<StoredSubmission | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSub(loadSubmission());
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <PageContainer>
        <div className="h-32" />
      </PageContainer>
    );
  }

  if (!sub) {
    return (
      <PageContainer>
        <SectionHeading
          eyebrow="Results"
          title="No result yet"
          description="Generate a dashboard to see your concept and recommendations here."
        />
        <div className="mt-8">
          <Button asChild>
            <Link to="/generate">
              Generate UX <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  const hasScreenshot = !!sub.screenshotDataUrl;
  const topRecs: TopRecommendation[] =
    sub.topRecommendations?.length
      ? sub.topRecommendations
      : (sub.recommendations ?? []).map((text) => ({
          text,
          compatibility: "supported" as const,
          complexity: "medium" as const,
        }));

  return (
    <PageContainer>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          eyebrow="Results"
          title="Anaplan New UX concept"
          description={`${sub.businessFunction} • Audience: ${sub.audience} • ${new Date(sub.generatedAt).toLocaleString()}`}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportReviewPdf(sub)}>
            <Download className="mr-1 h-4 w-4" /> Download PDF
          </Button>
          <Button asChild variant="outline">
            <Link to="/generate">New generation</Link>
          </Button>
        </div>
      </div>

      {/* A. Generated Anaplan UX Concept */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">A. Generated Anaplan UX Concept</h2>
        {hasScreenshot && sub.prototypeDataUrl ? (
          <BeforeAfter beforeSrc={sub.screenshotDataUrl!} afterSrc={sub.prototypeDataUrl} />
        ) : (
          <figure className="overflow-hidden rounded-lg border border-border bg-card">
            <figcaption className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
              Improved Anaplan UX concept
            </figcaption>
            {sub.prototypeDataUrl ? (
              <img
                src={sub.prototypeDataUrl}
                alt="Generated Anaplan New UX concept"
                className="h-auto w-full"
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center text-xs text-muted-foreground">
                Concept unavailable.
              </div>
            )}
          </figure>
        )}
        {sub.summary && (
          <p className="mt-3 text-sm text-muted-foreground">{sub.summary}</p>
        )}
      </section>

      {/* B. Top Recommendations */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          B. Top Recommendations <span className="text-muted-foreground">(max 5)</span>
        </h2>
        {topRecs.length ? (
          <ol className="grid gap-3">
            {topRecs.map((r, i) => (
              <li
                key={i}
                className="rounded-md border border-border bg-card p-4 text-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-xs font-semibold text-primary">{i + 1}.</span>
                  <div className="flex-1">
                    <p className="text-foreground">{r.text}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Chip className={COMPAT[r.compatibility].cls}>
                        {COMPAT[r.compatibility].label}
                      </Chip>
                      <Chip className="border-border bg-muted/40 text-muted-foreground">
                        {COMPLEX[r.complexity]}
                      </Chip>
                    </div>
                    {r.alternative && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Closest in Anaplan:</span>{" "}
                        {r.alternative}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No recommendations were returned.</p>
        )}
      </section>

      {/* C. Recommended UX Hierarchy */}
      {sub.uxHierarchy?.length ? (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold text-foreground">C. Recommended UX Hierarchy</h2>
          <ol className="divide-y divide-border rounded-md border border-border bg-card">
            {sub.uxHierarchy.map((h, i) => (
              <li key={i} className="flex items-start gap-4 p-4 text-sm">
                <span className="min-w-[78px] text-xs font-semibold uppercase tracking-wide text-primary">
                  Priority {h.priority}
                </span>
                <div>
                  <p className="font-medium text-foreground">{h.title}</p>
                  {h.purpose && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{h.purpose}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* D. Build Guide */}
      {sub.buildGuide?.length ? (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold text-foreground">D. Build Guide</h2>
          <ol className="divide-y divide-border rounded-md border border-border bg-card">
            {sub.buildGuide.map((b, i) => (
              <li key={i} className="flex items-start gap-4 p-4 text-sm">
                <span className="min-w-[64px] text-xs font-semibold uppercase tracking-wide text-primary">
                  Step {b.step}
                </span>
                <div>
                  <p className="font-medium text-foreground">{b.title}</p>
                  {b.detail && <p className="mt-0.5 text-xs text-muted-foreground">{b.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* Implementation Blueprint */}
      {sub.blueprint && (
        <section className="mt-10 rounded-lg border border-border bg-secondary/30 p-6">
          <h2 className="text-sm font-semibold text-foreground">Implementation Blueprint</h2>
          <p className="mt-1 text-xs text-muted-foreground">Concise handoff for the model builder.</p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recommended page type
              </dt>
              <dd className="mt-1 text-sm text-foreground">{sub.blueprint.pageType}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Complexity level
              </dt>
              <dd className="mt-1">
                <Chip className="border-border bg-background text-foreground">
                  {COMPLEX[sub.blueprint.complexity]}
                </Chip>
              </dd>
            </div>
            {sub.blueprint.keyDecisions.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Key design decisions
                </dt>
                <dd className="mt-1">
                  <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                    {sub.blueprint.keyDecisions.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            {sub.blueprint.buildSequence.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Build sequence
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {sub.blueprint.buildSequence.map((s, i) => (
                    <span key={i}>
                      {i > 0 && <span className="mx-1 text-muted-foreground">→</span>}
                      {s}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {sub.blueprint.compatibilityNotes.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Compatibility notes
                </dt>
                <dd className="mt-1">
                  <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                    {sub.blueprint.compatibilityNotes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <div className="mt-10 flex">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearSubmission();
            setSub(null);
          }}
        >
          <Trash2 className="mr-1 h-4 w-4" /> Clear result
        </Button>
      </div>
    </PageContainer>
  );
}
