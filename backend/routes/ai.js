import { Router } from 'express';
import { z } from 'zod';
import { parseAIJson } from '../lib/parseAIJson.js';

const router = Router();

const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

async function callOpenRouter(prompt, db, feature = 'api_call', systemPrompt = null) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const referer = process.env.CLIENT_URL || 'http://localhost:5173';

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': referer,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 2500,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || 'No response from AI';
  const tokens = data.usage?.total_tokens || 0;

  // Log AI call
  if (db) {
    try {
      await db.query(
        'INSERT INTO ai_logs (feature, prompt, response, model, tokens_used) VALUES ($1, $2, $3, $4, $5)',
        [feature, prompt.substring(0, 500), content.substring(0, 2000), MODEL, tokens]
      );
    } catch (e) { /* ignore logging errors */ }
  }

  return { content, model: MODEL, tokens };
}

// Ensure ai_results table exists
async function ensureAiResultsTable(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ai_results (
      id SERIAL PRIMARY KEY,
      feature VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id INTEGER,
      structured_data JSONB,
      raw_content TEXT,
      model VARCHAR(100),
      tokens_used INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function persistAiResult(db, feature, entityType, entityId, structuredData, rawContent, tokens) {
  try {
    await ensureAiResultsTable(db);
    await db.query(
      `INSERT INTO ai_results (feature, entity_type, entity_id, structured_data, raw_content, model, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [feature, entityType, entityId, JSON.stringify(structuredData), rawContent, MODEL, tokens]
    );
  } catch (e) { /* ignore persistence errors */ }
}

// Route Optimization AI
const optimizeRouteSchema = z.object({
  nurse_id: z.coerce.number().int().positive(),
  date: z.string().optional(),
});

router.post('/optimize-route', async (req, res) => {
  try {
    const parsed = optimizeRouteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'nurse_id (number) is required', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { nurse_id, date } = parsed.data;

    const visits = await db.query(`
      SELECT v.*, p.first_name, p.last_name, p.address, p.city, p.lat, p.lng
      FROM visits v JOIN patients p ON v.patient_id = p.id
      WHERE v.nurse_id = $1 AND v.visit_date = $2 ORDER BY v.start_time
    `, [nurse_id, date || new Date().toISOString().split('T')[0]]);

    const nurse = await db.query('SELECT * FROM nurses WHERE id = $1', [nurse_id]);
    if (nurse.rows.length === 0) return res.status(404).json({ error: 'Nurse not found' });

    const systemPrompt = 'You are a route optimization expert for home health care. Always respond with valid JSON.';
    const prompt = `Analyze these patient visits and suggest the optimal route order.

Nurse: ${nurse.rows[0].first_name} ${nurse.rows[0].last_name} (Base: ${nurse.rows[0].address}, ${nurse.rows[0].city})

Visits for today:
${visits.rows.map((v, i) => `${i + 1}. Patient: ${v.first_name} ${v.last_name} | Address: ${v.address}, ${v.city} | Type: ${v.visit_type} | Scheduled: ${v.start_time}-${v.end_time} | Lat: ${v.lat}, Lng: ${v.lng}`).join('\n')}

Respond ONLY in JSON:
{
  "optimized_order": [{"original_index": 1, "patient_name": "...", "address": "...", "visit_type": "...", "reason": "..."}],
  "estimated_total_miles": 0,
  "estimated_time_savings_minutes": 0,
  "route_summary": "...",
  "key_recommendations": ["..."],
  "narrative": "..."
}`;

    const result = await callOpenRouter(prompt, db, 'route_optimization', systemPrompt);
    const structured = parseAIJson(result.content);
    await persistAiResult(db, 'route_optimization', 'nurse', nurse_id, structured, result.content, result.tokens);

    res.json({ success: true, ...result, structured, visits: visits.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Medical Order AI Processing
const processOrderSchema = z.object({
  order_id: z.coerce.number().int().positive(),
});

router.post('/process-order', async (req, res) => {
  try {
    const parsed = processOrderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'order_id (number) is required', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { order_id } = parsed.data;

    const order = await db.query(`
      SELECT o.*, p.first_name, p.last_name, p.primary_diagnosis, p.date_of_birth, p.insurance_provider
      FROM medical_orders o JOIN patients p ON o.patient_id = p.id WHERE o.id = $1
    `, [order_id]);

    if (order.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const o = order.rows[0];

    const systemPrompt = 'You are a clinical documentation specialist. Always respond with valid JSON.';
    const prompt = `Analyze this medical order and provide a comprehensive summary.

Patient: ${o.first_name} ${o.last_name} (DOB: ${o.date_of_birth})
Primary Diagnosis: ${o.primary_diagnosis}
Insurance: ${o.insurance_provider}
Order Type: ${o.order_type}
Ordering Physician: ${o.ordering_physician}
Description: ${o.description}
Priority: ${o.priority}
Frequency: ${o.frequency}
Instructions: ${o.instructions}
Date Range: ${o.start_date} to ${o.end_date}

Respond ONLY in JSON:
{
  "clinical_summary": "...",
  "care_plan_highlights": ["..."],
  "documentation_requirements": ["..."],
  "insurance_considerations": "...",
  "red_flags": ["..."],
  "patient_education_points": ["..."],
  "narrative": "..."
}`;

    const result = await callOpenRouter(prompt, db, 'order_processing', systemPrompt);
    const structured = parseAIJson(result.content);
    await persistAiResult(db, 'order_processing', 'order', order_id, structured, result.content, result.tokens);

    // Save AI summary to order
    await db.query('UPDATE medical_orders SET ai_summary = $1 WHERE id = $2', [result.content, order_id]);

    res.json({ success: true, ...result, structured, order: o });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Visit Notes AI Generation
const generateNotesSchema = z.object({
  visit_id: z.coerce.number().int().positive(),
});

router.post('/generate-notes', async (req, res) => {
  try {
    const parsed = generateNotesSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'visit_id (number) is required', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { visit_id } = parsed.data;

    const visit = await db.query(`
      SELECT v.*, p.first_name as pf, p.last_name as pl, p.primary_diagnosis, p.date_of_birth,
             n.first_name as nf, n.last_name as nl, n.specialization
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      JOIN nurses n ON v.nurse_id = n.id
      WHERE v.id = $1
    `, [visit_id]);

    if (visit.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    const v = visit.rows[0];

    const systemPrompt = 'You are a clinical documentation assistant for home health nursing. Always respond with valid JSON.';
    const prompt = `Generate professional SOAP visit notes for this home health visit.

Patient: ${v.pf} ${v.pl} (DOB: ${v.date_of_birth})
Primary Diagnosis: ${v.primary_diagnosis}
Nurse: ${v.nf} ${v.nl} (${v.specialization})
Visit Type: ${v.visit_type}
Date: ${v.visit_date} | Time: ${v.start_time} - ${v.end_time}
Existing Notes: ${v.notes || 'None'}

Respond ONLY in JSON:
{
  "subjective": "...",
  "objective": "...",
  "assessment": "...",
  "plan": "...",
  "patient_education": "...",
  "follow_up": "...",
  "narrative": "Full SOAP note in prose format"
}`;

    const result = await callOpenRouter(prompt, db, 'visit_notes', systemPrompt);
    const structured = parseAIJson(result.content);
    const narrative = structured?.narrative || result.content;
    await persistAiResult(db, 'visit_notes', 'visit', visit_id, structured, result.content, result.tokens);

    await db.query('UPDATE visits SET ai_notes = $1 WHERE id = $2', [narrative, visit_id]);

    res.json({ success: true, ...result, structured, visit: v });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Scheduling Assistant
const smartScheduleSchema = z.object({
  date: z.string().optional(),
});

router.post('/smart-schedule', async (req, res) => {
  try {
    const parsed = smartScheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });

    const db = req.app.locals.db;
    const targetDate = parsed.data.date || new Date().toISOString().split('T')[0];

    const [nurses, visits, schedules] = await Promise.all([
      db.query("SELECT * FROM nurses WHERE status = 'active'"),
      db.query('SELECT v.*, p.first_name, p.last_name, p.address, p.city FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.visit_date = $1', [targetDate]),
      db.query('SELECT s.*, n.first_name, n.last_name FROM schedules s JOIN nurses n ON s.nurse_id = n.id WHERE s.schedule_date = $1', [targetDate]),
    ]);

    const systemPrompt = 'You are a scheduling optimization expert for home health care. Always respond with valid JSON.';
    const prompt = `Analyze the current schedule and suggest improvements.

Date: ${targetDate}
Available Nurses (${nurses.rows.length}):
${nurses.rows.map(n => `- ${n.first_name} ${n.last_name} | Specialty: ${n.specialization} | Base: ${n.city}`).join('\n')}

Scheduled Visits (${visits.rows.length}):
${visits.rows.map(v => `- Patient: ${v.first_name} ${v.last_name} | Type: ${v.visit_type} | Time: ${v.start_time}-${v.end_time} | Address: ${v.address}, ${v.city}`).join('\n')}

Current Assignments (${schedules.rows.length}):
${schedules.rows.map(s => `- ${s.first_name} ${s.last_name} | Shift: ${s.shift_start}-${s.shift_end} | Territory: ${s.territory} | Max: ${s.max_visits}`).join('\n')}

Respond ONLY in JSON:
{
  "schedule_analysis": "...",
  "optimization_suggestions": ["..."],
  "workload_balance": "...",
  "gap_analysis": "...",
  "priority_recommendations": ["..."],
  "risk_alerts": ["..."],
  "narrative": "..."
}`;

    const result = await callOpenRouter(prompt, db, 'smart_schedule', systemPrompt);
    const structured = parseAIJson(result.content);
    await persistAiResult(db, 'smart_schedule', 'schedule', null, structured, result.content, result.tokens);

    res.json({ success: true, ...result, structured });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Patient Risk Assessment
const patientRiskSchema = z.object({
  patient_id: z.coerce.number().int().positive(),
});

router.post('/patient-risk', async (req, res) => {
  try {
    const parsed = patientRiskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'patient_id (number) is required', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { patient_id } = parsed.data;

    const patient = await db.query('SELECT * FROM patients WHERE id = $1', [patient_id]);
    if (patient.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });

    const recentVisits = await db.query(
      'SELECT * FROM visits WHERE patient_id = $1 ORDER BY visit_date DESC LIMIT 5',
      [patient_id]
    );
    const orders = await db.query(
      'SELECT * FROM medical_orders WHERE patient_id = $1 ORDER BY created_at DESC',
      [patient_id]
    );

    const p = patient.rows[0];
    const systemPrompt = 'You are a clinical risk assessment specialist. Always respond with valid JSON.';
    const prompt = `Evaluate this home health patient's risk profile.

Patient: ${p.first_name} ${p.last_name} (DOB: ${p.date_of_birth}, Gender: ${p.gender})
Primary Diagnosis: ${p.primary_diagnosis}
Insurance: ${p.insurance_provider}

Active Medical Orders (${orders.rows.length}):
${orders.rows.map(o => `- ${o.order_type}: ${o.description} (Priority: ${o.priority})`).join('\n')}

Recent Visits (${recentVisits.rows.length}):
${recentVisits.rows.map(v => `- ${v.visit_date}: ${v.visit_type} - Status: ${v.status} | Notes: ${v.notes || 'None'}`).join('\n')}

Respond ONLY in JSON:
{
  "overall_risk_level": "low|moderate|high|critical",
  "clinical_risk_factors": ["..."],
  "hospitalization_risk": "low|moderate|high",
  "fall_risk": "low|moderate|high",
  "medication_risks": ["..."],
  "recommended_interventions": ["..."],
  "monitoring_priorities": ["..."],
  "rationale": "...",
  "narrative": "..."
}`;

    const result = await callOpenRouter(prompt, db, 'patient_risk', systemPrompt);
    const structured = parseAIJson(result.content);
    await persistAiResult(db, 'patient_risk', 'patient', patient_id, structured, result.content, result.tokens);

    res.json({ success: true, ...result, structured, patient: p });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI General Chat
const chatSchema = z.object({
  message: z.string().min(1, 'message is required'),
});

router.post('/chat', async (req, res) => {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'message is required', details: parsed.error.issues });

    const db = req.app.locals.db;
    const systemPrompt = 'You are an AI assistant for a home health care company. You help with nursing operations, patient care, route optimization, medical orders, and scheduling. Be helpful, professional, and clinically aware.';
    const result = await callOpenRouter(parsed.data.message, db, 'chat', systemPrompt);
    res.json({ success: true, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get AI Logs — paginated
router.get('/logs', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows, count] = await Promise.all([
      db.query('SELECT * FROM ai_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
      db.query('SELECT COUNT(*) FROM ai_logs'),
    ]);

    const total = parseInt(count.rows[0].count);
    res.json({
      data: rows.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get AI Results — paginated structured results
router.get('/results', async (req, res) => {
  try {
    const db = req.app.locals.db;
    await ensureAiResultsTable(db);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const feature = req.query.feature;

    const whereClause = feature ? 'WHERE feature = $3' : '';
    const params = feature ? [limit, offset, feature] : [limit, offset];

    const [rows, count] = await Promise.all([
      db.query(`SELECT * FROM ai_results ${whereClause} ORDER BY created_at DESC LIMIT $1 OFFSET $2`, params),
      db.query(`SELECT COUNT(*) FROM ai_results ${feature ? 'WHERE feature = $1' : ''}`, feature ? [feature] : []),
    ]);

    const total = parseInt(count.rows[0].count);
    res.json({
      data: rows.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// SSE: Stream route optimization progress
router.get('/optimize-route/stream', async (req, res) => {
  const { routeId } = req.query;

  if (!routeId) {
    return res.status(400).json({ error: 'routeId is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (type, payload) => {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
  };

  try {
    const db = req.app.locals.db;

    sendEvent('step', { step: 1, message: 'Loading route and stops from database...' });

    const route = await db.query(`
      SELECT r.*, n.first_name, n.last_name, n.address, n.city, n.lat, n.lng
      FROM routes r JOIN nurses n ON r.nurse_id = n.id WHERE r.id = $1
    `, [routeId]);

    if (route.rows.length === 0) {
      sendEvent('error', { message: 'Route not found' });
      return res.end();
    }

    const routeData = route.rows[0];
    sendEvent('step', { step: 2, message: `Route loaded for clinician: ${routeData.first_name} ${routeData.last_name} on ${routeData.route_date}` });

    sendEvent('step', { step: 3, message: 'Fetching visits and patient locations...' });

    const stops = await db.query(`
      SELECT rs.*, v.visit_type, v.start_time, v.end_time, v.address,
             p.first_name as patient_first, p.last_name as patient_last, p.lat, p.lng
      FROM route_stops rs
      LEFT JOIN visits v ON rs.visit_id = v.id
      LEFT JOIN patients p ON v.patient_id = p.id
      WHERE rs.route_id = $1 ORDER BY rs.stop_order
    `, [routeId]);

    sendEvent('step', { step: 4, message: `Loaded ${stops.rows.length} stops. Building AI optimization prompt...` });
    sendEvent('step', { step: 5, message: 'Calling AI route optimization engine...' });

    const referer = process.env.CLIENT_URL || 'http://localhost:5173';
    const prompt = `Optimize this home health route. Clinician: ${routeData.first_name} ${routeData.last_name} (Base: ${routeData.address || ''}, ${routeData.city || ''}, Lat: ${routeData.lat}, Lng: ${routeData.lng})

Current stops (${stops.rows.length}):
${stops.rows.map((s, i) => `${i + 1}. Stop #${s.stop_order}: ${s.patient_first} ${s.patient_last} | ${s.address} | ${s.visit_type} | ${s.start_time}-${s.end_time} | Lat: ${s.lat}, Lng: ${s.lng}`).join('\n')}

Respond ONLY in JSON:
{
  "optimized_order": [{"stop_order": 1, "patient_name": "...", "address": "..."}],
  "estimated_total_miles": 0,
  "estimated_time_savings_minutes": 0,
  "route_summary": "...",
  "key_recommendations": ["..."]
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': referer,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a route optimization expert for home health care. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2500,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No response from AI';
    const tokens = data.usage?.total_tokens || 0;
    const structured = parseAIJson(content);

    try {
      await db.query(
        'INSERT INTO ai_logs (feature, prompt, response, model, tokens_used) VALUES ($1, $2, $3, $4, $5)',
        ['route_optimization_stream', prompt.substring(0, 500), content.substring(0, 2000), MODEL, tokens]
      );
    } catch {}

    sendEvent('step', { step: 6, message: 'AI analysis complete. Saving optimization results...' });

    await db.query('UPDATE routes SET ai_suggestions = $1 WHERE id = $2', [content, routeId]);

    sendEvent('step', { step: 7, message: 'Results saved to database.' });

    sendEvent('complete', {
      route_id: parseInt(routeId),
      stops_count: stops.rows.length,
      optimization: content,
      structured,
      model: MODEL,
      tokens,
      optimized_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('SSE Route optimization error:', err);
    sendEvent('error', { message: err.message });
  } finally {
    res.end();
  }
});

export default router;
