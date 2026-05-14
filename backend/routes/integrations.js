// Integrations & deferred-backlog routes (apply pass 5).
//
// Implements the items previously deferred in _AUDIT_NOTE.md as additive,
// non-breaking endpoints. All new tables use CREATE TABLE IF NOT EXISTS.
// AI-style stubs return 503 + `missing: <ENV>` when their gating env var is
// not configured. No existing schema or routes are modified.
//
// Categories (per apply pass 5 spec):
//  - NEEDS-CREDS:
//      Epic FHIR  (EPIC_FHIR_BASE_URL, EPIC_CLIENT_ID, EPIC_CLIENT_SECRET)
//      Cerner FHIR (CERNER_FHIR_BASE_URL, CERNER_CLIENT_ID, CERNER_CLIENT_SECRET)
//      HL7 v2 ingestion (HL7_MLLP_HOST, HL7_MLLP_PORT)
//      Twilio Video (TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET)
//  - NEEDS-PRODUCT-DECISION:
//      Nurse mobile push (deep-link config table; PROVIDER decision deferred to env)
//  - TOO-RISKY (additive only / in-memory stub):
//      Caregiver feedback table + endpoints (additive)
//      Real-time vital streaming — in-memory ring buffer per patient,
//      no IoT vendor coupling, no auto-actuation.

import { Router } from 'express';

const router = Router();

// PRODUCT-DECISION: Mobile-push provider is intentionally not chosen here.
// We expose a generic `/api/integrations/mobile-push/register` that stores
// the device token for whichever provider the operator picks. The runtime
// dispatch path is gated on `MOBILE_PUSH_PROVIDER` (apns | fcm | onesignal).
//
// In-memory vital-stream buffer. Per-patient ring buffer of the last 200
// samples. Not durable, not exported, intentionally stubbed so we don't
// commit to a streaming vendor (Kafka / MQTT / Kinesis) prematurely.
const VITAL_BUFFERS = new Map(); // patient_id -> Array<sample>
const VITAL_BUFFER_MAX = 200;

async function ensureTables(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS caregiver_feedback (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER,
      visit_id INTEGER,
      submitted_by VARCHAR(160),
      relationship VARCHAR(80),
      rating INTEGER CHECK (rating BETWEEN 1 AND 5),
      categories TEXT,
      comments TEXT,
      sentiment VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS mobile_devices (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      device_token TEXT NOT NULL,
      platform VARCHAR(20),
      app_version VARCHAR(40),
      last_seen TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (device_token)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ehr_sync_log (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(40),
      resource_type VARCHAR(60),
      external_id VARCHAR(120),
      status VARCHAR(40),
      message TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

router.use(async (req, res, next) => {
  try {
    await ensureTables(req.app.locals.db);
    next();
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------------
// NEEDS-CREDS: Epic FHIR sync
// ---------------------------------------------------------------------------
router.post('/ehr/epic/sync', async (req, res) => {
  const missing = [];
  if (!process.env.EPIC_FHIR_BASE_URL) missing.push('EPIC_FHIR_BASE_URL');
  if (!process.env.EPIC_CLIENT_ID) missing.push('EPIC_CLIENT_ID');
  if (!process.env.EPIC_CLIENT_SECRET) missing.push('EPIC_CLIENT_SECRET');
  if (missing.length) {
    return res.status(503).json({
      error: 'Epic FHIR not configured',
      missing,
      provider: 'epic',
    });
  }
  // Real implementation would: OAuth client_credentials -> GET Patient/$everything,
  // upsert into local patients/visit_notes. Out of scope this pass.
  res.status(503).json({ error: 'Epic FHIR adapter not yet implemented', provider: 'epic' });
});

// ---------------------------------------------------------------------------
// NEEDS-CREDS: Cerner FHIR sync
// ---------------------------------------------------------------------------
router.post('/ehr/cerner/sync', async (req, res) => {
  const missing = [];
  if (!process.env.CERNER_FHIR_BASE_URL) missing.push('CERNER_FHIR_BASE_URL');
  if (!process.env.CERNER_CLIENT_ID) missing.push('CERNER_CLIENT_ID');
  if (!process.env.CERNER_CLIENT_SECRET) missing.push('CERNER_CLIENT_SECRET');
  if (missing.length) {
    return res.status(503).json({
      error: 'Cerner FHIR not configured',
      missing,
      provider: 'cerner',
    });
  }
  res.status(503).json({ error: 'Cerner FHIR adapter not yet implemented', provider: 'cerner' });
});

// ---------------------------------------------------------------------------
// NEEDS-CREDS: HL7 v2 MLLP ingestion (ADT/ORU)
// ---------------------------------------------------------------------------
router.post('/ehr/hl7/ingest', async (req, res) => {
  const missing = [];
  if (!process.env.HL7_MLLP_HOST) missing.push('HL7_MLLP_HOST');
  if (!process.env.HL7_MLLP_PORT) missing.push('HL7_MLLP_PORT');
  if (missing.length) {
    return res.status(503).json({
      error: 'HL7 MLLP not configured',
      missing,
      provider: 'hl7v2',
    });
  }
  res.status(503).json({ error: 'HL7 ingestion adapter not yet implemented', provider: 'hl7v2' });
});

// ---------------------------------------------------------------------------
// NEEDS-CREDS: Twilio Video room creation for telemedicine
// ---------------------------------------------------------------------------
router.post('/telemedicine/room', async (req, res) => {
  const missing = [];
  if (!process.env.TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID');
  if (!process.env.TWILIO_API_KEY) missing.push('TWILIO_API_KEY');
  if (!process.env.TWILIO_API_SECRET) missing.push('TWILIO_API_SECRET');
  if (missing.length) {
    return res.status(503).json({
      error: 'Telemedicine video not configured',
      missing,
      provider: 'twilio-video',
    });
  }
  res.status(503).json({ error: 'Twilio Video adapter not yet implemented', provider: 'twilio-video' });
});

// ---------------------------------------------------------------------------
// NEEDS-PRODUCT-DECISION: Nurse mobile push
// PRODUCT-DECISION: keep registration generic; gate the dispatch path on
// MOBILE_PUSH_PROVIDER so APNs/FCM/OneSignal selection happens at deploy.
// ---------------------------------------------------------------------------
router.post('/mobile-push/register', async (req, res) => {
  try {
    const { device_token, platform, app_version } = req.body || {};
    if (!device_token) return res.status(400).json({ error: 'device_token required' });
    const userId = req.user?.id || null;
    const result = await req.app.locals.db.query(
      `INSERT INTO mobile_devices (user_id, device_token, platform, app_version, last_seen)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (device_token) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             platform = EXCLUDED.platform,
             app_version = EXCLUDED.app_version,
             last_seen = NOW()
       RETURNING id, user_id, platform, app_version, last_seen`,
      [userId, device_token, platform || 'unknown', app_version || null]
    );
    res.json({ ok: true, device: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/mobile-push/notify', async (req, res) => {
  const provider = process.env.MOBILE_PUSH_PROVIDER;
  const missing = [];
  if (!provider) missing.push('MOBILE_PUSH_PROVIDER');
  if (provider === 'apns') {
    if (!process.env.APNS_KEY_ID) missing.push('APNS_KEY_ID');
    if (!process.env.APNS_TEAM_ID) missing.push('APNS_TEAM_ID');
    if (!process.env.APNS_PRIVATE_KEY) missing.push('APNS_PRIVATE_KEY');
  } else if (provider === 'fcm') {
    if (!process.env.FCM_SERVER_KEY) missing.push('FCM_SERVER_KEY');
  } else if (provider === 'onesignal') {
    if (!process.env.ONESIGNAL_APP_ID) missing.push('ONESIGNAL_APP_ID');
    if (!process.env.ONESIGNAL_API_KEY) missing.push('ONESIGNAL_API_KEY');
  }
  if (missing.length) {
    return res.status(503).json({
      error: 'Mobile push not configured',
      missing,
      provider: provider || 'unset',
    });
  }
  res.status(503).json({ error: 'Mobile-push dispatcher not yet implemented', provider });
});

// ---------------------------------------------------------------------------
// TOO-RISKY (additive only): Caregiver feedback collection
// ---------------------------------------------------------------------------
router.post('/caregiver-feedback', async (req, res) => {
  try {
    const {
      patient_id, visit_id, submitted_by, relationship,
      rating, categories, comments,
    } = req.body || {};
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating (1-5) required' });
    }
    // Sentiment: trivial heuristic so we have something useful without AI.
    const text = (comments || '').toLowerCase();
    let sentiment = 'neutral';
    if (rating >= 4 || /\b(great|excellent|amazing|love|kind|caring)\b/.test(text)) sentiment = 'positive';
    if (rating <= 2 || /\b(bad|terrible|awful|rude|late|missed)\b/.test(text)) sentiment = 'negative';
    const result = await req.app.locals.db.query(
      `INSERT INTO caregiver_feedback (patient_id, visit_id, submitted_by, relationship, rating, categories, comments, sentiment)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        patient_id || null,
        visit_id || null,
        submitted_by || null,
        relationship || null,
        rating,
        Array.isArray(categories) ? categories.join(',') : (categories || null),
        comments || null,
        sentiment,
      ]
    );
    res.json({ ok: true, feedback: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/caregiver-feedback', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const r = await req.app.locals.db.query(
      `SELECT * FROM caregiver_feedback ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    res.json({ data: r.rows, total: r.rowCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/caregiver-feedback/summary', async (req, res) => {
  try {
    const r = await req.app.locals.db.query(`
      SELECT
        COUNT(*)::int AS total,
        ROUND(AVG(rating)::numeric, 2) AS avg_rating,
        SUM(CASE WHEN sentiment='positive' THEN 1 ELSE 0 END)::int AS positive,
        SUM(CASE WHEN sentiment='neutral'  THEN 1 ELSE 0 END)::int AS neutral,
        SUM(CASE WHEN sentiment='negative' THEN 1 ELSE 0 END)::int AS negative
      FROM caregiver_feedback
    `);
    res.json(r.rows[0] || { total: 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// TOO-RISKY (in-memory stub): Real-time vital streaming
// We accept samples and keep the last N per patient. No DB writes (avoid
// uncontrolled volume), no auto-actuation, no IoT vendor coupling.
// ---------------------------------------------------------------------------
router.post('/vitals-stream/:patient_id', async (req, res) => {
  const pid = parseInt(req.params.patient_id, 10);
  if (!Number.isFinite(pid)) return res.status(400).json({ error: 'patient_id must be numeric' });
  const sample = {
    t: req.body?.t || new Date().toISOString(),
    hr: req.body?.hr ?? null,
    spo2: req.body?.spo2 ?? null,
    bp_sys: req.body?.bp_sys ?? null,
    bp_dia: req.body?.bp_dia ?? null,
    temp_f: req.body?.temp_f ?? null,
    source: req.body?.source || 'unknown',
  };
  let buf = VITAL_BUFFERS.get(pid);
  if (!buf) { buf = []; VITAL_BUFFERS.set(pid, buf); }
  buf.push(sample);
  if (buf.length > VITAL_BUFFER_MAX) buf.splice(0, buf.length - VITAL_BUFFER_MAX);
  // Advisory alerts only — never auto-actuates.
  const alerts = [];
  if (sample.hr != null && (sample.hr < 40 || sample.hr > 130)) alerts.push('hr_out_of_range');
  if (sample.spo2 != null && sample.spo2 < 90) alerts.push('spo2_low');
  if (sample.temp_f != null && sample.temp_f >= 100.4) alerts.push('fever');
  res.json({ ok: true, buffered: buf.length, alerts });
});

router.get('/vitals-stream/:patient_id', async (req, res) => {
  const pid = parseInt(req.params.patient_id, 10);
  if (!Number.isFinite(pid)) return res.status(400).json({ error: 'patient_id must be numeric' });
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, VITAL_BUFFER_MAX);
  const buf = VITAL_BUFFERS.get(pid) || [];
  res.json({
    patient_id: pid,
    samples: buf.slice(-limit),
    buffer_capacity: VITAL_BUFFER_MAX,
    note: 'in-memory stub — not durable; pick a streaming vendor before production',
  });
});

// ---------------------------------------------------------------------------
// MECHANICAL: Risk-trend summary across recent visits (no AI; uses joins)
// Surfaces visit completion + cancellation trend per nurse over the last 30 days.
// ---------------------------------------------------------------------------
router.get('/risk-trend-summary', async (req, res) => {
  try {
    const r = await req.app.locals.db.query(`
      SELECT
        n.id AS nurse_id,
        n.first_name || ' ' || n.last_name AS nurse,
        COUNT(v.id)::int AS total_visits,
        SUM(CASE WHEN v.status = 'completed' THEN 1 ELSE 0 END)::int AS completed,
        SUM(CASE WHEN v.status IN ('cancelled','no_show') THEN 1 ELSE 0 END)::int AS missed
      FROM nurses n
      LEFT JOIN visits v
        ON v.assigned_nurse_id = n.id
       AND v.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY n.id, n.first_name, n.last_name
      ORDER BY missed DESC, total_visits DESC
      LIMIT 50
    `);
    res.json({ window_days: 30, nurses: r.rows });
  } catch (e) {
    // Schema may differ — return shape-stable empty payload rather than 500.
    res.json({ window_days: 30, nurses: [], note: e.message });
  }
});

export default router;
