'use client';

import { useState } from 'react';

type Result = { ranking: { name: string; score: number; reason: string }[]; candidatesChecked?: number; catalogSize?: number; analysis?: { hair:string; eyes:string; colors:string[]; outfit:string; silhouette:string; theme:string } };

export default function Home() {
  const [file,setFile]=useState<File|null>(null); const [preview,setPreview]=useState(''); const [result,setResult]=useState<Result|null>(null); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  function select(f: File|null){ if(!f)return; setFile(f);setPreview(URL.createObjectURL(f));setResult(null);setError(''); }
  async function diagnose(){ if(!file)return; setLoading(true);setError(''); try{const fd=new FormData();fd.append('image',file);const r=await fetch('/api/analyze',{method:'POST',body:fd});const d=await r.json();if(!r.ok)throw new Error(d.error||'診断に失敗しました');setResult(d)}catch(e){setError(e instanceof Error?e.message:'診断に失敗しました')}finally{setLoading(false)} }
  function share(){if(!result)return;const top=result.ranking[0];const text=`私に一番似ているポケモンは「${top.name}」でした！\nAIによる見た目判定：${top.score}%\n#VTuberポケモン診断`;window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');}
  return <main className="page"><div className="shell"><header className="hero"><div className="eyebrow">AI × VTUBER × POKÉMON</div><h1>VTuberポケモン診断</h1><p>REALITYなどのアバター全身画像から、<br/>全ポケモンを対象に見た目が一番似ているポケモンをAI診断。</p></header><section className="card">
    {!result&&!loading&&<><label className="drop"><strong>アバターの全身画像を選択</strong><span>PNG / JPG・8MB以下を推奨</span><input className="file" type="file" accept="image/*" onChange={e=>select(e.target.files?.[0]||null)}/><button className="choose" type="button">画像を選ぶ</button></label>{preview&&<img className="preview" src={preview} alt="プレビュー"/>}<div className="actions">{file&&<button className="choose primary" onClick={diagnose}>AIで診断する</button>}</div></>}
    {loading&&<div className="loading">AIがアバターを分析しています…<br/><span className="muted">全ポケモンから候補を絞り、公式アートワークと画像比較しています</span></div>}
    {result&&<div className="result"><div className="eyebrow">YOUR POKÉMON</div><h2>{result.ranking[0].name}</h2><div className="score">見た目の一致度 {result.ranking[0].score}%</div><div className="reason"><strong>AIが選んだ理由</strong><br/>{result.ranking[0].reason}</div><h3>似ているポケモン TOP5</h3><div className="rank">{result.ranking.map((x,i)=><div className="rankrow" key={`${x.name}-${i}`}><span>#{i+1}　{x.name}</span><strong>{x.score}%</strong></div>)}</div><p className="muted">全{result.catalogSize ?? 1025}匹から候補を選出 → 上位{result.candidatesChecked ?? 24}匹を画像比較</p><div className="actions" style={{marginTop:20}}><button className="share" onClick={share}>𝕏 結果を投稿</button><button className="choose" onClick={()=>{setResult(null);setFile(null);setPreview('')}}>もう一度診断</button></div></div>}
    {error&&<div className="error">{error}</div>}</section><div className="footer">診断結果はAIによるエンターテインメント目的の推定です。</div></div></main>
}
