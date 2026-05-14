import { Router } from 'express';

const router = Router();

// GET /api/analytics/routes
// Returns: total miles per clinician per week, avg visits per route,
//          most common visit durations by care type, cancellation rate by reason
router.get('/routes', async (req, res) => {
  try {
    const db = req.app.locals.db;

    // Week boundaries (default: current week)
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekStart = (req.query.week_start || startOfWeek.toISOString().split('T')[0]);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const [
      milesByClinicianWeek,
      avgVisitsPerRoute,
      visitDurationsByType,
      cancellationRate,
    ] = await Promise.all([
      // Total miles driven per clinician per week
      db.query(`
        SELECT
          n.id as nurse_id,
          n.first_name,
          n.last_name,
          COALESCE(SUM(r.total_distance), 0) as total_miles,
          COUNT(r.id) as total_routes
        FROM nurses n
        LEFT JOIN routes r ON r.nurse_id = n.id
          AND r.route_date >= $1 AND r.route_date <= $2
        WHERE n.status = 'active'
        GROUP BY n.id, n.first_name, n.last_name
        ORDER BY total_miles DESC
      `, [weekStart, weekEndStr]),

      // Average visits per route
      db.query(`
        SELECT
          COALESCE(AVG(stop_counts.stop_count), 0) as avg_visits_per_route
        FROM (
          SELECT route_id, COUNT(*) as stop_count
          FROM route_stops
          GROUP BY route_id
        ) stop_counts
        JOIN routes r ON r.id = stop_counts.route_id
        WHERE r.route_date >= $1 AND r.route_date <= $2
      `, [weekStart, weekEndStr]),

      // Most common visit durations by care type
      // Duration computed from start_time/end_time where both exist
      db.query(`
        SELECT
          visit_type,
          COUNT(*) as visit_count,
          ROUND(AVG(
            EXTRACT(EPOCH FROM (end_time::interval - start_time::interval)) / 60
          ))::int as avg_duration_minutes,
          MIN(EXTRACT(EPOCH FROM (end_time::interval - start_time::interval)) / 60)::int as min_duration_minutes,
          MAX(EXTRACT(EPOCH FROM (end_time::interval - start_time::interval)) / 60)::int as max_duration_minutes
        FROM visits
        WHERE visit_date >= $1 AND visit_date <= $2
          AND start_time IS NOT NULL AND end_time IS NOT NULL
          AND end_time > start_time
        GROUP BY visit_type
        ORDER BY visit_count DESC
      `, [weekStart, weekEndStr]),

      // Cancellation rate by reason (using visit notes for reason, or grouping by status/visit_type as proxy)
      db.query(`
        SELECT
          visit_type,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
          COUNT(*) as total_count,
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE status = 'cancelled') / NULLIF(COUNT(*), 0), 1
          ) as cancellation_rate_percent
        FROM visits
        WHERE visit_date >= $1 AND visit_date <= $2
        GROUP BY visit_type
        ORDER BY cancellation_rate_percent DESC NULLS LAST
      `, [weekStart, weekEndStr]),
    ]);

    res.json({
      period: { week_start: weekStart, week_end: weekEndStr },
      miles_by_clinician: milesByClinicianWeek.rows.map(r => ({
        nurse_id: r.nurse_id,
        name: `${r.first_name} ${r.last_name}`,
        total_miles: parseFloat(r.total_miles),
        total_routes: parseInt(r.total_routes),
      })),
      avg_visits_per_route: parseFloat(avgVisitsPerRoute.rows[0]?.avg_visits_per_route || 0),
      visit_durations_by_type: visitDurationsByType.rows,
      cancellation_rate_by_type: cancellationRate.rows,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
