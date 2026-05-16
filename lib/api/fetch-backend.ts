import { env } from "@/lib/env.server";

export async function fetchBackend(
  path: string,
  revalidate = 0
): Promise<Response> {
  const url = `${env.WEER_API_BASE.replace(/\/$/, "")}/${path.replace(/^\//, "")}?t=${Date.now()}`;
  return fetch(url, {
    next: revalidate > 0 ? { revalidate } : undefined,
    signal: AbortSignal.timeout(10_000),
  });
}
