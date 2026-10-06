# BrewRig

コーヒードリップ・湯量管理タイマー (PWA)。React 19 + TypeScript + Vite 6 製の SPA を **単一ファイル HTML** にバンドルし、GitHub Pages に配信する。

## コマンド

| 用途 | コマンド |
| --- | --- |
| 開発サーバ | `npm run dev` |
| 本番ビルド (型チェック含む) | `npm run build` |
| 型チェックのみ | `npm run typecheck` |
| 本番ビルドのプレビュー | `npm run preview` |

自動テストはなし。CI ゲートは `npm run build` (= `tsc -b && vite build`) のみ。`backup/` にはポート前のオリジナル旧バンドルが原本として残っている (gitignore 済み) が、これと `dist/` を比較していた手動 audit スクリプト群 (`scripts/`) は撤去済みで、現在は未使用のアーカイブ。

## ビルドの非自明な仕様

PWA マニフェスト (`manifest.json`) は `public/` ではなく**プロジェクト直下** (`index.html` の隣) に置いている。理由:

- Vite は `<link rel="manifest">` を HTML アセットとして追跡し、`assetFileNames` のルールに従って dist 配下に出力する。
- 既定の `assetFileNames: 'assets/[name][extname]'` のままだと `dist/assets/manifest.json` に出力され、HTML 内の href もそれに合わせて書き換えられる。
- 一方 `public/sw.js` は `./manifest.json` (root) を `ASSETS` リストでキャッシュしているため、上記のままでは SW キャッシュと HTML の要求パスが食い違い、オフライン時に PWA マニフェストの取得が失敗する。

これを後加工せずに解決するため、`vite.config.ts` の `assetFileNames` を関数化して **`manifest.json` だけ root に出力** する特例を入れている (それ以外は `assets/` 行き)。マニフェストを `public/` から外しているのも、`public/` 自動コピー経路と Vite のアセット追跡経路の出力先衝突を避けるため (同じ `dist/manifest.json` を取り合う)。

`assetsInlineLimit: 100_000_000` と `cssCodeSplit: false` で JS/CSS は HTML にインライン化する設計。`base: './'` は GitHub Pages のサブパスでも動かすため。`vite:singlefile` がビルド時に「NOTE: asset not inlined: manifest.json」と出すのは仕様 (マニフェストは `<link>` 経由で参照される独立ファイルである必要があるためインラインにできない)。

## デプロイ

`main` への push で `.github/workflows/deploy.yml` が走り `dist/` を GitHub Pages にアップする。`concurrency: pages, cancel-in-progress: false` なので走行中のデプロイは中断されず順番待ち。

試作ブランチは本番を差し替えずに `/brewrig/preview/` へ併設公開できる: `gh workflow run deploy.yml --ref main -f preview_ref=<branch>`。ルートは常に `main` をビルドする。`main` への push 時は `vars.PREVIEW_REF` を参照し、未設定ならプレビューは消える。詳細は `docs/SPEC.md` §12。

## ソース構成のメモ

- `src/App.tsx` — タイマー本体。ステップ点火・SE 再生・確認ダイアログのフローを保持。`FINISH_TIME` は全レシピ共通 (210 秒、`src/data/recipes.ts`)。
- `src/audio/se.ts` — オリジナルバンドルからの**直訳ポート**。変数名 (`e`, `t`, `w`, `T`, `it`, `ot` など)、バリアント A〜G / D2〜D6 の構造は意図的に保存している。可読性目的のリネームはパリティを壊すので原則しない。
- `src/data/recipes.ts` — 4:6 メソッド (Tetsu Kasuya) ベースのレシピ定義。`Recipe` インターフェースは `src/types/index.ts`。
- `src/i18n/strings.ts` — ja/en の文言。`Lang` 型は `'ja' | 'en'`。
- `src/hooks/cookie.ts` — 永続化は `localStorage` ではなく **Cookie** (`recipeId`, `seVolume`, `soundMode`, `soundEnabled`, `lang`, `theme`)。SameSite=Lax / 365 日。`path=/` で同一オリジンの他アプリと共有されるため、読み込み時は許可値以外を既定値に丸める。
- `src/components/` — 単機能カード単位 (`RecipeCard` / `SettingsCard` / `TimerCard` / `Header` / `Dialogs` / `SegSlider` 等)。
- `manifest.json` — PWA マニフェスト。プロジェクト直下に置く (理由は「ビルドの非自明な仕様」参照)。
- `public/sw.js` — Service Worker。HTML は network-first、他の同一オリジン資産は cache-first。`ASSETS` には **dist に実在するファイルだけ**を並べる (1 件でも 404 だと `cache.addAll` が失敗し install 全体が失敗する。2026-10 まで旧バンドルの名残でこの状態だった)。キャッシュ名は `brewrig:<scope>:<BUILD_ID>` で、`__BUILD_ID__` は `vite.config.ts` の `swBuildId` プラグインがビルド時に埋め込む。登録は `src/hooks/swUpdate.ts` から本番ビルドのみ。詳細は `docs/SPEC.md` §11.3 / §11.7。
- `public/credits.html` — JS バンドル対象外の静的ページ。

## TypeScript

`tsconfig.app.json` は `strict: true` だが **`noUnusedLocals` / `noUnusedParameters` は意図的に OFF**。バンドル直訳由来の未使用変数を残すため。CIゲートは `npm run build` (= `tsc -b && vite build`)。

## 編集時の注意

- バックアップとのパリティ目的で残している命名・構造には手を加えない (前述の `src/audio/se.ts`)。
- 単一 HTML 出力前提のため、追加アセットを `public/` に置く・消す際は SW の `ASSETS` リストを同期する (存在しないファイルを含めると SW の install が失敗する)。
- `manifest.json` を `public/` に戻したり、`assetFileNames` の関数を一律 `'assets/[name][extname]'` に戻したりすると、SW キャッシュと HTML 要求パスのズレが再発する。変更する場合は両者の同期を保つこと。
- レシピの全所要時間は `FINISH_TIME` に揃える。これを変えると `App.tsx` の終了センチネル (`FINISH_SENTINEL = 99`) ロジックと SE 発火タイミングに波及する。
