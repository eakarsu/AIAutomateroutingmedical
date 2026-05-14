import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const nurseSchema = z.object({
  first_name: z.string().min(1, 'first_name required'),
  last_name: z.string().min(1, 'last_name required'),
  email: z.string().email('valid email required'),
  phone: z.string().optional(),
  license_number: z.string().optional(),
  specialization: z.string().optional(),
  status: z.enum(['active', 'inactive', 'on_leave']).optional().default('active'),
  hire_date: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

// Get all nurses — paginated
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows, count] = await Promise.all([
      db.query('SELECT * FROM nurses ORDER BY id LIMIT $1 OFFSET $2', [limit, offset]),
      db.query('SELECT COUNT(*) FROM nurses'),
    ]);

    const total = parseInt(count.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single nurse
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('SELECT * FROM nurses WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Nurse not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create nurse
router.post('/', async (req, res) => {
  try {
    const parsed = nurseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { first_name, last_name, email, phone, license_number, specialization, status, hire_date, address, city, state, zip } = parsed.data;
    const result = await db.query(
      `INSERT INTO nurses (first_name, last_name, email, phone, license_number, specialization, status, hire_date, address, city, state, zip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [first_name, last_name, email, phone, license_number, specialization, status, hire_date, address, city, state, zip]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update nurse
router.put('/:id', async (req, res) => {
  try {
    const parsed = nurseSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { first_name, last_name, email, phone, license_number, specialization, status, hire_date, address, city, state, zip } = parsed.data;
    const result = await db.query(
      `UPDATE nurses SET first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name), email=COALESCE($3,email), phone=COALESCE($4,phone), license_number=COALESCE($5,license_number), specialization=COALESCE($6,specialization), status=COALESCE($7,status), hire_date=COALESCE($8,hire_date), address=COALESCE($9,address), city=COALESCE($10,city), state=COALESCE($11,state), zip=COALESCE($12,zip)
       WHERE id=$13 RETURNING *`,
      [first_name, last_name, email, phone, license_number, specialization, status, hire_date, address, city, state, zip, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Nurse not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete nurse
router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('DELETE FROM nurses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Nurse not found' });
    res.json({ message: 'Nurse deleted', nurse: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
