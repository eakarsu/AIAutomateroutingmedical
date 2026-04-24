import { Router } from 'express';
const router = Router();

async function callOpenRouter(prompt, db) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
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
        ['api_call', prompt.substring(0, 500), content.substring(0, 2000), model, tokens]
      );
    } catch (e) { /* ignore logging errors */ }
  }

  return { content, model, tokens };
}

// Route Optimization AI
router.post('/optimize-route', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { nurse_id, date } = req.body;

    const visits = await db.query(`
      SELECT v.*, p.first_name, p.last_name, p.address, p.city, p.lat, p.lng
      FROM visits v JOIN patients p ON v.patient_id = p.id
      WHERE v.nurse_id = $1 AND v.visit_date = $2 ORDER BY v.start_time
    `, [nurse_id, date || new Date().toISOString().split('T')[0]]);

    const nurse = await db.query('SELECT * FROM nurses WHERE id = $1', [nurse_id]);

    const prompt = `You are a route optimization expert for home health care. Analyze these patient visits and suggest the optimal route order.

Nurse: ${nurse.rows[0]?.first_name} ${nurse.rows[0]?.last_name} (Base: ${nurse.rows[0]?.address}, ${nurse.rows[0]?.city})

Visits for today:
${visits.rows.map((v, i) => `${i + 1}. Patient: ${v.first_name} ${v.last_name} | Address: ${v.address}, ${v.city} | Type: ${v.visit_type} | Scheduled: ${v.start_time}-${v.end_time} | Lat: ${v.lat}, Lng: ${v.lng}`).join('\n')}

Please provide:
1. **Optimized Visit Order** - Reorder visits to minimize travel time
2. **Estimated Total Distance** - Approximate total miles
3. **Estimated Time Savings** - Minutes saved vs current order
4. **Route Summary** - Brief description of the optimal path
5. **Key Recommendations** - Any scheduling or efficiency tips

Format your response clearly with headers and bullet points.`;

    const result = await callOpenRouter(prompt, db);
    res.json({ success: true, ...result, visits: visits.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Medical Order AI Processing
router.post('/process-order', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { order_id } = req.body;

    const order = await db.query(`
      SELECT o.*, p.first_name, p.last_name, p.primary_diagnosis, p.date_of_birth, p.insurance_provider
      FROM medical_orders o JOIN patients p ON o.patient_id = p.id WHERE o.id = $1
    `, [order_id]);

    if (order.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const o = order.rows[0];

    const prompt = `You are a clinical documentation specialist. Analyze this medical order and provide a comprehensive summary.

**Medical Order Details:**
- Patient: ${o.first_name} ${o.last_name} (DOB: ${o.date_of_birth})
- Primary Diagnosis: ${o.primary_diagnosis}
- Insurance: ${o.insurance_provider}
- Order Type: ${o.order_type}
- Ordering Physician: ${o.ordering_physician}
- Description: ${o.description}
- Priority: ${o.priority}
- Frequency: ${o.frequency}
- Instructions: ${o.instructions}
- Date Range: ${o.start_date} to ${o.end_date}

Please provide:
1. **Clinical Summary** - Plain language summary of the order
2. **Care Plan Highlights** - Key nursing interventions needed
3. **Documentation Requirements** - What needs to be documented each visit
4. **Insurance Considerations** - Coverage and authorization notes
5. **Red Flags to Watch** - Warning signs requiring immediate physician contact
6. **Patient Education Points** - Key topics to discuss with patient/family

Format your response clearly with headers and bullet points.`;

    const result = await callOpenRouter(prompt, db);

    // Save AI summary to order
    await db.query('UPDATE medical_orders SET ai_summary = $1 WHERE id = $2', [result.content, order_id]);

    res.json({ success: true, ...result, order: o });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Visit Notes AI Generation
router.post('/generate-notes', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { visit_id } = req.body;

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

    const prompt = `You are a clinical documentation assistant for home health nursing. Generate professional visit notes.

**Visit Information:**
- Patient: ${v.pf} ${v.pl} (DOB: ${v.date_of_birth})
- Primary Diagnosis: ${v.primary_diagnosis}
- Nurse: ${v.nf} ${v.nl} (${v.specialization})
- Visit Type: ${v.visit_type}
- Date: ${v.visit_date} | Time: ${v.start_time} - ${v.end_time}
- Existing Notes: ${v.notes || 'None'}

Generate comprehensive SOAP-format visit notes:
1. **Subjective** - Patient reported symptoms and concerns
2. **Objective** - Clinical findings, vital signs, observations
3. **Assessment** - Clinical assessment and progress evaluation
4. **Plan** - Treatment plan and next steps
5. **Patient Education** - Topics discussed with patient
6. **Follow-up** - Next visit recommendations

Make notes realistic and clinically appropriate. Format clearly with headers.`;

    const result = await callOpenRouter(prompt, db);

    await db.query('UPDATE visits SET ai_notes = $1 WHERE id = $2', [result.content, visit_id]);

    res.json({ success: true, ...result, visit: v });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Scheduling Assistant
router.post('/smart-schedule', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const [nurses, visits, schedules] = await Promise.all([
      db.query("SELECT * FROM nurses WHERE status = 'active'"),
      db.query('SELECT v.*, p.first_name, p.last_name, p.address, p.city FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.visit_date = $1', [targetDate]),
      db.query('SELECT s.*, n.first_name, n.last_name FROM schedules s JOIN nurses n ON s.nurse_id = n.id WHERE s.schedule_date = $1', [targetDate]),
    ]);

    const prompt = `You are a scheduling optimization expert for home health care. Analyze the current schedule and suggest improvements.

**Date:** ${targetDate}

**Available Nurses (${nurses.rows.length}):**
${nurses.rows.map(n => `- ${n.first_name} ${n.last_name} | Specialty: ${n.specialization} | Base: ${n.city}`).join('\n')}

**Scheduled Visits (${visits.rows.length}):**
${visits.rows.map(v => `- Patient: ${v.first_name} ${v.last_name} | Type: ${v.visit_type} | Time: ${v.start_time}-${v.end_time} | Address: ${v.address}, ${v.city}`).join('\n')}

**Current Schedule Assignments (${schedules.rows.length}):**
${schedules.rows.map(s => `- ${s.first_name} ${s.last_name} | Shift: ${s.shift_start}-${s.shift_end} | Territory: ${s.territory} | Max Visits: ${s.max_visits}`).join('\n')}

Please provide:
1. **Schedule Analysis** - Overview of current scheduling efficiency
2. **Optimization Suggestions** - Specific improvements for nurse-patient assignments
3. **Workload Balance** - Assessment of visit distribution among nurses
4. **Gap Analysis** - Any unassigned visits or underutilized nurses
5. **Priority Recommendations** - Focus areas for today's operations
6. **Risk Alerts** - Potential scheduling conflicts or concerns

Format clearly with headers and bullet points.`;

    const result = await callOpenRouter(prompt, db);
    res.json({ success: true, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Patient Risk Assessment
router.post('/patient-risk', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { patient_id } = req.body;

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
    const prompt = `You are a clinical risk assessment specialist. Evaluate this home health patient's risk profile.

**Patient Profile:**
- Name: ${p.first_name} ${p.last_name}
- DOB: ${p.date_of_birth} | Gender: ${p.gender}
- Primary Diagnosis: ${p.primary_diagnosis}
- Insurance: ${p.insurance_provider}

**Active Medical Orders (${orders.rows.length}):**
${orders.rows.map(o => `- ${o.order_type}: ${o.description} (Priority: ${o.priority})`).join('\n')}

**Recent Visits (${recentVisits.rows.length}):**
${recentVisits.rows.map(v => `- ${v.visit_date}: ${v.visit_type} - Status: ${v.status} | Notes: ${v.notes || 'None'}`).join('\n')}

Please provide:
1. **Overall Risk Level** - Low / Moderate / High / Critical with reasoning
2. **Clinical Risk Factors** - Identified health risks
3. **Hospitalization Risk** - Likelihood of hospital readmission
4. **Fall Risk Assessment** - Based on available information
5. **Medication Risk** - Potential medication-related concerns
6. **Recommended Interventions** - Proactive measures to reduce risk
7. **Monitoring Priorities** - Key metrics to track

Format clearly with headers and bullet points.`;

    const result = await callOpenRouter(prompt, db);
    res.json({ success: true, ...result, patient: p });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI General Chat
router.post('/chat', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { message } = req.body;

    const prompt = `You are an AI assistant for a home health care company. You help with nursing operations, patient care, route optimization, medical orders, and scheduling. Be helpful, professional, and clinically aware.

User question: ${message}

Provide a clear, professional response. Use headers and bullet points for longer answers.`;

    const result = await callOpenRouter(prompt, db);
    res.json({ success: true, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get AI Logs
router.get('/logs', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('SELECT * FROM ai_logs ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
