import test from 'node:test';
import assert from 'node:assert/strict';
import { requestMedicalRoutingOperationsReadiness } from '../services/openrouterEvidence.js';

test('requires the canonical OpenRouter endpoint', async () => {
  const original = { base: process.env.OPENROUTER_BASE_URL, key: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL };
  process.env.OPENROUTER_BASE_URL = 'https://example.test/api/v1'; process.env.OPENROUTER_API_KEY = 'unit-key'; process.env.OPENROUTER_MODEL = 'unit-model';
  await assert.rejects(() => requestMedicalRoutingOperationsReadiness('de-identified workflow'), /canonical OpenRouter endpoint/);
  process.env.OPENROUTER_BASE_URL = original.base; process.env.OPENROUTER_API_KEY = original.key; process.env.OPENROUTER_MODEL = original.model;
});

test('returns substantive provider evidence', async () => {
  const original = { base: process.env.OPENROUTER_BASE_URL, key: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL };
  process.env.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'; process.env.OPENROUTER_API_KEY = 'unit-key'; process.env.OPENROUTER_MODEL = 'unit-model';
  const evidence = await requestMedicalRoutingOperationsReadiness('de-identified workflow', async () => ({ ok: true, json: async () => ({ id: 'generation-unit', model: 'unit-model', choices: [{ message: { content: '{"controls":["retain source records","authorize dispatch changes","require licensed human review"]}' } }] }) }));
  assert.equal(evidence.providerReceipt.requestId, 'generation-unit'); assert.ok(evidence.result.length > 40);
  process.env.OPENROUTER_BASE_URL = original.base; process.env.OPENROUTER_API_KEY = original.key; process.env.OPENROUTER_MODEL = original.model;
});
