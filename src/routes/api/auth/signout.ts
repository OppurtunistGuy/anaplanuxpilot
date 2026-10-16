import { createFileRoute } from "@tanstack/react-router";
import { clearAuthCookies, rejectCrossOrigin, signOut } from "@/lib/auth-server";

export const Route = createFileRoute("/api/auth/signout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rejected = rejectCrossOrigin(request);
        if (rejected) return rejected;
        try {
          return signOut(request);
        } catch {
          const headers = new Headers({ "Cache-Control": "no-store" });
          for (const value of clearAuthCookies()) headers.append("Set-Cookie", value);
          return Response.json({ ok: true }, { headers });
        }
      },
    },
  },
});
