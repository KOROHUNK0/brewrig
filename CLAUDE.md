# BrewRig

コーヒードリップ・湯量管理タイマー (PWA)。React 19 + TypeScript + Vite 6 製の SPA を **単一ファイル HTML** にバンドルし、GitHub Pages に配信する。

## コマンド

| 用途 | コマンド |
| --- | --- |
| 開発サーバ | `npm run dev` |
| 本番ビルド (型チェック含む) | `npm run build` |
| 型チェックのみ | `npm run typecheck` |
| 本番ビルドのプレビュー | `npm run preview` |

自動テストはなし。`scripts/audit-*.mjs` / `scripts/test-*.mjs` は Playwright を使う**手動 audit スクリプト**で、`backup/` 内のオリジナルビルドと現行 `dist/` を URL 引数で比較するために実行する (CI からは呼ばれない)。

## ビルドの非自明な仕様

PWA マニフェスト (`manifest.json`) は `public/` ではなく**プロジェクト直下** (`index.html` の隣) に置いている。理由:

- Vite は `<link rel="manifest">` を HTML アセットとして追跡し、`assetFileNames` のルールに従って dist 配下に出力する。
- 既定の `assetFileNames: 'assets/[name][extname]'` のままだと `dist/assets/manifest.json` に出力され、HTML 内の href もそれに合わせて書き換えられる。
- 一方 `public/sw.js` は `./manifest.json` (root) を `ASSETS` リストでキャッシュしているため、上記のままでは SW キャッシュと HTML の要求パスが食い違い、オフライン時に PWA マニフェストの取得が失敗する。

これを後加工せずに解決するため、`vite.config.ts` の `assetFileNames` を関数化して **`manifest.json` だけ root に出力** する特例を入れている (それ以外は `assets/` 行き)。マニフェストを `public/` から外しているのも、`public/` 自動コピー経路と Vite のアセット追跡経路の出力先衝突を避けるため (同じ `dist/manifest.json` を取り合う)。

`assetsInlineLimit: 100_000_000` と `cssCodeSplit: false` で JS/CSS は HTML にインライン化する設計。`base: './'` は GitHub Pages のサブパスでも動かすため。`vite:singlefile` がビルド時に「NOTE: asset not inlined: manifest.json」と出すのは仕様 (マニフェストは `<link>` 経由で参照される独立ファイルである必要があるためインラインにできない)。

## デプロイ

`main` への push で `.github/workflows/deploy.yml` が走り `dist/` を GitHub Pages にアップする。`concurrency: pages, cancel-in-progress: false` なので走行中のデプロイは中断されず順番待ち。

## ソース構成のメモ

- `src/App.tsx` — タイマー本体。ステップ点火・SE 再生・確認ダイアログのフローを保持。`FINISH_TIME` は全レシピ共通 (210 秒、`src/data/recipes.ts`)。
- `src/audio/se.ts` — オリジナルバンドルからの**直訳ポート**。変数名 (`e`, `t`, `w`, `T`, `it`, `ot` など)、バリアント A〜G / D2〜D6 の構造は意図的に保存している。可読性目的のリネームはパリティを壊すので原則しない。
- `src/data/recipes.ts` — 4:6 メソッド (Tetsu Kasuya) ベースのレシピ定義。`Recipe` インターフェースは `src/types/index.ts`。
- `src/i18n/strings.ts` — ja/en の文言。`Lang` 型は `'ja' | 'en'`。
- `src/hooks/cookie.ts` — 永続化は `localStorage` ではなく **Cookie** (`recipeId`, `seVolume`)。SameSite=Lax / 365 日。
- `src/components/` — 単機能カード単位 (`RecipeCard` / `SettingsCard` / `TimerCard` / `Header` / `Dialogs` / `SegSlider` 等)。
- `manifest.json` — PWA マニフェスト。プロジェクト直下に置く (理由は「ビルドの非自明な仕様」参照)。
- `public/sw.js` — Service Worker。`./manifest.json` は `assetFileNames` の root 配置と整合しているが、`ASSETS` リスト内の `./app.js` / `./app.css` / `./assets/submit-button-click2.mp3` は旧バンドル時代の名残で実ファイル名 (singlefile 化済み HTML / `_submit-button-click2.mp3`) と一致しない。これらは初回オンライン取得経由でキャッシュに乗る前提。触る場合は要確認。
- `public/credits.html` — JS バンドル対象外の静的ページ。

## TypeScript

`tsconfig.app.json` は `strict: true` だが **`noUnusedLocals` / `noUnusedParameters` は意図的に OFF**。バンドル直訳由来の未使用変数を残すため。CIゲートは `npm run build` (= `tsc -b && vite build`)。

## 編集時の注意

- バックアップとのパリティ目的で残している命名・構造には手を加えない (前述の `src/audio/se.ts`)。
- 単一 HTML 出力前提のため、追加アセットを `public/` に置く際は SW のキャッシュリストと整合性を確認する。
- `manifest.json` を `public/` に戻したり、`assetFileNames` の関数を一律 `'assets/[name][extname]'` に戻したりすると、SW キャッシュと HTML 要求パスのズレが再発する。変更する場合は両者の同期を保つこと。
- レシピの全所要時間は `FINISH_TIME` に揃える。これを変えると `App.tsx` の終了センチネル (`FINISH_SENTINEL = 99`) ロジックと SE 発火タイミングに波及する。
