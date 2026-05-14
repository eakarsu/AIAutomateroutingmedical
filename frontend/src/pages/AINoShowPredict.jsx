import { useState, useEffect } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';
import { CalendarX, Sparkles, AlertTriangle } from 'lucide-react';

export default function AINoShowPredict() {
  const [visits, setVisits] = useState([]);
  const [visitId, setVisitId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.getVisits().then(setVisits).catch(() => {}); }, []);

  const run = async () => {
    if (!visitId) return toast.error('Select a visit');
    setLoading(true); setResult(null);
    try {
      const data = await api.noShowPredict({ visit_id: visitId });
      setResult(data);
    } catch (err) {
      toast.error(err.message || 'Predict failed');
    } finally {
      setLoading(false);
    }
  };

  const bandColor = (b) => b === 'high' ? '#ef4444' : b === 'medium' ? '#f59e0b' : '#10b981';
  const probability = result?.no_show_probability ?? result?.ai?.no_show_probability;
  const band = result?.risk_band || result?.ai?.risk_band;
  const factors = result?.top_factors || result?.ai?.top_factors || [];
  const interventions = result?.recommended_interventions || result?.ai?.recommended_interventions || [];

  return (
    <>
      <div className="page-header">
        <div>
          <h2>No-Show Prediction</h2>
          <div className="page-header-sub">Predict the likelihood a scheduled visit will become a no-show / cancellation, with intervention suggestions</div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
          <div className="form-group">
            <label>Visit</label>
            <select value={visitId} onChange={(e) => setVisitId(e.target.value)}>
              <option value="">Select...</option>
              {visits.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.visit_date || v.scheduled_at} | {v.patient_first} {v.patient_last} | {v.visit_type}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-purple" onClick={run} disabled={loading} style={{ marginTop: 16 }}>
            <Sparkles size={16} /> {loading ? 'Predicting...' : 'Predict No-Show Risk'}
          </button>
        </div>

        {result && (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)' }}>
            <h3>{result.patient}</h3>
            <p style={{ color: '#64748b' }}>
              Visit type: {result.visit_type} | Baseline rate: {result.baseline_rate ? (result.baseline_rate * 100).toFixed(1) + '%' : 'n/a'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
              <div className="stat-card">
                <CalendarX size={18} />
                <div className="stat-label">No-Show Probability</div>
                <div className="stat-value">{probability !== undefined ? (probability * 100).toFixed(0) + '%' : '-'}</div>
              </div>
              <div className="stat-card">
                <AlertTriangle size={18} />
                <div className="stat-label">Risk Band</div>
                <div className="stat-value" style={{ color: bandColor(band) }}>{band || '-'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Confidence</div>
                <div className="stat-value">{result.confidence || result.ai?.confidence || '-'}</div>
              </div>
            </div>

            {factors.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>Top Factors</h4>
                <ul>{factors.map((f, i) => (<li key={i}>{f}</li>))}</ul>
              </div>
            )}
            {interventions.length > 0 && (
              <div>
                <h4>Recommended Interventions</h4>
                <ul>{interventions.map((f, i) => (<li key={i}>{f}</li>))}</ul>
              </div>
            )}
            {(result.rationale || result.ai?.rationale) && (
              <div style={{ marginTop: 16 }}>
                <h4>Rationale</h4>
                <p>{result.rationale || result.ai?.rationale}</p>
              </div>
            )}
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 12 }}>{result.tokens} tokens | {result.model}</p>
          </div>
        )}
      </div>
    </>
  );
}
