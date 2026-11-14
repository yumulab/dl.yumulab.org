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
- すべての表示形式で、論文の日付に合わせた年度ごとの見出しと区切りを表示（4月〜翌年3月）
- タイトル・英語タイトル・著者・概要・キーワード・掲載誌による複数語検索
- 年度、種類での絞り込み、新しい順／古い順への並べ替え
- 検索条件のURLへの反映（例: `/dl.yumulab.org/?q=湯村&year=2025&type=domestic-conference&view=list`）
- 論文詳細、PDFリンク、書誌情報、キーワード、引用のコピー
- Speaker Deck・YouTubeの埋め込み、関連資料へのリンク
- JavaScriptを無効にした場合も論文一覧・詳細を閲覧可能

表示形式は、画像付きの横並びリスト、カードを並べるグリッド、画像を省いたコンパクトなテキスト表示から選べます。初期表示はグリッドです。`view=list`・`view=grid`・`view=text` で表示形式を指定でき、検索・絞り込み条件と一緒にURLで共有できます。

年度は4月1日から翌年3月31日までです。例として、2026年3月の論文は2025年度に含まれます。URLの `year=2025` も2025年度を指定します。論文の日付表示や引用情報の出版年は暦年のままです。

種類の表示・検索・絞り込みは、元データの種類と言語から分類します。予稿集と研究報告は「国内学会」、講演は「予稿なし発表」です。`core.language: "en"` は「国際学会」を優先しますが、論文誌は言語に関係なく「論文誌」のままです。元データの `core.type` は維持するため、現行サイトからの再取り込み後も同じ分類になります。

## 論文の追加・編集

`src/data/papers.json` がデータ本体です。1論文につき1オブジェクトを追加・編集し、再ビルドすると反映されます。型定義は `src/lib/papers.ts` の `Paper` を参照してください。最低限の形式:

```json
{
  "core": {
    "id": "80",
    "type": "paper-conference",
    "language": "ja",
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
  "files": { "paper": "/pdfs/80.pdf" }
}
```

画像がある場合は `public/images/papers/<id>.jpg` に配置し、`core.thumbnailSmall` または `core.thumbnail` に画像の取得元URLを設定します。画像がない論文には共通のプレースホルダーが表示されます。`core.draft: true` の論文は表示しません。`files.draft: true` のPDFリンクは表示しません。

論文PDFは `public/pdfs/<id>.pdf` に配置し、`files.paper` に `/pdfs/<id>.pdf` を指定します。公開先の `base` はリンク生成時に付加するため、JSONに `/dl.yumulab.org` は含めません。

## 現行サイトからの再取り込み

```sh
npm run import:legacy
```

現行サイトの公開APIから全件を取得し、`src/data/papers.json` を置き換えます。手作業の編集がある場合は先にバックアップしてください。公開サムネイルと論文PDFも取得し、ローカルに保存します。PDFリンクはサイト内のパスに変換し、取得元URLを `files.paperSource` に残します。通常のビルド・閲覧では現行APIへの接続は不要です。

メタデータや画像を変更せず、現在登録されているPDFだけを取得する場合:

```sh
npm run download:pdfs
```

PDFは4件ずつ取得し、PDFのヘッダーと終端を確認してから保存します。取得失敗時は最大3回まで試行し、全件の保存に成功した後にJSONを置き換えます。PDFが登録されていない論文にはPDFリンクを表示しません。

発表スライド・動画・関連資料は引き続き外部サービスを参照します。管理画面・Googleログイン・アップロード機能は含みません。

## 公開

当面の公開URLは `https://yumulab.github.io/dl.yumulab.org/` です。`astro.config.mjs` に `site: 'https://yumulab.github.io'` と `base: '/dl.yumulab.org'` を設定しています。内部リンク・画像・検索フォームは `base` に追従します。

GitHubのリポジトリで **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。独自ドメインは設定せず、Custom domainは空欄のままにします。

`.github/workflows/deploy.yml` により、`main` へのpush時に型チェック・テスト・ビルド・公開を実行します。設定前の実行が失敗した場合は、Pagesを有効にしてから **Actions → Deploy to GitHub Pages → Run workflow** で再実行できます。`dist/` をGitに追加する必要はありません。

論文PDFは `dist/pdfs/` にコピーされ、仮URLでもサイト内から配信されます。

将来 `https://dl.yumulab.org/` に切り替える際は、`astro.config.mjs` の `site` を `https://dl.yumulab.org`、`base` を `/` に変更してください。その後、GitHub PagesのCustom domainとDNSを設定します。論文・画像・PDFのリンクを個別に修正する必要はありません。

## 構成

```text
src/data/papers.json       論文データ
src/lib/papers.ts          型・検索・日付・リンクの処理
src/pages/index.astro      一覧と検索
src/pages/papers/[id].astro 論文詳細の静的生成
src/scripts/catalog.ts    ブラウザ上の絞り込みと表示切り替え
src/styles/global.css     共通スタイルとレスポンシブ表示
public/images/papers/     ローカルのサムネイル
public/pdfs/              サイト内で配信する論文PDF
scripts/import-legacy.mjs 公開APIからの移行ツール
```

論文・画像・資料の権利は元の権利者に帰属します。Google Fontsと資料の埋め込みにはネットワーク接続を使用します。フォントを取得できない場合はシステムフォントに切り替わります。
