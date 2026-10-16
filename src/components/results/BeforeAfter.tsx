import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function BeforeAfter({
  beforeSrc,
  afterSrc,
  beforeLabel = "Current dashboard",
  afterLabel = "Improved Anaplan UX concept",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50); // 0-100
  const draggingRef = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, x)));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      setFromClientX(e.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setFromClientX]);

  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-card">
      <figcaption className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
        <span>{beforeLabel}</span>
        <span aria-hidden>↓</span>
        <span className="text-foreground">{afterLabel}</span>
      </figcaption>
      <div
        ref={containerRef}
        className="relative w-full select-none"
        onPointerDown={(e) => {
          draggingRef.current = true;
          setFromClientX(e.clientX);
        }}
      >
        {/* After (base) */}
        <img
          src={afterSrc}
          alt={afterLabel}
          className="block h-auto w-full"
          draggable={false}
        />
        {/* Before (clipped overlay) */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ width: `${pos}%` }}
        >
          <img
            src={beforeSrc}
            alt={beforeLabel}
            className="block h-full w-auto max-w-none object-cover"
            style={{ width: `${(100 / pos) * 100}%` }}
            draggable={false}
          />
        </div>
        {/* Divider */}
        <div
          role="slider"
          aria-label="Before / after comparison position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 2));
            if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 2));
          }}
          className="absolute top-0 bottom-0 z-10 -ml-px w-0.5 cursor-ew-resize bg-primary"
          style={{ left: `${pos}%` }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground shadow-sm">
            ‹ ›
          </span>
        </div>
        {/* Corner labels */}
        <span className="pointer-events-none absolute left-2 top-2 rounded-sm border border-border bg-background/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Before
        </span>
        <span className="pointer-events-none absolute right-2 top-2 rounded-sm border border-border bg-background/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
          After
        </span>
      </div>
    </figure>
  );
}
