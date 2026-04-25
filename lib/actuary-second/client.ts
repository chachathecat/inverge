export async function postActuarySecond<TResponse>(path: string, body: unknown): Promise<TResponse | null> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { ok: boolean; data?: TResponse };
    return payload.ok ? (payload.data ?? null) : null;
  } catch {
    return null;
  }
}
