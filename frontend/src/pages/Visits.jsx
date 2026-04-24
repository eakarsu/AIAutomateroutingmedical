import { useState, useEffect } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, Sparkles } from 'lucide-react';

const empty = { patient_id: '', nurse_id: '', visit_date: '', start_time: '', end_time: '', visit_type: '', status: 'scheduled', notes: '', address: '' };

export default function Visits() {
  const [items, setItems] = useState([]);
  const [patients, setPatients] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = () => {
    api.getVisits().then(setItems);
    api.getPatients().then(setPatients);
    api.getNurses().then(setNurses);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(v =>
    `${v.patient_first} ${v.patient_last} ${v.nurse_first} ${v.nurse_last} ${v.visit_type}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    try {
      if (editing) { await api.updateVisit(editing, form); toast.success('Visit updated'); }
      else { await api.createVisit(form); toast.success('Visit created'); }
      setEditing(null); setForm(empty); load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this visit?')) return;
    try { await api.deleteVisit(id); toast.success('Visit deleted'); setSelected(null); load(); }
    catch (err) { toast.error(err.message); }
  };

  const generateNotes = async (visitId) => {
    setAiLoading(true); setAiResult(null);
    try { const result = await api.generateNotes({ visit_id: visitId }); setAiResult(result); }
    catch (err) { toast.error('AI generation failed'); }
    finally { setAiLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <div><h2>Visits</h2><div className="page-header-sub">{items.length} visits</div></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="search-bar"><Search size={16} /><input placeholder="Search visits..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => { setForm(empty); setEditing(false); }}><Plus size={16} /> Add Visit</button>
        </div>
      </div>
      <div className="page-body">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Patient</th><th>Nurse</th><th>Date</th><th>Time</th><th>Type</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} onClick={() => { setSelected(v); setAiResult(null); }}>
                  <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{v.patient_first} {v.patient_last}</td>
                  <td>{v.nurse_first} {v.nurse_last}</td>
                  <td>{v.visit_date ? new Date(v.visit_date).toLocaleDateString() : ''}</td>
                  <td>{v.start_time?.slice(0,5)} - {v.end_time?.slice(0,5)}</td>
                  <td>{v.visit_type}</td>
                  <td><span className={`badge badge-${v.status}`}>{v.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal title={`Visit: ${selected.patient_first} ${selected.patient_last}`} onClose={() => setSelected(null)}
          footer={<>
            <button className="btn btn-purple" onClick={() => generateNotes(selected.id)}><Sparkles size={14} /> Generate AI Notes</button>
            <button className="btn btn-outline" onClick={() => { setForm({...selected, visit_date: selected.visit_date?.split('T')[0] || ''}); setEditing(selected.id); setSelected(null); }}><Edit2 size={14} /> Edit</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}><Trash2 size={14} /> Delete</button>
          </>}>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Patient</span><span className="detail-value">{selected.patient_first} {selected.patient_last}</span></div>
            <div className="detail-item"><span className="detail-label">Nurse</span><span className="detail-value">{selected.nurse_first} {selected.nurse_last}</span></div>
            <div className="detail-item"><span className="detail-label">Date</span><span className="detail-value">{selected.visit_date ? new Date(selected.visit_date).toLocaleDateString() : ''}</span></div>
            <div className="detail-item"><span className="detail-label">Time</span><span className="detail-value">{selected.start_time?.slice(0,5)} - {selected.end_time?.slice(0,5)}</span></div>
            <div className="detail-item"><span className="detail-label">Type</span><span className="detail-value">{selected.visit_type}</span></div>
            <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value"><span className={`badge badge-${selected.status}`}>{selected.status}</span></span></div>
            <div className="detail-item full-width"><span className="detail-label">Address</span><span className="detail-value">{selected.address}</span></div>
            <div className="detail-item full-width"><span className="detail-label">Notes</span><span className="detail-value">{selected.notes || 'No notes'}</span></div>
          </div>
          <AIOutput content={aiResult?.content} model={aiResult?.model} tokens={aiResult?.tokens} loading={aiLoading} />
        </Modal>
      )}

      {editing !== null && (
        <Modal title={editing ? 'Edit Visit' : 'New Visit'} onClose={() => setEditing(null)}
          footer={<><button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
          <div className="form-grid">
            <div className="form-group"><label>Patient</label>
              <select value={form.patient_id} onChange={(e) => setForm({...form, patient_id: e.target.value})}>
                <option value="">Select Patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Nurse</label>
              <select value={form.nurse_id} onChange={(e) => setForm({...form, nurse_id: e.target.value})}>
                <option value="">Select Nurse</option>
                {nurses.map(n => <option key={n.id} value={n.id}>{n.first_name} {n.last_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Date</label><input type="date" value={form.visit_date} onChange={(e) => setForm({...form, visit_date: e.target.value})} /></div>
            <div className="form-group"><label>Visit Type</label>
              <select value={form.visit_type} onChange={(e) => setForm({...form, visit_type: e.target.value})}>
                <option value="">Select Type</option>
                <option>Skilled Nursing</option><option>Wound Care</option><option>Physical Therapy</option><option>Respiratory Therapy</option><option>Cardiac Care</option><option>Palliative Care</option>
              </select>
            </div>
            <div className="form-group"><label>Start Time</label><input type="time" value={form.start_time} onChange={(e) => setForm({...form, start_time: e.target.value})} /></div>
            <div className="form-group"><label>End Time</label><input type="time" value={form.end_time} onChange={(e) => setForm({...form, end_time: e.target.value})} /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                <option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group"><label>Address</label><input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} /></div>
            <div className="form-group full-width"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} /></div>
          </div>
        </Modal>
      )}
    </>
  );
}
