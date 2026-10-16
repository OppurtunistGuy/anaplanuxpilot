import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ByokProvider = "openai" | "gemini" | "grok";

export interface ByokConfig {
  provider: ByokProvider;
  key: string;
}

const STORAGE_KEY = "uxc.byok";

export const PROVIDERS: { id: ByokProvider; label: string; placeholder: string; prefix?: string; hint: string }[] = [
  { id: "openai", label: "OpenAI", placeholder: "sk-...", prefix: "sk-", hint: "Get a key at platform.openai.com" },
  { id: "gemini", label: "Google Gemini", placeholder: "AIza...", prefix: "AIza", hint: "Get a key at aistudio.google.com — free tier available" },
  { id: "grok", label: "xAI Grok", placeholder: "xai-...", prefix: "xai-", hint: "Get a key at console.x.ai" },
];

export function useStoredApiKey(): [ByokConfig, (c: ByokConfig) => void] {
  const [config, setConfig] = useState<ByokConfig>({ provider: "openai", key: "" });
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ByokConfig;
        if (parsed && typeof parsed.key === "string") {
          setConfig({ provider: parsed.provider ?? "openai", key: parsed.key });
          return;
        }
      }
      // migrate legacy openai-only key
      const legacy = window.localStorage.getItem("uxc.openaiKey");
      if (legacy) setConfig({ provider: "openai", key: legacy });
    } catch {
      /* ignore */
    }
  }, []);
  const update = (c: ByokConfig) => {
    setConfig(c);
    if (c.key.trim()) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider: c.provider, key: c.key.trim() }));
    else window.localStorage.removeItem(STORAGE_KEY);
  };
  return [config, update];
}

export function ApiKeyField({ value, onChange }: { value: ByokConfig; onChange: (c: ByokConfig) => void }) {
  const [show, setShow] = useState(false);
  const meta = PROVIDERS.find((p) => p.id === value.provider) ?? PROVIDERS[0];
  const valid = !value.key || !meta.prefix || value.key.trim().startsWith(meta.prefix);
  return (
    <details className="rounded-md border border-border p-4" open={!!value.key}>
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        Use your own API key {value.key ? `(${meta.label} — active)` : "(optional)"}
      </summary>
      <div className="mt-3 space-y-3">
        <div className="space-y-2">
          <Label htmlFor="byok-provider">AI provider</Label>
          <select
            id="byok-provider"
            value={value.provider}
            onChange={(e) => onChange({ provider: e.target.value as ByokProvider, key: "" })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="apikey">{meta.label} API key</Label>
          <div className="flex gap-2">
            <Input
              id="apikey"
              type={show ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              placeholder={meta.placeholder}
              value={value.key}
              onChange={(e) => onChange({ ...value, key: e.target.value })}
              aria-invalid={!valid}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="rounded-md border border-border px-3 text-xs text-foreground hover:bg-accent"
            >
              {show ? "Hide" : "Show"}
            </button>
            {value.key && (
              <button
                type="button"
                onClick={() => onChange({ ...value, key: "" })}
                className="rounded-md border border-border px-3 text-xs text-foreground hover:bg-accent"
              >
                Clear
              </button>
            )}
          </div>
          {!valid && <p className="text-xs text-destructive">{meta.label} keys start with "{meta.prefix}".</p>}
        </div>
        <p className="text-xs text-muted-foreground">
          {meta.hint}. Bypasses shared limits; usage is billed to your own {meta.label} account under your plan. Saved
          only in this browser and sent per request — never stored on our servers.
        </p>
      </div>
    </details>
  );
}
