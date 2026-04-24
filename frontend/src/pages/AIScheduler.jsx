import { useState } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';

export default function AIScheduler() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true); setResult(null);
    try {
      const data = await api.smartSchedule({ date });
      setResult(data);
    } catch (err) { toast.error('Analysis failed'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <div><h2>AI Smart Scheduler</h2><div className="page-header-sub">AI-powered scheduling optimization</div></div>
      </div>
      <div className="page-body">
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
          <div className="form-group" style={{ maxWidth: 300 }}>
            <label>Date to Analyze</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button className="btn btn-purple" onClick={analyze} disabled={loading} style={{ marginTop: 16 }}>
            <Sparkles size={16} /> {loading ? 'Analyzing...' : 'Analyze Schedule'}
          </button>
        </div>
        <AIOutput content={result?.content} model={result?.model} tokens={result?.tokens} loading={loading} />
      </div>
    </>
  );
}
