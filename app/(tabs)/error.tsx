"use client";

import { useEffect } from "react";

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
      <h2 className="text-lg font-semibold text-white">Er ging iets mis</h2>
      <p className="mt-2 text-sm text-zinc-400">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-[0_0_16px_-4px_rgba(56,189,248,0.5)]"
      >
        Opnieuw proberen
      </button>
    </div>
  );
}
