import { useState, useEffect } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';

export default function AIOrderProcessor() {
  const [orders, setOrders] = useState([]);
  const [orderId, setOrderId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.getOrders().then(data => setOrders(Array.isArray(data) ? data : data)); }, []);

  const process = async () => {
    if (!orderId) return toast.error('Select an order');
    setLoading(true); setResult(null);
    try {
      const data = await api.processOrder({ order_id: orderId });
      setResult(data);
    } catch (err) { toast.error('Processing failed'); }
    finally { setLoading(false); }
  };

  const selectedOrder = orders.find(o => o.id === Number(orderId));

  return (
    <>
      <div className="page-header">
        <div><h2>AI Order Processor</h2><div className="page-header-sub">AI-powered medical order analysis</div></div>
      </div>
      <div className="page-body">
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--gray-200)', marginBottom: 24 }}>
          <div className="form-group">
            <label>Select Medical Order</label>
            <select value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              <option value="">Choose an order...</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.patient_first} {o.patient_last} - {o.order_type} ({o.priority})
                </option>
              ))}
            </select>
          </div>
          {selectedOrder && (
            <div className="detail-grid" style={{ marginTop: 16, padding: 16, background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
              <div className="detail-item"><span className="detail-label">Patient</span><span className="detail-value">{selectedOrder.patient_first} {selectedOrder.patient_last}</span></div>
              <div className="detail-item"><span className="detail-label">Physician</span><span className="detail-value">{selectedOrder.ordering_physician}</span></div>
              <div className="detail-item"><span className="detail-label">Type</span><span className="detail-value">{selectedOrder.order_type}</span></div>
              <div className="detail-item"><span className="detail-label">Priority</span><span className="detail-value"><span className={`badge badge-${selectedOrder.priority}`}>{selectedOrder.priority}</span></span></div>
            </div>
          )}
          <button className="btn btn-purple" onClick={process} disabled={loading} style={{ marginTop: 16 }}>
            <Sparkles size={16} /> {loading ? 'Processing...' : 'Process with AI'}
          </button>
        </div>
        <AIOutput content={result?.content} structured={result?.structured} model={result?.model} tokens={result?.tokens} loading={loading} />
      </div>
    </>
  );
}
