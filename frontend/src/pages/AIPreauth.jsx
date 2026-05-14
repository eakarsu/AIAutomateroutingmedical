import { useState, useEffect } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';
import { ShieldCheck, Sparkles } from 'lucide-react';

const empty = { patient_id: '', order_id: '', service_description: '', insurance_provider: '', notes: '' };

export default function AIPreauth() {
  const [items, setItems] = useState([]);
  const [patients, setPatients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(empty);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => api.getPreauths().then(r => setItems(r.data || r)).catch(() => {});

  useEffect(() => {
    load();
    api.getPatients().then(setPatients).catch(() => {});
    api.getOrders().then(setOrders).catch(() => {});
  }, []);

  const submit = async () => {
    if (!form.patient_id || !form.service_description) return toast.error('patient + service required');
    setLoading(true);
    try {
      await api.createPreauth({
        patient_id: parseInt(form.patient_id),
        order_id: form.order_id ? parseInt(form.order_id) : null,
        service_description: form.service_description,
        insurance_provider: form.insurance_provider,
        notes: form.notes,
      });
      toast.success('Pre-auth submitted');
      setForm(empty);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status, auth_number) => {
    try {
      await api.updatePreauth(id, { status, auth_number });
      load();
    } catch (err) { toast.error(err.message); }
  };

  const remove = async (id) => {
    if (!confirm('Delete?')) return;
    await api.deletePreauth(id);
    load();
  };

  const stColor = (s) => s === 'approved' ? '#10b981' : s === 'denied' ? '#ef4444' : '#f59e0b';

  return (
    <>
      <div className="page-header">
        <div><h2>Insurance Pre-Auth Workflow</h2><div className="page-header-sub">AI-generated pre-authorization requests with approval tracking</div></div>
      </div>
      <div className="page-body">
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
          <h3><ShieldCheck size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />New Pre-Auth Request</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group"><label>Patient</label>
              <select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                <option value="">Select...</option>
                {patients.map(p => (<option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>))}
              </select>
            </div>
            <div className="form-group"><label>Related Order (optional)</label>
              <select value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })}>
                <option value="">None</option>
                {orders.filter(o => !form.patient_id || o.patient_id === parseInt(form.patient_id)).map(o => (
                  <option key={o.id} value={o.id}>{o.order_type}: {o.description?.slice(0, 40)}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}><label>Service Description</label>
              <textarea rows="2" value={form.service_description} onChange={(e) => setForm({ ...form, service_description: e.target.value })} />
            </div>
            <div className="form-group"><label>Insurance Provider</label>
              <input value={form.insurance_provider} onChange={(e) => setForm({ ...form, insurance_provider: e.target.value })} />
            </div>
            <div className="form-group"><label>Notes</label>
              <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-purple" onClick={submit} disabled={loading}>
            <Sparkles size={16} /> {loading ? 'Submitting...' : 'Submit + AI Generate Justification'}
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)' }}>
          <h3>Pre-Auth Requests ({items.length})</h3>
          <table className="data-table">
            <thead><tr><th>Submitted</th><th>Patient</th><th>Service</th><th>Insurance</th><th>Status</th><th>Auth #</th><th>Actions</th></tr></thead>
            <tbody>{items.map((p) => (
              <tr key={p.id}>
                <td style={{ fontSize: 12 }}>{new Date(p.submitted_at).toLocaleDateString()}</td>
                <td>{p.first_name} {p.last_name}</td>
                <td style={{ maxWidth: 250, fontSize: 12 }}>{(p.service_description || '').slice(0, 100)}</td>
                <td>{p.insurance_provider}</td>
                <td><span style={{ padding: '4px 8px', borderRadius: 4, background: stColor(p.status), color: 'white', fontSize: 11 }}>{p.status}</span></td>
                <td>{p.auth_number || '-'}</td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={() => setSelected(selected === p.id ? null : p.id)}>{selected === p.id ? 'Hide' : 'View'}</button>
                  {p.status === 'pending' && (
                    <>
                      <button className="btn btn-sm btn-outline" style={{ marginLeft: 4 }} onClick={() => updateStatus(p.id, 'approved', prompt('Auth #?'))}>Approve</button>
                      <button className="btn btn-sm btn-outline" style={{ marginLeft: 4 }} onClick={() => updateStatus(p.id, 'denied')}>Deny</button>
                    </>
                  )}
                  <button className="btn btn-sm btn-outline" style={{ marginLeft: 4 }} onClick={() => remove(p.id)}>Del</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {selected && (
            <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 6 }}>
              <h4>AI Justification (Pre-Auth #{selected})</h4>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{items.find(p => p.id === selected)?.ai_summary}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
