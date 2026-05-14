import { Router } from 'express';
const router = Router();

router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekStart = startOfWeek.toISOString().split('T')[0];

    const [
      activePatients,
      visitsToday,
      visitsThisWeek,
      utilizationData,
      driveTimeData,
      overdueAlerts,
    ] = await Promise.all([
      // Total active patients
      db.query("SELECT COUNT(*) as total FROM patients WHERE status = 'active'"),

      // Visits today (by status)
      db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'missed') as missed,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
        FROM visits WHERE visit_date = $1
      `, [today]),

      // Visits this week
      db.query(`
        SELECT COUNT(*) as total
        FROM visits WHERE visit_date >= $1 AND visit_date <= $2
      `, [weekStart, today]),

      // Clinician utilization: visits assigned vs max capacity
      db.query(`
        SELECT
          n.id,
          n.first_name,
          n.last_name,
          COUNT(v.id) as assigned_visits,
          COALESCE(s.max_visits, 8) as capacity
        FROM nurses n
        LEFT JOIN visits v ON v.nurse_id = n.id AND v.visit_date = $1
        LEFT JOIN schedules s ON s.nurse_id = n.id AND s.schedule_date = $1
        WHERE n.status = 'active'
        GROUP BY n.id, n.first_name, n.last_name, s.max_visits
      `, [today]),

      // Average drive time per visit (from route_stops duration)
      db.query(`
        SELECT COALESCE(AVG(rs.duration_from_prev), 0) as avg_drive_minutes
        FROM route_stops rs
        JOIN routes r ON rs.route_id = r.id
        WHERE r.route_date = $1
      `, [today]),

      // Overdue visit alerts: scheduled visits past their end time that are still 'scheduled'
      db.query(`
        SELECT v.id, v.visit_date, v.start_time, v.end_time, v.status, v.visit_type,
               p.first_name as patient_first, p.last_name as patient_last,
               n.first_name as nurse_first, n.last_name as nurse_last
        FROM visits v
        LEFT JOIN patients p ON v.patient_id = p.id
        LEFT JOIN nurses n ON v.nurse_id = n.id
        WHERE v.visit_date <= $1
          AND v.status = 'scheduled'
          AND (v.visit_date < $1 OR (v.visit_date = $1 AND v.end_time < CURRENT_TIME))
        ORDER BY v.visit_date DESC, v.end_time DESC
        LIMIT 20
      `, [today]),
    ]);

    // Calculate utilization rate
    const clinicians = utilizationData.rows;
    let totalAssigned = 0;
    let totalCapacity = 0;
    for (const c of clinicians) {
      totalAssigned += parseInt(c.assigned_visits);
      totalCapacity += parseInt(c.capacity);
    }
    const utilizationRate = totalCapacity > 0
      ? Math.round((totalAssigned / totalCapacity) * 100)
      : 0;

    res.json({
      active_patients: parseInt(activePatients.rows[0].total),
      visits_today: visitsToday.rows[0],
      visits_this_week: parseInt(visitsThisWeek.rows[0].total),
      clinician_utilization: {
        rate_percent: utilizationRate,
        total_assigned: totalAssigned,
        total_capacity: totalCapacity,
        by_clinician: clinicians.map(c => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`,
          assigned_visits: parseInt(c.assigned_visits),
          capacity: parseInt(c.capacity),
          utilization_percent: parseInt(c.capacity) > 0
            ? Math.round((parseInt(c.assigned_visits) / parseInt(c.capacity)) * 100)
            : 0,
        })),
      },
      avg_drive_time_minutes: Math.round(parseFloat(driveTimeData.rows[0].avg_drive_minutes)),
      overdue_alerts: overdueAlerts.rows,
      overdue_count: overdueAlerts.rows.length,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Keep the existing stats endpoint
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
