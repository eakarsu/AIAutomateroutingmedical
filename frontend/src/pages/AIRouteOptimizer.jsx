import { useState, useEffect } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';
import { MapPin, Sparkles } from 'lucide-react';

export default function AIRouteOptimizer() {
  const [nurses, setNurses] = useState([]);
  const [nurseId, setNurseId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.getNurses().then(setNurses); }, []);

  const optimize = async () => {
    if (!nurseId) return toast.error('Select a nurse');
    setLoading(true); setResult(null);
    try {
      const data = await api.optimizeRoute({ nurse_id: nurseId, date });
      setResult(data);
    } catch (err) { toast.error('Optimization failed'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <div><h2>AI Route Optimizer</h2><div className="page-header-sub">Optimize nurse routes using AI</div></div>
      </div>
      <div className="page-body">
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Select Nurse</label>
              <select value={nurseId} onChange={(e) => setNurseId(e.target.value)}>
                <option value="">Choose a nurse...</option>
                {nurses.filter(n => n.status === 'active').map(n => (
                  <option key={n.id} value={n.id}>{n.first_name} {n.last_name} - {n.specialization}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-purple" onClick={optimize} disabled={loading} style={{ marginTop: 16 }}>
            <Sparkles size={16} /> {loading ? 'Optimizing...' : 'Optimize Route'}
          </button>
        </div>

        {result?.visits && result.visits.length > 0 && (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              <MapPin size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
              Current Visits ({result.visits.length})
            </h3>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead><tr><th>#</th><th>Patient</th><th>Address</th><th>Type</th><th>Time</th></tr></thead>
                <tbody>
                  {result.visits.map((v, i) => (
                    <tr key={v.id}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{v.first_name} {v.last_name}</td>
                      <td>{v.address}, {v.city}</td>
                      <td>{v.visit_type}</td>
                      <td>{v.start_time?.slice(0,5)} - {v.end_time?.slice(0,5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <AIOutput content={result?.content} model={result?.model} tokens={result?.tokens} loading={loading} />
      </div>
    </>
  );
}
