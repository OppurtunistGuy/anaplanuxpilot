import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "@/lib/auth-server";

export const Route = createFileRoute("/api/auth/session")({
  server: { handlers: { GET: async ({ request }) => getSession(request) } },
});
