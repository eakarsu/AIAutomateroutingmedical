import { useState, useEffect } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';

export default function AIVisitNotes() {
  const [visits, setVisits] = useState([]);
  const [visitId, setVisitId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.getVisits().then(setVisits); }, []);

  const generate = async () => {
    if (!visitId) return toast.error('Select a visit');
    setLoading(true); setResult(null);
    try {
      const data = await api.generateNotes({ visit_id: visitId });
      setResult(data);
    } catch (err) { toast.error('Generation failed'); }
    finally { setLoading(false); }
  };

  const selectedVisit = visits.find(v => v.id === Number(visitId));

  return (
    <>
      <div className="page-header">
        <div><h2>AI Visit Notes Generator</h2><div className="page-header-sub">Generate professional SOAP notes</div></div>
      </div>
      <div className="page-body">
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
          <div className="form-group">
            <label>Select Visit</label>
            <select value={visitId} onChange={(e) => setVisitId(e.target.value)}>
              <option value="">Choose a visit...</option>
              {visits.map(v => (
                <option key={v.id} value={v.id}>
                  {v.patient_first} {v.patient_last} - {v.visit_type} ({new Date(v.visit_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
          {selectedVisit && (
            <div className="detail-grid" style={{ marginTop: 16, padding: 16, background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
              <div className="detail-item"><span className="detail-label">Patient</span><span className="detail-value">{selectedVisit.patient_first} {selectedVisit.patient_last}</span></div>
              <div className="detail-item"><span className="detail-label">Nurse</span><span className="detail-value">{selectedVisit.nurse_first} {selectedVisit.nurse_last}</span></div>
              <div className="detail-item"><span className="detail-label">Type</span><span className="detail-value">{selectedVisit.visit_type}</span></div>
              <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value"><span className={`badge badge-${selectedVisit.status}`}>{selectedVisit.status}</span></span></div>
            </div>
          )}
          <button className="btn btn-purple" onClick={generate} disabled={loading} style={{ marginTop: 16 }}>
            <Sparkles size={16} /> {loading ? 'Generating...' : 'Generate SOAP Notes'}
          </button>
        </div>
        <AIOutput content={result?.content} model={result?.model} tokens={result?.tokens} loading={loading} />
      </div>
    </>
  );
}
