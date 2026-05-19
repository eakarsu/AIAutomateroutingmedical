import { useState, useEffect } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, Sparkles, Activity } from 'lucide-react';

const empty = { patient_id: '', nurse_id: '', visit_date: '', start_time: '', end_time: '', visit_type: '', status: 'scheduled', notes: '', address: '' };
const emptyVitals = { bp: '', hr: '', spo2: '', temp: '', weight: '', pain_scale: '' };

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
  const [vitalsForm, setVitalsForm] = useState(emptyVitals);
  const [showVitals, setShowVitals] = useState(false);
  const [vitalsLoading, setVitalsLoading] = useState(false);

  const load = () => {
    api.getVisits().then(data => setItems(Array.isArray(data) ? data : data));
    api.getPatients().then(data => setPatients(Array.isArray(data) ? data : data));
    api.getNurses().then(data => setNurses(Array.isArray(data) ? data : data));
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

  const saveVitals = async (visitId) => {
    setVitalsLoading(true);
    try {
      const payload = {};
      if (vitalsForm.bp) payload.bp = vitalsForm.bp;
      if (vitalsForm.hr) payload.hr = parseFloat(vitalsForm.hr);
      if (vitalsForm.spo2) payload.spo2 = parseFloat(vitalsForm.spo2);
      if (vitalsForm.temp) payload.temp = parseFloat(vitalsForm.temp);
      if (vitalsForm.weight) payload.weight = parseFloat(vitalsForm.weight);
      if (vitalsForm.pain_scale !== '') payload.pain_scale = parseInt(vitalsForm.pain_scale);
      await api.recordVitals(visitId, payload);
      toast.success('Vitals saved');
      setShowVitals(false);
      setVitalsForm(emptyVitals);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setVitalsLoading(false); }
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
            <thead><tr><th>Patient</th><th>Nurse</th><th>Date</th><th>Time</th><th>Type</th><th>Status</th><th>Vitals</th></tr></thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} onClick={() => { setSelected(v); setAiResult(null); setShowVitals(false); setVitalsForm(emptyVitals); }}>
                  <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{v.patient_first} {v.patient_last}</td>
                  <td>{v.nurse_first} {v.nurse_last}</td>
                  <td>{v.visit_date ? new Date(v.visit_date).toLocaleDateString() : ''}</td>
                  <td>{v.start_time?.slice(0,5)} - {v.end_time?.slice(0,5)}</td>
                  <td>{v.visit_type}</td>
                  <td><span className={`badge badge-${v.status}`}>{v.status}</span></td>
                  <td>
                    {v.vitals && Object.keys(v.vitals).length > 0
                      ? <span style={{ color: 'var(--success)', fontSize: 12 }}>Recorded</span>
                      : <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal title={`Visit: ${selected.patient_first} ${selected.patient_last}`} onClose={() => setSelected(null)}
          footer={<>
            <button className="btn btn-outline" style={{ color: 'var(--success)' }} onClick={() => setShowVitals(!showVitals)}>
              <Activity size={14} /> {showVitals ? 'Hide Vitals' : 'Record Vitals'}
            </button>
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
            {selected.vitals && Object.keys(selected.vitals).length > 0 && (
              <div className="detail-item full-width">
                <span className="detail-label">Vitals Recorded</span>
                <span className="detail-value" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {selected.vitals.bp && <span><strong>BP:</strong> {selected.vitals.bp}</span>}
                  {selected.vitals.hr && <span><strong>HR:</strong> {selected.vitals.hr} bpm</span>}
                  {selected.vitals.spo2 && <span><strong>SpO2:</strong> {selected.vitals.spo2}%</span>}
                  {selected.vitals.temp && <span><strong>Temp:</strong> {selected.vitals.temp}°F</span>}
                  {selected.vitals.weight && <span><strong>Weight:</strong> {selected.vitals.weight} lbs</span>}
                  {selected.vitals.pain_scale !== undefined && <span><strong>Pain:</strong> {selected.vitals.pain_scale}/10</span>}
                </span>
              </div>
            )}
          </div>

          {showVitals && (
            <div style={{ marginTop: 16, padding: 16, background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac' }}>
              <h4 style={{ margin: '0 0 12px', color: '#166534' }}><Activity size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Record Vitals</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div className="form-group"><label>Blood Pressure (e.g. 120/80)</label><input value={vitalsForm.bp} onChange={(e) => setVitalsForm({...vitalsForm, bp: e.target.value})} placeholder="120/80" /></div>
                <div className="form-group"><label>Heart Rate (bpm)</label><input type="number" value={vitalsForm.hr} onChange={(e) => setVitalsForm({...vitalsForm, hr: e.target.value})} placeholder="72" /></div>
                <div className="form-group"><label>SpO2 (%)</label><input type="number" value={vitalsForm.spo2} onChange={(e) => setVitalsForm({...vitalsForm, spo2: e.target.value})} placeholder="98" /></div>
                <div className="form-group"><label>Temperature (°F)</label><input type="number" step="0.1" value={vitalsForm.temp} onChange={(e) => setVitalsForm({...vitalsForm, temp: e.target.value})} placeholder="98.6" /></div>
                <div className="form-group"><label>Weight (lbs)</label><input type="number" step="0.1" value={vitalsForm.weight} onChange={(e) => setVitalsForm({...vitalsForm, weight: e.target.value})} placeholder="150" /></div>
                <div className="form-group"><label>Pain Scale (0-10)</label><input type="number" min="0" max="10" value={vitalsForm.pain_scale} onChange={(e) => setVitalsForm({...vitalsForm, pain_scale: e.target.value})} placeholder="0" /></div>
              </div>
              <button className="btn btn-primary" onClick={() => saveVitals(selected.id)} disabled={vitalsLoading} style={{ marginTop: 8 }}>
                {vitalsLoading ? 'Saving...' : 'Save Vitals'}
              </button>
            </div>
          )}

          <AIOutput content={aiResult?.content} structured={aiResult?.structured} model={aiResult?.model} tokens={aiResult?.tokens} loading={aiLoading} />
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
