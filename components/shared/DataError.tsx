"use client";

import { RefreshCw } from "lucide-react";

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
      <p className="text-sm text-rose-200">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Opnieuw proberen
        </button>
      )}
    </div>
  );
}
