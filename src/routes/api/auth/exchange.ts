import { createFileRoute } from "@tanstack/react-router";
import { exchangeSession, rejectCrossOrigin } from "@/lib/auth-server";

export const Route = createFileRoute("/api/auth/exchange")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rejected = rejectCrossOrigin(request);
        if (rejected) return rejected;
        try {
          const body = (await request.json()) as { accessToken?: unknown; refreshToken?: unknown };
          if (typeof body.accessToken !== "string" || typeof body.refreshToken !== "string")
            return Response.json({ error: "Confirmation session is invalid." }, { status: 400 });
          return await exchangeSession(body.accessToken, body.refreshToken);
        } catch {
          return Response.json({ error: "Confirmation could not be completed." }, { status: 503 });
        }
      },
    },
  },
});
