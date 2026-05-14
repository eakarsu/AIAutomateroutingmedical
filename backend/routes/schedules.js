import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const scheduleSchema = z.object({
  nurse_id: z.coerce.number().int().positive('nurse_id required'),
  schedule_date: z.string().min(1, 'schedule_date required'),
  shift_start: z.string().optional(),
  shift_end: z.string().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional().default('scheduled'),
  territory: z.string().optional(),
  max_visits: z.coerce.number().int().positive().optional().default(8),
  notes: z.string().optional(),
});

// Get all schedules — paginated
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows, count] = await Promise.all([
      db.query(
        `SELECT s.*, n.first_name, n.last_name, n.specialization
         FROM schedules s LEFT JOIN nurses n ON s.nurse_id = n.id ORDER BY s.schedule_date, s.shift_start LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.query('SELECT COUNT(*) FROM schedules'),
    ]);

    const total = parseInt(count.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(`
      SELECT s.*, n.first_name, n.last_name, n.specialization, n.phone
      FROM schedules s LEFT JOIN nurses n ON s.nurse_id = n.id WHERE s.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Schedule not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { nurse_id, schedule_date, shift_start, shift_end, status, territory, max_visits, notes } = parsed.data;
    const result = await db.query(
      `INSERT INTO schedules (nurse_id, schedule_date, shift_start, shift_end, status, territory, max_visits, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nurse_id, schedule_date, shift_start, shift_end, status, territory, max_visits, notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const parsed = scheduleSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { nurse_id, schedule_date, shift_start, shift_end, status, territory, max_visits, notes } = parsed.data;
    const result = await db.query(
      `UPDATE schedules SET
         nurse_id=COALESCE($1,nurse_id), schedule_date=COALESCE($2,schedule_date),
         shift_start=COALESCE($3,shift_start), shift_end=COALESCE($4,shift_end),
         status=COALESCE($5,status), territory=COALESCE($6,territory),
         max_visits=COALESCE($7,max_visits), notes=COALESCE($8,notes)
       WHERE id=$9 RETURNING *`,
      [nurse_id, schedule_date, shift_start, shift_end, status, territory, max_visits, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Schedule not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('DELETE FROM schedules WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Schedule not found' });
    res.json({ message: 'Schedule deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
