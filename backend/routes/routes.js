import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const routeSchema = z.object({
  nurse_id: z.coerce.number().int().positive('nurse_id required'),
  route_date: z.string().min(1, 'route_date required'),
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']).optional().default('planned'),
  total_distance: z.coerce.number().optional(),
  total_duration: z.coerce.number().int().optional(),
  optimization_score: z.coerce.number().optional(),
});

// Get all routes — paginated
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows, count] = await Promise.all([
      db.query(
        `SELECT r.*, n.first_name, n.last_name,
                (SELECT COUNT(*) FROM route_stops rs WHERE rs.route_id = r.id) as stop_count
         FROM routes r LEFT JOIN nurses n ON r.nurse_id = n.id ORDER BY r.route_date DESC, r.id LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.query('SELECT COUNT(*) FROM routes'),
    ]);

    const total = parseInt(count.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
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
    const parsed = routeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { nurse_id, route_date, status, total_distance, total_duration, optimization_score } = parsed.data;
    const result = await db.query(
      `INSERT INTO routes (nurse_id, route_date, status, total_distance, total_duration, optimization_score)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nurse_id, route_date, status, total_distance, total_duration, optimization_score]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const parsed = routeSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });

    const db = req.app.locals.db;
    const { nurse_id, route_date, status, total_distance, total_duration, optimization_score } = parsed.data;
    const result = await db.query(
      `UPDATE routes SET
         nurse_id=COALESCE($1,nurse_id), route_date=COALESCE($2,route_date), status=COALESCE($3,status),
         total_distance=COALESCE($4,total_distance), total_duration=COALESCE($5,total_duration),
         optimization_score=COALESCE($6,optimization_score)
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
