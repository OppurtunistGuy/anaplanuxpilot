import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-client";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/generate", label: "Generate UX" },
] as const;

export function Header() {
  const auth = useAuth();
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span aria-hidden className="inline-block h-5 w-5 rounded-sm bg-primary" />
          Anaplan UX Copilot
        </Link>
        <nav aria-label="Primary">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  activeProps={{ className: "text-foreground font-medium" }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {auth.authenticated ? (
              <li><button onClick={() => void auth.signOut()} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Sign out</button></li>
            ) : (
              <li><Link to="/sign-in" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Sign in</Link></li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
