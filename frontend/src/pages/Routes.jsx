import { useState, useEffect } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

const empty = { nurse_id: '', route_date: '', status: 'planned', total_distance: '', total_duration: '', optimization_score: '' };

export default function Routes() {
  const [items, setItems] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = () => { api.getRoutes().then(setItems); api.getNurses().then(setNurses); };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(r =>
    `${r.first_name} ${r.last_name} ${r.status}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    try {
      if (editing) { await api.updateRoute(editing, form); toast.success('Route updated'); }
      else { await api.createRoute(form); toast.success('Route created'); }
      setEditing(null); setForm(empty); load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this route?')) return;
    try { await api.deleteRoute(id); toast.success('Deleted'); setSelected(null); load(); }
    catch (err) { toast.error(err.message); }
  };

  const viewDetail = async (route) => {
    try {
      const detail = await api.getRoute(route.id);
      setSelected(detail);
    } catch (err) { toast.error('Failed to load route details'); }
  };

  return (
    <>
      <div className="page-header">
        <div><h2>Routes</h2><div className="page-header-sub">{items.length} routes</div></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="search-bar"><Search size={16} /><input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => { setForm(empty); setEditing(false); }}><Plus size={16} /> Add Route</button>
        </div>
      </div>
      <div className="page-body">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Nurse</th><th>Date</th><th>Stops</th><th>Distance</th><th>Duration</th><th>Score</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} onClick={() => viewDetail(r)}>
                  <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{r.first_name} {r.last_name}</td>
                  <td>{r.route_date ? new Date(r.route_date).toLocaleDateString() : ''}</td>
                  <td>{r.stop_count} stops</td>
                  <td>{r.total_distance} mi</td>
                  <td>{r.total_duration} min</td>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      color: Number(r.optimization_score) >= 90 ? 'var(--success)' : Number(r.optimization_score) >= 80 ? 'var(--warning)' : 'var(--danger)'
                    }}>{Number(r.optimization_score).toFixed(1)}%</span>
                  </td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal title={`Route: ${selected.first_name} ${selected.last_name}`} onClose={() => setSelected(null)}
          footer={<>
            <button className="btn btn-outline" onClick={() => { setForm({...selected, route_date: selected.route_date?.split('T')[0]||''}); setEditing(selected.id); setSelected(null); }}><Edit2 size={14} /> Edit</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}><Trash2 size={14} /> Delete</button>
          </>}>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Nurse</span><span className="detail-value">{selected.first_name} {selected.last_name}</span></div>
            <div className="detail-item"><span className="detail-label">Date</span><span className="detail-value">{selected.route_date ? new Date(selected.route_date).toLocaleDateString() : ''}</span></div>
            <div className="detail-item"><span className="detail-label">Distance</span><span className="detail-value">{selected.total_distance} miles</span></div>
            <div className="detail-item"><span className="detail-label">Duration</span><span className="detail-value">{selected.total_duration} minutes</span></div>
            <div className="detail-item"><span className="detail-label">Optimization</span><span className="detail-value" style={{ fontWeight: 700, color: 'var(--success)' }}>{Number(selected.optimization_score).toFixed(1)}%</span></div>
            <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value"><span className={`badge badge-${selected.status}`}>{selected.status}</span></span></div>
          </div>
          {selected.stops && selected.stops.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, color: 'var(--gray-700)' }}>Route Stops</h4>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>#</th><th>Patient</th><th>Type</th><th>ETA</th><th>Distance</th></tr></thead>
                  <tbody>
                    {selected.stops.map((s) => (
                      <tr key={s.id} onClick={(e) => e.stopPropagation()}>
                        <td>{s.stop_order}</td>
                        <td>{s.patient_first} {s.patient_last}</td>
                        <td>{s.visit_type}</td>
                        <td>{s.estimated_arrival?.slice(0,5)}</td>
                        <td>{s.distance_from_prev} mi</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal>
      )}

      {editing !== null && (
        <Modal title={editing ? 'Edit Route' : 'New Route'} onClose={() => setEditing(null)}
          footer={<><button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
          <div className="form-grid">
            <div className="form-group"><label>Nurse</label>
              <select value={form.nurse_id} onChange={(e) => setForm({...form, nurse_id: e.target.value})}>
                <option value="">Select</option>{nurses.map(n => <option key={n.id} value={n.id}>{n.first_name} {n.last_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Date</label><input type="date" value={form.route_date} onChange={(e) => setForm({...form, route_date: e.target.value})} /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                <option value="planned">Planned</option><option value="active">Active</option><option value="completed">Completed</option>
              </select>
            </div>
            <div className="form-group"><label>Total Distance (mi)</label><input type="number" step="0.1" value={form.total_distance} onChange={(e) => setForm({...form, total_distance: e.target.value})} /></div>
            <div className="form-group"><label>Total Duration (min)</label><input type="number" value={form.total_duration} onChange={(e) => setForm({...form, total_duration: e.target.value})} /></div>
            <div className="form-group"><label>Optimization Score (%)</label><input type="number" step="0.1" value={form.optimization_score} onChange={(e) => setForm({...form, optimization_score: e.target.value})} /></div>
          </div>
        </Modal>
      )}
    </>
  );
}
