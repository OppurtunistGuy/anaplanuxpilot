import { jsPDF } from "jspdf";
import type { Compatibility, Complexity, StoredSubmission } from "./submission-storage";

const COMPAT_LABEL: Record<Compatibility, string> = {
  supported: "[OK] Fully Supported",
  common: "[OK] Common Practice",
  workaround: "[!] Requires Workaround",
  unsupported: "[X] Not Supported",
};
const COMPLEX_LABEL: Record<Complexity, string> = {
  low: "Low Complexity",
  medium: "Medium Complexity",
  high: "High Complexity",
};

export function exportReviewPdf(s: StoredSubmission) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxW = pageW - margin * 2;
  let y = margin;

  const ensure = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };
  const h1 = (t: string) => {
    ensure(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15);
    doc.text(t, margin, y);
    y += 24;
  };
  const h2 = (t: string) => {
    ensure(22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text(t, margin, y);
    y += 16;
  };
  const para = (t: string) => {
    if (!t) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60);
    const lines = doc.splitTextToSize(t, maxW) as string[];
    lines.forEach((ln) => {
      ensure(14);
      doc.text(ln, margin, y);
      y += 14;
    });
    y += 4;
  };
  const bullets = (items: string[]) => {
    if (!items.length) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60);
    items.forEach((it) => {
      const lines = doc.splitTextToSize(`- ${it}`, maxW - 12) as string[];
      lines.forEach((ln, i) => {
        ensure(14);
        doc.text(ln, margin + (i === 0 ? 0 : 12), y);
        y += 14;
      });
    });
    y += 4;
  };
  const image = (dataUrl: string, label: string) => {
    h2(label);
    const fmt = dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
    try {
      const props = doc.getImageProperties(dataUrl);
      const ratio = props.height / props.width;
      const w = maxW;
      const h = w * ratio;
      ensure(h + 4);
      doc.addImage(dataUrl, fmt, margin, y, w, h, undefined, "FAST");
      y += h + 12;
    } catch {
      // skip
    }
  };

  h1("Anaplan UX Concept");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `${s.businessFunction} • Audience: ${s.audience} • ${new Date(s.generatedAt).toLocaleString()}`,
    margin,
    y,
  );
  y += 18;

  if (s.summary) para(s.summary);

  // A. Generated concept (with original if present)
  if (s.screenshotDataUrl) image(s.screenshotDataUrl, "Current Dashboard");
  if (s.prototypeDataUrl) {
    image(s.prototypeDataUrl, s.screenshotDataUrl ? "Improved Anaplan UX Concept" : "Generated Anaplan UX Concept");
  }

  // B. Top recommendations
  const recs = s.topRecommendations ?? [];
  if (recs.length) {
    h2("Top Recommendations");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60);
    recs.forEach((r, i) => {
      const head = `${i + 1}. ${r.text}`;
      const meta = `   ${COMPAT_LABEL[r.compatibility]} • ${COMPLEX_LABEL[r.complexity]}`;
      doc.splitTextToSize(head, maxW).forEach((ln: string) => {
        ensure(14);
        doc.text(ln, margin, y);
        y += 14;
      });
      ensure(14);
      doc.setTextColor(110);
      doc.text(meta, margin, y);
      y += 14;
      doc.setTextColor(60);
      if (r.alternative) {
        doc.splitTextToSize(`   Closest in Anaplan: ${r.alternative}`, maxW - 12).forEach(
          (ln: string) => {
            ensure(14);
            doc.text(ln, margin, y);
            y += 14;
          },
        );
      }
      y += 4;
    });
  } else if (s.recommendations?.length) {
    h2("Top Recommendations");
    bullets(s.recommendations);
  }

  // C. UX hierarchy
  if (s.uxHierarchy?.length) {
    h2("Recommended UX Hierarchy");
    bullets(
      s.uxHierarchy.map((h) => `Priority ${h.priority} — ${h.title}${h.purpose ? `: ${h.purpose}` : ""}`),
    );
  }

  // D. Build guide
  if (s.buildGuide?.length) {
    h2("Build Guide");
    bullets(
      s.buildGuide.map((b) => `Step ${b.step} — ${b.title}${b.detail ? `: ${b.detail}` : ""}`),
    );
  }

  // Blueprint
  if (s.blueprint) {
    h2("Implementation Blueprint");
    para(`Page type: ${s.blueprint.pageType}`);
    if (s.blueprint.keyDecisions.length) {
      para("Key design decisions:");
      bullets(s.blueprint.keyDecisions);
    }
    if (s.blueprint.buildSequence.length) {
      para("Build sequence:");
      bullets(s.blueprint.buildSequence);
    }
    para(`Complexity: ${COMPLEX_LABEL[s.blueprint.complexity]}`);
    if (s.blueprint.compatibilityNotes.length) {
      para("Compatibility notes:");
      bullets(s.blueprint.compatibilityNotes);
    }
  }

  // Findings (only when screenshot)
  if (s.findings?.length) {
    h2("Findings from current dashboard");
    bullets(s.findings);
  }

  doc.save(`anaplan-ux-concept-${Date.now()}.pdf`);
}
