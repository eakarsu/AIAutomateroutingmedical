import express from 'express';
import { runAiFeature } from '../lib/featurePack26c.js';
const LABELS = {"total": "Dispatch cases", "byStatus": "Cases by status", "flagged": "Cases flagged for manual review", "emptyNote": "No dispatch cases supplied. Operational routing only \u2014 no diagnosis or clinical claims."};
const FEATURES = [["dispatch-readiness", "Dispatch readiness (operational)"], ["stale-input-risk", "Stale-input risk"], ["capacity-match", "Capacity & capability match"]];
function createFeatureAiRouter({ authenticate, loadRecords } = {}) {
  const router = express.Router(); if (authenticate) router.use(authenticate);
  for (const [slug] of FEATURES) router.post('/' + slug, async (req, res) => { let records = Array.isArray(req.body?.records) ? req.body.records : null; if (!records && loadRecords) { try { records = await loadRecords(req); } catch { records = []; } } const out = await runAiFeature(slug, records || [], LABELS); return res.json({ feature: slug, ...out }); });
  router.get('/features', (req, res) => res.json({ features: FEATURES.map(([id, title]) => ({ id, title })) }));
  return router;
}
export { createFeatureAiRouter, FEATURES, LABELS };
