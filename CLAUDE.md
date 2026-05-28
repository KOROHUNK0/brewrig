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

`vite.config.ts` の `fixManifestPath` プラグインがビルド後 `dist/index.html` を後加工し、PWA マニフェストのパスを修正する:

- `viteSingleFile` は `<link rel="manifest" href="./manifest.json">` を `./assets/manifest.json` に書き換え、`dist/assets/manifest.json` を重複生成する。
- 一方 `public/sw.js` の `ASSETS` リストはルート直下の `./manifest.json` をキャッシュ対象に指定している (public/ から `dist/manifest.json` に自動コピーされる)。
- 後加工で href を `./manifest.json` に戻し、重複した `dist/assets/manifest.json` を削除することで、SW キャッシュとブラウザのマニフェスト要求パスを揃え、オフライン PWA のマニフェスト取得失敗を防ぐ。

backup/ の旧 HTML と「見た目・動作上ほぼ同一」となれば十分で、HTML のバイトレベル一致は不要 (script 位置や `crossorigin` 属性のような実機能に影響しない差分は揃えない)。

`assetsInlineLimit: 100_000_000` と `cssCodeSplit: false` で全アセットを HTML にインライン化する設計。`base: './'` は GitHub Pages のサブパスでも動かすため。

## デプロイ

`main` への push で `.github/workflows/deploy.yml` が走り `dist/` を GitHub Pages にアップする。`concurrency: pages, cancel-in-progress: false` なので走行中のデプロイは中断されず順番待ち。

## ソース構成のメモ

- `src/App.tsx` — タイマー本体。ステップ点火・SE 再生・確認ダイアログのフローを保持。`FINISH_TIME` は全レシピ共通 (210 秒、`src/data/recipes.ts`)。
- `src/audio/se.ts` — オリジナルバンドルからの**直訳ポート**。変数名 (`e`, `t`, `w`, `T`, `it`, `ot` など)、バリアント A〜G / D2〜D6 の構造は意図的に保存している。可読性目的のリネームはパリティを壊すので原則しない。
- `src/data/recipes.ts` — 4:6 メソッド (Tetsu Kasuya) ベースのレシピ定義。`Recipe` インターフェースは `src/types/index.ts`。
- `src/i18n/strings.ts` — ja/en の文言。`Lang` 型は `'ja' | 'en'`。
- `src/hooks/cookie.ts` — 永続化は `localStorage` ではなく **Cookie** (`recipeId`, `seVolume`)。SameSite=Lax / 365 日。
- `src/components/` — 単機能カード単位 (`RecipeCard` / `SettingsCard` / `TimerCard` / `Header` / `Dialogs` / `SegSlider` 等)。
- `public/sw.js` — Service Worker。`./manifest.json` は `fixManifestPath` の処理で整合しているが、`ASSETS` リスト内の `./app.js` / `./app.css` / `./assets/submit-button-click2.mp3` は旧バンドル時代の名残で実ファイル名 (singlefile 化済み HTML / `_submit-button-click2.mp3`) と一致しない。これらは初回オンライン取得経由でキャッシュに乗る前提。触る場合は要確認。
- `public/credits.html` — JS バンドル対象外の静的ページ。

## TypeScript

`tsconfig.app.json` は `strict: true` だが **`noUnusedLocals` / `noUnusedParameters` は意図的に OFF**。バンドル直訳由来の未使用変数を残すため。CIゲートは `npm run build` (= `tsc -b && vite build`)。

## 編集時の注意

- バックアップとのパリティ目的で残している命名・構造には手を加えない (前述の `src/audio/se.ts`)。`fixManifestPath` プラグインも単なる整形ではなく PWA オフライン挙動を成立させる修正なので削らない。
- 単一 HTML 出力前提のため、追加アセットを `public/` に置く際は SW のキャッシュリストと整合性を確認する。
- レシピの全所要時間は `FINISH_TIME` に揃える。これを変えると `App.tsx` の終了センチネル (`FINISH_SENTINEL = 99`) ロジックと SE 発火タイミングに波及する。
