import AIReport from './AIReport';
export default function AIOutput({ content, structured, model, tokens, loading }) {
  if (loading) return <div className="ai-output" role="status"><div className="ai-loading"><div className="spinner"/><span>AI is analyzing…</span></div></div>;
  if (content === undefined && structured === undefined) return null;
  return <div className="ai-output"><AIReport response={structured || content} title="AI analysis report" model={model} tokens={tokens} /></div>;
}
