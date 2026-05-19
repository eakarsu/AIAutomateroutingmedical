import { useState, useEffect } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';
import { BarChart3, TrendingUp } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [weekStart, setWeekStart] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.getRouteAnalytics(weekStart || undefined);
      setData(r);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <>
      <div className="page-header">
        <div><h2>Route Analytics</h2><div className="page-header-sub">Weekly miles, visit durations, cancellation rates</div></div>
      </div>
      <div className="page-body">
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Week start (Sunday)</label>
              <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
          </div>
        </div>

        {data && (
          <>
            <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
              <h3>Period: {data.period.week_start} to {data.period.week_end}</h3>
              <p>Avg visits per route: <strong>{data.avg_visits_per_route.toFixed(2)}</strong></p>
            </div>

            <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
              <h3><BarChart3 size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />Miles by Clinician</h3>
              <table className="data-table">
                <thead><tr><th>Nurse</th><th>Routes</th><th>Total Miles</th></tr></thead>
                <tbody>{data.miles_by_clinician.map((c) => (
                  <tr key={c.nurse_id}><td>{c.name}</td><td>{c.total_routes}</td><td><strong>{c.total_miles.toFixed(1)}</strong></td></tr>
                ))}</tbody>
              </table>
            </div>

            <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
              <h3><TrendingUp size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />Visit Durations by Type</h3>
              <table className="data-table">
                <thead><tr><th>Visit Type</th><th>Count</th><th>Avg Min</th><th>Min</th><th>Max</th></tr></thead>
                <tbody>{data.visit_durations_by_type.map((d, i) => (
                  <tr key={i}>
                    <td>{d.visit_type}</td><td>{d.visit_count}</td>
                    <td>{d.avg_duration_minutes}</td>
                    <td>{d.min_duration_minutes}</td>
                    <td>{d.max_duration_minutes}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)' }}>
              <h3>Cancellation Rate by Visit Type</h3>
              <table className="data-table">
                <thead><tr><th>Visit Type</th><th>Cancelled</th><th>Total</th><th>Rate %</th></tr></thead>
                <tbody>{data.cancellation_rate_by_type.map((d, i) => (
                  <tr key={i}>
                    <td>{d.visit_type}</td><td>{d.cancelled_count}</td><td>{d.total_count}</td>
                    <td><strong style={{ color: parseFloat(d.cancellation_rate_percent) > 10 ? '#ef4444' : '#10b981' }}>
                      {d.cancellation_rate_percent || '0.0'}%
                    </strong></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
