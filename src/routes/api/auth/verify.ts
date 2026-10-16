import { createFileRoute } from "@tanstack/react-router";
import { verifyEmailLink } from "@/lib/auth-server";

export const Route = createFileRoute("/api/auth/verify")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await verifyEmailLink(request);
        } catch {
          return Response.redirect(
            `${process.env.APP_BASE_URL ?? new URL(request.url).origin}/sign-in?verified=0`,
            303,
          );
        }
      },
    },
  },
});
