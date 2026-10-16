const ACCESS_COOKIE = "uxc_access";
const REFRESH_COOKIE = "uxc_refresh";

type SupabaseUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  app_metadata?: Record<string, unknown>;
};

type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user: SupabaseUser;
};

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Authentication is not configured.");
  return { url, anonKey };
}

function cookie(request: Request, name: string) {
  return (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function cookieHeaders(session: AuthSession) {
  const secure =
    process.env.NODE_ENV === "production" || process.env.APP_BASE_URL?.startsWith("https://")
      ? "; Secure"
      : "";
  const accessAge = Math.max(60, Math.min(session.expires_in ?? 3600, 3600));
  return [
    `${ACCESS_COOKIE}=${encodeURIComponent(session.access_token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${accessAge}${secure}`,
    `${REFRESH_COOKIE}=${encodeURIComponent(session.refresh_token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`,
  ];
}

export function clearAuthCookies() {
  const secure =
    process.env.NODE_ENV === "production" || process.env.APP_BASE_URL?.startsWith("https://")
      ? "; Secure"
      : "";
  return [
    `${ACCESS_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    `${REFRESH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  ];
}

export async function signOut(request: Request) {
  const token = cookie(request, ACCESS_COOKIE);
  if (token) {
    try {
      const { url, anonKey } = config();
      await fetch(`${url}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: anonKey, Authorization: `Bearer ${decodeURIComponent(token)}` },
      });
    } catch {
      // Always clear local cookies, even when Supabase is unavailable.
    }
  }
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const value of clearAuthCookies()) headers.append("Set-Cookie", value);
  return Response.json({ ok: true }, { headers });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_BASE_URL
    ? new URL(process.env.APP_BASE_URL).origin
    : new URL(request.url).origin;
  return !!origin && origin === expected;
}

export function rejectCrossOrigin(request: Request) {
  return sameOrigin(request)
    ? null
    : Response.json({ error: "Request origin rejected." }, { status: 403 });
}

function validateCredentials(email: string, password: string) {
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 12 || password.length > 128) {
    return Response.json({ error: "Password must be 12 to 128 characters." }, { status: 400 });
  }
  return null;
}

export async function signUp(request: Request, email: string, password: string) {
  const invalid = validateCredentials(email, password);
  if (invalid) return invalid;
  const { url, anonKey } = config();
  const allowed = (process.env.SIGNUP_ALLOWED_EMAILS ?? process.env.INITIAL_TESTER_EMAIL ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.includes(email.toLowerCase())) {
    return Response.json(
      { error: "Sign-up is invite-only. Ask the project owner for access." },
      { status: 403 },
    );
  }
  const redirectTo = `${process.env.APP_BASE_URL ?? new URL(request.url).origin}/auth/confirmed`;
  const response = await fetch(
    `${url}/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`,
    {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
  );
  const data = (await response.json().catch(() => ({}))) as AuthSession & {
    msg?: string;
    message?: string;
  };
  if (!response.ok)
    return Response.json(
      { error: "Could not create the account. Check the details or try again." },
      { status: response.status === 429 ? 429 : 400 },
    );
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (data.access_token && data.refresh_token && data.user) {
    for (const value of cookieHeaders(data)) headers.append("Set-Cookie", value);
  }
  return Response.json({ ok: true, confirmationRequired: !data.access_token }, { headers });
}

export async function signIn(email: string, password: string) {
  const invalid = validateCredentials(email, password);
  if (invalid) return invalid;
  const { url, anonKey } = config();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await response.json().catch(() => ({}))) as AuthSession;
  if (!response.ok || !data.access_token || !data.refresh_token) {
    return Response.json(
      { error: "Email or password is incorrect, or the email still needs verification." },
      { status: 401 },
    );
  }
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const value of cookieHeaders(data)) headers.append("Set-Cookie", value);
  return Response.json({ ok: true }, { headers });
}

export async function exchangeSession(accessToken: string, refreshToken: string) {
  const { url, anonKey } = config();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok)
    return Response.json({ error: "Email confirmation could not be completed." }, { status: 401 });
  const user = (await response.json()) as SupabaseUser;
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const value of cookieHeaders({
    access_token: accessToken,
    refresh_token: refreshToken,
    user,
  }))
    headers.append("Set-Cookie", value);
  return Response.json({ ok: true }, { headers });
}

export async function verifyEmailLink(request: Request) {
  const { url, anonKey } = config();
  const query = new URL(request.url).searchParams;
  const tokenHash = query.get("token_hash") ?? "";
  const type = query.get("type") ?? "";
  if (!tokenHash || !["signup", "email", "invite"].includes(type)) {
    return Response.redirect(
      `${process.env.APP_BASE_URL ?? new URL(request.url).origin}/sign-in?verified=0`,
      303,
    );
  }
  const verified = await fetch(`${url}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ token_hash: tokenHash, type }),
  });
  const session = (await verified.json().catch(() => null)) as AuthSession | null;
  if (!verified.ok || !session?.access_token || !session.refresh_token || !session.user) {
    return Response.redirect(
      `${process.env.APP_BASE_URL ?? new URL(request.url).origin}/sign-in?verified=0`,
      303,
    );
  }
  const headers = new Headers({
    Location: `${process.env.APP_BASE_URL ?? new URL(request.url).origin}/auth/confirmed`,
    "Cache-Control": "no-store",
  });
  for (const value of cookieHeaders(session)) headers.append("Set-Cookie", value);
  return new Response(null, { status: 303, headers });
}

async function readUser(url: string, anonKey: string, accessToken: string) {
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  return (await response.json()) as SupabaseUser;
}

export async function getSession(request: Request) {
  try {
    const { url, anonKey } = config();
    let accessToken = cookie(request, ACCESS_COOKIE);
    const refreshToken = cookie(request, REFRESH_COOKIE);
    let user = accessToken ? await readUser(url, anonKey, decodeURIComponent(accessToken)) : null;
    const headers = new Headers({ "Cache-Control": "no-store" });
    if (!user && refreshToken) {
      const refreshed = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: decodeURIComponent(refreshToken) }),
      });
      const session = (await refreshed.json().catch(() => null)) as AuthSession | null;
      if (refreshed.ok && session?.access_token && session.refresh_token && session.user) {
        accessToken = session.access_token;
        user = session.user;
        for (const value of cookieHeaders(session)) headers.append("Set-Cookie", value);
      }
    }
    if (!user) return Response.json({ authenticated: false }, { headers });
    const role = user.app_metadata?.role;
    const initialTesterEmail = process.env.INITIAL_TESTER_EMAIL?.trim().toLowerCase();
    const canClaimTester =
      !!initialTesterEmail &&
      user.email?.toLowerCase() === initialTesterEmail &&
      !!user.email_confirmed_at;
    return Response.json(
      {
        authenticated: true,
        user: { id: user.id, email: user.email },
        role: role === "admin" || role === "tester" ? role : "pending",
        canClaimTester,
      },
      { headers },
    );
  } catch {
    return Response.json(
      { error: "Authentication is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function requireTester(request: Request) {
  try {
    const { url, anonKey } = config();
    const token = cookie(request, ACCESS_COOKIE);
    if (!token) return Response.json({ error: "Sign in required." }, { status: 401 });
    const user = await readUser(url, anonKey, decodeURIComponent(token));
    if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
    const role = user.app_metadata?.role;
    if (role !== "tester" && role !== "admin")
      return Response.json({ error: "Your account is awaiting access approval." }, { status: 403 });
    return user;
  } catch {
    return Response.json({ error: "Authentication is not configured." }, { status: 503 });
  }
}

export async function claimInitialTester(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const initialEmail = process.env.INITIAL_TESTER_EMAIL?.trim().toLowerCase();
  if (!serviceKey || !initialEmail)
    return Response.json(
      { error: "Tester account provisioning is not configured." },
      { status: 503 },
    );
  const { url, anonKey } = config();
  const token = cookie(request, ACCESS_COOKIE);
  if (!token) return Response.json({ error: "Sign in required." }, { status: 401 });
  const user = await readUser(url, anonKey, decodeURIComponent(token));
  if (!user || user.email?.toLowerCase() !== initialEmail || !user.email_confirmed_at) {
    return Response.json(
      { error: "This verified account is not approved for tester access." },
      { status: 403 },
    );
  }
  if (user.app_metadata?.role === "tester" || user.app_metadata?.role === "admin")
    return Response.json({ ok: true });
  const response = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
    method: "PUT",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ app_metadata: { ...user.app_metadata, role: "tester" } }),
  });
  if (!response.ok)
    return Response.json({ error: "Tester role could not be assigned." }, { status: 502 });
  return Response.json({ ok: true });
}
