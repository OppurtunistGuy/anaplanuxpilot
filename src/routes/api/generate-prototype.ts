import { createFileRoute } from "@tanstack/react-router";

type Provider = "openai" | "gemini" | "grok";

interface ReqBody {
  prompt?: string;
  apiKey?: string;
  provider?: Provider;
}

const sse = (events: Array<Record<string, unknown>>) =>
  new Response(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n", {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });

// Gemini image generation (non-streaming): returns b64 of first inline image.
async function geminiImage(prompt: string, key: string): Promise<Response> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    },
  );
  if (!res.ok) return new Response(await res.text().catch(() => "Gemini error"), { status: res.status });
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
  };
  const b64 = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
  if (!b64) return new Response("Gemini returned no image", { status: 502 });
  return sse([{ type: "image_generation.completed", b64_json: b64 }]);
}

// Grok image generation (non-streaming, OpenAI-compatible shape).
async function grokImage(prompt: string, key: string): Promise<Response> {
  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "grok-2-image-1212", prompt, n: 1, response_format: "b64_json" }),
  });
  if (!res.ok) return new Response(await res.text().catch(() => "Grok error"), { status: res.status });
  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) return new Response("Grok returned no image", { status: 502 });
  return sse([{ type: "image_generation.completed", b64_json: b64 }]);
}

export const Route = createFileRoute("/api/generate-prototype")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ReqBody;
        try {
          body = (await request.json()) as ReqBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const prompt = (body.prompt ?? "").toString().slice(0, 8000);
        if (!prompt.trim()) return new Response("Missing prompt", { status: 400 });

        const userKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
        const provider: Provider | null = userKey
          ? body.provider === "gemini" || body.provider === "grok"
            ? body.provider
            : "openai"
          : null;

        if (userKey && provider === "gemini") return geminiImage(prompt, userKey);
        if (userKey && provider === "grok") return grokImage(prompt, userKey);

        const key = userKey || process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const upstream = await fetch(
          userKey
            ? "https://api.openai.com/v1/images/generations"
            : "https://ai.gateway.lovable.dev/v1/images/generations",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: userKey ? "gpt-image-1" : "openai/gpt-image-2",
              prompt,
              size: "1536x1024",
              quality: "medium",
              n: 1,
              stream: true,
              partial_images: 2,
            }),
          },
        );

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status });
        }
        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
