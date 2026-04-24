import { Router } from 'express';
const router = Router();

router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query(`
      SELECT r.*, n.first_name, n.last_name,
             (SELECT COUNT(*) FROM route_stops rs WHERE rs.route_id = r.id) as stop_count
      FROM routes r LEFT JOIN nurses n ON r.nurse_id = n.id ORDER BY r.route_date DESC, r.id
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const route = await db.query(`
      SELECT r.*, n.first_name, n.last_name, n.specialization
      FROM routes r LEFT JOIN nurses n ON r.nurse_id = n.id WHERE r.id = $1
    `, [req.params.id]);
    if (route.rows.length === 0) return res.status(404).json({ error: 'Route not found' });
    const stops = await db.query(`
      SELECT rs.*, v.visit_type, v.start_time, v.end_time, v.address,
             p.first_name as patient_first, p.last_name as patient_last
      FROM route_stops rs
      LEFT JOIN visits v ON rs.visit_id = v.id
      LEFT JOIN patients p ON v.patient_id = p.id
      WHERE rs.route_id = $1 ORDER BY rs.stop_order
    `, [req.params.id]);
    res.json({ ...route.rows[0], stops: stops.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { nurse_id, route_date, status, total_distance, total_duration, optimization_score } = req.body;
    const result = await db.query(
      `INSERT INTO routes (nurse_id, route_date, status, total_distance, total_duration, optimization_score)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nurse_id, route_date, status || 'planned', total_distance, total_duration, optimization_score]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { nurse_id, route_date, status, total_distance, total_duration, optimization_score } = req.body;
    const result = await db.query(
      `UPDATE routes SET nurse_id=$1, route_date=$2, status=$3, total_distance=$4, total_duration=$5, optimization_score=$6
       WHERE id=$7 RETURNING *`,
      [nurse_id, route_date, status, total_distance, total_duration, optimization_score, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Route not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    await db.query('DELETE FROM route_stops WHERE route_id = $1', [req.params.id]);
    const result = await db.query('DELETE FROM routes WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Route not found' });
    res.json({ message: 'Route deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
