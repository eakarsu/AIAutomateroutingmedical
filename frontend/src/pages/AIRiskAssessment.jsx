import { useState, useEffect } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';

export default function AIRiskAssessment() {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.getPatients().then(setPatients); }, []);

  const assess = async () => {
    if (!patientId) return toast.error('Select a patient');
    setLoading(true); setResult(null);
    try {
      const data = await api.patientRisk({ patient_id: patientId });
      setResult(data);
    } catch (err) { toast.error('Assessment failed'); }
    finally { setLoading(false); }
  };

  const selectedPatient = patients.find(p => p.id === Number(patientId));

  return (
    <>
      <div className="page-header">
        <div><h2>AI Risk Assessment</h2><div className="page-header-sub">AI-powered patient risk evaluation</div></div>
      </div>
      <div className="page-body">
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
          <div className="form-group">
            <label>Select Patient</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Choose a patient...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name} - {p.primary_diagnosis}</option>
              ))}
            </select>
          </div>
          {selectedPatient && (
            <div className="detail-grid" style={{ marginTop: 16, padding: 16, background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
              <div className="detail-item"><span className="detail-label">Patient</span><span className="detail-value">{selectedPatient.first_name} {selectedPatient.last_name}</span></div>
              <div className="detail-item"><span className="detail-label">Diagnosis</span><span className="detail-value">{selectedPatient.primary_diagnosis}</span></div>
              <div className="detail-item"><span className="detail-label">DOB</span><span className="detail-value">{selectedPatient.date_of_birth ? new Date(selectedPatient.date_of_birth).toLocaleDateString() : 'N/A'}</span></div>
              <div className="detail-item"><span className="detail-label">Insurance</span><span className="detail-value">{selectedPatient.insurance_provider}</span></div>
            </div>
          )}
          <button className="btn btn-purple" onClick={assess} disabled={loading} style={{ marginTop: 16 }}>
            <Sparkles size={16} /> {loading ? 'Assessing...' : 'Run Risk Assessment'}
          </button>
        </div>
        <AIOutput content={result?.content} model={result?.model} tokens={result?.tokens} loading={loading} />
      </div>
    </>
  );
}
