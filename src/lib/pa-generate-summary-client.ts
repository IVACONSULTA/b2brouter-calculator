/**
 * Browser-side POST to `src/pages/api/pa/scenarios/[id]/generate-summary.ts`, which
 * runs `paFetchJson('/scenarios/:id/generate-summary', …)` on the server.
 * Do not use `paFetchJson` in the client — it targets Plan Advisor with secrets.
 */
export async function paFetchJsonGenerateSummaryPost(summaryEndpointUrl: string): Promise<Response> {
  const url = summaryEndpointUrl.trim();
  if (!url) {
    return Promise.reject(new Error('Missing summary endpoint URL.'));
  }
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: '{}',
    credentials: 'same-origin',
  });
}
