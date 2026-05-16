export class FetchError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "FetchError";
  }
}

export async function jsonFetcher<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      let message = `Fout ${res.status}`;
      try {
        const body = await res.json();
        if (body && typeof body.error === "string") message = body.error;
      } catch {
        /* ignore */
      }
      throw new FetchError(message, res.status);
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof FetchError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new FetchError("Verzoek duurde te lang (timeout)");
    }
    throw new FetchError("Geen verbinding met de server");
  } finally {
    clearTimeout(timeout);
  }
}
