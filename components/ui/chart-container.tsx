"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ChartContainerProps {
  children: React.ReactNode;
  className?: string;
  height?: number;
}

/** Wacht tot de container gemeten is — voorkomt Recharts width/height -1. */
export function ChartContainer({
  children,
  className,
  height = 180,
}: ChartContainerProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={cn("w-full min-w-0", className)}
      style={{ height, minHeight: height }}
    >
      {ready ? children : null}
    </div>
  );
}
