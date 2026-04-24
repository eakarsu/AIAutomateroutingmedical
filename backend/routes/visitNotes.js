import { Router } from 'express';
const router = Router();

router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(`
      SELECT vn.*, v.visit_date, v.visit_type,
             p.first_name as patient_first, p.last_name as patient_last,
             n.first_name as nurse_first, n.last_name as nurse_last
      FROM visit_notes vn
      LEFT JOIN visits v ON vn.visit_id = v.id
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN nurses n ON vn.nurse_id = n.id
      ORDER BY vn.created_at DESC
    `);
    res.json(result.rows);
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
    const db = req.app.locals.db;
    const { visit_id, nurse_id, note_type, content, ai_generated } = req.body;
    const result = await db.query(
      `INSERT INTO visit_notes (visit_id, nurse_id, note_type, content, ai_generated)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [visit_id, nurse_id, note_type, content, ai_generated || false]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { visit_id, nurse_id, note_type, content } = req.body;
    const result = await db.query(
      `UPDATE visit_notes SET visit_id=$1, nurse_id=$2, note_type=$3, content=$4
       WHERE id=$5 RETURNING *`,
      [visit_id, nurse_id, note_type, content, req.params.id]
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
