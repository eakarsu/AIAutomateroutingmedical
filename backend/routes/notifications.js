import { Router } from 'express';
import { z } from 'zod';
import { sendVisitReminder, sendVisitStatusAlert, saveNotification } from '../services/notificationService.js';

const router = Router();

// Get all notifications — paginated
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows, count] = await Promise.all([
      db.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
      db.query('SELECT COUNT(*) FROM notifications'),
    ]);

    const total = parseInt(count.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/read', async (req, res) => {
  try {
    const db = req.app.locals.db;
    await db.query('UPDATE notifications SET is_read = true WHERE id = $1', [req.params.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    await db.query('DELETE FROM notifications WHERE id = $1', [req.params.id]);
    res.json({ message: 'Notification deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const sendSchema = z.object({
  type: z.enum(['visit_reminder', 'status_alert'], { message: 'type must be visit_reminder or status_alert' }),
  visit_id: z.coerce.number().int().positive('visit_id required'),
  recipient_email: z.string().email().optional(),
});

// Internal endpoint: send email/SMS notification
router.post('/send', async (req, res) => {
  try {
    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { type, visit_id, recipient_email } = parsed.data;

    const visitResult = await db.query(`
      SELECT v.*,
             p.first_name as patient_first, p.last_name as patient_last,
             p.primary_diagnosis, p.address as patient_address,
             n.first_name as nurse_first, n.last_name as nurse_last,
             n.email as nurse_email, n.phone as nurse_phone
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      LEFT JOIN nurses n ON v.nurse_id = n.id
      WHERE v.id = $1
    `, [visit_id]);

    if (visitResult.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });

    const v = visitResult.rows[0];
    const patient = { first_name: v.patient_first, last_name: v.patient_last, primary_diagnosis: v.primary_diagnosis };
    const clinician = { first_name: v.nurse_first, last_name: v.nurse_last, email: v.nurse_email, phone: v.nurse_phone };

    let result;
    if (type === 'visit_reminder') {
      result = await sendVisitReminder(patient, clinician, v);
      await saveNotification(db, null, 'Visit Reminder Sent', `Reminder sent for visit on ${v.visit_date} to ${clinician.first_name} ${clinician.last_name}`, 'reminder');
    } else {
      const supervisor = recipient_email || process.env.SUPERVISOR_EMAIL;
      result = await sendVisitStatusAlert(v, patient, clinician, supervisor);
      await saveNotification(db, null, `Visit ${v.status} Alert`, `Alert sent: visit ${visit_id} is ${v.status}`, 'alert');
    }

    res.json({ success: true, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
