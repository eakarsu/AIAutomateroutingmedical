import { useEffect, useState } from 'react';

// VIZ #2 — Ward Occupancy Heatmap (CSS-grid heatmap of % occupancy)
export default function WardOccupancyHeatmap() {
  const [hours, setHours] = useState(12);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (h = hours) => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`/api/custom-views/ward-occupancy-heatmap?hours=${h}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(hours); /* eslint-disable-next-line */ }, []);

  const color = (v) => {
    // 0% green -> 100% red
    const t = Math.max(0, Math.min(1, v / 100));
    const r = Math.round(34 + (220 - 34) * t);
    const g = Math.round(197 + (38 - 197) * t);
    const b = Math.round(94 + (38 - 94) * t);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div data-testid="ward-occupancy-heatmap" style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Ward Occupancy Heatmap</h3>
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
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Ward \ Hour</th>
                  {data.hours.map(h => (
                    <th key={h} style={{ padding: '4px 6px', color: '#475569', fontWeight: 500, minWidth: 36 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.wards.map((w, wi) => (
                  <tr key={w}>
                    <td style={{ padding: '4px 8px', color: '#0f172a', fontWeight: 500, whiteSpace: 'nowrap' }}>{w}</td>
                    {data.matrix[wi].map((v, hi) => (
                      <td key={hi} title={`${w} @ ${data.hours[hi]}: ${v}%`}
                          style={{ background: color(v), color: v > 60 ? '#fff' : '#0f172a',
                                   textAlign: 'center', padding: '6px 6px', borderRadius: 3,
                                   minWidth: 32, fontWeight: 600 }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, padding: 10, background: '#fff7ed', borderRadius: 6, fontSize: 13, color: '#7c2d12' }}>
            <strong>Capacity hotspots:</strong> {data.hotspots.map(h => `${h.ward} @ ${h.hour} (${h.occupancy}%)`).join(' · ')}
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#475569' }}>{data.summary}</div>
        </>
      )}
    </div>
  );
}
