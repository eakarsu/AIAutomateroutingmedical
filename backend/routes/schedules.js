import { Router } from 'express';
const router = Router();

router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(`
      SELECT s.*, n.first_name, n.last_name, n.specialization
      FROM schedules s LEFT JOIN nurses n ON s.nurse_id = n.id ORDER BY s.schedule_date, s.shift_start
    `);
    res.json(result.rows);
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
    const db = req.app.locals.db;
    const { nurse_id, schedule_date, shift_start, shift_end, status, territory, max_visits, notes } = req.body;
    const result = await db.query(
      `INSERT INTO schedules (nurse_id, schedule_date, shift_start, shift_end, status, territory, max_visits, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nurse_id, schedule_date, shift_start, shift_end, status || 'scheduled', territory, max_visits || 8, notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { nurse_id, schedule_date, shift_start, shift_end, status, territory, max_visits, notes } = req.body;
    const result = await db.query(
      `UPDATE schedules SET nurse_id=$1, schedule_date=$2, shift_start=$3, shift_end=$4, status=$5, territory=$6, max_visits=$7, notes=$8
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
