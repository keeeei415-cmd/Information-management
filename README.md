# ボード — 汎用情報管理アプリ

タブ × カードの2階層で、ToDo・メモ・仕事・投資など何でも1つの仕組みで管理できるWebアプリです。

- **フロント**: Next.js (App Router) + TypeScript + Tailwind CSS
- **DB**: Supabase (PostgreSQL)
- **ホスティング**: Vercel
- **対応**: スマホ最優先のレスポンシブ / PWA (ホーム画面追加でアプリとして起動)

## 機能

| 分類 | 内容 |
|---|---|
| タブ | 作成 / 名前変更 / 並び替え / 削除 (カードごと削除) |
| カード | タイトル・内容・カテゴリ・タグ(複数)・ピン留め・完了・色・期限・作成/更新日時 |
| 表示 | リスト表示 / カード(グリッド)表示の切り替え |
| 検索 | 全タブ横断でタイトル・内容・タグ・カテゴリを検索 |
| 並び替え | 作成日 / 更新日 / タイトル / 期限 / 手動 (ピン留めは常に先頭) |
| フィルター | 完了のみ / 未完了のみ / ピン留めのみ / タグ指定 |

---

## セットアップ手順

### 1. Supabase

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. **SQL Editor** を開き、`supabase/schema.sql` の内容を貼り付けて実行
3. **Project Settings > API** から以下をメモ
   - Project URL
   - anon public キー

### 2. ローカル起動

```bash
npm install
cp .env.local.example .env.local
# .env.local に Supabase の URL と anon キーを記入
npm run dev
```

http://localhost:3000 で起動します。

### 3. GitHub & Vercel デプロイ

```bash
git init && git add -A && git commit -m "initial commit"
# GitHub にリポジトリを作成して push
```

1. [vercel.com](https://vercel.com) で「New Project」→ リポジトリをインポート
2. **Environment Variables** に以下を設定
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy

### 4. スマホでアプリとして使う (PWA)

デプロイ後のURLをスマホで開き、
- **iOS**: 共有 →「ホーム画面に追加」
- **Android**: メニュー →「アプリをインストール」

---

## セキュリティに関する注意

現在の設定は **個人利用・ログインなし** を想定しており、URLとanonキーを知っている人は誰でもデータを読み書きできます。公開範囲を制限したい場合は下記「認証の追加」を実装してください。

---

## アーキテクチャ

```
lib/types.ts    ── 型定義 (DBスキーマと1:1)
lib/api.ts      ── データアクセス層 (Supabase読み書きを集約)
lib/store.tsx   ── 状態管理 (Context + 楽観的更新)
lib/utils.ts    ── 検索・フィルター・ソートの純関数
lib/colors.ts   ── カードの色定義
components/     ── UI (1コンポーネント1責務)
  TabBar        ── タブ切り替え
  TabManager    ── タブのCRUDモーダル
  Toolbar       ── 検索・並び替え・フィルター・表示切替
  CardBoard     ── 一覧 (絞り込み結果の描画)
  CardItem      ── カード1枚
  CardEditor    ── カードの作成/編集モーダル
  Modal, Icon, TagInput ── 汎用部品
app/page.tsx    ── 画面の組み立てと表示状態の保持
```

**変更の流れ**: 新しいデータ項目を追加するときは
`schema.sql` → `lib/types.ts` → `lib/api.ts`(必要なら) → UI の順に修正します。
UIはDBを直接知らないため、影響範囲が層ごとに閉じます。

---

## 機能拡張ガイド

スキーマには拡張用のカラムを最初から用意してあります。

### アーカイブ / ゴミ箱 (カラム追加不要)
`cards.archived_at` / `cards.deleted_at` が既にあります。
- ゴミ箱: `lib/api.ts` の `deleteCard` を `updateCard(id, { deleted_at: ... })` に変更し、ゴミ箱画面で `deleted_at is not null` を取得
- アーカイブ: 同様に `archived_at` をセットし、`fetchCards` に `.is("archived_at", null)` を追加

### チェックリスト / サブタスク (カラム追加不要)
`cards.metadata` (jsonb) に `{ "checklist": [{ "text": "...", "done": false }] }` の形で保存。
`lib/types.ts` に型を定義し、`CardEditor` にUIを追加するだけで実現できます。

### 画像 / PDF 添付
1. Supabase **Storage** にバケット `attachments` を作成
2. `attachments` テーブル (`id, card_id, path, type`) を追加
3. `CardEditor` にアップロードUIを追加

### リマインダー / カレンダー表示
`due_date` が既にあるため、カレンダーは `sortCards` と同じデータをカレンダーUIに流すだけで実装可能。通知は Supabase Edge Functions + Web Push を利用。

### Markdown 対応
`react-markdown` を導入し、`CardItem` / `CardEditor` の内容表示を差し替え。

### 認証の追加 (複数ユーザー対応)
1. 両テーブルに `user_id uuid references auth.users default auth.uid()` を追加
2. RLSポリシーを `using (auth.uid() = user_id)` に変更
3. `@supabase/ssr` でログイン画面を追加

### オフライン対応 (PWA強化)
`next-pwa` または `serwist` を導入して Service Worker を追加。マニフェスト・アイコンは設定済みです。
