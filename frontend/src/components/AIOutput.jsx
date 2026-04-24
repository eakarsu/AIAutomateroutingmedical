import { Sparkles } from 'lucide-react';

function formatAIContent(text) {
  if (!text) return '';
  // Convert markdown-like formatting to HTML
  let html = text
    // Bold headers with ** **
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Numbered lists
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    // Bullet points
    .replace(/^[-•]\s(.+)$/gm, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*?<\/li>(<br\/>)?)+/g, (match) => {
    return '<ul>' + match.replace(/<br\/>/g, '') + '</ul>';
  });

  return '<p>' + html + '</p>';
}

export default function AIOutput({ content, model, tokens, loading }) {
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

  if (!content) return null;

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
        dangerouslySetInnerHTML={{ __html: formatAIContent(content) }}
      />
      {tokens > 0 && (
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--gray-400)' }}>
          {tokens} tokens used
        </div>
      )}
    </div>
  );
}
