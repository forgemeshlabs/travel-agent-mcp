const DEFAULT_BASE_URL = "https://travel.forgemesh.io";

export function buildExternalBookingLink(params: Record<string, string | undefined>, baseUrl = DEFAULT_BASE_URL): string {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}
