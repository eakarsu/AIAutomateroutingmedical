import { useState } from 'react';

// NON-VIZ #1 — PDF Receipt for routed document
export default function RoutedDocReceipt() {
  const [form, setForm] = useState({ id: 'DOC-' + Math.floor(Math.random() * 9000 + 1000), docType: 'preauth', priority: 'high', payer: 'BCBS' });
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true); setError(''); setPdfUrl(null);
    try {
      const token = localStorage.getItem('token');
      const qs = new URLSearchParams({ docType: form.docType, priority: form.priority, payer: form.payer });
      const r = await fetch(`/api/custom-views/receipt-pdf/${encodeURIComponent(form.id)}?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      setPdfUrl(URL.createObjectURL(blob));
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Routed-Document PDF Receipt</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <input value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} placeholder="Document ID"
               style={{ padding: 6, borderRadius: 4, border: '1px solid #cbd5e1', minWidth: 160 }} />
        <select value={form.docType} onChange={e => setForm({ ...form, docType: e.target.value })} style={{ padding: 6, borderRadius: 4, border: '1px solid #cbd5e1' }}>
          <option value="lab">lab</option>
          <option value="preauth">preauth</option>
          <option value="denial">denial</option>
          <option value="referral">referral</option>
          <option value="rx">rx</option>
        </select>
        <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={{ padding: 6, borderRadius: 4, border: '1px solid #cbd5e1' }}>
          <option value="stat">stat</option>
          <option value="high">high</option>
          <option value="routine">routine</option>
        </select>
        <input value={form.payer} onChange={e => setForm({ ...form, payer: e.target.value })} placeholder="Payer"
               style={{ padding: 6, borderRadius: 4, border: '1px solid #cbd5e1' }} />
        <button onClick={generate} disabled={loading}
                style={{ padding: '6px 14px', borderRadius: 4, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>
          {loading ? 'Generating...' : 'Generate PDF'}
        </button>
        {pdfUrl && (
          <a href={pdfUrl} download={`routing-receipt-${form.id}.pdf`}
             style={{ padding: '6px 14px', borderRadius: 4, background: '#16a34a', color: '#fff', textDecoration: 'none', display: 'inline-block' }}>
            Download
          </a>
        )}
      </div>
      {error && <div style={{ color: '#dc2626', marginBottom: 8 }}>Error: {error}</div>}
      {pdfUrl && (
        <iframe src={pdfUrl} title="receipt" style={{ width: '100%', height: 520, border: '1px solid #e2e8f0', borderRadius: 6 }} />
      )}
      {!pdfUrl && !loading && !error && (
        <div style={{ color: '#64748b', fontSize: 13 }}>Configure the document and click <em>Generate PDF</em> to render an inline routing receipt.</div>
      )}
    </div>
  );
}
