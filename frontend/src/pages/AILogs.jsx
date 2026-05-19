import { useState, useEffect } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import { Search, Sparkles, ChevronLeft, ChevronRight, Database } from 'lucide-react';

const featureLabels = {
  route_optimization: 'Route Optimization',
  route_optimization_stream: 'Route Optimization (SSE)',
  order_processing: 'Order Processing',
  visit_notes: 'Visit Notes',
  smart_schedule: 'Smart Schedule',
  patient_risk: 'Patient Risk',
  chat: 'AI Chat',
  api_call: 'API Call',
  traffic_adjust: 'Traffic Adjust',
  acuity_check: 'Acuity Check',
  medication_check: 'Medication Check',
  skill_match: 'Skill Match',
  outcome_predict: 'Outcome Predict',
  family_summary: 'Family Summary',
  shift_swap: 'Shift Swap',
  preauth_request: 'Pre-Auth',
};

const featureColors = {
  route_optimization: 'var(--accent)',
  order_processing: 'var(--success)',
  visit_notes: 'var(--purple)',
  smart_schedule: 'var(--warning)',
  patient_risk: 'var(--danger)',
  chat: 'var(--gray-600)',
  api_call: 'var(--gray-500)',
  traffic_adjust: '#f97316',
  acuity_check: '#dc2626',
  medication_check: '#7c3aed',
  skill_match: '#0891b2',
  outcome_predict: '#059669',
  family_summary: '#db2777',
  shift_swap: '#9333ea',
  preauth_request: '#ca8a04',
};

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, justifyContent: 'center' }}>
      <button className="btn btn-outline btn-sm" onClick={() => onPage(page - 1)} disabled={page <= 1}>
        <ChevronLeft size={14} />
      </button>
      <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>Page {page} of {totalPages}</span>
      <button className="btn btn-outline btn-sm" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

export default function AILogs() {
  const [tab, setTab] = useState('logs');
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const [results, setResults] = useState([]);
  const [resultsPagination, setResultsPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [featureFilter, setFeatureFilter] = useState('');

  const loadLogs = async (page = 1) => {
    setLoading(true);
    try {
      const r = await api.getAiLogs(page, 20);
      setItems(r.data || []);
      setPagination(r.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch {}
    finally { setLoading(false); }
  };

  const loadResults = async (page = 1, feature = featureFilter) => {
    setLoading(true);
    try {
      const r = await api.getAiResults(page, 20, feature);
      setResults(r.data || []);
      setResultsPagination(r.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'logs') loadLogs(1);
    else loadResults(1);
  }, [tab]);

  const filtered = items.filter(l =>
    `${l.feature} ${l.prompt} ${l.response} ${l.model}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h2>AI Activity Log</h2>
          <div className="page-header-sub">{pagination.total} AI interactions recorded</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className={`btn ${tab === 'logs' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab('logs')}
          >
            <Sparkles size={14} /> Interaction Logs
          </button>
          <button
            className={`btn ${tab === 'results' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab('results')}
          >
            <Database size={14} /> Structured Results
          </button>
        </div>
      </div>

      <div className="page-body">
        {tab === 'logs' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div className="search-bar"><Search size={16} /><input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead><tr><th>Feature</th><th>Model</th><th>Tokens</th><th>Prompt Preview</th><th>Time</th></tr></thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} onClick={() => setSelected(l)} style={{ cursor: 'pointer' }}>
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
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 32 }}>No logs found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPage={loadLogs} />
          </>
        )}

        {tab === 'results' && (
          <>
            <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
              <select
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 13 }}
                value={featureFilter}
                onChange={(e) => {
                  setFeatureFilter(e.target.value);
                  loadResults(1, e.target.value);
                }}
              >
                <option value="">All features</option>
                {Object.keys(featureLabels).map(k => (
                  <option key={k} value={k}>{featureLabels[k]}</option>
                ))}
              </select>
              <span style={{ color: 'var(--gray-500)', fontSize: 13, alignSelf: 'center' }}>
                {resultsPagination.total} structured results
              </span>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead><tr><th>Feature</th><th>Entity</th><th>Key Fields</th><th>Model</th><th>Tokens</th><th>Time</th></tr></thead>
                <tbody>
                  {results.map((r) => {
                    const sd = r.structured_data || {};
                    const keyFields = Object.keys(sd).slice(0, 3).map(k => `${k}: ${String(sd[k]).slice(0, 40)}`).join(' | ');
                    return (
                      <tr key={r.id} onClick={() => setSelected({ ...r, isResult: true })} style={{ cursor: 'pointer' }}>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: `${featureColors[r.feature] || 'var(--gray-500)'}15`,
                            color: featureColors[r.feature] || 'var(--gray-500)',
                          }}>
                            <Database size={12} />
                            {featureLabels[r.feature] || r.feature}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>{r.entity_type || '-'} {r.entity_id ? `#${r.entity_id}` : ''}</td>
                        <td style={{ fontSize: 11, color: 'var(--gray-600)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{keyFields || '-'}</td>
                        <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{r.model}</td>
                        <td>{r.tokens_used}</td>
                        <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{new Date(r.created_at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  {results.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 32 }}>No structured results yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={resultsPagination.page} totalPages={resultsPagination.totalPages} onPage={(p) => loadResults(p)} />
          </>
        )}
      </div>

      {selected && !selected.isResult && (
        <Modal title="AI Log Details" onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Feature</span><span className="detail-value">{featureLabels[selected.feature] || selected.feature}</span></div>
            <div className="detail-item"><span className="detail-label">Model</span><span className="detail-value" style={{ fontFamily: 'monospace' }}>{selected.model}</span></div>
            <div className="detail-item"><span className="detail-label">Tokens Used</span><span className="detail-value">{selected.tokens_used}</span></div>
            <div className="detail-item"><span className="detail-label">Time</span><span className="detail-value">{new Date(selected.created_at).toLocaleString()}</span></div>
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

      {selected && selected.isResult && (
        <Modal title={`Structured Result: ${featureLabels[selected.feature] || selected.feature}`} onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Entity</span><span className="detail-value">{selected.entity_type} {selected.entity_id ? `#${selected.entity_id}` : ''}</span></div>
            <div className="detail-item"><span className="detail-label">Model</span><span className="detail-value" style={{ fontFamily: 'monospace' }}>{selected.model}</span></div>
            <div className="detail-item"><span className="detail-label">Tokens Used</span><span className="detail-value">{selected.tokens_used}</span></div>
            <div className="detail-item"><span className="detail-label">Time</span><span className="detail-value">{new Date(selected.created_at).toLocaleString()}</span></div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="detail-label" style={{ marginBottom: 8 }}>Structured Data</div>
            <div style={{ padding: 12, background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', fontSize: 12, lineHeight: 1.6, fontFamily: 'monospace', maxHeight: 350, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(selected.structured_data, null, 2)}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
