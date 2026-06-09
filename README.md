# LifeLog

LifeLog は、短いタイトルと短い本文だけで日々の思考や出来事を残していく個人用ライフログサイトです。

まずは GitHub Pages で無料公開できる、シンプルで長期運用しやすい静的サイトを目指します。

## 仕様

- [LifeLog 仕様案](docs/lifelog-spec.md)

## 日記の追加方法

### 方法 1: GitHub Actions から投稿する

公開後の日常運用では、この方法が一番簡単です。

1. GitHub の `Actions` タブを開く。
2. `Create entry` ワークフローを選ぶ。
3. `Run workflow` から `title` と `body` を入力する。
4. 必要なら `date` に `YYYY-MM-DD` を入力する。空欄なら日本時間の今日の日付を使います。
5. ワークフローが `entries/YYYY/MM/DD.md` を作成して commit します。
6. その commit をきっかけに GitHub Pages のデプロイが走ります。

### 方法 2: Markdown ファイルを直接追加する

`entries/YYYY/MM/DD.md` の形式で Markdown ファイルを追加します。

```markdown
---
date: 2026-06-09
title: 今日から記録する
---

少しずつ、自分の考えを残していくことにした。
```

ファイルパスの日付と Front Matter の `date` は一致させてください。同じ日付の投稿は 1 件だけにします。

### 方法 3: ローカルで作成する

```bash
ENTRY_DATE=2026-06-09 ENTRY_TITLE="今日から記録する" ENTRY_BODY="少しずつ、自分の考えを残していくことにした。" npm run new
```

`ENTRY_DATE` を省略すると、日本時間の今日の日付で作成します。

## 開発コマンド

```bash
npm run check
npm run build
```

`npm run build` を実行すると `dist/` に静的 HTML が生成されます。
GitHub Actions では `dist/` を GitHub Pages にデプロイします。
