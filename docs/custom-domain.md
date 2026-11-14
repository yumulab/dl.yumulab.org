# dl.yumulab.orgへの切替

対象リポジトリ: [yumulab/dl.yumulab.org](https://github.com/yumulab/dl.yumulab.org)。公開は既存のGitHub Actionsワークフローを使用します。

## 1. サイトの設定変更をデプロイ

`astro.config.mjs` の設定は次のとおりです。この変更をcommit・pushし、Actionsの「Deploy to GitHub Pages」が成功したことを確認します。

```js
site: 'https://dl.yumulab.org',
base: '/',
```

## 2. GitHub Pagesにドメインを登録

1. [リポジトリのPages設定](https://github.com/yumulab/dl.yumulab.org/settings/pages)を開きます。
2. **Build and deployment → Source** は **GitHub Actions** を使用します。
3. **Custom domain** に `dl.yumulab.org` を入力し、**Save** を押します。`https://` や末尾の `/` は付けません。
4. DNSの変更前はDNSチェックが完了しなくても、次のDNS設定に進みます。

GitHubへのドメイン登録を先に行い、その後でDNSを切り替えます。カスタムActionsワークフローのため、Gitの `CNAME` ファイルは不要です。

## 3. DNSを変更

2026-11-14の確認では、`dl.yumulab.org` にAレコード `153.126.173.43`（TTL 3600秒）があり、CNAME・AAAAレコードは確認されませんでした。

DNS管理画面で、`yumulab.org` ゾーン内の `dl` を次のように変更します。

| 操作 | 種別 | ホスト名 | 値 |
|---|---|---|---|
| 削除 | A | `dl` | `153.126.173.43` |
| 追加 | CNAME | `dl` | `yumulab.github.io` |

TTLは300秒またはDNSサービスの既定値で構いません。ホスト名をFQDNで指定するDNSサービスでは `dl.yumulab.org`、ゾーンファイル形式のCNAME宛先では `yumulab.github.io.` と記載します。値には `https://` や `/dl.yumulab.org/` を含めません。

`dl` に旧A・AAAAレコードがほかにもある場合は、それらも置き換えます。同じホスト名にCNAMEとA・AAAAを併存させません。

## 4. HTTPSと表示を確認

1. GitHub Pages設定でDNSチェックの成功を確認します。
2. 証明書の発行後、**Enforce HTTPS** を有効にします。DNS伝播やHTTPSが利用可能になるまで最大24時間かかることがあります。
3. 次のURLを確認します。

   - `https://dl.yumulab.org/`
   - `https://dl.yumulab.org/ec79-miyazaki/`
   - `https://dl.yumulab.org/papers/77/` → `/ec79-miyazaki/`
   - `https://dl.yumulab.org/papers/ec79-miyazaki/` → `/ec79-miyazaki/`
   - `https://dl.yumulab.org/pdfs/77.pdf`

DNSの確認コマンド:

```sh
dig dl.yumulab.org CNAME +short
# yumulab.github.io.
```

旧サイトのAPIはGitHub Pagesへ移行していません。通常の閲覧に必要なメタデータ・画像・PDFはリポジトリ内に保存済みですが、移行ツールの再実行には旧APIを引き続き参照できる別のホスト名が必要です。

## 公式資料

- [GitHub Pagesのカスタムドメイン設定](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
