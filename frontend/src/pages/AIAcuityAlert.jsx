import { useState, useEffect } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';
import { AlertTriangle, Sparkles } from 'lucide-react';

export default function AIAcuityAlert() {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.getPatients().then(setPatients).catch(() => {}); }, []);

  const run = async () => {
    if (!patientId) return toast.error('Select a patient');
    setLoading(true); setResult(null);
    try {
      const data = await api.acuityCheck({ patient_id: patientId });
      setResult(data);
    } catch (err) { toast.error('Acuity check failed'); }
    finally { setLoading(false); }
  };

  const lvlColor = (l) => l === 'urgent' ? '#ef4444' : l === 'warning' ? '#f59e0b' : l === 'info' ? '#3b82f6' : '#10b981';

  return (
    <>
      <div className="page-header">
        <div><h2>Patient Acuity Alerting</h2><div className="page-header-sub">AI scans visit notes for deterioration signals</div></div>
      </div>
      <div className="page-body">
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
          <div className="form-group"><label>Patient</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Select...</option>
              {patients.map(p => (<option key={p.id} value={p.id}>{p.first_name} {p.last_name} - {p.primary_diagnosis}</option>))}
            </select>
          </div>
          <button className="btn btn-purple" onClick={run} disabled={loading} style={{ marginTop: 16 }}>
            <Sparkles size={16} /> {loading ? 'Scanning...' : 'Run Acuity Check'}
          </button>
        </div>

        {result && (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
            <h3>{result.patient_name}</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <span style={{ padding: '8px 16px', borderRadius: 6, background: lvlColor(result.alert_level), color: 'white', fontWeight: 600 }}>
                <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                {(result.alert_level || 'unknown').toUpperCase()}
              </span>
              <span>Status: <strong>{result.acuity_change}</strong></span>
              {result.escalate_to_rn && <span style={{ color: '#ef4444', fontWeight: 600 }}>Escalate to RN</span>}
            </div>
            {result.deterioration_signals && result.deterioration_signals.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4>Signals Detected</h4>
                <ul>{result.deterioration_signals.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            <p><strong>Recommended Action:</strong> {result.recommended_action}</p>
            <p><strong>Rationale:</strong> {result.rationale}</p>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 12 }}>{result.tokens} tokens | {result.model}</p>
          </div>
        )}
      </div>
    </>
  );
}
