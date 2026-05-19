import { useState, useEffect } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';
import { UserCheck, Sparkles } from 'lucide-react';

export default function AISkillMatch() {
  const [visits, setVisits] = useState([]);
  const [visitId, setVisitId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.getVisits().then(setVisits).catch(() => {}); }, []);

  const run = async () => {
    if (!visitId) return toast.error('Select a visit');
    setLoading(true); setResult(null);
    try {
      const data = await api.skillMatch({ visit_id: visitId });
      setResult(data);
    } catch (err) { toast.error('Match failed'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <div><h2>Nurse Skill Matching</h2><div className="page-header-sub">Rank nurses by specialty fit and patient familiarity</div></div>
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
            <Sparkles size={16} /> {loading ? 'Matching...' : 'Find Best Matches'}
          </button>
        </div>

        {result && (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)' }}>
            <h3>{result.patient}</h3>
            <p style={{ color: '#64748b' }}>Dx: {result.diagnosis} | Type: {result.visit_type}</p>
            {result.ai_recommendation && (
              <div style={{ padding: 16, background: 'linear-gradient(135deg, #f0f7ff 0%, #f5f3ff 100%)', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={14} /> AI Recommendation
                  {result.ai_recommendation.confidence && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'white', color: 'var(--gray-600)' }}>
                      Confidence: {result.ai_recommendation.confidence}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: '#1e40af', margin: 0 }}>{result.ai_recommendation.recommendation}</p>
                {result.ai_recommendation.top_nurse_rationale && (
                  <p style={{ fontSize: 12, color: '#64748b', margin: '8px 0 0' }}>{result.ai_recommendation.top_nurse_rationale}</p>
                )}
              </div>
            )}
            <table className="data-table">
              <thead><tr><th>Rank</th><th>Nurse</th><th>Specialty</th><th>Score</th><th>Reasons</th></tr></thead>
              <tbody>{result.candidates.map((c, i) => (
                <tr key={c.nurse_id}>
                  <td><strong>{i + 1}</strong></td>
                  <td><UserCheck size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{c.name}</td>
                  <td>{c.specialization}</td>
                  <td><strong style={{ color: c.score > 50 ? '#10b981' : c.score > 20 ? '#f59e0b' : '#64748b' }}>{c.score}</strong></td>
                  <td style={{ fontSize: 12 }}>{c.reasons.join('; ') || '-'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
