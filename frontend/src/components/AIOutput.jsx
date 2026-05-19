import { Sparkles } from 'lucide-react';

function formatAIContent(text) {
  if (!text) return '';
  // If it's already JSON-looking, pretty print it
  if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      const obj = JSON.parse(text);
      return formatStructured(obj);
    } catch {}
  }

  // Convert markdown-like formatting to HTML
  let html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    .replace(/^[-•]\s(.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  html = html.replace(/(<li>.*?<\/li>(<br\/>)?)+/g, (match) => {
    return '<ul>' + match.replace(/<br\/>/g, '') + '</ul>';
  });

  return '<p>' + html + '</p>';
}

function formatStructured(obj) {
  if (!obj || typeof obj !== 'object') return String(obj);
  let html = '';
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'narrative' || key === 'rationale') continue; // shown separately
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      html += `<div style="margin-bottom:10px"><strong>${label}:</strong><ul style="margin:4px 0 0 16px">`;
      html += value.map(v => `<li style="margin-bottom:2px">${typeof v === 'object' ? JSON.stringify(v) : v}</li>`).join('');
      html += '</ul></div>';
    } else if (typeof value === 'object' && value !== null) {
      html += `<div style="margin-bottom:10px"><strong>${label}:</strong> <span style="font-size:12px;color:#64748b">${JSON.stringify(value)}</span></div>`;
    } else {
      const valStr = String(value);
      const color = valStr === 'critical' || valStr === 'urgent' || valStr === 'high' ? '#dc2626'
        : valStr === 'warning' || valStr === 'moderate' ? '#f59e0b'
        : valStr === 'low' || valStr === 'stable' || valStr === 'safe' ? '#10b981'
        : 'inherit';
      html += `<div style="margin-bottom:6px"><strong>${label}:</strong> <span style="color:${color};font-weight:${color !== 'inherit' ? '600' : '400'}">${valStr}</span></div>`;
    }
  }
  // Show narrative/rationale last
  if (obj.narrative || obj.rationale) {
    const text = obj.narrative || obj.rationale;
    html += `<div style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:6px;font-size:13px;line-height:1.6">${text}</div>`;
  }
  return html;
}

export default function AIOutput({ content, structured, model, tokens, loading }) {
  if (loading) {
    return (
      <div className="ai-output">
        <div className="ai-loading">
          <div className="spinner"></div>
          <span>AI is analyzing... Please wait</span>
        </div>
      </div>
    );
  }

  if (!content && !structured) return null;

  const displayHtml = structured && typeof structured === 'object'
    ? formatStructured(structured)
    : formatAIContent(content || '');

  return (
    <div className="ai-output">
      <div className="ai-output-header">
        <div className="ai-icon">
          <Sparkles size={18} />
        </div>
        <div>
          <h4>AI Analysis</h4>
        </div>
        {model && <span className="ai-model">{model}</span>}
      </div>
      <div
        className="ai-content"
        dangerouslySetInnerHTML={{ __html: displayHtml }}
      />
      {tokens > 0 && (
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--gray-400)' }}>
          {tokens} tokens used
        </div>
      )}
    </div>
  );
}
