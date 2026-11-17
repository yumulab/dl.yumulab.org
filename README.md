# 湯村研究室 論文レポジトリ

[現行サイト](https://dl.yumulab.org/)の公開部分と[研究室のNews](https://www.yumulab.org/news.html)をもとにした、Astro製の静的サイトです。既存79件、Newsから補完した28件、提供原稿から追加した情報処理北海道シンポジウム2026の4件、Jxivのプレプリント1件を合わせ、論文・学会発表・雑誌記事など計112件のメタデータを収録しています。追加分の出典と未確認情報は [News等からの追加記録](docs/news-additions.md) と [情報処理北海道シンポジウム2026の追加記録](docs/info2026.md) を参照してください。

## 開発

Node.js 22.23.4以上（推奨: Node.js 24 LTS）を使用してください。

```sh
npm install
npm run dev
```

開発サーバーは `http://localhost:4321/` で起動します。

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
- 検索条件のURLへの反映（例: `/?q=湯村&year=2025&type=domestic-conference&view=list`）
- 論文詳細、PDFリンク、書誌情報、キーワード、引用のコピー
- Speaker Deck・YouTubeの埋め込み、関連資料へのリンク
- JavaScriptを無効にした場合も論文一覧・詳細を閲覧可能
- 論文詳細のHTMLにGoogle Scholar向けの書誌メタデータを出力

表示形式は、画像付きの横並びリスト、カードを並べるグリッド、画像を省いたコンパクトなテキスト表示から選べます。初期表示はグリッドです。`view=list`・`view=grid`・`view=text` で表示形式を指定でき、検索・絞り込み条件と一緒にURLで共有できます。

ヘッダ右端の研究室サイトリンクには `public/images/yumulab-logo.png` を使用します。提供画像を縦横比と透過を保って256×68pxに縮小し、PCでは96px幅、スマートフォンでは72px幅で表示しています。現在のロゴの元画像は `tmp/archive/yumulab-logo-banner-transparent2.png` に保管します。

一覧の学会名・掲載先は `publication.bookTitleAbbr`（略称）を優先し、略称がない場合は `publication.bookTitle`（正式名称）を表示します。

受賞した発表は、3種類の一覧と個別ページに賞名付きのバッジを表示します。個別ページのバッジから受賞記事を開けます。賞名は検索対象にも含まれます。

プレミアム発表などの選出情報は `selections: [{ "name": "プレミアム発表" }]` として受賞とは別に登録します。選出バッジは紫色・星アイコンで表示し、名称も検索対象に含めます。出典URLが分かる場合は `sourceUrl` を追加できます。

年度は4月1日から翌年3月31日までです。例として、2026年3月の論文は2025年度に含まれます。URLの `year=2025` も2025年度を指定します。論文の日付表示や引用情報の出版年は暦年のままです。

一覧の見出しは2021年度以降を年度ごとに表示し、2020年度以前は「2020年度以前（研究室設立前）」にまとめます。年度の絞り込みでは引き続き個別の年度を指定できます。

種類の表示・検索・絞り込みは、元データの種類と言語から分類します。予稿集と研究報告は「国内学会」、講演は「予稿なし発表」、`core.type: "preprint"` は「プレプリント」です。`core.language: "en"` は「国際学会」を優先しますが、論文誌・プレプリント・明示的に指定した予稿なし発表（`core.type: "presentation"`）は、言語に関係なくそれぞれの種類を保ちます。元データの `core.type` は維持するため、現行サイトからの再取り込み後も同じ分類になります。

## Google Scholar向けメタデータ

各論文の詳細ページの `<head>` に、[Google Scholarの収録ガイドライン](https://scholar.google.com/intl/en/scholar/inclusion.html#indexing)でサポートされているHighwire Press形式の `citation_*` タグを出力します。論文タイトル、著者ごとのタグ、出版日、言語、正式な掲載誌・会議名、巻号、開始・終了ページ、出版社、ISSN・ISBN、DOIなど、登録済みの書誌情報を使用します。一覧や旧URLの転送ページには付与しません。DOI欄に保存されたURLはDOI識別子へ正規化し、DOIではないURLは出力しません。

出版日は `publication.publishedDate` を優先し、なければ `core.presentationDate` を使います。ニュース記事日などが入る `core.sortingDate` は出版日として使いません。両方の日付がないレコードでは `citation_publication_date` を省略するため、収録に必要な出版年・発表日の補完が必要です。空の項目や、記録にない所属機関などは推測して付与しません。

公開中のローカルPDFは、ビルド時に詳細ページと同じディレクトリの `/<slug>/paper.pdf` にも生成します。`citation_pdf_url` はこの絶対URLを指定し、画面のPDFボタンも同じURLへリンクします。元の `/pdfs/<id>.pdf` は引き続き利用できます。`files.draft: true` のPDFやPDF未登録の論文にはPDFタグ・配信用URLを生成しません。外部のPDFリンクは画面に表示できますが、同一ディレクトリの条件を満たさないため `citation_pdf_url` は付与しません。

メタデータはJavaScriptの実行なしで読み取れます。収録にはメタデータのほか、公開された本文または著者による完全な概要など、Google Scholarのコンテンツ要件を満たす必要があります。収録の可否・時期はGoogle Scholarが判断します。

## 論文の追加・編集

`src/data/papers.json` がデータ本体です。1論文につき1オブジェクトを追加・編集し、再ビルドすると反映されます。型定義は `src/lib/papers.ts` の `Paper` を参照してください。最低限の形式:

新しい論文には `src/data/paper-slugs.json` にも `"113": "ec80-surname"` のようなURL名を登録してください。URLはサイトのトップ直下の `/学会名-第1著者の姓/` です。インタラクションは `i20XX`、第36回ハプティクス研究会は `haptics36` を使用しています。登録済みURLは論文データの編集・再取り込みでも変わりません。未登録や重複がある場合はビルド時に検出します。

```json
{
  "core": {
    "id": "113",
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
  "files": { "paper": "/pdfs/113.pdf" }
}
```

画像がある場合は `public/images/papers/<id>.jpg` に配置し、`core.thumbnailSmall` または `core.thumbnail` に `/images/papers/<id>.jpg`（ローカル画像）または画像の取得元URLを設定します。画像がない論文には共通のプレースホルダーが表示されます。`core.draft: true` の論文は表示しません。`files.draft: true` のPDFリンクは表示しません。

論文PDFは `public/pdfs/<id>.pdf` に配置し、`files.paper` に `/pdfs/<id>.pdf` を指定します。公開先の `base` はリンク生成時に付加するため、JSONに `/dl.yumulab.org` は含めません。

受賞情報は論文オブジェクトの `awards` に `[{ "name": "研究奨励賞（銀賞）", "sourceUrl": "https://www.yumulab.org/2026/03/27/ec79-award.html" }]` の形式で登録します。複数受賞にも対応しています。受賞記事と発表先・題目・著者を照合し、対応する発表に追加してください。登録済みの受賞と出典は [受賞情報](docs/awards.md) を参照してください。

取り込み待ちのPDF・画像は `tmp/before/` に置きます。論文データと照合して `public/` へ配置し、表示・ファイルの確認後に元ファイルを `tmp/archive/` に移します。`tmp/` 以下はGitの追跡対象外です。論文内の図をサムネイルにする場合は、元の図を抽出し、グリッドの縦横比（約1.91:1）に合わせてトリミングし、最大720×377ピクセルの画像として保存します。元画像は引き伸ばさず、余白も追加しません。

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

公開先は `https://dl.yumulab.org/` です。`astro.config.mjs` に `site: 'https://dl.yumulab.org'` と `base: '/'` を設定しています。以前の仮URLは `https://yumulab.github.io/dl.yumulab.org/` です。内部リンク・画像・検索フォームは `base` に追従します。

GitHubのリポジトリで **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定し、**Custom domain** に `dl.yumulab.org` を保存してください。その後、DNSの `dl` のAレコードを `yumulab.github.io` 宛てのCNAMEに置き換えます。DNSチェック・証明書発行後に **Enforce HTTPS** を有効にします。切替順序と設定値は [独自ドメインへの切替手順](docs/custom-domain.md) を参照してください。

`.github/workflows/deploy.yml` により、`main` へのpush時に型チェック・テスト・ビルド・公開を実行します。設定前の実行が失敗した場合は、Pagesを有効にしてから **Actions → Deploy to GitHub Pages → Run workflow** で再実行できます。`dist/` をGitに追加する必要はありません。

論文PDFは `dist/pdfs/` にコピーされ、`https://dl.yumulab.org/pdfs/<id>.pdf` から配信されます。

GitHub Actionsで公開する構成のため、リポジトリ内の `CNAME` ファイルは不要です。論文・画像・PDFのリンクを個別に修正する必要はありません。切替後は旧サイトの `/api/papers`・`/api/files/…` はGitHub Pagesから提供されないため、現行API向けの再取り込み・PDF再取得ツールを使う場合は、別途残した旧サーバーの参照先を設定する必要があります。通常のサイト閲覧は保存済みJSON・画像・PDFで動作します。

旧 `/papers/77/` などの数字URLと `/papers/ec79-miyazaki/` などの旧形式URLは、トップ直下の `/ec79-miyazaki/` などへ即時転送するHTMLページを生成します。GitHub PagesではHTTPの301応答ではなく、`meta refresh` による自動転送です。転送ページのcanonicalは新URLを指します。会議名の略称と全件の対応は [URL対応表](docs/paper-urls.md) を参照してください。

## 構成

```text
src/data/papers.json       論文データ
src/data/paper-slugs.json  数字IDと固定URL名の対応
src/lib/paper-urls.ts      論文URLの生成・検証
src/lib/papers.ts          型・検索・日付・リンクの処理
src/pages/index.astro      一覧と検索
src/pages/[slug].astro     トップ直下の論文詳細
src/pages/papers/[slug].astro 旧URLの転送ページ
src/scripts/catalog.ts    ブラウザ上の絞り込みと表示切り替え
src/styles/global.css     共通スタイルとレスポンシブ表示
public/images/papers/     ローカルのサムネイル
public/pdfs/              サイト内で配信する論文PDF
scripts/import-legacy.mjs 公開APIからの移行ツール
```

論文・画像・資料の権利は元の権利者に帰属します。Google Fontsと資料の埋め込みにはネットワーク接続を使用します。フォントを取得できない場合はシステムフォントに切り替わります。
