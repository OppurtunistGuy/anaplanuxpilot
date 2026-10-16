import { createFileRoute } from "@tanstack/react-router";
import { rejectCrossOrigin, signUp } from "@/lib/auth-server";

export const Route = createFileRoute("/api/auth/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rejected = rejectCrossOrigin(request);
        if (rejected) return rejected;
        try {
          const body = (await request.json()) as { email?: unknown; password?: unknown };
          const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
          const password = typeof body.password === "string" ? body.password : "";
          if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            password.length < 12 ||
            password.length > 128
          ) {
            return Response.json(
              { error: "Enter a valid email and a password with at least 12 characters." },
              { status: 400 },
            );
          }
          return await signUp(request, email, password);
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "Sign-up is unavailable." },
            { status: 503 },
          );
        }
      },
    },
  },
});
