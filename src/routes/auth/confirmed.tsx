import { createFileRoute } from "@tanstack/react-router";
import { AuthConfirmed } from "@/lib/auth-client";

export const Route = createFileRoute("/auth/confirmed")({ component: AuthConfirmed });
