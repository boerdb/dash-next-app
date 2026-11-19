"use client";

/** Leest het vlag-cookie `dash_ingelogd` (geen geheim; de echte sessie is httpOnly). */
export function isLoggedInClient(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === "dash_ingelogd=1");
}

const listeners = new Set<() => void>();

export function subscribeLogin(onChange: () => void): () => void {
  listeners.add(onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    listeners.delete(onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

export function notifyLoginChange(): void {
  listeners.forEach((l) => l());
}
