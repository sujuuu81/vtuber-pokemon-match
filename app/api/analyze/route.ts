import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const POKEMON = [
  ['ニンフィア','Fairy'],['サーナイト','Psychic/Fairy'],['エーフィ','Psychic'],['グレイシア','Ice'],['アシレーヌ','Water/Fairy'],
  ['ミミッキュ','Ghost/Fairy'],['マホイップ','Fairy'],['ブラッキー','Dark'],['リーフィア','Grass'],['シャワーズ','Water'],
  ['ブースター','Fire'],['サンダース','Electric'],['ブリムオン','Psychic/Fairy'],['ロズレイド','Grass/Poison'],['チルタリス','Dragon/Flying'],
  ['ルカリオ','Fighting/Steel'],['メタグロス','Steel/Psychic'],['ガブリアス','Dragon/Ground'],['バシャーモ','Fire/Fighting'],['リザードン','Fire/Flying']
] as const;

export async function POST(req: Request) {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ error: 'OPENAI_API_KEYが設定されていません。' }, { status: 500 });
    const form = await req.formData();
    const file = form.get('image');
    if (!(file instanceof File)) return NextResponse.json({ error: '画像を選択してください。' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: '画像ファイルを指定してください。' }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: '画像は8MB以下にしてください。' }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${bytes.toString('base64')}`;
    const client = new OpenAI({ apiKey: key });
    const names = POKEMON.map(([name,type]) => `${name} (${type})`).join(', ');

    const response = await client.responses.create({
      model: 'gpt-5-mini',
      input: [{ role: 'user', content: [
        { type: 'input_text', text: `あなたはVTuberアバターとポケモンの外見類似診断AIです。画像の人物・アバターの外見だけを分析し、性格・性別・年齢などを推測しないでください。候補ポケモンは次の20匹だけです: ${names}。髪、目、主要色、衣装、装飾、シルエット、全体のデザインテーマを比較し、最も見た目が似ている順に5匹選んでください。JSONだけを返してください。形式: {"analysis":{"hair":"","eyes":"","colors":[""],"outfit":"","silhouette":"","theme":""},"ranking":[{"name":"","score":0,"reason":""},{"name":"","score":0,"reason":""},{"name":"","score":0,"reason":""},{"name":"","score":0,"reason":""},{"name":"","score":0,"reason":""}]}` },
        { type: 'input_image', image_url: dataUrl }
      ] }],
      text: { format: { type: 'json_object' } }
    });
    const parsed = JSON.parse(response.output_text);
    if (!parsed?.ranking?.length) throw new Error('AIから診断結果を取得できませんでした。');
    return NextResponse.json(parsed);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '診断中にエラーが発生しました。時間を置いて再試行してください。' }, { status: 500 });
  }
}
