"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function TabsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-8 text-center">
      <h2 className="text-lg font-semibold text-foreground">Er ging iets mis</h2>
      <p className="mt-2 text-sm text-surface-muted">{error.message}</p>
      <Button type="button" onClick={reset} className="mt-4">
        Opnieuw proberen
      </Button>
    </div>
  );
}
