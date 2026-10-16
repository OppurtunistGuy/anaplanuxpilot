import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/lib/auth-client";

export const Route = createFileRoute("/sign-in")({ component: () => <AuthForm mode="signin" /> });
