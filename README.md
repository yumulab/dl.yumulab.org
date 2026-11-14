# 湯村研究室 論文レポジトリ

[現行サイト](https://dl.yumulab.org/)の公開部分をもとにした、Astro製の静的サイトです。公開論文79件のメタデータを収録しています。

## 開発

Node.js 22.23.4以上（推奨: Node.js 24 LTS）を使用してください。

```sh
npm install
npm run dev
```

開発サーバーは `http://localhost:4321/dl.yumulab.org/` で起動します。

```sh
npm run check   # Astro・TypeScriptの型チェック
npm test        # 検索・絞り込み・URL処理のテスト
npm run build   # dist/ に静的サイトを生成
npm run preview # ビルド結果をローカルで確認
```

## 機能

- 論文のリスト／グリッド／テキスト表示と、スマートフォンに対応したレイアウト
- すべての表示形式で、論文の日付に合わせた年ごとの見出しと区切りを表示
- タイトル・英語タイトル・著者・概要・キーワード・掲載誌による複数語検索
- 出版年／発表年、種類での絞り込み、新しい順／古い順への並べ替え
- 検索条件のURLへの反映（例: `/dl.yumulab.org/?q=湯村&year=2025&type=report&view=list`）
- 論文詳細、PDFリンク、書誌情報、キーワード、引用のコピー
- Speaker Deck・YouTubeの埋め込み、関連資料へのリンク
- JavaScriptを無効にした場合も論文一覧・詳細を閲覧可能

表示形式は、画像付きの横並びリスト、カードを並べるグリッド、画像を省いたコンパクトなテキスト表示から選べます。初期表示はグリッドです。`view=list`・`view=grid`・`view=text` で表示形式を指定でき、検索・絞り込み条件と一緒にURLで共有できます。

## 論文の追加・編集

`src/data/papers.json` がデータ本体です。1論文につき1オブジェクトを追加・編集し、再ビルドすると反映されます。型定義は `src/lib/papers.ts` の `Paper` を参照してください。最低限の形式:

```json
{
  "core": {
    "id": "80",
    "type": "paper-conference",
    "title": "論文タイトル",
    "authors": ["著者名"],
    "abstract": "概要",
    "keywords": ["キーワード"],
    "sortingDate": "2026-11-14T00:00:00.000Z",
    "presentationDate": "2026-11-14T00:00:00.000Z"
  },
  "publication": {
    "bookTitle": "会議・掲載誌名",
    "bookTitleAbbr": "会議略称",
    "publishedDate": "2026-11-14T00:00:00.000Z"
  },
  "files": { "paper": "https://example.com/paper.pdf" }
}
```

画像がある場合は `public/images/papers/<id>.jpg` に配置し、`core.thumbnailSmall` または `core.thumbnail` に画像の取得元URLを設定します。画像がない論文には共通のプレースホルダーが表示されます。`core.draft: true` の論文は表示しません。`files.draft: true` のPDFリンクは表示しません。

## 現行サイトからの再取り込み

```sh
npm run import:legacy
```

現行サイトの公開APIから全件を取得し、`src/data/papers.json` を置き換えます。手作業の編集がある場合は先にバックアップしてください。公開サムネイルも取得してJPEGに圧縮し、ローカルに保存します。通常のビルドや検索ではAPIへの接続は不要です。

**PDFと発表資料は現行サイト・外部サービスへのリンクです。** PDF自体はこのリポジトリに複製していません。`dl.yumulab.org` をこの静的サイトに置き換える場合は、既存の `/api/files/*` を引き続き配信するか、PDFを別の配信先に移してJSON内のURLも更新してください。管理画面・Googleログイン・アップロード機能は含みません。

## 公開

当面の公開URLは `https://yumulab.github.io/dl.yumulab.org/` です。`astro.config.mjs` に `site: 'https://yumulab.github.io'` と `base: '/dl.yumulab.org'` を設定しています。内部リンク・画像・検索フォームは `base` に追従します。

GitHubのリポジトリで **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。独自ドメインは設定せず、Custom domainは空欄のままにします。

`.github/workflows/deploy.yml` により、`main` へのpush時に型チェック・テスト・ビルド・公開を実行します。設定前の実行が失敗した場合は、Pagesを有効にしてから **Actions → Deploy to GitHub Pages → Run workflow** で再実行できます。`dist/` をGitに追加する必要はありません。

PDFは引き続き現行の `dl.yumulab.org` を参照するため、仮URLの公開時にはPDFの移行やDNS変更は不要です。

将来 `https://dl.yumulab.org/` に切り替える際は、PDFの配信先を準備してから、`astro.config.mjs` の `site` を `https://dl.yumulab.org`、`base` を `/` に変更してください。その後、GitHub PagesのCustom domainとDNSを設定します。内部リンクを個別に修正する必要はありません。

## 構成

```text
src/data/papers.json       論文データ
src/lib/papers.ts          型・検索・日付・リンクの処理
src/pages/index.astro      一覧と検索
src/pages/papers/[id].astro 論文詳細の静的生成
src/scripts/catalog.ts    ブラウザ上の絞り込みと表示切り替え
src/styles/global.css     共通スタイルとレスポンシブ表示
public/images/papers/     ローカルのサムネイル
scripts/import-legacy.mjs 公開APIからの移行ツール
```

論文・画像・資料の権利は元の権利者に帰属します。Google Fontsと資料の埋め込みにはネットワーク接続を使用します。フォントを取得できない場合はシステムフォントに切り替わります。
