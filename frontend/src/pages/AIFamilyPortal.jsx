import { useState, useEffect } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';
import { Mail, Sparkles } from 'lucide-react';

export default function AIFamilyPortal() {
  const [visits, setVisits] = useState([]);
  const [visitId, setVisitId] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.getVisits().then(setVisits).catch(() => {});
    api.getFamilyMessages().then(r => setHistory(r.data || r)).catch(() => {});
  }, []);

  const run = async () => {
    if (!visitId) return toast.error('Select a visit');
    setLoading(true); setResult(null);
    try {
      const data = await api.familySummary({ visit_id: visitId, send_to: sendTo || undefined });
      setResult(data);
      if (sendTo) {
        toast.success('Summary sent to ' + sendTo);
        const m = await api.getFamilyMessages();
        setHistory(m.data || m);
      }
    } catch (err) { toast.error('Failed: ' + err.message); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <div><h2>Family Communication Portal</h2><div className="page-header-sub">Generate simplified visit summaries for patient families</div></div>
      </div>
      <div className="page-body">
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
          <div className="form-group"><label>Visit</label>
            <select value={visitId} onChange={(e) => setVisitId(e.target.value)}>
              <option value="">Select...</option>
              {visits.map(v => (<option key={v.id} value={v.id}>{v.visit_date} | {v.patient_first} {v.patient_last}</option>))}
            </select>
          </div>
          <div className="form-group"><label>Send to (email, optional)</label>
            <input type="email" value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="family@example.com" />
          </div>
          <button className="btn btn-purple" onClick={run} disabled={loading} style={{ marginTop: 16 }}>
            <Sparkles size={16} /> {loading ? 'Generating...' : 'Generate Family Summary'}
          </button>
        </div>

        {result && (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
            <h3>{result.patient} - Visit on {result.visit_date}</h3>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 6, marginTop: 12, whiteSpace: 'pre-wrap' }}>
              {result.family_summary}
            </div>
            {result.sent_to && <p style={{ color: '#10b981', marginTop: 12 }}><Mail size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Sent to {result.sent_to}</p>}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)' }}>
          <h3>Sent Messages ({history.length})</h3>
          {history.length === 0 ? <p style={{ color: '#64748b' }}>No messages sent yet</p> : (
            <table className="data-table">
              <thead><tr><th>Sent at</th><th>Patient</th><th>To</th><th>Summary</th></tr></thead>
              <tbody>{history.slice(0, 20).map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.sent_at).toLocaleString()}</td>
                  <td>{m.first_name} {m.last_name}</td>
                  <td>{m.sent_to}</td>
                  <td style={{ maxWidth: 400, fontSize: 12 }}>{(m.summary || '').slice(0, 200)}...</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
