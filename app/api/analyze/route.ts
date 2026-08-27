import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const POKEAPI = 'https://pokeapi.co/api/v2/pokemon?limit=1025&offset=0';
const SPRITE = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

let catalogPromise: Promise<{ id: number; name: string }[]> | null = null;
async function getCatalog() {
  if (!catalogPromise) catalogPromise = fetch(POKEAPI, { next: { revalidate: 86400 } }).then(async r => {
    if (!r.ok) throw new Error('ポケモン図鑑を取得できませんでした。');
    const data = await r.json();
    return data.results.map((x: { name: string; url: string }) => ({ id: Number(x.url.match(/pokemon\/(\d+)\//)?.[1]), name: x.name }));
  });
  return catalogPromise;
}

function clampScore(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
}

export async function POST(req: Request) {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ error: 'OPENAI_API_KEYが設定されていません。' }, { status: 500 });
    const form = await req.formData();
    const file = form.get('image');
    if (!(file instanceof File)) return NextResponse.json({ error: '画像を選択してください。' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: '画像ファイルを指定してください。' }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: '画像は8MB以下にしてください。' }, { status: 400 });

    const catalog = await getCatalog();
    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${bytes.toString('base64')}`;
    const client = new OpenAI({ apiKey: key });

    const shortlist = await client.responses.create({
      model: 'gpt-5-mini',
      input: [{ role: 'user', content: [
        { type: 'input_text', text: `あなたはVTuberアバターの外見とポケモンのビジュアル類似診断AIです。画像から観察できる外見だけを使い、性格・性別・年齢などは推測しません。髪色、髪型、目、身体色、衣装色、装飾、シルエット、頭身、全体の配色、デザインテーマを分析してください。次の全ポケモン1025匹の中から、第2段階で実際の公式アートワークと画像比較する候補を24匹選んでください。候補名はリストにある英語名を完全一致で返してください。JSONのみ: {"analysis":{"hair":"","eyes":"","colors":[""],"outfit":"","silhouette":"","theme":""},"candidates":["exact-name", "..."]}\n\n全候補:\n${catalog.map(x => x.name).join(', ')}` },
        { type: 'input_image', image_url: dataUrl }
      ] }],
      text: { format: { type: 'json_object' } }
    });
    const stage1 = JSON.parse(shortlist.output_text);
    const candidateNames = Array.isArray(stage1.candidates) ? stage1.candidates.filter((x: unknown): x is string => typeof x === 'string') : [];
    const candidates = candidateNames.map(name => catalog.find(x => x.name === name)).filter(Boolean).slice(0, 24) as { id: number; name: string }[];
    if (!candidates.length) throw new Error('候補ポケモンを生成できませんでした。');

    const visualContent: any[] = [{ type: 'input_text', text: `元画像と、候補ポケモンの公式アートワークを直接比較してください。最重要なのはキャラクターデザインとして見た目が似ているかです。タイプや名前の印象では判断しないでください。色だけでなく、髪/耳/目/顔周辺、衣装・装飾、身体のシルエット、全体の形、配色バランスを総合評価してください。上位5匹を順位付けし、1位を最も似ているポケモンとしてください。一致度は相対的な視覚類似度で0-100。JSONのみ: {"ranking":[{"candidate":"exact English candidate name","nameJa":"日本語名","score":0,"reason":"日本語で具体的な視覚的理由"},...]}` }, { type: 'input_image', image_url: dataUrl }];
    for (const p of candidates) {
      visualContent.push({ type: 'input_text', text: `候補: ${p.name}` });
      visualContent.push({ type: 'input_image', image_url: SPRITE(p.id) });
    }
    const finalResponse = await client.responses.create({ model: 'gpt-5-mini', input: [{ role: 'user', content: visualContent }], text: { format: { type: 'json_object' } } });
    const final = JSON.parse(finalResponse.output_text);
    if (!Array.isArray(final.ranking) || !final.ranking.length) throw new Error('最終診断結果を取得できませんでした。');

    const ranking = final.ranking.slice(0, 5).map((x: any) => ({
      name: typeof x.nameJa === 'string' && x.nameJa ? x.nameJa : String(x.candidate ?? ''),
      candidate: String(x.candidate ?? ''),
      score: clampScore(x.score),
      reason: String(x.reason ?? '')
    }));
    return NextResponse.json({ analysis: stage1.analysis ?? null, ranking, candidatesChecked: candidates.length, catalogSize: catalog.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '診断中にエラーが発生しました。時間を置いて再試行してください。' }, { status: 500 });
  }
}
