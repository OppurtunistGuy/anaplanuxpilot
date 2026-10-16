import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { clearSubmission } from "@/lib/submission-storage";

type Role = "admin" | "tester" | "pending";
type Session = {
  authenticated: boolean;
  role?: Role;
  user?: { id: string; email?: string };
  canClaimTester?: boolean;
};
type AuthContextValue = Session & {
  loading: boolean;
  refresh: () => Promise<Session>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function post(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    confirmationRequired?: boolean;
  };
  if (!response.ok) throw new Error(data.error ?? "The request could not be completed.");
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ authenticated: false });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
    });
    const next = (await response.json().catch(() => ({ authenticated: false }))) as Session;
    if (next.canClaimTester) {
      await post("/api/auth/claim-tester").catch(() => undefined);
      const refreshed = await fetch("/api/auth/session", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const claimed = (await refreshed.json().catch(() => next)) as Session;
      setSession(claimed);
      return claimed;
    }
    setSession(next);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    async function initialize() {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
        await post("/api/auth/exchange", { accessToken, refreshToken }).catch(() => undefined);
      }
      await refresh().catch(() => undefined);
      if (active) setLoading(false);
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    await post("/api/auth/signout").catch(() => undefined);
    clearSubmission();
    setSession({ authenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...session, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (auth.loading)
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-sm text-muted-foreground">
        Checking your sign-in…
      </div>
    );
  if (!auth.authenticated)
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold">Sign in to continue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your design workspace is available to approved testers.
        </p>
        <Link
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          to="/sign-in"
        >
          Sign in
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">
          Need an account?{" "}
          <Link className="text-primary underline" to="/sign-up">
            Sign up
          </Link>
        </p>
      </div>
    );
  if (auth.role !== "tester" && auth.role !== "admin")
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold">Access is pending</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is verified. A project admin must approve access before you can generate
          designs.
        </p>
        <button
          className="mt-6 rounded-md border px-4 py-2 text-sm"
          onClick={() => void auth.signOut()}
        >
          Sign out
        </button>
      </div>
    );
  return children;
}

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await post(`/api/auth/${mode}`, { email, password });
      if (result.confirmationRequired) {
        setMessage(
          "Check your email for a confirmation link. Your session will be created after you confirm.",
        );
      } else {
        const next = await auth.refresh();
        if (next.role === "tester" || next.role === "admin") await navigate({ to: "/generate" });
        else setMessage("Account created. Your access is pending approval.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-6 py-12">
      <section className="w-full rounded-lg border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Anaplan UX Copilot
        </p>
        <h1 className="mt-3 text-2xl font-semibold">
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to continue to your design workspace."
            : "Sign-up is invite-only. Your account needs tester approval before using the design tools."}
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium">
            Work email
            <input
              required
              type="email"
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              required
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Use at least 12 characters.
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-sm text-muted-foreground">
              {message}
            </p>
          )}
          <button
            disabled={busy}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <p className="mt-5 text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>
              New tester?{" "}
              <Link className="text-primary underline" to="/sign-up">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already registered?{" "}
              <Link className="text-primary underline" to="/sign-in">
                Sign in
              </Link>
            </>
          )}
        </p>
      </section>
    </main>
  );
}

export function AuthConfirmed() {
  const auth = useAuth();
  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold">Email confirmation</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {auth.loading
          ? "Completing sign-in…"
          : auth.authenticated
            ? auth.role === "tester" || auth.role === "admin"
              ? "Your account is ready."
              : "Your email is confirmed. Access is pending approval."
            : "The confirmation link could not be completed. Please sign in or request a new link."}
      </p>
      <Link
        className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        to={auth.authenticated ? "/generate" : "/sign-in"}
      >
        Continue
      </Link>
    </main>
  );
}
