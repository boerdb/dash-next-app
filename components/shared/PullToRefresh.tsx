"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const startY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchEnd = useCallback(
    async (e: React.TouchEvent) => {
      const diff = e.changedTouches[0].clientY - startY.current;
      if (diff > 80 && window.scrollY === 0 && !pulling) {
        setPulling(true);
        try {
          await onRefresh();
        } finally {
          setPulling(false);
        }
      }
    },
    [onRefresh, pulling]
  );

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {pulling && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
        </div>
      )}
      {children}
    </div>
  );
}
