import { useEffect, useState } from 'react';

// NON-VIZ #2 — Triage Rules Editor (CRUD priority thresholds)
const PRIORITIES = ['immediate', 'emergent', 'urgent', 'less-urgent', 'non-urgent'];
const METRICS = ['news2', 'temp_c', 'spo2', 'hr', 'sbp'];

export default function TriageRulesEditor() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState('');
  const [error, setError] = useState('');

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const load = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/custom-views/triage-rules', { headers: headers() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setRules(data.rules);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true); setError(''); setReview('');
    try {
      const r = await fetch('/api/custom-views/triage-rules', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ rules }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setRules(data.rules);
      setReview(data.review || 'Saved.');
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const update = (idx, field, value) => {
    const next = rules.slice();
    next[idx] = { ...next[idx], [field]: value };
    setRules(next);
  };

  const remove = (idx) => setRules(rules.filter((_, i) => i !== idx));
  const add = () => setRules([
    ...rules,
    { id: (rules.at(-1)?.id || 0) + 1, name: 'New Threshold', metric: 'news2', min: 0, max: 0, priority: 'urgent', ward: 'urgent-care', sla_minutes: 30, enabled: true },
  ]);

  return (
    <div data-testid="triage-rules-editor" style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Triage Rules Editor (priority thresholds)</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={add} style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>+ Add Threshold</button>
          <button onClick={save} disabled={saving}
                  style={{ padding: '6px 14px', borderRadius: 4, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>
      {error && <div style={{ color: '#dc2626', marginBottom: 8 }}>Error: {error}</div>}
      {loading ? <div style={{ color: '#64748b' }}>Loading...</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={th}>#</th>
                <th style={th}>Name</th>
                <th style={th}>Metric</th>
                <th style={th}>Min</th>
                <th style={th}>Max</th>
                <th style={th}>Priority</th>
                <th style={th}>Ward</th>
                <th style={th}>SLA (min)</th>
                <th style={th}>Enabled</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={td}>{r.id}</td>
                  <td style={td}><input value={r.name} onChange={e => update(i, 'name', e.target.value)} style={inp} /></td>
                  <td style={td}>
                    <select value={r.metric} onChange={e => update(i, 'metric', e.target.value)} style={inp}>
                      {METRICS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    <input type="number" value={r.min} onChange={e => update(i, 'min', Number(e.target.value))} style={{ ...inp, width: 70 }} />
                  </td>
                  <td style={td}>
                    <input type="number" value={r.max} onChange={e => update(i, 'max', Number(e.target.value))} style={{ ...inp, width: 70 }} />
                  </td>
                  <td style={td}>
                    <select value={r.priority} onChange={e => update(i, 'priority', e.target.value)} style={inp}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td style={td}><input value={r.ward} onChange={e => update(i, 'ward', e.target.value)} style={inp} /></td>
                  <td style={td}>
                    <input type="number" value={r.sla_minutes} onChange={e => update(i, 'sla_minutes', Number(e.target.value))} style={{ ...inp, width: 90 }} />
                  </td>
                  <td style={td}>
                    <input type="checkbox" checked={!!r.enabled} onChange={e => update(i, 'enabled', e.target.checked)} />
                  </td>
                  <td style={td}>
                    <button onClick={() => remove(i)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer' }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {review && <div style={{ marginTop: 12, padding: 10, background: '#f0f9ff', borderRadius: 6, fontSize: 13, color: '#075985' }}><strong>Review:</strong> {review}</div>}
    </div>
  );
}

const th = { padding: '8px 10px', borderBottom: '2px solid #e2e8f0', fontWeight: 600, color: '#475569', fontSize: 12, textTransform: 'uppercase' };
const td = { padding: '6px 10px', verticalAlign: 'middle' };
const inp = { padding: 5, borderRadius: 4, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', fontSize: 13 };
