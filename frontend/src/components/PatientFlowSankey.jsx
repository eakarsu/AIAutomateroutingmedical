import { useEffect, useState, useMemo } from 'react';

// VIZ #1 — Patient Flow Sankey
// Renders an SVG Sankey: Arrival -> Triage -> Ward -> Disposition
export default function PatientFlowSankey() {
  const [hours, setHours] = useState(24);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (h = hours) => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`/api/custom-views/patient-flow?window=${h}h`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(hours); /* eslint-disable-next-line */ }, []);

  const layout = useMemo(() => {
    if (!data) return null;
    const STAGES = ['arrival', 'triage', 'ward', 'disposition'];
    const stageWidth = 180;
    const nodeWidth = 18;
    const gap = 10;
    const height = 420;
    const width = STAGES.length * stageWidth;

    const byStage = STAGES.map(s => data.nodes.filter(n => n.stage === s));
    const nodeMap = {};

    byStage.forEach((nodes, si) => {
      // sum throughput per node = max(in, out)
      const sizes = nodes.map(n => {
        const inV = data.links.filter(l => l.target === n.id).reduce((s, l) => s + l.value, 0);
        const outV = data.links.filter(l => l.source === n.id).reduce((s, l) => s + l.value, 0);
        return Math.max(inV, outV, 1);
      });
      const total = sizes.reduce((a, b) => a + b, 0);
      const available = height - (nodes.length - 1) * gap;
      let y = 20;
      nodes.forEach((n, i) => {
        const h = (sizes[i] / total) * (available - 40);
        nodeMap[n.id] = { x: si * stageWidth + 30, y, h: Math.max(14, h), label: n.label, stage: n.stage };
        y += Math.max(14, h) + gap;
      });
    });

    // For each link, slice positions on source and target
    const srcUsed = {};
    const tgtUsed = {};
    const paths = data.links.map(l => {
      const s = nodeMap[l.source]; const t = nodeMap[l.target];
      if (!s || !t) return null;
      const srcSum = data.links.filter(x => x.source === l.source).reduce((a, b) => a + b.value, 0);
      const tgtSum = data.links.filter(x => x.target === l.target).reduce((a, b) => a + b.value, 0);
      const sThick = (l.value / Math.max(1, srcSum)) * s.h;
      const tThick = (l.value / Math.max(1, tgtSum)) * t.h;
      const sy = (srcUsed[l.source] || 0) + s.y + sThick / 2;
      const ty = (tgtUsed[l.target] || 0) + t.y + tThick / 2;
      srcUsed[l.source] = (srcUsed[l.source] || 0) + sThick;
      tgtUsed[l.target] = (tgtUsed[l.target] || 0) + tThick;
      const x1 = s.x + nodeWidth;
      const x2 = t.x;
      const mx = (x1 + x2) / 2;
      const d = `M ${x1} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${x2} ${ty}`;
      return { d, thick: Math.max(1.5, Math.min(sThick, tThick)), priority: l.priority, value: l.value };
    }).filter(Boolean);

    return { nodeMap, paths, width, height, nodeWidth };
  }, [data]);

  const colorForPriority = (p) => {
    switch (p) {
      case 'immediate':   return '#dc2626';
      case 'emergent':    return '#ea580c';
      case 'urgent':      return '#d97706';
      case 'less-urgent': return '#16a34a';
      case 'non-urgent':  return '#0ea5e9';
      default:            return '#94a3b8';
    }
  };

  return (
    <div data-testid="patient-flow-sankey" style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Patient Flow (Sankey)</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#64748b' }}>Window:</label>
          <select value={hours} onChange={e => { const v = Number(e.target.value); setHours(v); load(v); }}
                  style={{ padding: 4, borderRadius: 4, border: '1px solid #cbd5e1' }}>
            <option value={8}>8h</option><option value={12}>12h</option>
            <option value={24}>24h</option><option value={48}>48h</option>
            <option value={72}>72h</option>
          </select>
        </div>
      </div>
      {error && <div style={{ color: '#dc2626', marginBottom: 8 }}>Error: {error}</div>}
      {loading && <div style={{ color: '#64748b' }}>Loading...</div>}
      {data && layout && (
        <>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <svg width={layout.width} height={layout.height} style={{ display: 'block' }}>
              {/* stage column headers */}
              {['Arrival','Triage','Ward','Disposition'].map((lbl, i) => (
                <text key={lbl} x={i * 180 + 30} y={14} fontSize={11} fill="#475569" fontWeight={600}>{lbl}</text>
              ))}
              {/* links */}
              {layout.paths.map((p, i) => (
                <path key={i} d={p.d} fill="none"
                      stroke={colorForPriority(p.priority)} strokeOpacity={0.35}
                      strokeWidth={p.thick}>
                  <title>{`${p.value} patients`}</title>
                </path>
              ))}
              {/* nodes */}
              {Object.entries(layout.nodeMap).map(([id, n]) => (
                <g key={id} transform={`translate(${n.x},${n.y})`}>
                  <rect width={layout.nodeWidth} height={n.h} rx={3} fill="#0f172a" />
                  <text x={layout.nodeWidth + 6} y={Math.min(n.h, 16)} fontSize={11} fill="#0f172a">{n.label}</text>
                </g>
              ))}
            </svg>
          </div>
          <div style={{ marginTop: 10, padding: 10, background: '#f0f9ff', borderRadius: 6, fontSize: 13, color: '#075985' }}>
            <strong>{data.total_intake}</strong> patients in last {data.window_hours}h. {data.summary}
          </div>
        </>
      )}
    </div>
  );
}
