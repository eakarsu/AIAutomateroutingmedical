import { Router } from 'express';
import { z } from 'zod';
import { parseAIJson } from '../lib/parseAIJson.js';

const router = Router();

const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

// Helper: call OpenRouter
async function callAI(prompt, db, feature = 'feature', systemPrompt = null) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const referer = process.env.CLIENT_URL || 'http://localhost:5173';

  if (!apiKey) {
    return { content: 'AI disabled (no API key)', model: MODEL, tokens: 0 };
  }

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': referer,
    },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: 2500 }),
  });
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || 'No response from AI';
  const tokens = data.usage?.total_tokens || 0;
  if (db) {
    try {
      await db.query(
        'INSERT INTO ai_logs (feature, prompt, response, model, tokens_used) VALUES ($1, $2, $3, $4, $5)',
        [feature, prompt.substring(0, 500), content.substring(0, 2000), MODEL, tokens]
      );
    } catch {}
  }
  return { content, model: MODEL, tokens };
}

// Ensure tables exist for new features
async function initTables(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS shift_swap_requests (
      id SERIAL PRIMARY KEY,
      requester_nurse_id INTEGER REFERENCES nurses(id),
      target_nurse_id INTEGER REFERENCES nurses(id),
      shift_date DATE NOT NULL,
      reason TEXT,
      status VARCHAR(40) DEFAULT 'pending',
      ai_recommendation TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS preauth_requests (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES patients(id),
      order_id INTEGER REFERENCES medical_orders(id),
      service_description TEXT,
      insurance_provider VARCHAR(120),
      auth_number VARCHAR(80),
      status VARCHAR(40) DEFAULT 'pending',
      submitted_at TIMESTAMP DEFAULT NOW(),
      decision_at TIMESTAMP,
      ai_summary TEXT,
      notes TEXT
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS family_messages (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES patients(id),
      visit_id INTEGER REFERENCES visits(id),
      summary TEXT,
      sent_to VARCHAR(120),
      sent_at TIMESTAMP DEFAULT NOW(),
      created_by VARCHAR(120)
    )
  `);
}

router.use(async (req, res, next) => {
  try { await initTables(req.app.locals.db); } catch {}
  next();
});

// ========================================
// 1. Route Traffic Integration
// POST /api/ai-features/traffic-adjust { route_id }
// ========================================
const trafficAdjustSchema = z.object({
  route_id: z.coerce.number().int().positive('route_id must be a positive integer'),
});

router.post('/traffic-adjust', async (req, res) => {
  try {
    const parsed = trafficAdjustSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'route_id required', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { route_id } = parsed.data;

    const stops = await db.query(
      `SELECT rs.*, p.first_name, p.last_name, p.address, p.lat, p.lng,
              v.start_time, v.end_time
       FROM route_stops rs
       LEFT JOIN visits v ON rs.visit_id = v.id
       LEFT JOIN patients p ON v.patient_id = p.id
       WHERE rs.route_id = $1 ORDER BY rs.stop_order`,
      [route_id]
    );

    const now = new Date();
    const adjusted = stops.rows.map((s) => {
      const baseDriveMin = s.duration_from_prev || 15;
      const hour = now.getHours();
      const trafficFactor = hour >= 7 && hour <= 9 ? 1.3 : hour >= 16 && hour <= 18 ? 1.4 : 1.0;
      const adjustedDrive = Math.round(baseDriveMin * trafficFactor);
      return {
        stop_order: s.stop_order,
        patient: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
        address: s.address,
        scheduled_time: s.start_time,
        base_drive_minutes: baseDriveMin,
        traffic_factor: trafficFactor,
        adjusted_drive_minutes: adjustedDrive,
        delay_minutes: adjustedDrive - baseDriveMin,
      };
    });
    const totalDelay = adjusted.reduce((a, s) => a + s.delay_minutes, 0);

    let aiAdvice = '';
    let aiModel = MODEL;
    let aiTokens = 0;
    if (totalDelay > 30) {
      const r = await callAI(
        `Route has ${totalDelay} minutes of traffic delays across ${adjusted.length} stops. Suggest reordering or rescheduling actions.

Respond ONLY in JSON:
{"recommendation": "...", "reorder_suggestion": ["..."], "schedule_adjustments": ["..."], "rationale": "..."}`,
        db,
        'traffic_adjust',
        'You are a home health route traffic specialist. Always respond with valid JSON.'
      );
      aiAdvice = parseAIJson(r.content) || { recommendation: r.content };
      aiModel = r.model;
      aiTokens = r.tokens;
    }

    res.json({
      route_id,
      stops: adjusted,
      total_delay_minutes: totalDelay,
      reorder_recommended: totalDelay > 30,
      ai_recommendation: aiAdvice,
      model: aiModel,
      tokens: aiTokens,
      generated_at: now.toISOString(),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 2. Patient Acuity Alerting
// POST /api/ai-features/acuity-check { visit_id | patient_id }
// ========================================
const acuityCheckSchema = z.object({
  visit_id: z.coerce.number().int().positive().optional(),
  patient_id: z.coerce.number().int().positive().optional(),
}).refine(d => d.visit_id || d.patient_id, { message: 'visit_id or patient_id required' });

router.post('/acuity-check', async (req, res) => {
  try {
    const parsed = acuityCheckSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message, details: parsed.error.issues });

    const db = req.app.locals.db;
    const { visit_id, patient_id } = parsed.data;
    let visits;
    if (visit_id) {
      visits = await db.query(
        `SELECT v.*, p.first_name, p.last_name, p.primary_diagnosis
         FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.id = $1`,
        [visit_id]
      );
    } else {
      visits = await db.query(
        `SELECT v.*, p.first_name, p.last_name, p.primary_diagnosis
         FROM visits v JOIN patients p ON v.patient_id = p.id
         WHERE v.patient_id = $1 ORDER BY v.visit_date DESC LIMIT 5`,
        [patient_id]
      );
    }

    if (visits.rows.length === 0) return res.status(404).json({ error: 'No visits found' });

    const v = visits.rows[0];
    const notes = visits.rows.map((x) => `${x.visit_date}: ${x.notes || x.ai_notes || '(no notes)'}`).join('\n\n');

    const result = await callAI(
      `Patient: ${v.first_name} ${v.last_name}, Dx: ${v.primary_diagnosis}.

Recent visit notes:
${notes}

Respond ONLY in JSON:
{"acuity_change": "stable|deteriorating|improving", "alert_level": "none|info|warning|urgent", "deterioration_signals": ["..."], "recommended_action": "...", "escalate_to_rn": true, "rationale": "..."}`,
      db,
      'acuity_check',
      'You are an acuity alerting AI for home health. Always respond with valid JSON.'
    );

    const parsed2 = parseAIJson(result.content) || { acuity_change: 'unknown', rationale: result.content };

    res.json({ patient_id: v.patient_id, patient_name: `${v.first_name} ${v.last_name}`, visit_count: visits.rows.length, ...parsed2, model: result.model, tokens: result.tokens });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 3. Medication Interaction Checker
// POST /api/ai-features/medication-check { patient_id, additional_meds? }
// ========================================
const medicationCheckSchema = z.object({
  patient_id: z.coerce.number().int().positive('patient_id required'),
  additional_meds: z.array(z.string()).optional().default([]),
});

router.post('/medication-check', async (req, res) => {
  try {
    const parsed = medicationCheckSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'patient_id required', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { patient_id, additional_meds } = parsed.data;

    const patient = await db.query('SELECT * FROM patients WHERE id = $1', [patient_id]);
    if (patient.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });

    const orders = await db.query(
      `SELECT order_type, description, frequency, instructions FROM medical_orders WHERE patient_id = $1`,
      [patient_id]
    );

    const allMeds = [
      ...orders.rows.map((o) => `${o.order_type}: ${o.description} (${o.frequency || 'PRN'})`),
      ...additional_meds,
    ];

    const result = await callAI(
      `Patient diagnosis: ${patient.rows[0].primary_diagnosis}

Active medications:
${allMeds.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Respond ONLY in JSON:
{"interactions": [{"drugs": ["A","B"], "severity": "minor|moderate|severe", "description": "..."}], "duplications": [{"drugs": ["..."], "note": "..."}], "contraindications": [{"drug": "...", "with_diagnosis": "...", "note": "..."}], "summary": "...", "overall_safety_rating": "safe|caution|high-risk"}`,
      db,
      'medication_check',
      'You are a clinical pharmacist AI. Always respond with valid JSON.'
    );

    const parsed2 = parseAIJson(result.content) || { summary: result.content, interactions: [], duplications: [], contraindications: [] };

    res.json({ patient_id, total_meds_checked: allMeds.length, ...parsed2, model: result.model, tokens: result.tokens });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 4. Nurse Skill Matching
// POST /api/ai-features/skill-match { visit_id }
// ========================================
const skillMatchSchema = z.object({
  visit_id: z.coerce.number().int().positive('visit_id required'),
});

router.post('/skill-match', async (req, res) => {
  try {
    const parsed = skillMatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'visit_id required', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { visit_id } = parsed.data;

    const visit = await db.query(
      `SELECT v.*, p.first_name, p.last_name, p.primary_diagnosis FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.id = $1`,
      [visit_id]
    );
    if (visit.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    const v = visit.rows[0];

    const nurses = await db.query("SELECT * FROM nurses WHERE status = 'active'");

    const candidates = await Promise.all(
      nurses.rows.map(async (n) => {
        let score = 0;
        const reasons = [];
        const dx = (v.primary_diagnosis || '').toLowerCase();
        const spec = (n.specialization || '').toLowerCase();
        const vt = (v.visit_type || '').toLowerCase();
        const specWords = spec.split(/\s+/);
        for (const w of specWords) {
          if (w && (dx.includes(w) || vt.includes(w))) {
            score += 30;
            reasons.push(`Specialty keyword "${w}" matches`);
            break;
          }
        }
        const prior = await db.query(
          'SELECT COUNT(*) FROM visits WHERE nurse_id = $1 AND patient_id = $2',
          [n.id, v.patient_id]
        );
        const priorCount = parseInt(prior.rows[0].count);
        if (priorCount > 0) {
          score += Math.min(40, priorCount * 5);
          reasons.push(`${priorCount} prior visit(s) with this patient`);
        }
        const patient = await db.query('SELECT city FROM patients WHERE id = $1', [v.patient_id]);
        if (patient.rows[0]?.city && n.city && patient.rows[0].city.toLowerCase() === n.city.toLowerCase()) {
          score += 15;
          reasons.push(`Same city: ${n.city}`);
        }
        return { nurse_id: n.id, name: `${n.first_name} ${n.last_name}`, specialization: n.specialization, score, reasons };
      })
    );

    candidates.sort((a, b) => b.score - a.score);
    const top = candidates.slice(0, 10);

    // AI narrative recommendation for top match
    let aiRecommendation = null;
    if (top.length > 0) {
      const aiResult = await callAI(
        `For a ${v.visit_type} visit with patient ${v.first_name} ${v.last_name} (Dx: ${v.primary_diagnosis}), the top-ranked nurse is ${top[0].name} (Specialty: ${top[0].specialization}, Score: ${top[0].score}).

Other candidates: ${top.slice(1, 4).map(c => `${c.name} (${c.specialization}, score ${c.score})`).join(', ')}.

Respond ONLY in JSON:
{"recommendation": "...", "top_nurse_rationale": "...", "risk_if_reassigned": "...", "confidence": "low|medium|high"}`,
        db,
        'skill_match',
        'You are a home health staffing specialist. Always respond with valid JSON.'
      );
      aiRecommendation = parseAIJson(aiResult.content) || { recommendation: aiResult.content };
    }

    res.json({
      visit_id,
      patient: `${v.first_name} ${v.last_name}`,
      diagnosis: v.primary_diagnosis,
      visit_type: v.visit_type,
      candidates: top,
      ai_recommendation: aiRecommendation,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 5. Visit Outcome Prediction
// POST /api/ai-features/outcome-predict { visit_id }
// ========================================
const outcomePredictSchema = z.object({
  visit_id: z.coerce.number().int().positive('visit_id required'),
});

router.post('/outcome-predict', async (req, res) => {
  try {
    const parsed = outcomePredictSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'visit_id required', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { visit_id } = parsed.data;

    const visit = await db.query(
      `SELECT v.*, p.first_name, p.last_name, p.primary_diagnosis FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.id = $1`,
      [visit_id]
    );
    if (visit.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    const v = visit.rows[0];

    const historical = await db.query(
      `SELECT EXTRACT(EPOCH FROM (end_time::interval - start_time::interval))/60 AS duration_min
       FROM visits WHERE visit_type = $1 AND status = 'completed' AND start_time IS NOT NULL AND end_time IS NOT NULL
       LIMIT 100`,
      [v.visit_type]
    );
    const durations = historical.rows.map((r) => parseFloat(r.duration_min)).filter((d) => d > 0 && d < 240);
    const avgDur = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 45;

    const result = await callAI(
      `Predict visit outcome. Patient: ${v.first_name} ${v.last_name}, Dx: ${v.primary_diagnosis}, Visit type: ${v.visit_type}, Historical avg duration: ${avgDur.toFixed(0)} min (based on ${durations.length} completed visits).

Respond ONLY in JSON:
{"estimated_duration_min": 45, "complexity": "low|medium|high", "required_equipment": ["..."], "expected_complications": ["..."], "confidence": "low|medium|high", "readmission_risk": "low|moderate|high", "rationale": "..."}`,
      db,
      'outcome_predict',
      'You are a home health outcome prediction AI. Always respond with valid JSON.'
    );

    const parsed2 = parseAIJson(result.content) || { estimated_duration_min: Math.round(avgDur), complexity: 'medium' };

    res.json({
      visit_id,
      patient: `${v.first_name} ${v.last_name}`,
      visit_type: v.visit_type,
      historical_sample_size: durations.length,
      historical_avg_duration: parseFloat(avgDur.toFixed(1)),
      ...parsed2,
      model: result.model,
      tokens: result.tokens,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 6. Family Communication Portal
// POST /api/ai-features/family-summary { visit_id, send_to? }
// ========================================
const familySummarySchema = z.object({
  visit_id: z.coerce.number().int().positive('visit_id required'),
  send_to: z.string().email().optional(),
});

router.post('/family-summary', async (req, res) => {
  try {
    const parsed = familySummarySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'visit_id required', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { visit_id, send_to } = parsed.data;

    const visit = await db.query(
      `SELECT v.*, p.first_name, p.last_name, p.primary_diagnosis FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.id = $1`,
      [visit_id]
    );
    if (visit.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    const v = visit.rows[0];

    const result = await callAI(
      `Convert this clinical visit into a simple, warm summary for the patient's family. Avoid medical jargon.

Patient: ${v.first_name} ${v.last_name}
Visit type: ${v.visit_type}
Date: ${v.visit_date}
Clinical notes: ${v.notes || v.ai_notes || 'No detailed notes'}

Write a 3-4 sentence family-friendly summary covering: how the visit went, key takeaways, what to watch for, next steps.`,
      db,
      'family_summary',
      'You are a compassionate home health communicator writing for patient families. Use warm, clear language.'
    );

    if (send_to) {
      await db.query(
        'INSERT INTO family_messages (patient_id, visit_id, summary, sent_to, created_by) VALUES ($1, $2, $3, $4, $5)',
        [v.patient_id, visit_id, result.content, send_to, 'ai-portal']
      );
    }

    res.json({
      visit_id,
      patient: `${v.first_name} ${v.last_name}`,
      visit_date: v.visit_date,
      family_summary: result.content,
      sent_to: send_to || null,
      model: result.model,
      tokens: result.tokens,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET family messages — paginated
router.get('/family-summary/messages', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows, count] = await Promise.all([
      db.query(
        `SELECT fm.*, p.first_name, p.last_name FROM family_messages fm
         LEFT JOIN patients p ON fm.patient_id = p.id ORDER BY fm.sent_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.query('SELECT COUNT(*) FROM family_messages'),
    ]);

    const total = parseInt(count.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 7. Shift Swap Optimizer — paginated GET
// ========================================
const shiftSwapCreateSchema = z.object({
  requester_nurse_id: z.coerce.number().int().positive('requester_nurse_id required'),
  target_nurse_id: z.coerce.number().int().positive().optional().nullable(),
  shift_date: z.string().min(1, 'shift_date required'),
  reason: z.string().optional(),
});

router.get('/shift-swaps', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows, count] = await Promise.all([
      db.query(
        `SELECT s.*, n1.first_name as req_first, n1.last_name as req_last,
                n2.first_name as tgt_first, n2.last_name as tgt_last
         FROM shift_swap_requests s
         LEFT JOIN nurses n1 ON s.requester_nurse_id = n1.id
         LEFT JOIN nurses n2 ON s.target_nurse_id = n2.id
         ORDER BY s.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.query('SELECT COUNT(*) FROM shift_swap_requests'),
    ]);

    const total = parseInt(count.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/shift-swaps', async (req, res) => {
  try {
    const parsed = shiftSwapCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'requester_nurse_id and shift_date required', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { requester_nurse_id, target_nurse_id, shift_date, reason } = parsed.data;

    const reqVisits = await db.query(
      'SELECT COUNT(*) FROM visits WHERE nurse_id=$1 AND visit_date=$2',
      [requester_nurse_id, shift_date]
    );
    const tgtVisits = target_nurse_id ? await db.query(
      'SELECT COUNT(*) FROM visits WHERE nurse_id=$1 AND visit_date=$2',
      [target_nurse_id, shift_date]
    ) : { rows: [{ count: 0 }] };

    const aiResult = await callAI(
      `Evaluate shift swap. Requester nurse #${requester_nurse_id} has ${reqVisits.rows[0].count} visits on ${shift_date}. Target nurse #${target_nurse_id || 'OPEN'} has ${tgtVisits.rows[0].count} visits same day. Reason: ${reason || 'unspecified'}.

Respond ONLY in JSON: {"feasibility": "high|medium|low", "coverage_risk": "...", "geographic_concerns": "...", "recommendation": "approve|review|reject", "rationale": "..."}`,
      db,
      'shift_swap',
      'You are a home health scheduling manager. Always respond with valid JSON.'
    );

    const parsedAI = parseAIJson(aiResult.content) || { recommendation: 'review', rationale: aiResult.content };

    const r = await db.query(
      `INSERT INTO shift_swap_requests (requester_nurse_id, target_nurse_id, shift_date, reason, status, ai_recommendation)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [requester_nurse_id, target_nurse_id || null, shift_date, reason, parsedAI.recommendation || 'pending', JSON.stringify(parsedAI)]
    );

    res.status(201).json({ ...r.rows[0], ai_evaluation: parsedAI });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/shift-swaps/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const statusSchema = z.object({ status: z.enum(['pending', 'review', 'approve', 'approved', 'rejected', 'reject']) });
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'status required', details: parsed.error.issues });

    const status = req.body.status === 'approve' ? 'approved' : req.body.status === 'reject' ? 'rejected' : req.body.status;
    const r = await db.query(
      'UPDATE shift_swap_requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 8. Insurance Pre-Auth Workflow — paginated GET
// ========================================
const preauthCreateSchema = z.object({
  patient_id: z.coerce.number().int().positive('patient_id required'),
  order_id: z.coerce.number().int().positive().optional().nullable(),
  service_description: z.string().min(1, 'service_description required'),
  insurance_provider: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/preauth', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows, count] = await Promise.all([
      db.query(
        `SELECT pa.*, p.first_name, p.last_name FROM preauth_requests pa
         LEFT JOIN patients p ON pa.patient_id = p.id ORDER BY pa.submitted_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.query('SELECT COUNT(*) FROM preauth_requests'),
    ]);

    const total = parseInt(count.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/preauth', async (req, res) => {
  try {
    const parsed = preauthCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'patient_id and service_description required', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { patient_id, order_id, service_description, insurance_provider, notes } = parsed.data;

    const patient = await db.query('SELECT * FROM patients WHERE id=$1', [patient_id]);
    if (patient.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });

    const order = order_id ? await db.query('SELECT * FROM medical_orders WHERE id=$1', [order_id]) : null;

    const aiResult = await callAI(
      `Generate a pre-authorization request summary for insurance.
Patient: ${patient.rows[0].first_name} ${patient.rows[0].last_name}
Diagnosis: ${patient.rows[0].primary_diagnosis}
Insurance: ${insurance_provider || patient.rows[0].insurance_provider}
Service: ${service_description}
${order ? `Physician order: ${order.rows[0]?.description}` : ''}
${notes ? `Notes: ${notes}` : ''}

Format as a professional pre-auth justification including: medical necessity, expected duration, and clinical evidence.`,
      db,
      'preauth_request',
      'You are a clinical authorization specialist writing formal insurance pre-authorization requests.'
    );

    const r = await db.query(
      `INSERT INTO preauth_requests (patient_id, order_id, service_description, insurance_provider, ai_summary, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [patient_id, order_id || null, service_description, insurance_provider || patient.rows[0].insurance_provider, aiResult.content, notes]
    );

    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/preauth/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const schema = z.object({
      status: z.enum(['pending', 'approved', 'denied']).optional(),
      auth_number: z.string().optional(),
      notes: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid update data', details: parsed.error.issues });

    const { status, auth_number, notes } = parsed.data;
    const r = await db.query(
      `UPDATE preauth_requests SET
         status = COALESCE($1, status),
         auth_number = COALESCE($2, auth_number),
         notes = COALESCE($3, notes),
         decision_at = CASE WHEN $1 IN ('approved','denied') THEN NOW() ELSE decision_at END
       WHERE id = $4 RETURNING *`,
      [status, auth_number, notes, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/preauth/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    await db.query('DELETE FROM preauth_requests WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 9. Visit Vitals Recording
// PATCH /api/ai-features/vitals/:visit_id { bp, hr, spo2, temp, weight, pain_scale }
// ========================================
const vitalsSchema = z.object({
  bp: z.string().optional(),
  hr: z.coerce.number().optional(),
  spo2: z.coerce.number().optional(),
  temp: z.coerce.number().optional(),
  weight: z.coerce.number().optional(),
  pain_scale: z.coerce.number().min(0).max(10).optional(),
});

router.patch('/vitals/:visit_id', async (req, res) => {
  try {
    const parsed = vitalsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid vitals data', details: parsed.error.issues });

    const db = req.app.locals.db;
    const r = await db.query(
      'UPDATE visits SET vitals = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(parsed.data), req.params.visit_id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 10. Schedule Conflict Detection
// POST /api/ai-features/check-conflict { nurse_id, schedule_date, shift_start, shift_end }
// ========================================
const conflictSchema = z.object({
  nurse_id: z.coerce.number().int().positive('nurse_id required'),
  schedule_date: z.string().min(1, 'schedule_date required'),
  shift_start: z.string().min(1, 'shift_start required'),
  shift_end: z.string().min(1, 'shift_end required'),
  exclude_id: z.coerce.number().int().optional(),
});

router.post('/check-conflict', async (req, res) => {
  try {
    const parsed = conflictSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'nurse_id, schedule_date, shift_start, shift_end required', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { nurse_id, schedule_date, shift_start, shift_end, exclude_id } = parsed.data;

    const conflicts = await db.query(
      `SELECT s.*, n.first_name, n.last_name FROM schedules s
       JOIN nurses n ON s.nurse_id = n.id
       WHERE s.nurse_id = $1 AND s.schedule_date = $2
         AND ($3::time, $4::time) OVERLAPS (s.shift_start, s.shift_end)
         ${exclude_id ? 'AND s.id != $5' : ''}`,
      exclude_id ? [nurse_id, schedule_date, shift_start, shift_end, exclude_id] : [nurse_id, schedule_date, shift_start, shift_end]
    );

    const visitConflicts = await db.query(
      `SELECT v.*, p.first_name as patient_first, p.last_name as patient_last FROM visits v
       JOIN patients p ON v.patient_id = p.id
       WHERE v.nurse_id = $1 AND v.visit_date = $2
         AND ($3::time, $4::time) OVERLAPS (v.start_time, v.end_time)`,
      [nurse_id, schedule_date, shift_start, shift_end]
    );

    res.json({
      has_conflict: conflicts.rows.length > 0 || visitConflicts.rows.length > 0,
      schedule_conflicts: conflicts.rows,
      visit_conflicts: visitConflicts.rows,
      conflict_count: conflicts.rows.length + visitConflicts.rows.length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 11. Bulk Route Stop Assignment
// POST /api/ai-features/routes/:route_id/stops/bulk { visit_ids[] }
// ========================================
const bulkStopsSchema = z.object({
  visit_ids: z.array(z.coerce.number().int().positive()).min(1, 'At least one visit_id required'),
});

router.post('/routes/:route_id/stops/bulk', async (req, res) => {
  try {
    const parsed = bulkStopsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'visit_ids array required', details: parsed.error.issues });

    const db = req.app.locals.db;
    const route_id = parseInt(req.params.route_id);
    const { visit_ids } = parsed.data;

    // Get current max stop_order
    const maxOrder = await db.query('SELECT COALESCE(MAX(stop_order), 0) as max FROM route_stops WHERE route_id = $1', [route_id]);
    let stopOrder = parseInt(maxOrder.rows[0].max);

    const inserted = [];
    for (const visit_id of visit_ids) {
      stopOrder++;
      const r = await db.query(
        `INSERT INTO route_stops (route_id, visit_id, stop_order) VALUES ($1, $2, $3) RETURNING *`,
        [route_id, visit_id, stopOrder]
      );
      inserted.push(r.rows[0]);
    }

    res.status(201).json({ route_id, inserted, total_stops_added: inserted.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========================================
// 14. No-show prediction
// POST /api/ai-features/no-show-predict { visit_id }
// ========================================
const noShowSchema = z.object({
  visit_id: z.coerce.number().int().positive('visit_id required'),
});

router.post('/no-show-predict', async (req, res) => {
  try {
    const parsed = noShowSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'visit_id required', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { visit_id } = parsed.data;

    const visit = await db.query(
      `SELECT v.*, p.first_name, p.last_name, p.date_of_birth, p.primary_diagnosis
       FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.id = $1`,
      [visit_id]
    );
    if (visit.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    const v = visit.rows[0];

    // Historical no-show count for this patient
    let history = { rows: [{ total: 0, no_shows: 0 }] };
    try {
      history = await db.query(
        `SELECT COUNT(*)::int AS total,
                SUM(CASE WHEN status IN ('no_show','missed','cancelled') THEN 1 ELSE 0 END)::int AS no_shows
         FROM visits WHERE patient_id = $1`,
        [v.patient_id]
      );
    } catch (_) {}
    const total = history.rows[0].total || 0;
    const noShows = history.rows[0].no_shows || 0;
    const baselineRate = total > 0 ? noShows / total : 0;

    const result = await callAI(
      `Predict probability that the scheduled visit will become a no-show.
Patient: ${v.first_name} ${v.last_name}
Diagnosis: ${v.primary_diagnosis || 'unknown'}
Visit type: ${v.visit_type}
Scheduled time: ${v.scheduled_at || v.start_time || 'unknown'}
Historical visits: ${total}, prior no-shows/cancellations: ${noShows} (baseline ${(baselineRate * 100).toFixed(1)}%)

Respond ONLY with valid JSON:
{"no_show_probability":0.0-1.0,"risk_band":"low|medium|high","top_factors":["..."],"recommended_interventions":["call reminder","sms 24h prior","transport offer","caregiver involvement"],"confidence":"low|medium|high","rationale":"..."}`,
      db,
      'no_show_predict',
      'You are a home-health no-show prediction AI. Always return valid JSON.'
    );

    const ai = parseAIJson(result.content) || { no_show_probability: baselineRate, risk_band: baselineRate > 0.3 ? 'high' : baselineRate > 0.15 ? 'medium' : 'low' };

    res.json({
      visit_id,
      patient: `${v.first_name} ${v.last_name}`,
      visit_type: v.visit_type,
      historical_total: total,
      historical_no_shows: noShows,
      baseline_no_show_rate: parseFloat(baselineRate.toFixed(3)),
      ...ai,
      model: result.model,
      tokens: result.tokens,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
