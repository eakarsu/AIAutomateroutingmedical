import { useState } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';
import toast from 'react-hot-toast';
import { Send, Sparkles } from 'lucide-react';

export default function AIChat() {
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!message.trim()) return;
    const userMsg = message;
    setMessage('');
    setHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const data = await api.aiChat({ message: userMsg });
      setHistory(prev => [...prev, { role: 'ai', content: data.content, model: data.model, tokens: data.tokens }]);
    } catch (err) { toast.error('Failed to get response'); }
    finally { setLoading(false); }
  };

  const suggestions = [
    'What are the best practices for home health route optimization?',
    'How should I handle a patient with worsening CHF symptoms?',
    'What documentation is required for Medicare home health visits?',
    'Suggest a wound care protocol for diabetic foot ulcers',
    'What are the key metrics to track for nurse productivity?',
  ];

  return (
    <>
      <div className="page-header">
        <div><h2>AI Assistant</h2><div className="page-header-sub">Ask questions about home health operations</div></div>
      </div>
      <div className="page-body">
        <div className="ai-chat-container">
          <div className="ai-chat-input">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask anything about home health care..."
            />
            <button className="btn btn-purple" onClick={send} disabled={loading}>
              <Send size={16} />
            </button>
          </div>

          {history.length === 0 && !loading && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>Suggested questions:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {suggestions.map((s, i) => (
                  <button key={i} className="btn btn-sm btn-outline" onClick={() => { setMessage(s); }}>
                    <Sparkles size={12} /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.map((msg, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              {msg.role === 'user' ? (
                <div style={{
                  background: 'var(--accent)', color: 'white', padding: '12px 16px',
                  borderRadius: '12px 12px 4px 12px', maxWidth: '80%', marginLeft: 'auto',
                  fontSize: 14, fontWeight: 500,
                }}>
                  {msg.content}
                </div>
              ) : (
                <AIOutput content={msg.content} model={msg.model} tokens={msg.tokens} />
              )}
            </div>
          ))}

          {loading && <AIOutput loading={true} />}
        </div>
      </div>
    </>
  );
}
