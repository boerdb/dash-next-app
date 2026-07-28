"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function DataError({
  message = "Gegevens konden niet worden geladen.",
  onRetry,
}: DataErrorProps) {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-6 text-center">
      <p className="text-sm text-rose-700 dark:text-rose-200">{message}</p>
      {onRetry && (
        <Button type="button" onClick={onRetry} className="mt-3">
          <RefreshCw className="h-4 w-4" />
          Opnieuw proberen
        </Button>
      )}
    </div>
  );
}
