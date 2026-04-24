import { useState, useEffect } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

const empty = { nurse_id: '', schedule_date: '', shift_start: '', shift_end: '', status: 'scheduled', territory: '', max_visits: 8, notes: '' };

export default function Schedules() {
  const [items, setItems] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = () => { api.getSchedules().then(setItems); api.getNurses().then(setNurses); };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(s =>
    `${s.first_name} ${s.last_name} ${s.territory}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    try {
      if (editing) { await api.updateSchedule(editing, form); toast.success('Schedule updated'); }
      else { await api.createSchedule(form); toast.success('Schedule created'); }
      setEditing(null); setForm(empty); load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this schedule?')) return;
    try { await api.deleteSchedule(id); toast.success('Deleted'); setSelected(null); load(); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <>
      <div className="page-header">
        <div><h2>Schedules</h2><div className="page-header-sub">{items.length} schedules</div></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="search-bar"><Search size={16} /><input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => { setForm(empty); setEditing(false); }}><Plus size={16} /> Add Schedule</button>
        </div>
      </div>
      <div className="page-body">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Nurse</th><th>Date</th><th>Shift</th><th>Territory</th><th>Max Visits</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} onClick={() => setSelected(s)}>
                  <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{s.first_name} {s.last_name}</td>
                  <td>{s.schedule_date ? new Date(s.schedule_date).toLocaleDateString() : ''}</td>
                  <td>{s.shift_start?.slice(0,5)} - {s.shift_end?.slice(0,5)}</td>
                  <td>{s.territory}</td>
                  <td>{s.max_visits}</td>
                  <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal title={`Schedule: ${selected.first_name} ${selected.last_name}`} onClose={() => setSelected(null)}
          footer={<>
            <button className="btn btn-outline" onClick={() => { setForm({...selected, schedule_date: selected.schedule_date?.split('T')[0]||''}); setEditing(selected.id); setSelected(null); }}><Edit2 size={14} /> Edit</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}><Trash2 size={14} /> Delete</button>
          </>}>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Nurse</span><span className="detail-value">{selected.first_name} {selected.last_name}</span></div>
            <div className="detail-item"><span className="detail-label">Specialization</span><span className="detail-value">{selected.specialization}</span></div>
            <div className="detail-item"><span className="detail-label">Date</span><span className="detail-value">{selected.schedule_date ? new Date(selected.schedule_date).toLocaleDateString() : ''}</span></div>
            <div className="detail-item"><span className="detail-label">Shift</span><span className="detail-value">{selected.shift_start?.slice(0,5)} - {selected.shift_end?.slice(0,5)}</span></div>
            <div className="detail-item"><span className="detail-label">Territory</span><span className="detail-value">{selected.territory}</span></div>
            <div className="detail-item"><span className="detail-label">Max Visits</span><span className="detail-value">{selected.max_visits}</span></div>
            <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value"><span className={`badge badge-${selected.status}`}>{selected.status}</span></span></div>
            <div className="detail-item full-width"><span className="detail-label">Notes</span><span className="detail-value">{selected.notes || 'None'}</span></div>
          </div>
        </Modal>
      )}

      {editing !== null && (
        <Modal title={editing ? 'Edit Schedule' : 'New Schedule'} onClose={() => setEditing(null)}
          footer={<><button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
          <div className="form-grid">
            <div className="form-group"><label>Nurse</label>
              <select value={form.nurse_id} onChange={(e) => setForm({...form, nurse_id: e.target.value})}>
                <option value="">Select</option>{nurses.map(n => <option key={n.id} value={n.id}>{n.first_name} {n.last_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Date</label><input type="date" value={form.schedule_date} onChange={(e) => setForm({...form, schedule_date: e.target.value})} /></div>
            <div className="form-group"><label>Shift Start</label><input type="time" value={form.shift_start} onChange={(e) => setForm({...form, shift_start: e.target.value})} /></div>
            <div className="form-group"><label>Shift End</label><input type="time" value={form.shift_end} onChange={(e) => setForm({...form, shift_end: e.target.value})} /></div>
            <div className="form-group"><label>Territory</label><input value={form.territory} onChange={(e) => setForm({...form, territory: e.target.value})} /></div>
            <div className="form-group"><label>Max Visits</label><input type="number" value={form.max_visits} onChange={(e) => setForm({...form, max_visits: e.target.value})} /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                <option value="scheduled">Scheduled</option><option value="active">Active</option><option value="completed">Completed</option>
              </select>
            </div>
            <div className="form-group full-width"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} /></div>
          </div>
        </Modal>
      )}
    </>
  );
}
