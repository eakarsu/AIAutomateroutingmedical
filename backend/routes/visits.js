import { Router } from 'express';
const router = Router();

router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(`
      SELECT v.*, p.first_name as patient_first, p.last_name as patient_last,
             n.first_name as nurse_first, n.last_name as nurse_last
      FROM visits v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN nurses n ON v.nurse_id = n.id
      ORDER BY v.visit_date DESC, v.start_time
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(`
      SELECT v.*, p.first_name as patient_first, p.last_name as patient_last, p.primary_diagnosis,
             n.first_name as nurse_first, n.last_name as nurse_last, n.specialization
      FROM visits v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN nurses n ON v.nurse_id = n.id
      WHERE v.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { patient_id, nurse_id, visit_date, start_time, end_time, visit_type, status, notes, address } = req.body;
    const result = await db.query(
      `INSERT INTO visits (patient_id, nurse_id, visit_date, start_time, end_time, visit_type, status, notes, address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [patient_id, nurse_id, visit_date, start_time, end_time, visit_type, status || 'scheduled', notes, address]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { patient_id, nurse_id, visit_date, start_time, end_time, visit_type, status, notes, address } = req.body;
    const result = await db.query(
      `UPDATE visits SET patient_id=$1, nurse_id=$2, visit_date=$3, start_time=$4, end_time=$5, visit_type=$6, status=$7, notes=$8, address=$9
       WHERE id=$10 RETURNING *`,
      [patient_id, nurse_id, visit_date, start_time, end_time, visit_type, status, notes, address, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Visit not found' });
    res.json(result.rows[0]);
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
