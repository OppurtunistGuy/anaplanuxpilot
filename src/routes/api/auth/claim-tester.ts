import { createFileRoute } from "@tanstack/react-router";
import { claimInitialTester, rejectCrossOrigin } from "@/lib/auth-server";

export const Route = createFileRoute("/api/auth/claim-tester")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rejected = rejectCrossOrigin(request);
        if (rejected) return rejected;
        try {
          return await claimInitialTester(request);
        } catch {
          return Response.json({ error: "Tester access could not be set up." }, { status: 503 });
        }
      },
    },
  },
});
