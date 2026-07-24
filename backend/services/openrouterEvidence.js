const CANONICAL_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export async function requestMedicalRoutingOperationsReadiness(workflowSummary, fetchImpl = fetch) {
  const baseUrl = String(process.env.OPENROUTER_BASE_URL || '').replace(/\/$/, '');
  const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim();
  const model = String(process.env.OPENROUTER_MODEL || '').trim();
  if (baseUrl !== CANONICAL_OPENROUTER_BASE_URL) throw new Error('OPENROUTER_BASE_URL must use the canonical OpenRouter endpoint');
  if (!apiKey || !model) throw new Error('OpenRouter key and model must be configured');
  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.CLIENT_URL || 'http://127.0.0.1:30057',
      'X-Title': 'Medical Routing Operations Readiness',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Review de-identified administrative routing operations only. Never triage patients, diagnose, recommend care, set urgency, or choose a clinician. Return JSON with exactly three concise controls for source provenance, dispatcher authorization, and licensed human review.' },
        { role: 'user', content: `Review this de-identified administrative workflow: ${workflowSummary}` },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`OpenRouter request failed with status ${response.status}`);
  const requestId = typeof payload?.id === 'string' ? payload.id.trim() : '';
  const providerModel = typeof payload?.model === 'string' ? payload.model.trim() : '';
  const result = typeof payload?.choices?.[0]?.message?.content === 'string' ? payload.choices[0].message.content.trim() : '';
  if (!requestId || !providerModel || result.length < 40) throw new Error('OpenRouter response did not include substantive provider evidence');
  return { result, providerReceipt: { provider: 'openrouter', requestId, model: providerModel, completedAt: new Date().toISOString() } };
}
