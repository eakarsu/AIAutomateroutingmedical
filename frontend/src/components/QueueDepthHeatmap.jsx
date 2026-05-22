import { useEffect, useState } from 'react';

// VIZ #2 — Queue Depth Heatmap (CSS grid)
export default function QueueDepthHeatmap() {
  const [hours, setHours] = useState(12);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (h = hours) => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`/api/custom-views/queue-depth-heatmap?hours=${h}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(hours); /* eslint-disable-next-line */ }, []);

  const color = (v, max) => {
    const t = Math.max(0, Math.min(1, v / Math.max(1, max)));
    // light blue -> red
    const r = Math.round(59 + (220 - 59) * t);
    const g = Math.round(130 + (38 - 130) * t);
    const b = Math.round(246 + (38 - 246) * t);
    return `rgb(${r},${g},${b})`;
  };

  const max = data ? Math.max(...data.matrix.flat()) : 1;

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Queue Depth Heatmap</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#64748b' }}>Window:</label>
          <select value={hours} onChange={e => { const v = Number(e.target.value); setHours(v); load(v); }}
                  style={{ padding: 4, borderRadius: 4, border: '1px solid #cbd5e1' }}>
            <option value={4}>4h</option><option value={8}>8h</option><option value={12}>12h</option>
            <option value={18}>18h</option><option value={24}>24h</option>
          </select>
        </div>
      </div>
      {error && <div style={{ color: '#dc2626', marginBottom: 8 }}>Error: {error}</div>}
      {loading && <div style={{ color: '#64748b' }}>Loading...</div>}
      {data && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 2, fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Queue \ Hour</th>
                  {data.hours.map(h => (
                    <th key={h} style={{ padding: '4px 6px', color: '#475569', fontWeight: 500, minWidth: 36 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.queues.map((q, qi) => (
                  <tr key={q}>
                    <td style={{ padding: '4px 8px', color: '#0f172a', fontWeight: 500, whiteSpace: 'nowrap' }}>{q}</td>
                    {data.matrix[qi].map((v, hi) => (
                      <td key={hi} title={`${q} @ ${data.hours[hi]}: ${v}`}
                          style={{ background: color(v, max), color: v / max > 0.55 ? '#fff' : '#0f172a',
                                   textAlign: 'center', padding: '6px 6px', borderRadius: 3,
                                   minWidth: 32, fontWeight: 600 }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, padding: 10, background: '#fff7ed', borderRadius: 6, fontSize: 13, color: '#7c2d12' }}>
            <strong>Hotspots:</strong> {data.hotspots.map(h => `${h.queue} @ ${h.hour} (${h.depth})`).join(' · ')}
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#475569' }}>{data.summary}</div>
        </>
      )}
    </div>
  );
}
