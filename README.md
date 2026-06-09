# LifeLog

LifeLog は、短いタイトルと短い本文だけで日々の思考や出来事を残していく個人用ライフログサイトです。

まずは GitHub Pages で無料公開できる、シンプルで長期運用しやすい静的サイトを目指します。

## 仕様

- [LifeLog 仕様案](docs/lifelog-spec.md)

## 日記の追加方法

`entries/YYYY/MM/DD.md` の形式で Markdown ファイルを追加します。

```markdown
---
date: 2026-06-09
title: 今日から記録する
---

少しずつ、自分の考えを残していくことにした。
```

ファイルパスの日付と Front Matter の `date` は一致させてください。同じ日付の投稿は 1 件だけにします。

## 開発コマンド

```bash
npm run check
npm run build
```

`npm run build` を実行すると `dist/` に静的 HTML が生成されます。
GitHub Actions では `dist/` を GitHub Pages にデプロイします。
