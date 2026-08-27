# VTuber Pokémon Match

REALITYなどのVTuberアバター全身画像から、見た目が最も似ているポケモンをAIで診断するWebアプリ。

## 構成

- Next.js / TypeScript
- OpenAI API（サーバー側のみ）
- X Web Intentによる結果シェア
- スマートフォン対応

## 環境変数

`OPENAI_API_KEY` をサーバー環境変数として設定してください。キーはブラウザへ公開しません。

## 開発

```bash
npm install
npm run dev
```

## 注意

ポケモンの画像・名称等の権利は各権利者に帰属します。診断結果の「似ている度」はエンターテインメント目的の推定値です。
