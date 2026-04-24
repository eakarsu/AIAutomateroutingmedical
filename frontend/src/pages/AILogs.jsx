import { useState, useEffect } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import { Search, Sparkles } from 'lucide-react';

const featureLabels = {
  route_optimization: 'Route Optimization',
  order_processing: 'Order Processing',
  visit_notes: 'Visit Notes',
  smart_schedule: 'Smart Schedule',
  patient_risk: 'Patient Risk',
  chat: 'AI Chat',
  api_call: 'API Call',
};

const featureColors = {
  route_optimization: 'var(--accent)',
  order_processing: 'var(--success)',
  visit_notes: 'var(--purple)',
  smart_schedule: 'var(--warning)',
  patient_risk: 'var(--danger)',
  chat: 'var(--gray-600)',
  api_call: 'var(--gray-500)',
};

export default function AILogs() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => { api.getAiLogs().then(setItems); }, []);

  const filtered = items.filter(l =>
    `${l.feature} ${l.prompt} ${l.response} ${l.model}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div><h2>AI Activity Log</h2><div className="page-header-sub">{items.length} AI interactions recorded</div></div>
        <div className="search-bar"><Search size={16} /><input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>
      <div className="page-body">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Feature</th><th>Model</th><th>Tokens</th><th>Prompt Preview</th><th>Time</th></tr></thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} onClick={() => setSelected(l)}>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: `${featureColors[l.feature] || 'var(--gray-500)'}15`,
                      color: featureColors[l.feature] || 'var(--gray-500)',
                    }}>
                      <Sparkles size={12} />
                      {featureLabels[l.feature] || l.feature}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{l.model}</td>
                  <td style={{ fontWeight: 600 }}>{l.tokens_used}</td>
                  <td style={{ maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.prompt?.substring(0, 80)}...</td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal title="AI Log Details" onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Feature</span>
              <span className="detail-value">{featureLabels[selected.feature] || selected.feature}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Model</span>
              <span className="detail-value" style={{ fontFamily: 'monospace' }}>{selected.model}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Tokens Used</span>
              <span className="detail-value">{selected.tokens_used}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Time</span>
              <span className="detail-value">{new Date(selected.created_at).toLocaleString()}</span>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="detail-label" style={{ marginBottom: 8 }}>Prompt</div>
            <div style={{ padding: 12, background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', fontSize: 13, lineHeight: 1.6, fontFamily: 'monospace', maxHeight: 150, overflow: 'auto' }}>
              {selected.prompt}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="detail-label" style={{ marginBottom: 8 }}>Response</div>
            <div style={{ padding: 16, background: 'linear-gradient(135deg, #f0f7ff 0%, #f5f3ff 50%, #fdf2f8 100%)', borderRadius: 'var(--radius-sm)', fontSize: 14, lineHeight: 1.7, maxHeight: 300, overflow: 'auto' }}>
              {selected.response}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
