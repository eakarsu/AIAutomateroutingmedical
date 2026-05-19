import { Router } from 'express';
import { z } from 'zod';
import { sendVisitStatusAlert, saveNotification } from '../services/notificationService.js';

const router = Router();

const visitSchema = z.object({
  patient_id: z.coerce.number().int().positive('patient_id required'),
  nurse_id: z.coerce.number().int().positive().optional().nullable(),
  visit_date: z.string().min(1, 'visit_date required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  visit_type: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'missed', 'cancelled']).optional().default('scheduled'),
  notes: z.string().optional(),
  address: z.string().optional(),
});

// Get all visits — paginated
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows, count] = await Promise.all([
      db.query(
        `SELECT v.*, p.first_name as patient_first, p.last_name as patient_last,
                p.primary_diagnosis, p.address as patient_address,
                n.first_name as nurse_first, n.last_name as nurse_last
         FROM visits v
         LEFT JOIN patients p ON v.patient_id = p.id
         LEFT JOIN nurses n ON v.nurse_id = n.id
         ORDER BY v.visit_date DESC, v.start_time LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.query('SELECT COUNT(*) FROM visits'),
    ]);

    const total = parseInt(count.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(`
      SELECT v.*, p.first_name as patient_first, p.last_name as patient_last,
             p.primary_diagnosis, p.date_of_birth, p.address as patient_address,
             p.phone as patient_phone, p.insurance_provider,
             n.first_name as nurse_first, n.last_name as nurse_last, n.specialization,
             n.license_number, n.email as nurse_email
      FROM visits v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN nurses n ON v.nurse_id = n.id
      WHERE v.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PDF export for clinical visit note
router.get('/:id/note/pdf', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(`
      SELECT v.*, p.first_name as patient_first, p.last_name as patient_last,
             p.primary_diagnosis, p.date_of_birth, p.address as patient_address,
             p.phone as patient_phone, p.insurance_provider, p.gender,
             n.first_name as nurse_first, n.last_name as nurse_last, n.specialization,
             n.license_number
      FROM visits v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN nurses n ON v.nurse_id = n.id
      WHERE v.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });

    const v = result.rows[0];
    const { default: PDFDocument } = await import('pdfkit');
    const pdf = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="visit-note-${req.params.id}.pdf"`);
    pdf.pipe(res);

    pdf.fontSize(18).font('Helvetica-Bold').text('CLINICAL VISIT NOTE', { align: 'center' });
    pdf.fontSize(10).font('Helvetica').fillColor('#666').text('Home Health Services', { align: 'center' });
    pdf.moveDown(0.5);
    pdf.moveTo(50, pdf.y).lineTo(562, pdf.y).stroke('#cccccc');
    pdf.moveDown(1);

    pdf.fontSize(13).font('Helvetica-Bold').fillColor('#000').text('Patient Information');
    pdf.moveDown(0.5);
    pdf.fontSize(11).font('Helvetica');
    const patientFields = [
      ['Patient Name', `${v.patient_first || ''} ${v.patient_last || ''}`.trim()],
      ['Date of Birth', v.date_of_birth ? new Date(v.date_of_birth).toLocaleDateString() : 'N/A'],
      ['Gender', v.gender || 'N/A'],
      ['Phone', v.patient_phone || 'N/A'],
      ['Address', v.patient_address || v.address || 'N/A'],
      ['Insurance', v.insurance_provider || 'N/A'],
      ['Primary Diagnosis', v.primary_diagnosis || 'N/A'],
    ];
    for (const [label, value] of patientFields) {
      pdf.font('Helvetica-Bold').text(`${label}: `, { continued: true }).font('Helvetica').text(String(value));
    }

    pdf.moveDown(1);
    pdf.moveTo(50, pdf.y).lineTo(562, pdf.y).stroke('#cccccc');
    pdf.moveDown(1);

    pdf.fontSize(13).font('Helvetica-Bold').text('Visit Details');
    pdf.moveDown(0.5);
    const visitFields = [
      ['Visit Date', v.visit_date ? new Date(v.visit_date).toLocaleDateString() : 'N/A'],
      ['Start Time', v.start_time || 'N/A'],
      ['End Time', v.end_time || 'N/A'],
      ['Visit Type', v.visit_type || 'N/A'],
      ['Status', v.status || 'N/A'],
      ['Address', v.address || 'N/A'],
    ];
    pdf.fontSize(11).font('Helvetica');
    for (const [label, value] of visitFields) {
      pdf.font('Helvetica-Bold').text(`${label}: `, { continued: true }).font('Helvetica').text(String(value));
    }

    pdf.moveDown(1);
    pdf.moveTo(50, pdf.y).lineTo(562, pdf.y).stroke('#cccccc');
    pdf.moveDown(1);

    pdf.fontSize(13).font('Helvetica-Bold').text('Vitals Recorded');
    pdf.moveDown(0.5);
    pdf.fontSize(11).font('Helvetica');
    if (v.vitals && typeof v.vitals === 'object' && Object.keys(v.vitals).length > 0) {
      for (const [key, val] of Object.entries(v.vitals)) {
        pdf.font('Helvetica-Bold').text(`${key}: `, { continued: true }).font('Helvetica').text(String(val));
      }
    } else {
      pdf.text('No vitals recorded.');
    }

    pdf.moveDown(1);
    pdf.moveTo(50, pdf.y).lineTo(562, pdf.y).stroke('#cccccc');
    pdf.moveDown(1);

    pdf.fontSize(13).font('Helvetica-Bold').text('Clinical Notes / Assessments');
    pdf.moveDown(0.5);
    pdf.fontSize(11).font('Helvetica');
    if (v.notes) { pdf.text(v.notes); } else { pdf.text('No clinical notes recorded.'); }
    if (v.ai_notes) {
      pdf.moveDown(0.5);
      pdf.fontSize(12).font('Helvetica-Bold').text('AI-Generated SOAP Notes:');
      pdf.fontSize(10).font('Helvetica').text(v.ai_notes);
    }

    pdf.moveDown(1);
    pdf.moveTo(50, pdf.y).lineTo(562, pdf.y).stroke('#cccccc');
    pdf.moveDown(1);

    pdf.fontSize(13).font('Helvetica-Bold').text('Clinician Signature');
    pdf.moveDown(0.5);
    pdf.fontSize(11).font('Helvetica');
    pdf.text(`Clinician: ${v.nurse_first || ''} ${v.nurse_last || ''}`.trim());
    pdf.text(`Specialization: ${v.specialization || 'N/A'}`);
    pdf.text(`License Number: ${v.license_number || 'N/A'}`);
    pdf.moveDown(2);
    pdf.text('Signature: ___________________________________');
    pdf.moveDown(0.5);
    pdf.text(`Date: ${new Date().toLocaleDateString()}`);

    pdf.moveDown(2);
    pdf.moveTo(50, pdf.y).lineTo(562, pdf.y).stroke('#cccccc');
    pdf.moveDown(0.5);
    pdf.fontSize(8).fillColor('#999').text('CONFIDENTIAL - This clinical document is for authorized personnel only.', { align: 'center' });

    pdf.end();
  } catch (err) {
    console.error('PDF visit note error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const parsed = visitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { patient_id, nurse_id, visit_date, start_time, end_time, visit_type, status, notes, address } = parsed.data;
    const result = await db.query(
      `INSERT INTO visits (patient_id, nurse_id, visit_date, start_time, end_time, visit_type, status, notes, address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [patient_id, nurse_id || null, visit_date, start_time, end_time, visit_type, status, notes, address]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const parsed = visitSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { patient_id, nurse_id, visit_date, start_time, end_time, visit_type, status, notes, address } = parsed.data;

    const currentVisit = await db.query('SELECT * FROM visits WHERE id = $1', [req.params.id]);
    if (currentVisit.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    const prevStatus = currentVisit.rows[0].status;

    const result = await db.query(
      `UPDATE visits SET
         patient_id=COALESCE($1,patient_id), nurse_id=COALESCE($2,nurse_id), visit_date=COALESCE($3,visit_date),
         start_time=COALESCE($4,start_time), end_time=COALESCE($5,end_time), visit_type=COALESCE($6,visit_type),
         status=COALESCE($7,status), notes=COALESCE($8,notes), address=COALESCE($9,address)
       WHERE id=$10 RETURNING *`,
      [patient_id, nurse_id || null, visit_date, start_time, end_time, visit_type, status, notes, address, req.params.id]
    );

    const updated = result.rows[0];

    if (status && (status === 'missed' || status === 'cancelled') && status !== prevStatus) {
      try {
        const patientResult = await db.query('SELECT * FROM patients WHERE id = $1', [patient_id || updated.patient_id]);
        const nurseResult = updated.nurse_id
          ? await db.query('SELECT * FROM nurses WHERE id = $1', [updated.nurse_id])
          : { rows: [] };
        const patient = patientResult.rows[0] || {};
        const clinician = nurseResult.rows[0] || {};
        const supervisorEmail = process.env.SUPERVISOR_EMAIL;
        await sendVisitStatusAlert(updated, patient, clinician, supervisorEmail);
        await saveNotification(
          db,
          null,
          `Visit ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          `Visit for ${patient.first_name || ''} ${patient.last_name || ''} on ${updated.visit_date} marked as ${status}.`,
          'alert'
        );
      } catch (notifErr) {
        console.error('Notification error:', notifErr.message);
      }
    }

    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('DELETE FROM visits WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    res.json({ message: 'Visit deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
