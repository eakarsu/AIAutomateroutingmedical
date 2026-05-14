import { useState, useEffect } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';
import { Activity, Sparkles, Clock } from 'lucide-react';

export default function AIOutcomePredict() {
  const [visits, setVisits] = useState([]);
  const [visitId, setVisitId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.getVisits().then(setVisits).catch(() => {}); }, []);

  const run = async () => {
    if (!visitId) return toast.error('Select a visit');
    setLoading(true); setResult(null);
    try {
      const data = await api.outcomePredict({ visit_id: visitId });
      setResult(data);
    } catch (err) { toast.error('Predict failed'); }
    finally { setLoading(false); }
  };

  const cmplxColor = (c) => c === 'high' ? '#ef4444' : c === 'medium' ? '#f59e0b' : '#10b981';

  return (
    <>
      <div className="page-header">
        <div><h2>Visit Outcome Prediction</h2><div className="page-header-sub">Estimate duration, complexity, equipment needs from historical patterns</div></div>
      </div>
      <div className="page-body">
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
          <div className="form-group"><label>Visit</label>
            <select value={visitId} onChange={(e) => setVisitId(e.target.value)}>
              <option value="">Select...</option>
              {visits.map(v => (<option key={v.id} value={v.id}>{v.visit_date} | {v.patient_first} {v.patient_last} | {v.visit_type}</option>))}
            </select>
          </div>
          <button className="btn btn-purple" onClick={run} disabled={loading} style={{ marginTop: 16 }}>
            <Sparkles size={16} /> {loading ? 'Predicting...' : 'Predict Outcome'}
          </button>
        </div>

        {result && (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)' }}>
            <h3>{result.patient}</h3>
            <p style={{ color: '#64748b' }}>Visit type: {result.visit_type} | Historical sample: {result.historical_sample_size} visits | Avg: {result.historical_avg_duration} min</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
              <div className="stat-card"><Clock size={18} /><div className="stat-label">Estimated Duration</div><div className="stat-value">{result.estimated_duration_min} min</div></div>
              <div className="stat-card"><Activity size={18} /><div className="stat-label">Complexity</div><div className="stat-value" style={{ color: cmplxColor(result.complexity) }}>{result.complexity}</div></div>
              <div className="stat-card"><div className="stat-label">Confidence</div><div className="stat-value">{result.confidence || '-'}</div></div>
            </div>
            {result.required_equipment && result.required_equipment.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>Required Equipment</h4>
                <ul>{result.required_equipment.map((e, i) => (<li key={i}>{e}</li>))}</ul>
              </div>
            )}
            {result.expected_complications && result.expected_complications.length > 0 && (
              <div>
                <h4>Possible Complications</h4>
                <ul>{result.expected_complications.map((e, i) => (<li key={i}>{e}</li>))}</ul>
              </div>
            )}
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 12 }}>{result.tokens} tokens | {result.model}</p>
          </div>
        )}
      </div>
    </>
  );
}
