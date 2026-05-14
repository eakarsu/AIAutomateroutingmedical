import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const patientSchema = z.object({
  first_name: z.string().min(1, 'first_name required'),
  last_name: z.string().min(1, 'last_name required'),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().min(1, 'address required'),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  insurance_provider: z.string().optional(),
  insurance_id: z.string().optional(),
  primary_diagnosis: z.string().optional(),
  status: z.enum(['active', 'inactive', 'discharged']).optional().default('active'),
  assigned_nurse_id: z.coerce.number().int().positive().optional().nullable(),
});

// Get all patients — paginated
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows, count] = await Promise.all([
      db.query(
        `SELECT p.*, n.first_name as nurse_first_name, n.last_name as nurse_last_name
         FROM patients p LEFT JOIN nurses n ON p.assigned_nurse_id = n.id ORDER BY p.id LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.query('SELECT COUNT(*) FROM patients'),
    ]);

    const total = parseInt(count.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(`
      SELECT p.*, n.first_name as nurse_first_name, n.last_name as nurse_last_name
      FROM patients p LEFT JOIN nurses n ON p.assigned_nurse_id = n.id WHERE p.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const parsed = patientSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { first_name, last_name, date_of_birth, gender, phone, email, address, city, state, zip, insurance_provider, insurance_id, primary_diagnosis, status, assigned_nurse_id } = parsed.data;
    const result = await db.query(
      `INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, email, address, city, state, zip, insurance_provider, insurance_id, primary_diagnosis, status, assigned_nurse_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [first_name, last_name, date_of_birth, gender, phone, email || null, address, city, state, zip, insurance_provider, insurance_id, primary_diagnosis, status, assigned_nurse_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const parsed = patientSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { first_name, last_name, date_of_birth, gender, phone, email, address, city, state, zip, insurance_provider, insurance_id, primary_diagnosis, status, assigned_nurse_id } = parsed.data;
    const result = await db.query(
      `UPDATE patients SET first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name), date_of_birth=COALESCE($3,date_of_birth), gender=COALESCE($4,gender), phone=COALESCE($5,phone), email=COALESCE($6,email), address=COALESCE($7,address), city=COALESCE($8,city), state=COALESCE($9,state), zip=COALESCE($10,zip), insurance_provider=COALESCE($11,insurance_provider), insurance_id=COALESCE($12,insurance_id), primary_diagnosis=COALESCE($13,primary_diagnosis), status=COALESCE($14,status), assigned_nurse_id=COALESCE($15,assigned_nurse_id)
       WHERE id=$16 RETURNING *`,
      [first_name, last_name, date_of_birth, gender, phone, email || null, address, city, state, zip, insurance_provider, insurance_id, primary_diagnosis, status, assigned_nurse_id || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('DELETE FROM patients WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json({ message: 'Patient deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
