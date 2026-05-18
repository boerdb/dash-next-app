"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const THRESHOLD_PX = 72;

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDist, setPullDist] = useState(0);
  const startY = useRef(0);
  const pullDistRef = useRef(0);
  const canPull = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (typeof window === "undefined") return;
    if (window.scrollY > 2) {
      canPull.current = false;
      return;
    }
    canPull.current = true;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!canPull.current || refreshing) return;
      if (typeof window === "undefined") return;
      if (window.scrollY > 2) {
        pullDistRef.current = 0;
        setPullDist(0);
        return;
      }
      const y = e.touches[0].clientY;
      const d = Math.max(0, y - startY.current);
      const capped = Math.min(d, THRESHOLD_PX + 56);
      pullDistRef.current = capped;
      setPullDist(capped);
    },
    [refreshing]
  );

  const resetPull = useCallback(() => {
    pullDistRef.current = 0;
    setPullDist(0);
    canPull.current = false;
  }, []);

  const handleTouchCancel = useCallback(() => {
    resetPull();
  }, [resetPull]);

  const handleTouchEnd = useCallback(async () => {
    const dist = pullDistRef.current;
    resetPull();

    if (dist < THRESHOLD_PX || refreshing) return;
    if (typeof window !== "undefined" && window.scrollY > 2) return;

    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, refreshing, resetPull]);

  const showSpinner = pullDist > 8 || refreshing;
  const spinActive = refreshing || pullDist >= THRESHOLD_PX - 8;

  return (
    <div
      className="relative touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <div
        className={cn(
          "pointer-events-none sticky top-0 z-30 flex justify-center overflow-hidden transition-[height,opacity] duration-150",
          showSpinner ? "min-h-11 opacity-100" : "h-0 min-h-0 opacity-0"
        )}
        aria-live="polite"
      >
        {showSpinner && (
          <div className="flex items-center justify-center pt-2">
            <Loader2
              className={cn(
                "h-7 w-7 text-sky-400 drop-shadow-md",
                spinActive ? "animate-spin" : "opacity-60"
              )}
            />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
