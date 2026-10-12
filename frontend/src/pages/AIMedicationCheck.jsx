import AIReport from '../components/AIReport';
import NativeAIPresets from '../components/NativeAIPresets';
import { useState, useEffect } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';
import { Pill, Sparkles, AlertTriangle } from 'lucide-react';

export default function AIMedicationCheck() {
  const [medicationOrders, setMedicationOrders] = useState([]);
  useEffect(() => { api.getOrders().then(data=>setMedicationOrders(Array.isArray(data)?data:data.data||[])).catch(()=>{}); }, []);
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [extraMeds, setExtraMeds] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.getPatients().then(setPatients).catch(() => {}); }, []);

  const run = async () => {
    if (!patientId) return toast.error('Select a patient');
    setLoading(true); setResult(null);
    try {
      const data = await api.medicationCheck({
        patient_id: patientId,
        additional_meds: extraMeds.split('\n').map(s => s.trim()).filter(Boolean),
      });
      setResult(data);
    } catch (err) { toast.error('Check failed'); }
    finally { setLoading(false); }
  };

  const sevColor = (s) => s === 'severe' ? '#ef4444' : s === 'moderate' ? '#f59e0b' : '#3b82f6';

  return (
    <>
      <div className="page-header">
        <div><h2>Medication Interaction Checker</h2><div className="page-header-sub">Cross-reference patient meds for interactions, duplications, contraindications</div></div>
      </div>
      <div className="page-body">
        <NativeAIPresets disabled={loading} presets={['First available record','Next available record','Current record review'].map((label,index)=>({label,fill:()=>{const withMedicationOrders=patients.filter(patient=>medicationOrders.some(order=>String(order.patient_id)===String(patient.id)&&/medication|prescription|medicine/i.test(order.order_type||'')));const id=patientId || withMedicationOrders[index%withMedicationOrders.length]?.id || patients[index%patients.length]?.id;if(id)setPatientId(String(id));const actualMeds=medicationOrders.filter(order=>String(order.patient_id)===String(id)&&/medication|prescription|medicine/i.test(order.order_type||'')).map(order=>order.description).filter(Boolean);setExtraMeds(extraMeds || actualMeds.join('\n') || ['Acetaminophen','Ibuprofen','Cetirizine'][index] + ' (fictional additional-medication example; not a saved patient order; replace with verified medication details before checking)');return id ? (extraMeds || actualMeds.length ? 'Example filled from accessible records. Review before generating.' : 'All fields filled; additional medication is a clearly marked fictional example. Replace it with actual medication facts before checking.') : 'Select an actual available record before generating.';}}))} />
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
          <div className="form-group"><label>Patient</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Select...</option>
              {patients.map(p => (<option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>))}
            </select>
          </div>
          <div className="form-group"><label>Additional medications (one per line, optional)</label>
            <textarea rows="3" value={extraMeds} onChange={(e) => setExtraMeds(e.target.value)} placeholder="e.g. Warfarin 5mg daily" />
          </div>
          <button className="btn btn-purple" onClick={run} disabled={loading} style={{ marginTop: 16 }}>
            <Sparkles size={16} /> {loading ? 'Checking...' : 'Check Interactions'}
          </button>
        </div>

        {result && <AIReport response={result} title="AI analysis report" />}
        {result && (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
            <h3><Pill size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Analysis ({result.total_meds_checked} meds)</h3>

            {result.interactions && result.interactions.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4>Interactions ({result.interactions.length})</h4>
                {result.interactions.map((i, idx) => (
                  <div key={idx} style={{ padding: 12, marginBottom: 8, borderLeft: `4px solid ${sevColor(i.severity)}`, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{(i.drugs || []).join(' + ')}</strong>
                      <span style={{ color: sevColor(i.severity), fontWeight: 600 }}>{i.severity}</span>
                    </div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>{i.description}</div>
                  </div>
                ))}
              </div>
            )}

            {result.duplications && result.duplications.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4>Duplications</h4>
                {result.duplications.map((d, idx) => (
                  <div key={idx} style={{ padding: 8, marginBottom: 4, background: '#fff7ed' }}>
                    <strong>{(d.drugs || []).join(', ')}</strong>: {d.note}
                  </div>
                ))}
              </div>
            )}

            {result.contraindications && result.contraindications.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4><AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6, color: '#ef4444' }} />Contraindications</h4>
                {result.contraindications.map((c, idx) => (
                  <div key={idx} style={{ padding: 8, marginBottom: 4, background: '#fef2f2' }}>
                    <strong>{c.drug}</strong> with {c.with_diagnosis}: {c.note}
                  </div>
                ))}
              </div>
            )}

            <p><strong>Summary:</strong> {result.summary}</p>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 12 }}>{result.tokens} tokens | {result.model}</p>
          </div>
        )}
      </div>
    </>
  );
}
