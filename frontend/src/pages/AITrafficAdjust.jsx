import { useState, useEffect } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';
import { TrafficCone, Sparkles } from 'lucide-react';

export default function AITrafficAdjust() {
  const [routes, setRoutes] = useState([]);
  const [routeId, setRouteId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.getRoutes().then(setRoutes).catch(() => {}); }, []);

  const run = async () => {
    if (!routeId) return toast.error('Select a route');
    setLoading(true); setResult(null);
    try {
      const data = await api.trafficAdjust({ route_id: routeId });
      setResult(data);
    } catch (err) { toast.error('Adjust failed: ' + err.message); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <div><h2>Route Traffic Integration</h2><div className="page-header-sub">Real-time traffic adjustments to ETAs and stop ordering</div></div>
      </div>
      <div className="page-body">
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
          <div className="form-group">
            <label>Route</label>
            <select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
              <option value="">Select a route...</option>
              {routes.map(r => (<option key={r.id} value={r.id}>Route #{r.id} | {r.route_date} | Nurse {r.nurse_id}</option>))}
            </select>
          </div>
          <button className="btn btn-purple" onClick={run} disabled={loading} style={{ marginTop: 16 }}>
            <Sparkles size={16} /> {loading ? 'Calculating...' : 'Apply Live Traffic Adjustments'}
          </button>
        </div>

        {result?.stops && (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
            <h3 style={{ marginBottom: 12 }}><TrafficCone size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />Traffic-Adjusted Stops</h3>
            <p>Total delay: <strong style={{ color: result.total_delay_minutes > 30 ? '#ef4444' : '#10b981' }}>{result.total_delay_minutes} min</strong></p>
            {result.reorder_recommended && <p style={{ color: '#f59e0b' }}>Reorder recommended due to significant delay.</p>}
            <table className="data-table">
              <thead><tr><th>#</th><th>Patient</th><th>Address</th><th>Scheduled</th><th>Base drive</th><th>With traffic</th><th>Delay</th></tr></thead>
              <tbody>{result.stops.map((s) => (
                <tr key={s.stop_order}>
                  <td>{s.stop_order}</td><td>{s.patient}</td><td>{s.address}</td><td>{s.scheduled_time}</td>
                  <td>{s.base_drive_minutes}m</td><td>{s.adjusted_drive_minutes}m</td>
                  <td style={{ color: s.delay_minutes > 5 ? '#ef4444' : '#64748b' }}>+{s.delay_minutes}m</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {result?.ai_recommendation && <AIOutput content={result.ai_recommendation} />}
      </div>
    </>
  );
}
