// Custom Views — Triage Views for medical patient routing / triage
// 4 features:
//   VIZ:     /patient-flow            — Sankey-style stage-to-stage patient flow
//   VIZ:     /ward-occupancy-heatmap  — ward x hour occupancy heatmap
//   NON-VIZ: /referral-pdf/:id        — referral letter PDF
//   NON-VIZ: /triage-rules            — GET/PUT triage rules (priority thresholds CRUD)
import { Router } from 'express';
import PDFDocument from 'pdfkit';

const router = Router();
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

// In-memory triage rule store (priority thresholds)
// Each rule maps a clinical signal range -> acuity priority + target ward + SLA
const DEFAULT_RULES = [
  { id: 1, name: 'ESI-1 Resuscitation',  metric: 'news2',    min: 7,  max: 99, priority: 'immediate', ward: 'resus',         sla_minutes: 0,   enabled: true },
  { id: 2, name: 'ESI-2 Emergent',       metric: 'news2',    min: 5,  max: 6,  priority: 'emergent',  ward: 'acute',         sla_minutes: 10,  enabled: true },
  { id: 3, name: 'ESI-3 Urgent',         metric: 'news2',    min: 3,  max: 4,  priority: 'urgent',    ward: 'urgent-care',   sla_minutes: 30,  enabled: true },
  { id: 4, name: 'ESI-4 Less Urgent',    metric: 'news2',    min: 1,  max: 2,  priority: 'less-urgent', ward: 'fast-track',  sla_minutes: 60,  enabled: true },
  { id: 5, name: 'ESI-5 Non-Urgent',     metric: 'news2',    min: 0,  max: 0,  priority: 'non-urgent', ward: 'fast-track',   sla_minutes: 120, enabled: true },
  { id: 6, name: 'Pediatric Fever Path', metric: 'temp_c',   min: 39, max: 45, priority: 'urgent',    ward: 'peds',          sla_minutes: 20,  enabled: true },
];
let RULES = JSON.parse(JSON.stringify(DEFAULT_RULES));

const PRIORITIES = ['immediate', 'emergent', 'urgent', 'less-urgent', 'non-urgent'];

// --- LLM helper -------------------------------------------------------------
async function callAI(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { content: null, disabled: true };
  }
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 900,
        temperature: 0.4,
      }),
    });
    const data = await r.json();
    return { content: data?.choices?.[0]?.message?.content || null, model: MODEL };
  } catch (err) {
    return { content: null, error: err.message };
  }
}

function seeded(s) {
  let x = 0;
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
  return x;
}

// ---------------------------------------------------------------------------
// 1) VIZ — Patient Flow (Sankey)
//    GET /patient-flow?window=24h
//    Returns: { nodes: [{id,label,stage}], links: [{source,target,value,priority}], summary }
//    Stages: Arrival -> Triage -> Ward -> Disposition
// ---------------------------------------------------------------------------
router.get('/patient-flow', async (req, res) => {
  const windowParam = req.query.window || '24h';
  const hours = Math.max(4, Math.min(72, parseInt(windowParam, 10) || 24));

  // Stages
  const arrivals = [
    { id: 'arr_walkin',  label: 'Walk-in',          stage: 'arrival' },
    { id: 'arr_ems',     label: 'EMS / Ambulance',  stage: 'arrival' },
    { id: 'arr_referral',label: 'GP Referral',      stage: 'arrival' },
  ];
  const triages = PRIORITIES.map(p => ({ id: `tri_${p}`, label: p, stage: 'triage' }));
  const wards = Array.from(new Set(RULES.filter(r => r.enabled).map(r => r.ward)))
    .map(w => ({ id: `ward_${w}`, label: w, stage: 'ward' }));
  const dispositions = [
    { id: 'disp_admit',     label: 'Admitted',     stage: 'disposition' },
    { id: 'disp_discharge', label: 'Discharged',   stage: 'disposition' },
    { id: 'disp_transfer',  label: 'Transferred',  stage: 'disposition' },
  ];

  const nodes = [...arrivals, ...triages, ...wards, ...dispositions];

  // Synthesize link volumes using a seed per pair + the hour window
  const links = [];
  function vol(a, b) {
    const base = (seeded(`${a}|${b}|${hours}`) % 22) + 3;
    return Math.round(base * (hours / 12));
  }

  // arrival -> triage
  arrivals.forEach(a => {
    triages.forEach(t => {
      const v = vol(a.id, t.id);
      if (v > 0) links.push({ source: a.id, target: t.id, value: v, priority: t.label });
    });
  });
  // triage -> ward (use rules to pick eligible wards per priority)
  triages.forEach(t => {
    const priority = t.label;
    const eligible = wards.filter(w =>
      RULES.some(r => r.enabled && r.priority === priority && `ward_${r.ward}` === w.id)
    );
    const fallback = eligible.length ? eligible : wards;
    fallback.forEach(w => {
      const v = vol(t.id, w.id);
      if (v > 0) links.push({ source: t.id, target: w.id, value: v, priority });
    });
  });
  // ward -> disposition
  wards.forEach(w => {
    dispositions.forEach(d => {
      const v = vol(w.id, d.id);
      if (v > 0) links.push({ source: w.id, target: d.id, value: v });
    });
  });

  const totalIn = arrivals.reduce((s, a) =>
    s + links.filter(l => l.source === a.id).reduce((x, l) => x + l.value, 0), 0);

  const ai = await callAI(
    'You are an ED operations analyst. In one short sentence (<=24 words) describe the dominant patient flow path.',
    `Window: ${hours}h. Total intake: ${totalIn}. Top links: ${links
      .slice().sort((a,b)=>b.value-a.value).slice(0,4)
      .map(l => `${l.source}->${l.target}=${l.value}`).join(', ')}.`
  );

  res.json({
    window_hours: hours,
    nodes,
    links,
    total_intake: totalIn,
    summary: ai.content || `Across ${hours}h, ${totalIn} patients flowed through arrival → triage → ward → disposition.`,
    ai_disabled: !!ai.disabled,
  });
});

// ---------------------------------------------------------------------------
// 2) VIZ — Ward Occupancy Heatmap
//    GET /ward-occupancy-heatmap?hours=12
//    Returns: { wards, hours, matrix: occupancy% per ward per hour, hotspots, summary }
// ---------------------------------------------------------------------------
router.get('/ward-occupancy-heatmap', async (req, res) => {
  const hoursWindow = Math.max(4, Math.min(24, parseInt(req.query.hours, 10) || 12));
  const wards = Array.from(new Set(RULES.filter(r => r.enabled).map(r => r.ward)));

  const now = new Date();
  const hours = Array.from({ length: hoursWindow }, (_, i) => {
    const d = new Date(now.getTime() - (hoursWindow - 1 - i) * 3600 * 1000);
    return `${String(d.getHours()).padStart(2, '0')}:00`;
  });

  // Occupancy as a percentage (0–100), seeded per ward + hour
  const matrix = wards.map(w =>
    hours.map((h, idx) => {
      const base = (seeded(`${w}-${h}`) % 55) + 35; // 35–90
      // mid-shift peak
      const peak = Math.max(0, 8 - Math.abs(idx - Math.floor(hoursWindow / 2)));
      return Math.min(100, base + peak);
    })
  );

  const cells = [];
  matrix.forEach((row, wi) => row.forEach((v, hi) => cells.push({ ward: wards[wi], hour: hours[hi], occupancy: v })));
  const hotspots = cells.sort((a, b) => b.occupancy - a.occupancy).slice(0, 3);

  const ai = await callAI(
    'You are a hospital bed-manager. In one short sentence (<=22 words) state which ward is at capacity risk.',
    `Hotspots: ${hotspots.map(h => `${h.ward}@${h.hour}=${h.occupancy}%`).join(', ')}.`
  );

  res.json({
    wards,
    hours,
    matrix,
    hotspots,
    summary: ai.content || `Capacity pressure highest on ${hotspots[0].ward} (${hotspots[0].occupancy}% at ${hotspots[0].hour}).`,
    ai_disabled: !!ai.disabled,
  });
});

// ---------------------------------------------------------------------------
// 3) NON-VIZ — Referral PDF
//    GET /referral-pdf/:id?patient=Jane%20Doe&from_provider=Dr.%20Smith&specialty=cardiology&priority=urgent
//    Streams a PDF (Content-Type: application/pdf)
// ---------------------------------------------------------------------------
router.get('/referral-pdf/:id', async (req, res) => {
  const id = req.params.id;
  const patient = req.query.patient || 'Jane Doe';
  const fromProvider = req.query.from_provider || 'Dr. Andrea Smith, MD';
  const specialty = req.query.specialty || 'cardiology';
  const priority = PRIORITIES.includes(req.query.priority) ? req.query.priority : 'urgent';
  const reason = req.query.reason || 'Persistent exertional chest pain with abnormal ECG.';

  // Match a rule by priority to pick destination ward + SLA
  const rule =
    RULES.find(r => r.enabled && r.priority === priority) ||
    RULES.find(r => r.enabled) ||
    RULES[0];

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="referral-${id}.pdf"`);

  const doc = new PDFDocument({ size: 'LETTER', margin: 54 });
  doc.pipe(res);

  doc.fontSize(20).fillColor('#0f172a').text('Patient Referral', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#64748b').text(`Referral ID: ${id}`);
  doc.text(`Generated: ${new Date().toISOString()}`);
  doc.moveDown(0.8);

  doc.fontSize(12).fillColor('#0f172a').text('Patient', { underline: true });
  doc.fontSize(11).fillColor('#1e293b').text(`Name: ${patient}`);
  doc.text(`Priority: ${priority}`);
  doc.moveDown(0.6);

  doc.fontSize(12).fillColor('#0f172a').text('Referring Provider', { underline: true });
  doc.fontSize(11).fillColor('#1e293b').text(`From: ${fromProvider}`);
  doc.text(`Specialty requested: ${specialty}`);
  doc.moveDown(0.6);

  doc.fontSize(12).fillColor('#0f172a').text('Clinical Reason', { underline: true });
  doc.fontSize(11).fillColor('#1e293b').text(reason, { width: 480 });
  doc.moveDown(0.6);

  doc.fontSize(12).fillColor('#0f172a').text('Routing Decision', { underline: true });
  doc.fontSize(11).fillColor('#1e293b').text(`Matched triage rule: #${rule.id} — ${rule.name}`);
  doc.text(`Destination ward: ${rule.ward}`);
  doc.text(`Target SLA: ${rule.sla_minutes} minutes`);
  doc.moveDown(0.6);

  doc.fontSize(12).fillColor('#0f172a').text('Triage Trail', { underline: true });
  doc.fontSize(10).fillColor('#334155')
    .text(`1. Referral received   — ${new Date().toISOString()}`)
    .text(`2. Triage rule engine evaluated — rule #${rule.id} matched`)
    .text(`3. Routed to ${rule.ward} (priority: ${priority})`);

  doc.moveDown(1);
  doc.fontSize(9).fillColor('#94a3b8').text(
    'This referral document is generated by AIAutomateroutingmedical Triage Views. ' +
    'It records an automated triage routing decision and does not constitute medical advice.',
    { align: 'left' }
  );

  doc.end();
});

// ---------------------------------------------------------------------------
// 4) NON-VIZ — Triage Rules Editor (CRUD priority thresholds)
//    GET  /triage-rules           → { rules }
//    PUT  /triage-rules           body: { rules: [...] }  → { rules, validation, review }
// ---------------------------------------------------------------------------
router.get('/triage-rules', (req, res) => {
  res.json({ rules: RULES, priorities: PRIORITIES });
});

router.put('/triage-rules', async (req, res) => {
  const incoming = Array.isArray(req.body?.rules) ? req.body.rules : null;
  if (!incoming) return res.status(400).json({ error: 'Body must be { rules: [...] }' });

  const errors = [];
  const sanitized = incoming.map((r, idx) => {
    const out = {
      id: Number.isFinite(r.id) ? r.id : idx + 1,
      name: String(r.name || `Rule ${idx + 1}`).slice(0, 80),
      metric: ['news2', 'temp_c', 'spo2', 'hr', 'sbp'].includes(r.metric) ? r.metric : 'news2',
      min: Math.max(0, Math.min(999, Number.isFinite(+r.min) ? +r.min : 0)),
      max: Math.max(0, Math.min(999, Number.isFinite(+r.max) ? +r.max : 0)),
      priority: PRIORITIES.includes(r.priority) ? r.priority : 'urgent',
      ward: String(r.ward || 'urgent-care').slice(0, 40),
      sla_minutes: Math.max(0, Math.min(10080, parseInt(r.sla_minutes, 10) || 30)),
      enabled: r.enabled !== false,
    };
    if (out.min > out.max) errors.push(`Rule ${idx + 1}: min > max`);
    if (!out.ward) errors.push(`Rule ${idx + 1}: ward required`);
    return out;
  });

  RULES = sanitized;

  const ai = await callAI(
    'You are a triage protocol reviewer. In one short sentence summarize coverage and SLA spread risk.',
    `Rules: ${RULES.map(r => `${r.metric}[${r.min}-${r.max}]/${r.priority}->${r.ward}@${r.sla_minutes}m`).join('; ')}.`
  );

  res.json({
    rules: RULES,
    validation: { errors, count: RULES.length },
    review: ai.content || `${RULES.length} triage rules active across ${new Set(RULES.map(r => r.ward)).size} wards.`,
    ai_disabled: !!ai.disabled,
  });
});

// Health
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    features: ['patient-flow', 'ward-occupancy-heatmap', 'referral-pdf', 'triage-rules'],
    rules_count: RULES.length,
  });
});

export default router;
