"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ChartFrameProps {
  height: number;
  className?: string;
  children: React.ReactNode;
}

/** Recharts needs a non-zero container before first paint. */
export function ChartFrame({ height, className, children }: ChartFrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      ref={ref}
      className={cn("w-full", className)}
      style={{ height, minHeight: height }}
    >
      {ready ? children : null}
    </div>
  );
}

/** @deprecated Use ChartFrame */
export const ChartContainer = ChartFrame;
