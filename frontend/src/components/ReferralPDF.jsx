import { useState } from 'react';

// NON-VIZ #1 — Referral PDF generator (inline preview)
export default function ReferralPDF() {
  const [form, setForm] = useState({
    id: 'REF-' + Math.floor(Math.random() * 9000 + 1000),
    patient: 'Jane Doe',
    from_provider: 'Dr. Andrea Smith, MD',
    specialty: 'cardiology',
    priority: 'urgent',
    reason: 'Persistent exertional chest pain with abnormal ECG.',
  });
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true); setError(''); setPdfUrl(null);
    try {
      const token = localStorage.getItem('token');
      const qs = new URLSearchParams({
        patient: form.patient,
        from_provider: form.from_provider,
        specialty: form.specialty,
        priority: form.priority,
        reason: form.reason,
      });
      const r = await fetch(`/api/custom-views/referral-pdf/${encodeURIComponent(form.id)}?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      setPdfUrl(URL.createObjectURL(blob));
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div data-testid="referral-pdf" style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Referral PDF</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <input value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} placeholder="Referral ID" style={inp} />
        <input value={form.patient} onChange={e => setForm({ ...form, patient: e.target.value })} placeholder="Patient" style={inp} />
        <input value={form.from_provider} onChange={e => setForm({ ...form, from_provider: e.target.value })} placeholder="Referring Provider" style={inp} />
        <input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} placeholder="Specialty" style={inp} />
        <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={inp}>
          <option value="immediate">immediate</option>
          <option value="emergent">emergent</option>
          <option value="urgent">urgent</option>
          <option value="less-urgent">less-urgent</option>
          <option value="non-urgent">non-urgent</option>
        </select>
        <button onClick={generate} disabled={loading}
                style={{ padding: '8px 14px', borderRadius: 4, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>
          {loading ? 'Generating...' : 'Generate Referral PDF'}
        </button>
      </div>
      <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="Clinical reason"
                style={{ ...inp, gridColumn: '1 / -1', minHeight: 60, marginBottom: 12, width: '100%', boxSizing: 'border-box' }} />
      {pdfUrl && (
        <a href={pdfUrl} download={`referral-${form.id}.pdf`}
           style={{ marginBottom: 10, display: 'inline-block', padding: '6px 14px', borderRadius: 4, background: '#16a34a', color: '#fff', textDecoration: 'none' }}>
          Download
        </a>
      )}
      {error && <div style={{ color: '#dc2626', marginBottom: 8 }}>Error: {error}</div>}
      {pdfUrl && (
        <iframe src={pdfUrl} title="referral" style={{ width: '100%', height: 520, border: '1px solid #e2e8f0', borderRadius: 6 }} />
      )}
      {!pdfUrl && !loading && !error && (
        <div style={{ color: '#64748b', fontSize: 13 }}>Fill in patient + provider, then <em>Generate Referral PDF</em> to render an inline letter.</div>
      )}
    </div>
  );
}

const inp = { padding: 6, borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 13 };
