import { useState } from 'react';

// VIZ #1 — Routing Decision Tree (SVG-rendered)
export default function RoutingDecisionTree() {
  const [form, setForm] = useState({ docType: 'lab', priority: 'routine', payer: 'Aetna', attachments: 1 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const r = await fetch('/api/custom-views/routing-decision-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, attachments: Number(form.attachments) || 0 }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setResult(await r.json());
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  // Compute SVG layout for tree
  function layout(tree) {
    const nodes = [];
    const edges = [];
    let nextId = 0;
    function walk(node, depth, xOffset, parentId) {
      const id = nextId++;
      const myNode = { id, label: node.label, kind: node.kind, leaf: !node.children?.length, depth, x: 0, y: 60 + depth * 90 };
      nodes.push(myNode);
      if (parentId !== undefined) edges.push({ from: parentId, to: id });
      if (node.children?.length) {
        let acc = xOffset;
        node.children.forEach(c => {
          const subWidth = countLeaves(c) * 220;
          walk(c, depth + 1, acc, id);
          myNode.x = (myNode.x || acc) + subWidth / 2; // overwritten below
          acc += subWidth;
        });
      } else {
        myNode.x = xOffset + 110;
      }
      return myNode;
    }
    function countLeaves(node) {
      if (!node.children?.length) return 1;
      return node.children.reduce((s, c) => s + countLeaves(c), 0);
    }
    walk(tree, 0, 0);
    // Recompute parent x as midpoint of children
    const byDepth = {};
    nodes.forEach(n => { (byDepth[n.depth] ||= []).push(n); });
    const maxDepth = Math.max(...nodes.map(n => n.depth));
    for (let d = maxDepth - 1; d >= 0; d--) {
      (byDepth[d] || []).forEach(parent => {
        const children = edges.filter(e => e.from === parent.id).map(e => nodes.find(n => n.id === e.to));
        if (children.length) parent.x = children.reduce((s, c) => s + c.x, 0) / children.length;
      });
    }
    return { nodes, edges };
  }

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Routing Decision Tree</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
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
        <input value={form.payer} onChange={e => setForm({ ...form, payer: e.target.value })} placeholder="Payer" style={{ padding: 6, borderRadius: 4, border: '1px solid #cbd5e1' }} />
        <input type="number" value={form.attachments} onChange={e => setForm({ ...form, attachments: e.target.value })} placeholder="Attachments" style={{ padding: 6, borderRadius: 4, border: '1px solid #cbd5e1', width: 110 }} />
        <button onClick={run} disabled={loading} style={{ padding: '6px 14px', borderRadius: 4, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>
          {loading ? 'Routing...' : 'Compute Route'}
        </button>
      </div>
      {error && <div style={{ color: '#dc2626', marginBottom: 8 }}>Error: {error}</div>}
      {result && (() => {
        const { nodes, edges } = layout(result.tree);
        const width = Math.max(640, Math.max(...nodes.map(n => n.x)) + 220);
        const height = Math.max(...nodes.map(n => n.y)) + 80;
        return (
          <>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
              <svg width={width} height={height} style={{ display: 'block' }}>
                {edges.map((e, i) => {
                  const a = nodes.find(n => n.id === e.from);
                  const b = nodes.find(n => n.id === e.to);
                  return <line key={i} x1={a.x} y1={a.y + 18} x2={b.x} y2={b.y - 18} stroke="#94a3b8" strokeWidth={1.5} />;
                })}
                {nodes.map(n => {
                  const fill = n.kind === 'route' ? '#dbeafe' : n.kind === 'sla' ? '#fef3c7' : n.leaf ? '#dcfce7' : '#f1f5f9';
                  const stroke = n.kind === 'route' ? '#2563eb' : n.kind === 'sla' ? '#d97706' : '#475569';
                  return (
                    <g key={n.id} transform={`translate(${n.x - 100},${n.y - 18})`}>
                      <rect width={200} height={36} rx={6} fill={fill} stroke={stroke} strokeWidth={1} />
                      <text x={100} y={22} textAnchor="middle" fontSize={12} fill="#0f172a">{n.label.length > 30 ? n.label.slice(0, 28) + '...' : n.label}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div style={{ marginTop: 10, padding: 10, background: '#f8fafc', borderRadius: 6, fontSize: 13, color: '#334155' }}>
              {result.narrative}
            </div>
          </>
        );
      })()}
    </div>
  );
}
