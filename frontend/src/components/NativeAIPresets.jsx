import { useState } from 'react';
export default function NativeAIPresets({ presets, disabled }) {
  const [notice,setNotice]=useState('');
  return <section style={{margin:'0 0 20px',padding:16,border:'1px solid var(--gray-200)',borderRadius:8,background:'white'}}><strong>Complete AI examples</strong><p>Use accessible source records and review every field before generating.</p><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{presets.map(preset=><button type="button" className="btn btn-outline" key={preset.label} disabled={disabled} onClick={()=>setNotice(preset.fill())}>{preset.label}</button>)}</div>{notice&&<p role="status">{notice}</p>}</section>;
}
