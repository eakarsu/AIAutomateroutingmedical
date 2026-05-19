import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const orderSchema = z.object({
  patient_id: z.coerce.number().int().positive('patient_id required'),
  ordering_physician: z.string().optional(),
  order_type: z.string().min(1, 'order_type required'),
  description: z.string().optional(),
  priority: z.enum(['routine', 'urgent', 'stat']).optional().default('routine'),
  status: z.enum(['pending', 'active', 'completed', 'cancelled']).optional().default('pending'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  frequency: z.string().optional(),
  instructions: z.string().optional(),
});

// Get all orders — paginated
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows, count] = await Promise.all([
      db.query(
        `SELECT o.*, p.first_name as patient_first, p.last_name as patient_last
         FROM medical_orders o LEFT JOIN patients p ON o.patient_id = p.id ORDER BY o.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.query('SELECT COUNT(*) FROM medical_orders'),
    ]);

    const total = parseInt(count.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(`
      SELECT o.*, p.first_name as patient_first, p.last_name as patient_last, p.primary_diagnosis, p.insurance_provider
      FROM medical_orders o LEFT JOIN patients p ON o.patient_id = p.id WHERE o.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { patient_id, ordering_physician, order_type, description, priority, status, start_date, end_date, frequency, instructions } = parsed.data;
    const result = await db.query(
      `INSERT INTO medical_orders (patient_id, ordering_physician, order_type, description, priority, status, start_date, end_date, frequency, instructions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [patient_id, ordering_physician, order_type, description, priority, status, start_date, end_date, frequency, instructions]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const parsed = orderSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { patient_id, ordering_physician, order_type, description, priority, status, start_date, end_date, frequency, instructions } = parsed.data;
    const result = await db.query(
      `UPDATE medical_orders SET
         patient_id=COALESCE($1,patient_id), ordering_physician=COALESCE($2,ordering_physician), order_type=COALESCE($3,order_type),
         description=COALESCE($4,description), priority=COALESCE($5,priority), status=COALESCE($6,status),
         start_date=COALESCE($7,start_date), end_date=COALESCE($8,end_date), frequency=COALESCE($9,frequency),
         instructions=COALESCE($10,instructions), updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [patient_id, ordering_physician, order_type, description, priority, status, start_date, end_date, frequency, instructions, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('DELETE FROM medical_orders WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
