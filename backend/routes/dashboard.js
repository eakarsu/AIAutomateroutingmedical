import { Router } from 'express';
const router = Router();

router.get('/stats', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [nurses, patients, visits, orders, routes, schedules, notifications] = await Promise.all([
      db.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='active') as active FROM nurses"),
      db.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='active') as active FROM patients"),
      db.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='scheduled') as scheduled, COUNT(*) FILTER (WHERE status='completed') as completed, COUNT(*) FILTER (WHERE status='in_progress') as in_progress FROM visits WHERE visit_date = CURRENT_DATE"),
      db.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='active') as active, COUNT(*) FILTER (WHERE priority='high' OR priority='urgent') as high_priority FROM medical_orders"),
      db.query("SELECT COUNT(*) as total, COALESCE(AVG(optimization_score),0) as avg_score FROM routes WHERE route_date = CURRENT_DATE"),
      db.query("SELECT COUNT(*) as total FROM schedules WHERE schedule_date = CURRENT_DATE"),
      db.query("SELECT COUNT(*) as unread FROM notifications WHERE is_read = false"),
    ]);
    res.json({
      nurses: nurses.rows[0],
      patients: patients.rows[0],
      visits: visits.rows[0],
      orders: orders.rows[0],
      routes: routes.rows[0],
      schedules: schedules.rows[0],
      notifications: notifications.rows[0],
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
