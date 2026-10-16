export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Anaplan UX Copilot. Not affiliated with Anaplan, Inc.</p>
        <p>AI-powered prototype generation</p>
      </div>
    </footer>
  );
}
