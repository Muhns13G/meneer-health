/** Server-only callers supply their own key; never follow settings redirects. */
export function publicAuthSettingsRequestOptions(apiKey: string): RequestInit {
  return {
    headers: { apikey: apiKey },
    cache: "no-store",
    // workerd does not implement redirect:"error". The caller rejects every non-2xx response.
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  };
}
