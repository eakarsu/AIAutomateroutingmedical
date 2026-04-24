import { useState, useEffect } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

const emptyNurse = { first_name: '', last_name: '', email: '', phone: '', license_number: '', specialization: '', status: 'active', hire_date: '', address: '', city: '', state: '', zip: '' };

export default function Nurses() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyNurse);

  const load = () => api.getNurses().then(setItems).catch(() => toast.error('Failed to load nurses'));
  useEffect(() => { load(); }, []);

  const filtered = items.filter(n =>
    `${n.first_name} ${n.last_name} ${n.specialization} ${n.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    try {
      if (editing) {
        await api.updateNurse(editing, form);
        toast.success('Nurse updated');
      } else {
        await api.createNurse(form);
        toast.success('Nurse created');
      }
      setEditing(null); setForm(emptyNurse); load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this nurse?')) return;
    try { await api.deleteNurse(id); toast.success('Nurse deleted'); setSelected(null); load(); }
    catch (err) { toast.error(err.message); }
  };

  const openEdit = (item) => {
    setForm({ ...item, hire_date: item.hire_date ? item.hire_date.split('T')[0] : '' });
    setEditing(item.id);
    setSelected(null);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Nurses</h2>
          <div className="page-header-sub">{items.length} nurses in the system</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="search-bar">
            <Search size={16} />
            <input placeholder="Search nurses..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => { setForm(emptyNurse); setEditing(false); }}>
            <Plus size={16} /> Add Nurse
          </button>
        </div>
      </div>
      <div className="page-body">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Specialization</th><th>Phone</th><th>License</th><th>City</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => (
                <tr key={n.id} onClick={() => setSelected(n)}>
                  <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{n.first_name} {n.last_name}</td>
                  <td>{n.specialization}</td>
                  <td>{n.phone}</td>
                  <td>{n.license_number}</td>
                  <td>{n.city}, {n.state}</td>
                  <td><span className={`badge badge-${n.status}`}>{n.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal title={`${selected.first_name} ${selected.last_name}`} onClose={() => setSelected(null)}
          footer={<>
            <button className="btn btn-outline" onClick={() => openEdit(selected)}><Edit2 size={14} /> Edit</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}><Trash2 size={14} /> Delete</button>
          </>}>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Email</span><span className="detail-value">{selected.email}</span></div>
            <div className="detail-item"><span className="detail-label">Phone</span><span className="detail-value">{selected.phone}</span></div>
            <div className="detail-item"><span className="detail-label">License</span><span className="detail-value">{selected.license_number}</span></div>
            <div className="detail-item"><span className="detail-label">Specialization</span><span className="detail-value">{selected.specialization}</span></div>
            <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value"><span className={`badge badge-${selected.status}`}>{selected.status}</span></span></div>
            <div className="detail-item"><span className="detail-label">Hire Date</span><span className="detail-value">{selected.hire_date ? new Date(selected.hire_date).toLocaleDateString() : 'N/A'}</span></div>
            <div className="detail-item full-width"><span className="detail-label">Address</span><span className="detail-value">{selected.address}, {selected.city}, {selected.state} {selected.zip}</span></div>
          </div>
        </Modal>
      )}

      {editing !== null && (
        <Modal title={editing ? 'Edit Nurse' : 'New Nurse'} onClose={() => setEditing(null)}
          footer={<>
            <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>Save</button>
          </>}>
          <div className="form-grid">
            <div className="form-group"><label>First Name</label><input value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} /></div>
            <div className="form-group"><label>Last Name</label><input value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} /></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
            <div className="form-group"><label>Phone</label><input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} /></div>
            <div className="form-group"><label>License Number</label><input value={form.license_number} onChange={(e) => setForm({...form, license_number: e.target.value})} /></div>
            <div className="form-group"><label>Specialization</label><input value={form.specialization} onChange={(e) => setForm({...form, specialization: e.target.value})} /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                <option value="active">Active</option><option value="on_leave">On Leave</option><option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="form-group"><label>Hire Date</label><input type="date" value={form.hire_date} onChange={(e) => setForm({...form, hire_date: e.target.value})} /></div>
            <div className="form-group full-width"><label>Address</label><input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} /></div>
            <div className="form-group"><label>City</label><input value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} /></div>
            <div className="form-group"><label>State</label><input value={form.state} onChange={(e) => setForm({...form, state: e.target.value})} /></div>
            <div className="form-group"><label>Zip</label><input value={form.zip} onChange={(e) => setForm({...form, zip: e.target.value})} /></div>
          </div>
        </Modal>
      )}
    </>
  );
}
