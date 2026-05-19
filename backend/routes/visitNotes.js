import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const noteSchema = z.object({
  visit_id: z.coerce.number().int().positive('visit_id required'),
  nurse_id: z.coerce.number().int().positive().optional().nullable(),
  note_type: z.string().optional(),
  content: z.string().min(1, 'content required'),
  ai_generated: z.boolean().optional().default(false),
});

// Get all visit notes — paginated
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows, count] = await Promise.all([
      db.query(
        `SELECT vn.*, v.visit_date, v.visit_type,
                p.first_name as patient_first, p.last_name as patient_last,
                n.first_name as nurse_first, n.last_name as nurse_last
         FROM visit_notes vn
         LEFT JOIN visits v ON vn.visit_id = v.id
         LEFT JOIN patients p ON v.patient_id = p.id
         LEFT JOIN nurses n ON vn.nurse_id = n.id
         ORDER BY vn.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.query('SELECT COUNT(*) FROM visit_notes'),
    ]);

    const total = parseInt(count.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(`
      SELECT vn.*, v.visit_date, v.visit_type, v.notes as visit_notes,
             p.first_name as patient_first, p.last_name as patient_last, p.primary_diagnosis,
             n.first_name as nurse_first, n.last_name as nurse_last
      FROM visit_notes vn
      LEFT JOIN visits v ON vn.visit_id = v.id
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN nurses n ON vn.nurse_id = n.id
      WHERE vn.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { visit_id, nurse_id, note_type, content, ai_generated } = parsed.data;
    const result = await db.query(
      `INSERT INTO visit_notes (visit_id, nurse_id, note_type, content, ai_generated)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [visit_id, nurse_id || null, note_type, content, ai_generated]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const parsed = noteSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { visit_id, nurse_id, note_type, content } = parsed.data;
    const result = await db.query(
      `UPDATE visit_notes SET
         visit_id=COALESCE($1,visit_id), nurse_id=COALESCE($2,nurse_id),
         note_type=COALESCE($3,note_type), content=COALESCE($4,content)
       WHERE id=$5 RETURNING *`,
      [visit_id, nurse_id || null, note_type, content, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('DELETE FROM visit_notes WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ message: 'Note deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
