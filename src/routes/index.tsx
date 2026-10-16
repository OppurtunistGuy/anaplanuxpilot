import { createFileRoute, Link } from "@tanstack/react-router";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { ArrowRight, LayoutDashboard, Sparkles, Image as ImageIcon, FileText } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Anaplan UX Copilot — AI-generated dashboard prototypes" },
      {
        name: "description",
        content:
          "Generate realistic Anaplan New UX dashboard prototypes from requirements or improve existing dashboards with AI.",
      },
      { property: "og:title", content: "Anaplan UX Copilot" },
      {
        property: "og:description",
        content:
          "Generate realistic Anaplan New UX dashboard prototypes from requirements or improve existing dashboards with AI.",
      },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border">
        <PageContainer className="py-20 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              AI for Anaplan model builders & consultants
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Generate realistic Anaplan New UX dashboards in minutes.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Turn business requirements or an existing screenshot into a clean, client-ready Anaplan
              Board page prototype — with concise, actionable recommendations.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to="/generate">
                  Generate a dashboard <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <span className="text-xs text-muted-foreground">
                Invite-only preview. Sign up with an approved email.
              </span>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* How it works */}
      <section className="border-b border-border bg-secondary/30">
        <PageContainer>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">How it works</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                n: "01",
                title: "Describe or upload",
                body:
                  "Enter a requirement, upload an existing dashboard screenshot, or do both for sharper results.",
              },
              {
                n: "02",
                title: "AI generates",
                body:
                  "Get a realistic Anaplan New UX prototype image built on enterprise dashboard best practices.",
              },
              {
                n: "03",
                title: "Review & present",
                body:
                  "Get up to 5 concise recommendations and an optional client-ready PDF review report.",
              },
            ].map((s) => (
              <li key={s.n} className="rounded-lg border border-border bg-background p-6">
                <div className="text-xs font-semibold text-primary">{s.n}</div>
                <h3 className="mt-2 text-base font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </PageContainer>
      </section>

      {/* Example Before/After */}
      <section className="border-b border-border">
        <PageContainer>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Example: before & after</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A cluttered legacy dashboard, reorganised into a focused Anaplan New UX Board page.
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <BeforePlaceholder />
            <AfterPlaceholder />
          </div>
        </PageContainer>
      </section>

      {/* Features */}
      <section className="border-b border-border bg-secondary/30">
        <PageContainer>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">What you get</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ImageIcon, title: "Realistic prototype", body: "Anaplan Board page styling, not generic BI." },
              { icon: LayoutDashboard, title: "Three modes", body: "Create new, improve existing, or combine both." },
              { icon: Sparkles, title: "5 sharp recs", body: "Short, actionable, business-focused — no essays." },
              { icon: FileText, title: "PDF review report", body: "Client-ready when you upload a screenshot." },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border border-border bg-background p-5">
                <f.icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="mt-3 text-sm font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* CTA */}
      <section>
        <PageContainer className="py-20">
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Ready to generate your first Anaplan UX prototype?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Start with a requirement or a screenshot. You will have a result in under a minute.
            </p>
            <div className="mt-6">
              <Button asChild size="lg">
                <Link to="/generate">
                  Generate UX <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </PageContainer>
      </section>
    </>
  );
}

function BeforePlaceholder() {
  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">Before</div>
      <div className="p-4">
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="h-10 rounded-sm border border-border bg-muted/40" />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-12 gap-1">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="h-3 rounded-sm bg-muted/60" />
          ))}
        </div>
      </div>
    </figure>
  );
}

function AfterPlaceholder() {
  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">After</div>
      <div className="p-4">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-md border border-border p-3">
              <div className="h-2 w-12 rounded-sm bg-muted" />
              <div className="mt-2 h-5 w-16 rounded-sm bg-foreground/80" />
              <div className="mt-2 h-1 w-full rounded-full bg-primary/60" />
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="col-span-2 h-32 rounded-md border border-border p-3">
            <div className="flex h-full items-end gap-1">
              {[40, 60, 30, 80, 55, 70, 50, 90].map((h, i) => (
                <div key={i} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          <div className="h-32 rounded-md border border-border p-3">
            <div className="space-y-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-2 rounded-sm bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
