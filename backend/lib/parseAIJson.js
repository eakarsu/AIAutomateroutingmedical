/**
 * Robust JSON extractor for AI responses that may be wrapped in markdown code fences.
 */
export function parseAIJson(text) {
  if (!text) return null;
  // Direct parse
  try { return JSON.parse(text); } catch {}
  // Strip markdown code fences
  const stripped = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch {}
  // Extract first {...} block
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  }
  return null;
}
