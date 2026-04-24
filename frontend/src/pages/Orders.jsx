import { useState, useEffect } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, Sparkles } from 'lucide-react';

const empty = { patient_id: '', ordering_physician: '', order_type: '', description: '', priority: 'routine', status: 'pending', start_date: '', end_date: '', frequency: '', instructions: '' };

export default function Orders() {
  const [items, setItems] = useState([]);
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = () => { api.getOrders().then(setItems); api.getPatients().then(setPatients); };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(o =>
    `${o.patient_first} ${o.patient_last} ${o.order_type} ${o.ordering_physician}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    try {
      if (editing) { await api.updateOrder(editing, form); toast.success('Order updated'); }
      else { await api.createOrder(form); toast.success('Order created'); }
      setEditing(null); setForm(empty); load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this order?')) return;
    try { await api.deleteOrder(id); toast.success('Order deleted'); setSelected(null); load(); }
    catch (err) { toast.error(err.message); }
  };

  const processWithAI = async (orderId) => {
    setAiLoading(true); setAiResult(null);
    try { const result = await api.processOrder({ order_id: orderId }); setAiResult(result); }
    catch (err) { toast.error('AI processing failed'); }
    finally { setAiLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <div><h2>Medical Orders</h2><div className="page-header-sub">{items.length} orders</div></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="search-bar"><Search size={16} /><input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => { setForm(empty); setEditing(false); }}><Plus size={16} /> Add Order</button>
        </div>
      </div>
      <div className="page-body">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Patient</th><th>Physician</th><th>Type</th><th>Priority</th><th>Frequency</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} onClick={() => { setSelected(o); setAiResult(null); }}>
                  <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{o.patient_first} {o.patient_last}</td>
                  <td>{o.ordering_physician}</td>
                  <td>{o.order_type}</td>
                  <td><span className={`badge badge-${o.priority}`}>{o.priority}</span></td>
                  <td>{o.frequency}</td>
                  <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal title={`Order: ${selected.order_type}`} onClose={() => setSelected(null)}
          footer={<>
            <button className="btn btn-purple" onClick={() => processWithAI(selected.id)}><Sparkles size={14} /> AI Process Order</button>
            <button className="btn btn-outline" onClick={() => { setForm({...selected, start_date: selected.start_date?.split('T')[0]||'', end_date: selected.end_date?.split('T')[0]||''}); setEditing(selected.id); setSelected(null); }}><Edit2 size={14} /> Edit</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}><Trash2 size={14} /> Delete</button>
          </>}>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Patient</span><span className="detail-value">{selected.patient_first} {selected.patient_last}</span></div>
            <div className="detail-item"><span className="detail-label">Physician</span><span className="detail-value">{selected.ordering_physician}</span></div>
            <div className="detail-item"><span className="detail-label">Type</span><span className="detail-value">{selected.order_type}</span></div>
            <div className="detail-item"><span className="detail-label">Priority</span><span className="detail-value"><span className={`badge badge-${selected.priority}`}>{selected.priority}</span></span></div>
            <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value"><span className={`badge badge-${selected.status}`}>{selected.status}</span></span></div>
            <div className="detail-item"><span className="detail-label">Frequency</span><span className="detail-value">{selected.frequency}</span></div>
            <div className="detail-item"><span className="detail-label">Start Date</span><span className="detail-value">{selected.start_date ? new Date(selected.start_date).toLocaleDateString() : ''}</span></div>
            <div className="detail-item"><span className="detail-label">End Date</span><span className="detail-value">{selected.end_date ? new Date(selected.end_date).toLocaleDateString() : ''}</span></div>
            <div className="detail-item full-width"><span className="detail-label">Description</span><span className="detail-value">{selected.description}</span></div>
            <div className="detail-item full-width"><span className="detail-label">Instructions</span><span className="detail-value">{selected.instructions}</span></div>
          </div>
          <AIOutput content={aiResult?.content} model={aiResult?.model} tokens={aiResult?.tokens} loading={aiLoading} />
        </Modal>
      )}

      {editing !== null && (
        <Modal title={editing ? 'Edit Order' : 'New Order'} onClose={() => setEditing(null)}
          footer={<><button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
          <div className="form-grid">
            <div className="form-group"><label>Patient</label>
              <select value={form.patient_id} onChange={(e) => setForm({...form, patient_id: e.target.value})}>
                <option value="">Select</option>{patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Physician</label><input value={form.ordering_physician} onChange={(e) => setForm({...form, ordering_physician: e.target.value})} /></div>
            <div className="form-group"><label>Order Type</label>
              <select value={form.order_type} onChange={(e) => setForm({...form, order_type: e.target.value})}>
                <option value="">Select</option><option>Skilled Nursing</option><option>Wound Care</option><option>Physical Therapy</option><option>Respiratory Therapy</option><option>Cardiac Care</option><option>Palliative Care</option><option>IV Therapy</option><option>Oncology</option>
              </select>
            </div>
            <div className="form-group"><label>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})}>
                <option value="routine">Routine</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                <option value="pending">Pending</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group"><label>Frequency</label><input value={form.frequency} onChange={(e) => setForm({...form, frequency: e.target.value})} placeholder="e.g., 3x per week" /></div>
            <div className="form-group"><label>Start Date</label><input type="date" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} /></div>
            <div className="form-group"><label>End Date</label><input type="date" value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} /></div>
            <div className="form-group full-width"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
            <div className="form-group full-width"><label>Instructions</label><textarea value={form.instructions} onChange={(e) => setForm({...form, instructions: e.target.value})} /></div>
          </div>
        </Modal>
      )}
    </>
  );
}
