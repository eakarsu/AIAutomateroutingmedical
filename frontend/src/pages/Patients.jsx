import { useState, useEffect } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, Sparkles } from 'lucide-react';
import AIOutput from '../components/AIOutput';

const empty = { first_name: '', last_name: '', date_of_birth: '', gender: '', phone: '', email: '', address: '', city: '', state: '', zip: '', insurance_provider: '', insurance_id: '', primary_diagnosis: '', status: 'active', assigned_nurse_id: '' };

export default function Patients() {
  const [items, setItems] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = () => {
    api.getPatients().then(setItems).catch(() => toast.error('Failed to load'));
    api.getNurses().then(setNurses);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(p =>
    `${p.first_name} ${p.last_name} ${p.primary_diagnosis} ${p.insurance_provider}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    try {
      if (editing) { await api.updatePatient(editing, form); toast.success('Patient updated'); }
      else { await api.createPatient(form); toast.success('Patient created'); }
      setEditing(null); setForm(empty); load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this patient?')) return;
    try { await api.deletePatient(id); toast.success('Patient deleted'); setSelected(null); load(); }
    catch (err) { toast.error(err.message); }
  };

  const runRiskAssessment = async (patientId) => {
    setAiLoading(true); setAiResult(null);
    try {
      const result = await api.patientRisk({ patient_id: patientId });
      setAiResult(result);
    } catch (err) { toast.error('AI analysis failed'); }
    finally { setAiLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <div><h2>Patients</h2><div className="page-header-sub">{items.length} patients</div></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="search-bar"><Search size={16} /><input placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => { setForm(empty); setEditing(false); }}><Plus size={16} /> Add Patient</button>
        </div>
      </div>
      <div className="page-body">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Diagnosis</th><th>Insurance</th><th>Assigned Nurse</th><th>Phone</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} onClick={() => { setSelected(p); setAiResult(null); }}>
                  <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{p.first_name} {p.last_name}</td>
                  <td>{p.primary_diagnosis}</td>
                  <td>{p.insurance_provider}</td>
                  <td>{p.nurse_first_name ? `${p.nurse_first_name} ${p.nurse_last_name}` : 'Unassigned'}</td>
                  <td>{p.phone}</td>
                  <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal title={`${selected.first_name} ${selected.last_name}`} onClose={() => setSelected(null)}
          footer={<>
            <button className="btn btn-purple" onClick={() => runRiskAssessment(selected.id)}><Sparkles size={14} /> AI Risk Assessment</button>
            <button className="btn btn-outline" onClick={() => { setForm({...selected, date_of_birth: selected.date_of_birth?.split('T')[0] || ''}); setEditing(selected.id); setSelected(null); }}><Edit2 size={14} /> Edit</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}><Trash2 size={14} /> Delete</button>
          </>}>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Date of Birth</span><span className="detail-value">{selected.date_of_birth ? new Date(selected.date_of_birth).toLocaleDateString() : 'N/A'}</span></div>
            <div className="detail-item"><span className="detail-label">Gender</span><span className="detail-value">{selected.gender}</span></div>
            <div className="detail-item"><span className="detail-label">Phone</span><span className="detail-value">{selected.phone}</span></div>
            <div className="detail-item"><span className="detail-label">Email</span><span className="detail-value">{selected.email}</span></div>
            <div className="detail-item"><span className="detail-label">Insurance</span><span className="detail-value">{selected.insurance_provider} ({selected.insurance_id})</span></div>
            <div className="detail-item"><span className="detail-label">Diagnosis</span><span className="detail-value">{selected.primary_diagnosis}</span></div>
            <div className="detail-item"><span className="detail-label">Assigned Nurse</span><span className="detail-value">{selected.nurse_first_name ? `${selected.nurse_first_name} ${selected.nurse_last_name}` : 'Unassigned'}</span></div>
            <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value"><span className={`badge badge-${selected.status}`}>{selected.status}</span></span></div>
            <div className="detail-item full-width"><span className="detail-label">Address</span><span className="detail-value">{selected.address}, {selected.city}, {selected.state} {selected.zip}</span></div>
          </div>
          <AIOutput content={aiResult?.content} structured={aiResult?.structured} model={aiResult?.model} tokens={aiResult?.tokens} loading={aiLoading} />
        </Modal>
      )}

      {editing !== null && (
        <Modal title={editing ? 'Edit Patient' : 'New Patient'} onClose={() => setEditing(null)}
          footer={<><button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
          <div className="form-grid">
            <div className="form-group"><label>First Name</label><input value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} /></div>
            <div className="form-group"><label>Last Name</label><input value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} /></div>
            <div className="form-group"><label>Date of Birth</label><input type="date" value={form.date_of_birth} onChange={(e) => setForm({...form, date_of_birth: e.target.value})} /></div>
            <div className="form-group"><label>Gender</label>
              <select value={form.gender} onChange={(e) => setForm({...form, gender: e.target.value})}>
                <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option>
              </select>
            </div>
            <div className="form-group"><label>Phone</label><input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} /></div>
            <div className="form-group"><label>Email</label><input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
            <div className="form-group full-width"><label>Address</label><input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} /></div>
            <div className="form-group"><label>City</label><input value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} /></div>
            <div className="form-group"><label>State</label><input value={form.state} onChange={(e) => setForm({...form, state: e.target.value})} /></div>
            <div className="form-group"><label>Zip</label><input value={form.zip} onChange={(e) => setForm({...form, zip: e.target.value})} /></div>
            <div className="form-group"><label>Insurance Provider</label><input value={form.insurance_provider} onChange={(e) => setForm({...form, insurance_provider: e.target.value})} /></div>
            <div className="form-group"><label>Insurance ID</label><input value={form.insurance_id} onChange={(e) => setForm({...form, insurance_id: e.target.value})} /></div>
            <div className="form-group full-width"><label>Primary Diagnosis</label><input value={form.primary_diagnosis} onChange={(e) => setForm({...form, primary_diagnosis: e.target.value})} /></div>
            <div className="form-group"><label>Assigned Nurse</label>
              <select value={form.assigned_nurse_id || ''} onChange={(e) => setForm({...form, assigned_nurse_id: e.target.value || null})}>
                <option value="">Unassigned</option>
                {nurses.map(n => <option key={n.id} value={n.id}>{n.first_name} {n.last_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                <option value="active">Active</option><option value="inactive">Inactive</option><option value="discharged">Discharged</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
