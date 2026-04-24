import { Router } from 'express';
const router = Router();

router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(`
      SELECT o.*, p.first_name as patient_first, p.last_name as patient_last
      FROM medical_orders o LEFT JOIN patients p ON o.patient_id = p.id ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
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
    const db = req.app.locals.db;
    const { patient_id, ordering_physician, order_type, description, priority, status, start_date, end_date, frequency, instructions } = req.body;
    const result = await db.query(
      `INSERT INTO medical_orders (patient_id, ordering_physician, order_type, description, priority, status, start_date, end_date, frequency, instructions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [patient_id, ordering_physician, order_type, description, priority || 'routine', status || 'pending', start_date, end_date, frequency, instructions]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { patient_id, ordering_physician, order_type, description, priority, status, start_date, end_date, frequency, instructions } = req.body;
    const result = await db.query(
      `UPDATE medical_orders SET patient_id=$1, ordering_physician=$2, order_type=$3, description=$4, priority=$5, status=$6, start_date=$7, end_date=$8, frequency=$9, instructions=$10, updated_at=NOW()
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
