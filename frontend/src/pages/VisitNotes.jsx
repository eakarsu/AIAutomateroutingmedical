import { useState, useEffect } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, Sparkles } from 'lucide-react';

const empty = { visit_id: '', nurse_id: '', note_type: 'SOAP', content: '' };

export default function VisitNotes() {
  const [items, setItems] = useState([]);
  const [visits, setVisits] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = () => {
    api.getVisitNotes().then(setItems);
    api.getVisits().then(setVisits);
    api.getNurses().then(setNurses);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(n =>
    `${n.patient_first} ${n.patient_last} ${n.nurse_first} ${n.nurse_last} ${n.note_type} ${n.content}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    try {
      if (editing) { await api.updateVisitNote(editing, form); toast.success('Note updated'); }
      else { await api.createVisitNote(form); toast.success('Note created'); }
      setEditing(null); setForm(empty); load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this note?')) return;
    try { await api.deleteVisitNote(id); toast.success('Deleted'); setSelected(null); load(); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <>
      <div className="page-header">
        <div><h2>Visit Notes</h2><div className="page-header-sub">{items.length} clinical notes</div></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="search-bar"><Search size={16} /><input placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => { setForm(empty); setEditing(false); }}><Plus size={16} /> Add Note</button>
        </div>
      </div>
      <div className="page-body">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Patient</th><th>Nurse</th><th>Type</th><th>Date</th><th>AI</th><th>Preview</th></tr></thead>
            <tbody>
              {filtered.map((n) => (
                <tr key={n.id} onClick={() => setSelected(n)}>
                  <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{n.patient_first} {n.patient_last}</td>
                  <td>{n.nurse_first} {n.nurse_last}</td>
                  <td><span className={`badge ${n.note_type === 'SOAP' ? 'badge-active' : 'badge-scheduled'}`}>{n.note_type}</span></td>
                  <td>{n.visit_date ? new Date(n.visit_date).toLocaleDateString() : ''}</td>
                  <td>{n.ai_generated ? <Sparkles size={14} style={{ color: 'var(--purple)' }} /> : '-'}</td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.content?.substring(0, 80)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal title={`Note: ${selected.patient_first} ${selected.patient_last}`} onClose={() => setSelected(null)}
          footer={<>
            <button className="btn btn-outline" onClick={() => { setForm({ visit_id: selected.visit_id, nurse_id: selected.nurse_id, note_type: selected.note_type, content: selected.content }); setEditing(selected.id); setSelected(null); }}><Edit2 size={14} /> Edit</button>
            <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}><Trash2 size={14} /> Delete</button>
          </>}>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Patient</span><span className="detail-value">{selected.patient_first} {selected.patient_last}</span></div>
            <div className="detail-item"><span className="detail-label">Nurse</span><span className="detail-value">{selected.nurse_first} {selected.nurse_last}</span></div>
            <div className="detail-item"><span className="detail-label">Note Type</span><span className="detail-value">{selected.note_type}</span></div>
            <div className="detail-item"><span className="detail-label">Visit Date</span><span className="detail-value">{selected.visit_date ? new Date(selected.visit_date).toLocaleDateString() : 'N/A'}</span></div>
            <div className="detail-item"><span className="detail-label">Visit Type</span><span className="detail-value">{selected.visit_type}</span></div>
            <div className="detail-item"><span className="detail-label">AI Generated</span><span className="detail-value">{selected.ai_generated ? 'Yes' : 'No'}</span></div>
          </div>
          <div style={{ marginTop: 16, padding: 16, background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', lineHeight: 1.7, fontSize: 14 }}>
            <div className="detail-label" style={{ marginBottom: 8 }}>Note Content</div>
            {selected.content}
          </div>
        </Modal>
      )}

      {editing !== null && (
        <Modal title={editing ? 'Edit Note' : 'New Note'} onClose={() => setEditing(null)}
          footer={<><button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
          <div className="form-grid">
            <div className="form-group"><label>Visit</label>
              <select value={form.visit_id} onChange={(e) => setForm({...form, visit_id: e.target.value})}>
                <option value="">Select Visit</option>
                {visits.map(v => <option key={v.id} value={v.id}>{v.patient_first} {v.patient_last} - {v.visit_type} ({new Date(v.visit_date).toLocaleDateString()})</option>)}
              </select>
            </div>
            <div className="form-group"><label>Nurse</label>
              <select value={form.nurse_id} onChange={(e) => setForm({...form, nurse_id: e.target.value})}>
                <option value="">Select Nurse</option>
                {nurses.map(n => <option key={n.id} value={n.id}>{n.first_name} {n.last_name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Note Type</label>
              <select value={form.note_type} onChange={(e) => setForm({...form, note_type: e.target.value})}>
                <option value="SOAP">SOAP</option><option value="Progress">Progress</option><option value="Wound Care">Wound Care</option><option value="Assessment">Assessment</option><option value="Cardiac">Cardiac</option><option value="Palliative">Palliative</option>
              </select>
            </div>
            <div className="form-group full-width"><label>Content</label><textarea rows={8} value={form.content} onChange={(e) => setForm({...form, content: e.target.value})} placeholder="Enter clinical note content..." /></div>
          </div>
        </Modal>
      )}
    </>
  );
}
