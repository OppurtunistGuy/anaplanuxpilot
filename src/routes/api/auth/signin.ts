import { createFileRoute } from "@tanstack/react-router";
import { rejectCrossOrigin, signIn } from "@/lib/auth-server";

export const Route = createFileRoute("/api/auth/signin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rejected = rejectCrossOrigin(request);
        if (rejected) return rejected;
        try {
          const body = (await request.json()) as { email?: unknown; password?: unknown };
          const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
          const password = typeof body.password === "string" ? body.password : "";
          if (!email || !password || password.length > 128)
            return Response.json({ error: "Enter your email and password." }, { status: 400 });
          return await signIn(email, password);
        } catch {
          return Response.json({ error: "Sign-in is unavailable." }, { status: 503 });
        }
      },
    },
  },
});
