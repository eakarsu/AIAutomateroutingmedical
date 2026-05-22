import { useEffect, useState } from 'react';

export default function CaregiverCredentialExpiry() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/caregiver-credential-expiry', { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } }).then((res) => res.json()).then(setData).catch(() => setData(null));
  }, []);
  return (
    <div className="page">
      <h1>Caregiver Credential Expiry</h1>
      <p>Prevent route assignments that conflict with expiring clinical credentials.</p>
      <div className="stats-grid">
        {data && Object.entries(data.summary).map(([key, value]) => <div className="stat-card" key={key}><span>{key.replaceAll('_', ' ')}</span><strong>{value}</strong></div>)}
      </div>
      <div className="card">
        {(data?.credentials || []).map((item) => <div key={item.caregiver} style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}><strong>{item.caregiver}</strong><div>{item.credential} expires in {item.expires_in_days} days - {item.action}</div></div>)}
      </div>
    </div>
  );
}
