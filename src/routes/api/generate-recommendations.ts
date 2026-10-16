import { createFileRoute } from "@tanstack/react-router";

type Provider = "openai" | "gemini" | "grok";

interface ReqBody {
  prompt?: string;
  screenshotDataUrl?: string | null;
  apiKey?: string;
  provider?: Provider;
}

// Gemini chat (non-OpenAI shape). Returns raw text content.
async function geminiChat(
  prompt: string,
  screenshotDataUrl: string | null | undefined,
  key: string,
): Promise<Response> {
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (screenshotDataUrl) {
    const m = /^data:(image\/[a-z]+);base64,(.+)$/i.exec(screenshotDataUrl);
    if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You output strict JSON only." }] },
        contents: [{ parts }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) return new Response(await res.text().catch(() => "Gemini error"), { status: res.status });
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "{}";
  return Response.json({ content: text });
}

const COMPAT = ["supported", "common", "workaround", "unsupported"] as const;
const COMPLEX = ["low", "medium", "high"] as const;
type Compat = (typeof COMPAT)[number];
type Complex = (typeof COMPLEX)[number];

const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const clampStr = (v: unknown, max = 240) => (isStr(v) ? v.trim().slice(0, max) : "");
const oneOf = <T extends readonly string[]>(v: unknown, list: T, fallback: T[number]): T[number] =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T[number]) : fallback;
const cleanList = (v: unknown, max: number, maxLen = 240): string[] =>
  Array.isArray(v)
    ? v
        .map((x) => clampStr(x, maxLen))
        .filter((x) => x.length > 0)
        .slice(0, max)
    : [];

export const Route = createFileRoute("/api/generate-recommendations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ReqBody;
        try {
          body = (await request.json()) as ReqBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const prompt = (body.prompt ?? "").toString();
        if (!prompt.trim()) return new Response("Missing prompt", { status: 400 });

        const userKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
        const provider: Provider | null = userKey
          ? body.provider === "gemini" || body.provider === "grok"
            ? body.provider
            : "openai"
          : null;

        let content = "{}";

        if (userKey && provider === "gemini") {
          const r = await geminiChat(prompt, body.screenshotDataUrl, userKey);
          if (!r.ok) return r;
          content = ((await r.json()) as { content?: string }).content ?? "{}";
        } else {
          const key = userKey || process.env.LOVABLE_API_KEY;
          if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

          const userContent: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
          if (body.screenshotDataUrl) {
            userContent.push({
              type: "image_url",
              image_url: { url: body.screenshotDataUrl },
            });
          }

          const url = userKey
            ? provider === "grok"
              ? "https://api.x.ai/v1/chat/completions"
              : "https://api.openai.com/v1/chat/completions"
            : "https://ai.gateway.lovable.dev/v1/chat/completions";
          const model = userKey
            ? provider === "grok"
              ? "grok-3-mini"
              : "gpt-4o-mini"
            : "google/gemini-2.5-flash";

          const upstream = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: "You output strict JSON only." },
                { role: "user", content: userContent },
              ],
              response_format: { type: "json_object" },
            }),
          });

          if (!upstream.ok) {
            const text = await upstream.text().catch(() => "");
            return new Response(text || "Upstream error", { status: upstream.status });
          }
          const json = (await upstream.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          content = json.choices?.[0]?.message?.content ?? "{}";
        }
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(content) as Record<string, unknown>;
        } catch {
          parsed = {};
        }

        const topRecommendations = Array.isArray(parsed.topRecommendations)
          ? (parsed.topRecommendations as unknown[])
              .map((r) => {
                if (!r || typeof r !== "object") return null;
                const o = r as Record<string, unknown>;
                const text = clampStr(o.text, 200);
                if (!text) return null;
                const compatibility: Compat = oneOf(o.compatibility, COMPAT, "supported");
                const complexity: Complex = oneOf(o.complexity, COMPLEX, "medium");
                const altRaw = clampStr(o.alternative, 200);
                const alternative =
                  (compatibility === "workaround" || compatibility === "unsupported") && altRaw
                    ? altRaw
                    : undefined;
                return { text, compatibility, complexity, alternative };
              })
              .filter((x): x is NonNullable<typeof x> => !!x)
              .slice(0, 5)
          : [];

        const uxHierarchy = Array.isArray(parsed.uxHierarchy)
          ? (parsed.uxHierarchy as unknown[])
              .map((r, i) => {
                if (!r || typeof r !== "object") return null;
                const o = r as Record<string, unknown>;
                const title = clampStr(o.title, 80);
                if (!title) return null;
                const priority =
                  typeof o.priority === "number" && Number.isFinite(o.priority) ? o.priority : i + 1;
                const purpose = clampStr(o.purpose, 160);
                return { priority, title, purpose };
              })
              .filter((x): x is NonNullable<typeof x> => !!x)
              .slice(0, 5)
          : [];

        const buildGuide = Array.isArray(parsed.buildGuide)
          ? (parsed.buildGuide as unknown[])
              .map((r, i) => {
                if (!r || typeof r !== "object") return null;
                const o = r as Record<string, unknown>;
                const title = clampStr(o.title, 80);
                if (!title) return null;
                const step =
                  typeof o.step === "number" && Number.isFinite(o.step) ? o.step : i + 1;
                const detail = clampStr(o.detail, 200);
                return { step, title, detail };
              })
              .filter((x): x is NonNullable<typeof x> => !!x)
              .slice(0, 6)
          : [];

        let blueprint: {
          pageType: string;
          keyDecisions: string[];
          buildSequence: string[];
          complexity: Complex;
          compatibilityNotes: string[];
        } | null = null;
        if (parsed.blueprint && typeof parsed.blueprint === "object") {
          const b = parsed.blueprint as Record<string, unknown>;
          const pageType = oneOf(b.pageType, ["Board", "Worksheet", "Report"] as const, "Board");
          blueprint = {
            pageType,
            keyDecisions: cleanList(b.keyDecisions, 5, 160),
            buildSequence: cleanList(b.buildSequence, 6, 80),
            complexity: oneOf(b.complexity, COMPLEX, "medium"),
            compatibilityNotes: cleanList(b.compatibilityNotes, 3, 200),
          };
        }

        return Response.json({
          summary: clampStr(parsed.summary, 280),
          findings: cleanList(parsed.findings, 5, 200),
          topRecommendations,
          uxHierarchy,
          buildGuide,
          blueprint,
        });
      },
    },
  },
});
