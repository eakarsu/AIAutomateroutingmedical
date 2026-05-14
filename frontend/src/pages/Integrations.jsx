import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// Apply pass 5 — Integrations & deferred-backlog UI.
// Hits /api/integrations endpoints exposed by backend/routes/integrations.js.
// All NEEDS-CREDS endpoints surface 503 + missing[] env vars.

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function callApi(path, opts = {}) {
  const res = await fetch(`/api${path}`, { ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } });
  let body = null;
  try { body = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, body };
}

export default function Integrations() {
  const [tab, setTab] = useState('ehr');
  const [status, setStatus] = useState({});
  const [feedback, setFeedback] = useState({ patient_id: '', visit_id: '', rating: 5, relationship: 'family', comments: '' });
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [streamPid, setStreamPid] = useState('1');
  const [streamSamples, setStreamSamples] = useState([]);
  const [pushToken, setPushToken] = useState('');
  const [trend, setTrend] = useState(null);

  const probe = async (label, path, method = 'POST') => {
    const r = await callApi(path, { method, body: method === 'GET' ? undefined : '{}' });
    setStatus((s) => ({ ...s, [label]: r }));
    if (r.status === 503) toast(`${label}: ${r.body?.error || '503'}${r.body?.missing ? ' — missing ' + r.body.missing.join(',') : ''}`);
  };

  const submitFeedback = async () => {
    const r = await callApi('/integrations/caregiver-feedback', {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
    if (!r.ok) return toast.error(r.body?.error || 'Failed');
    toast.success('Feedback recorded');
    refreshFeedback();
  };

  const refreshFeedback = async () => {
    const list = await callApi('/integrations/caregiver-feedback', { method: 'GET' });
    if (list.ok) setFeedbackList(list.body?.data || []);
    const sum = await callApi('/integrations/caregiver-feedback/summary', { method: 'GET' });
    if (sum.ok) setFeedbackSummary(sum.body);
  };

  const pushVital = async () => {
    if (!streamPid) return;
    const sample = {
      hr: 60 + Math.floor(Math.random() * 50),
      spo2: 90 + Math.floor(Math.random() * 10),
      bp_sys: 110 + Math.floor(Math.random() * 30),
      bp_dia: 70 + Math.floor(Math.random() * 15),
      temp_f: 97 + Math.random() * 3,
      source: 'ui-test',
    };
    const r = await callApi(`/integrations/vitals-stream/${streamPid}`, {
      method: 'POST',
      body: JSON.stringify(sample),
    });
    if (!r.ok) return toast.error(r.body?.error || 'Push failed');
    if (r.body?.alerts?.length) toast(`Alerts: ${r.body.alerts.join(', ')}`);
    const list = await callApi(`/integrations/vitals-stream/${streamPid}`, { method: 'GET' });
    if (list.ok) setStreamSamples(list.body?.samples || []);
  };

  const registerDevice = async () => {
    if (!pushToken) return toast.error('Token required');
    const r = await callApi('/integrations/mobile-push/register', {
      method: 'POST',
      body: JSON.stringify({ device_token: pushToken, platform: 'ios' }),
    });
    if (!r.ok) return toast.error(r.body?.error || 'Register failed');
    toast.success(`Registered device #${r.body?.device?.id}`);
  };

  const loadTrend = async () => {
    const r = await callApi('/integrations/risk-trend-summary', { method: 'GET' });
    if (r.ok) setTrend(r.body);
  };

  useEffect(() => {
    refreshFeedback();
    loadTrend();
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Integrations & Backlog</h2>
          <div className="page-header-sub">EHR, telemedicine, mobile push, caregiver feedback, vital streaming, and risk trend.</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['ehr', 'telemedicine', 'push', 'feedback', 'vitals', 'trend'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: tab === t ? '#2563eb' : '#374151', color: '#fff',
          }}>{t}</button>
        ))}
      </div>

      {tab === 'ehr' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <button onClick={() => probe('Epic FHIR', '/integrations/ehr/epic/sync')}>Test Epic FHIR</button>
          <button onClick={() => probe('Cerner FHIR', '/integrations/ehr/cerner/sync')}>Test Cerner FHIR</button>
          <button onClick={() => probe('HL7 v2', '/integrations/ehr/hl7/ingest')}>Test HL7 v2 ingestion</button>
          {Object.entries(status).map(([k, v]) => (
            <pre key={k} style={{ background: '#1f2937', padding: 12, borderRadius: 6, color: '#e5e7eb' }}>
              {k}: {v.status} — {JSON.stringify(v.body)}
            </pre>
          ))}
        </div>
      )}

      {tab === 'telemedicine' && (
        <div>
          <button onClick={() => probe('Twilio Video', '/integrations/telemedicine/room')}>Test Twilio Video</button>
          {status['Twilio Video'] && (
            <pre style={{ background: '#1f2937', padding: 12, borderRadius: 6, color: '#e5e7eb' }}>
              {JSON.stringify(status['Twilio Video'].body, null, 2)}
            </pre>
          )}
        </div>
      )}

      {tab === 'push' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <input value={pushToken} onChange={(e) => setPushToken(e.target.value)} placeholder="device token" />
          <button onClick={registerDevice}>Register device</button>
          <button onClick={() => probe('Push notify', '/integrations/mobile-push/notify')}>Probe notify (expect 503)</button>
          {status['Push notify'] && (
            <pre style={{ background: '#1f2937', padding: 12, borderRadius: 6, color: '#e5e7eb' }}>
              {JSON.stringify(status['Push notify'].body, null, 2)}
            </pre>
          )}
        </div>
      )}

      {tab === 'feedback' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <input placeholder="patient_id" value={feedback.patient_id} onChange={(e) => setFeedback({ ...feedback, patient_id: e.target.value })} />
          <input placeholder="visit_id" value={feedback.visit_id} onChange={(e) => setFeedback({ ...feedback, visit_id: e.target.value })} />
          <input type="number" min="1" max="5" placeholder="rating" value={feedback.rating} onChange={(e) => setFeedback({ ...feedback, rating: +e.target.value })} />
          <input placeholder="relationship" value={feedback.relationship} onChange={(e) => setFeedback({ ...feedback, relationship: e.target.value })} />
          <textarea placeholder="comments" value={feedback.comments} onChange={(e) => setFeedback({ ...feedback, comments: e.target.value })} />
          <button onClick={submitFeedback}>Submit feedback</button>
          {feedbackSummary && (
            <pre style={{ background: '#1f2937', padding: 12, borderRadius: 6, color: '#e5e7eb' }}>
              {JSON.stringify(feedbackSummary, null, 2)}
            </pre>
          )}
          <ul>{feedbackList.map(f => <li key={f.id}>{f.rating}★ {f.sentiment} — {f.comments}</li>)}</ul>
        </div>
      )}

      {tab === 'vitals' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <input value={streamPid} onChange={(e) => setStreamPid(e.target.value)} placeholder="patient_id" />
          <button onClick={pushVital}>Push synthetic vital sample</button>
          <pre style={{ background: '#1f2937', padding: 12, borderRadius: 6, color: '#e5e7eb', maxHeight: 320, overflow: 'auto' }}>
            {JSON.stringify(streamSamples.slice(-10), null, 2)}
          </pre>
        </div>
      )}

      {tab === 'trend' && (
        <div>
          <button onClick={loadTrend}>Refresh nurse risk trend (30d)</button>
          <pre style={{ background: '#1f2937', padding: 12, borderRadius: 6, color: '#e5e7eb', maxHeight: 480, overflow: 'auto' }}>
            {JSON.stringify(trend, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}
