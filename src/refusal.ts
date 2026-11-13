export type BackendResult = { status: number; ok: boolean; text: string; json: unknown } | null;

/**
 * Turns a non-success backend reply into an honest tool error. Returns null when the caller should keep going:
 * null result (network failure or timeout), 2xx, or 402 (payment challenge; this MCP never pays).
 * Nothing is ever charged here because this server does not sign payments.
 */
export function backendRefusal(result: BackendResult, endpoint: string) {
  if (!result || result.ok || result.status === 402) return null;
  const body = result.json && typeof result.json === "object" && !Array.isArray(result.json) ? (result.json as Record<string, unknown>) : {};
  const payload = {
    ok: false,
    backend: "travel-agent-server",
    endpoint,
    http_status: result.status,
    charged: typeof body.charged === "boolean" ? body.charged : false,
    error: body.error ?? body.reason ?? `HTTP ${result.status}`,
    ...(body.message !== undefined ? { message: body.message } : {}),
    ...(body.details !== undefined ? { details: body.details } : {}),
    ...(Object.keys(body).length === 0 ? { body: result.text.slice(0, 300) } : {}),
  };
  return { content: [{ type: "text" as const, text: JSON.stringify(payload) }], isError: true };
}
