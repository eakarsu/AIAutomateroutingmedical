import { useState, useEffect } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';
import { ArrowRightLeft, Sparkles } from 'lucide-react';

const empty = { requester_nurse_id: '', target_nurse_id: '', shift_date: '', reason: '' };

export default function AIShiftSwap() {
  const [items, setItems] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);

  const load = () => api.getShiftSwaps().then(r => setItems(r.data || r)).catch(() => {});
  useEffect(() => {
    load();
    api.getNurses().then(setNurses).catch(() => {});
  }, []);

  const submit = async () => {
    if (!form.requester_nurse_id || !form.shift_date) return toast.error('requester + shift_date required');
    setLoading(true);
    try {
      await api.createShiftSwap({
        requester_nurse_id: parseInt(form.requester_nurse_id),
        target_nurse_id: form.target_nurse_id ? parseInt(form.target_nurse_id) : null,
        shift_date: form.shift_date,
        reason: form.reason,
      });
      toast.success('Swap requested');
      setForm(empty);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.updateShiftSwap(id, { status });
      load();
    } catch (err) { toast.error(err.message); }
  };

  const recColor = (r) => r === 'reject' ? '#ef4444' : r === 'review' ? '#f59e0b' : '#10b981';

  return (
    <>
      <div className="page-header">
        <div><h2>Shift Swap Optimizer</h2><div className="page-header-sub">AI-evaluated shift trades that maintain coverage</div></div>
      </div>
      <div className="page-body">
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
          <h3><ArrowRightLeft size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />New Swap Request</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group"><label>Requester</label>
              <select value={form.requester_nurse_id} onChange={(e) => setForm({ ...form, requester_nurse_id: e.target.value })}>
                <option value="">Select...</option>
                {nurses.map(n => (<option key={n.id} value={n.id}>{n.first_name} {n.last_name}</option>))}
              </select>
            </div>
            <div className="form-group"><label>Target Nurse (optional)</label>
              <select value={form.target_nurse_id} onChange={(e) => setForm({ ...form, target_nurse_id: e.target.value })}>
                <option value="">Open swap</option>
                {nurses.map(n => (<option key={n.id} value={n.id}>{n.first_name} {n.last_name}</option>))}
              </select>
            </div>
            <div className="form-group"><label>Shift Date</label>
              <input type="date" value={form.shift_date} onChange={(e) => setForm({ ...form, shift_date: e.target.value })} />
            </div>
          </div>
          <div className="form-group"><label>Reason</label>
            <textarea rows="2" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <button className="btn btn-purple" onClick={submit} disabled={loading}>
            <Sparkles size={16} /> {loading ? 'Submitting...' : 'Submit + AI Evaluate'}
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)' }}>
          <h3>Swap Requests ({items.length})</h3>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Requester</th><th>Target</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{items.map((s) => {
              let aiRec = {};
              try { aiRec = JSON.parse(s.ai_recommendation || '{}'); } catch {}
              return (
                <tr key={s.id}>
                  <td>{s.shift_date}</td>
                  <td>{s.req_first} {s.req_last}</td>
                  <td>{s.tgt_first ? `${s.tgt_first} ${s.tgt_last}` : 'Open'}</td>
                  <td style={{ fontSize: 12 }}>{s.reason}</td>
                  <td><span style={{ padding: '4px 8px', borderRadius: 4, background: recColor(s.status), color: 'white', fontSize: 11 }}>{s.status}</span>
                    {aiRec.feasibility && <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>AI: {aiRec.feasibility}</div>}
                  </td>
                  <td>
                    {s.status === 'pending' || s.status === 'review' ? (
                      <>
                        <button className="btn btn-sm btn-outline" onClick={() => updateStatus(s.id, 'approved')}>Approve</button>
                        <button className="btn btn-sm btn-outline" style={{ marginLeft: 4 }} onClick={() => updateStatus(s.id, 'rejected')}>Reject</button>
                      </>
                    ) : '-'}
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}
