# BrewRig 仕様書

> **この文書の目的**: 新規セッションの Claude が本ファイル 1 つを読むだけで BrewRig の仕様を完全に把握できるようにするための、機能・挙動・データモデルの網羅的リファレンス。ビルド/デプロイの非自明な事情は `CLAUDE.md` にも記載があり、本書はそれと重複しつつ機能面を主に補完する。実装と食い違いが出た場合は**コードが正**。

---

## 1. 概要

BrewRig は **コーヒードリップの湯量管理タイマー** (PWA)。世界バリスタチャンピオン粕谷哲氏の「4:6 メソッド」およびハリオ スイッチを用いた「ハイブリッドメソッド」をベースに、粉量・味わい・濃度に応じた**各注湯タイミングと目標湯量**を計時・音声/画面で案内する。

- **形態**: React 19 + TypeScript 製 SPA を **単一ファイル HTML** にバンドルし、GitHub Pages に配信。
- **公開 URL**: `https://korohunk0.github.io/brewrig/`
- **オフライン対応**: Service Worker によりインストール後はオフラインでも動作する PWA。
- **自動テストなし**。CI ゲートは `npm run build`（= `tsc -b && vite build`）の型チェック + ビルド成功のみ。
- **バックエンドなし**。全状態はクライアント内（React state + Cookie）で完結。実行時の外部通信は `index.css` にインライン化された Google Fonts の CSS `@import`（クロスオリジンのフォント取得）のみで、オフライン時はシステムフォントにフォールバック。アイコン・`manifest.json` 等のアセットは同一オリジン。起動音は合成音のため音声ファイルの取得も行わない（§7.1 / §11.4）。

### 技術スタック / コマンド

| 項目 | 内容 |
| --- | --- |
| UI | React 19 (`StrictMode`)、関数コンポーネント + Hooks のみ（状態管理ライブラリ・ルーターなし） |
| 言語 | TypeScript 5.6（`strict: true`。ただし `noUnusedLocals`/`noUnusedParameters` は意図的に OFF） |
| ビルド | Vite 6 + `@vitejs/plugin-react` + `vite-plugin-singlefile` |
| 音声 | Web Audio API（効果音の合成）+ Web Speech API（音声ガイダンス） |
| 画面 | Screen Wake Lock API（計時中のスリープ防止。非対応環境では何もしない）、Picture-in-Picture + Media Session API（PiP 表示・試験的） |
| 永続化 | **Cookie**（`localStorage` は不使用） |
| 開発サーバ | `npm run dev` |
| 本番ビルド | `npm run build`（型チェック含む） |
| 型チェックのみ | `npm run typecheck` |
| プレビュー | `npm run preview` |

---

## 2. 画面構成とコンポーネント階層

単一ページ。上から Header → RecipeCard → SettingsCard → TimerCard → footer の縦積み（`max-width: 480px`、700px 以上で 800px に拡張しタイマーは横 2 カラム化）。

```
App (src/App.tsx)                     … 全状態と全ビジネスロジックを保持する単一の親
├─ ConfirmDialog / FlavorHelpDialog   (components/Dialogs.tsx)
├─ Header                             (components/Header.tsx)
│    ├─ LangToggle (JP|EN)
│    └─ ThemeToggle (🌙/☀️)   … ≤560px でハンバーガーメニューに集約
├─ main
│   ├─ RecipeCard                     (components/RecipeCard.tsx)
│   │    └─ RecipeDropdown → RecipeLabel   (レシピ選択ドロップダウン + #HOT/#ICED タグ)
│   ├─ SettingsCard                   (components/SettingsCard.tsx)
│   │    ├─ 粉量ステッパー (−5 / −1 / 数値入力 / +1 / +5)
│   │    ├─ 味わい SegSlider
│   │    ├─ 濃度 SegSlider  (レシピが strength を持つ場合のみ)
│   │    └─ 使用器具 / 挽き目 / 総投入湯量 / 湯温 / 備考
│   └─ TimerCard                      (components/TimerCard.tsx)
│        ├─ タイマー表示 + 現在の目標湯量/指示
│        ├─ PiP アイコン (カード右上。対応環境のみ)
│        ├─ 操作ボタン (Start/Pause/Resume, Reset)
│        ├─ サウンド設定 (ON/OFF, SE↔ガイダンス, 音量スライダー)
│        └─ 投入タイムライン (各ステップをタップで skip/rewind)
└─ footer (© 2025 KOROHUNK / Credits リンク → credits.html)
```

`App` が唯一の状態保持者で、子コンポーネントは全て props 経由の制御コンポーネント（自前状態はドロップダウン開閉など UI ローカルなもののみ）。

---

## 3. データモデル（`src/types/index.ts`）

```ts
type Lang       = 'ja' | 'en';
type Theme      = 'dark' | 'light';
type FlavorKey  = 'sweet' | 'normal' | 'bright';        // 味わい
type StrengthKey= 'light' | 'normal' | 'strong';        // 濃度
type FlowType   = 'immersion' | 'percolation';          // 浸漬 / 透過
type RecipeId   = 'hot' | 'iced' | 'hybrid' | 'hybrid-iced';
type SoundMode  = 'se' | 'tts';                         // 効果音 / 音声ガイダンス
```

### PourStep（1 回の注湯ステップ）

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `timeSeconds` | number | この注湯を開始する経過秒。ステップ点火の判定キー |
| `label` | string | 表示ラベル（例「1投目」「スイッチ開放」） |
| `amount` | number | このステップで**追加**投入する湯量 (g)。UI の累積計算にも使用 |
| `amountMin` / `amountMax` | number? | 湯量に幅がある場合の下限/上限（主にハイブリッド 1・2 投目） |
| `cumTarget` | number? | 累積目標を明示的に上書き（ハイブリッド 2 投目の「計 n g」表示用） |
| `noWater` | boolean? | 湯を注がないステップ（スイッチ開放等）。湯量表示・TTS の湯量読み上げを抑止 |
| `instruction` | string? | 詳細指示文。`" / "` 区切りで複数行に分割表示される |
| `stir` | boolean? | 撹拌ステップ。撹拌バッジ + 撹拌指示を表示 |
| `flowType` | `'immersion'\|'percolation'`? | 浸漬/透過バッジ |
| `stepTag` | string? | 追加バッジ（例「湯温75℃」） |

### Recipe インターフェース

各レシピはメソッド群を持つオブジェクト（`src/data/recipes.ts`）。多言語文字列は `getStrings(lang)` から解決するため全メソッドが `lang` を引数に取る。

```ts
interface Recipe {
  id: RecipeId;
  getLabel(lang): string;                 // 例 "4:6メソッド #HOT"
  getDescription(lang): string;
  sourceUrl: string;                      // 出典 URL
  getGrind(lang): string;                 // 挽き目（中粗挽き 等）
  waterMultiplier: number;                // 総湯量 = round(powder × waterMultiplier)
  getFlavorOptions(lang): FlavorOption[]; // 常に sweet/normal/bright
  defaultFlavor: FlavorKey;
  getStrengthOptions?(lang): StrengthOption[]; // 省略時は濃度セレクタ非表示
  defaultStrength: StrengthKey;
  getTemperature(lang, strength): string | null; // null なら焙煎度チップを表示
  getEquipment?(lang): string;            // 使用器具（ハイブリッドのみ）
  getPreparation?(lang): string[];        // 備考（アイス系のみ）
  getTempNote?(lang): string;             // 湯温の注記（ハイブリッドのみ）
  getPourSteps(flavor, strength, lang, powder): PourStep[]; // 中核: 注湯計画を生成
}
```

- 公開レジストリ `RECIPES = [hot, iced, hybrid, hybridIced]`（**この順序がドロップダウンの並び順**）。
- `getRecipeById(id)`: 見つからなければ先頭 `hot` にフォールバック。
- `isRecommended(id)`: `hot` と `iced` のみ true →「定番」バッジ表示。

---

## 4. レシピ仕様（`src/data/recipes.ts`）

全レシピ共通で **総所要時間 `FINISH_TIME = 210` 秒**（`recipes.ts` に定義）。`powder`（粉量 g）を `r` として湯量を算出し、`Math.round` で丸める。

### 4.1 総投入湯量

`totalWater = Math.round(powder × waterMultiplier)`。

| レシピ | waterMultiplier | 例: powder 20g |
| --- | --- | --- |
| hot | 15 | 300g |
| iced | 7.5 | 150g |
| hybrid | 15 | 300g |
| hybrid-iced | 7 | 140g |

### 4.2 hot — 4:6 メソッド #HOT

- 挽き目: 中粗挽き / 湯温: `null`（焙煎度チップ表示）/ 器具・備考なし
- 味わい: sweet/normal/bright（既定 normal）、濃度: light/normal/strong（既定 normal）
- 出典: philocoffea.com

湯量の内訳（`r = powder`、round 済み）:

| 変数 | sweet | normal | bright |
| --- | --- | --- | --- |
| `i`（1投目） | r×2.5 | r×3 | r×3.5 |
| `a`（2投目） | r×3.5 | r×3 | r×2.5 |

- 前半 40%（`i + a = r×6` 固定）で**甘味/酸味のバランス**、後半 60%（`r×9`）の分割数で**濃度**を決める。
- `o = r×9`、`ss = r×4.5`、`c = r×3`。

| 濃度 | ステップ (timeSeconds: 追加湯量ラベル) |
| --- | --- |
| light | 0s:`i` / 45s:`a` / 90s:`o`（3投） |
| normal | 0s:`i` / 45s:`a` / 90s:`ss` / 130s:`ss`（4投） |
| strong | 0s:`i` / 45s:`a` / 90s:`c` / 130s:`c` / 160s:`c`（5投） |

いずれも累積は `r×15`（= totalWater）に一致。

### 4.3 iced — 4:6 メソッド #ICED

- 挽き目: 中挽き / 器具なし / 備考: 「コーヒーサーバーに十分な氷を入れておく」
- 味わい: sweet/normal/bright（既定 normal）
- 濃度: **light / strong（推奨）** の 2 択、既定 **strong**
- 湯温: `getTemperature` が濃度依存 → light は **80℃**、それ以外 **90℃**
- 出典: YouTube（TfSBzFeoL4s）

湯量（`r = powder`）:

| 変数 | sweet | normal | bright |
| --- | --- | --- | --- |
| `i`（1投目） | r×1 | r×1.5 | r×2 |
| `a`（2投目） | r×2 | r×1.5 | r×1 |

- `o = r×1.5`。
- **ステップは濃度に依存しない**（`getPourSteps` の strength 引数は未使用。濃度は湯温だけを変える）。常に 5 投:

| time | 追加湯量 | 属性 |
| --- | --- | --- |
| 0s | `i` | stir（撹拌） |
| 45s | `a` | stir |
| 90s | `o` | — |
| 130s | `o` | — |
| 160s | `o` | — |

累積 `r×7.5`（= totalWater）。

### 4.4 hybrid — ニューハイブリッドメソッド #HOT

- 器具: **ハリオ スイッチ ドリッパー** / 挽き目: 中粗挽き / 湯温: `null`（焙煎度チップ）
- 湯温注記: 「※4投目から 75℃前後に下げる」
- 味わい: sweet/normal/bright（既定 normal）。**濃度セレクタなし**（`getStrengthOptions` 省略、`defaultStrength: normal`）
- 浸漬式（スイッチ閉）と透過式（スイッチ開）を組み合わせる改良版。出典: YouTube（4FeUp_zNiiY）

湯量（`r = powder`）:

| 変数 | sweet | normal | bright | 用途 |
| --- | --- | --- | --- | --- |
| `i` | r×1.5 | r×2 | r×2.5 | 1投目の下限 (amountMin) |
| `a` | r×2 | r×2.5 | r×3 | 1投目の amount/amountMax、`o` |
| `ss` | = r×6 − a | | | 2投目 amount/amountMin (`l`) |
| `c` | = r×6 − i | | | 2投目 amountMax |
| `u` | r×4 | | | 3投目 amount |
| `d` | r×5 | | | 4投目 amount |

| time | amount | min/max | cumTarget | ラベル | 指示(instruction) | flow | tag |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0s | `a` | `i`〜`a` | — | 1投目 | スイッチ閉鎖で注湯（浸漬）／粉全体が浸る程度 | immersion | — |
| 40s | `ss` | `ss`〜`c` | r×6 | 2投目 | スイッチ開放で注湯（透過） | percolation | — |
| 90s | `u` | — | — | 3投目 | スイッチ開放のまま注湯／ケトルに水・氷を加え75℃前後へ | percolation | — |
| 130s | `d` | — | — | 4投目 | スイッチ閉鎖し75℃前後で注湯（浸漬） | immersion | 湯温75℃ |
| 165s | 0 | — | — | スイッチ開放 | スイッチを解放する（透過） | percolation (noWater) | — |

名目累積は `r×15`（1・2 投目の名目和が `r×6`、以降 `r×4 + r×5`）。

### 4.5 hybrid-iced — ハイブリッドメソッド #ICED（旧版ベース）

- 器具: ハリオ スイッチ / 挽き目: **中細挽き** / 湯温: `null`（焙煎度チップ）
- 湯温注記: 「※3投目から 75℃前後に下げる」/ 備考: 氷を入れておく
- 味わい: sweet/normal/bright（既定 normal）。濃度セレクタなし。出典: YouTube（dBf8im6Jyng）

湯量（`r = powder`）:

| 変数 | sweet | normal | bright |
| --- | --- | --- | --- |
| `i`（1投目） | r×1 | r×1.5 | r×2 |
| `a`（2投目） | r×2.5 | r×2 | r×1.5 |

- `o = r×3.5`（3投目）。

| time | amount | ラベル | 指示 | flow | 属性 |
| --- | --- | --- | --- | --- | --- |
| 0s | `i` | 1投目 | スイッチ開放で注湯し撹拌（透過） | percolation | stir |
| 30s | `a` | 2投目 | スイッチ開放で注湯・撹拌／75℃前後へ | percolation | stir |
| 100s | `o` | 3投目 | スイッチ閉鎖し75℃前後で注湯（浸漬） | immersion | 湯温75℃ |
| 130s | 0 | スイッチ開放 | スイッチを解放する（透過） | percolation | noWater, stir |

累積 `r×7`（= totalWater）。

### 4.6 焙煎度チップ（`getTemperature` が null のとき）

`getRoastChips(lang)` が返す推奨湯温の目安。湯温が固定でないレシピ（hot / hybrid / hybrid-iced）で表示:

| 焙煎度 | 湯温 |
| --- | --- |
| 浅煎り | 93℃ |
| 中煎り | 88℃ |
| 深煎り | 83℃ |

---

## 5. 状態管理（`src/App.tsx`）

`App` が全状態を保持。子は props で受け取る。

### 5.1 state 一覧

| state | 初期値 | 説明 |
| --- | --- | --- |
| `lang` | Cookie or `'ja'` | 表示言語 |
| `dark` | Cookie or `true` | テーマ（Cookie `theme` が `'light'` のときのみ false）。`.app` と `<html>` の `data-theme` 属性へ反映（§10.4） |
| `flavorHelpOpen` | false | 味わい説明ダイアログ |
| `recipeId` | Cookie or `'hot'` | 選択中レシピ |
| `powder` | `20` | 粉量 g（範囲 **5〜50**、UI で clamp） |
| `flavor` | `'normal'` | 味わい |
| `strength` | `'normal'` | 濃度（レシピが対応しない値なら `effectiveStrength` で既定へ丸め） |
| `currentTime` | `0` | 経過秒 |
| `isPlaying` | false | 計時中フラグ |
| `soundEnabled` | Cookie（既定 ON） | サウンド全体の ON/OFF |
| `soundMode` | Cookie（既定 `'se'`） | `'se'`（効果音）or `'tts'`（音声ガイダンス） |
| `seVolume` | Cookie or 既定 | 音量（下記スケール参照） |
| `activeStep` | `0` | 現在アクティブなステップ index（null=なし） |
| `finished` | false | 抽出完了フラグ |
| `highlightStep` | null | 点火直後 2 秒だけハイライトする index（パルス演出） |
| `confirmState` | 閉 | 確認ダイアログ状態 `{open, message, onOk}` |
| `menuOpen` | false | ハンバーガーメニュー開閉 |

### 5.2 ref

| ref | 用途 |
| --- | --- |
| `tickRef` | tick 用 `setInterval` の id（250ms ポーリング） |
| `anchorPerfRef` / `anchorSecRef` | 実時計アンカー。`currentTime = anchorSec + floor((performance.now() − anchorPerf)/1000)`。(再)開始・再開・ジャンプ・リセットで `reanchor()` により貼り直す |
| `firedRef` | 点火済みステップ index の `Set`。**完了センチネル `99`（`FINISH_SENTINEL`）** も同じ Set に入れて完了の二重発火を防ぐ |
| `audioCtxRef` | 将来用の予約（実質未使用。AudioContext は `se.ts` が独自管理） |

### 5.3 音量スケール（モバイル判定）

`isMobileUserAgent()`（UA 正規表現 `/iPhone|iPad|iPod|Android/i`）で分岐:

| | max | step | 既定 |
| --- | --- | --- | --- |
| モバイル | 5 | 0.1 | 2.5 |
| デスクトップ | 1 | 0.05 | 0.5 |

- SE 音量 `seVolume` は Web Audio の gain 係数にそのまま渡る（モバイルは 1 超で増幅可能）。
- TTS 音量は `ttsVolume = min(1, seVolume / seVolumeMax)` に正規化（0〜1）。

### 5.4 派生値

- `t = getStrings(lang)` … 文言辞書。
- `recipe = getRecipeById(recipeId)`。
- `effectiveStrength` … `strength` がレシピの選択肢に無ければ `recipe.defaultStrength` に丸める。
- `steps = recipe.getPourSteps(flavor, effectiveStrength, lang, powder)`。
- `totalWater = round(powder × recipe.waterMultiplier)`。
- `seActive = soundEnabled && soundMode==='se'`。
- `ttsActive = soundEnabled && soundMode==='tts' && ttsSupported`。

---

## 6. タイマー挙動（中核ロジック）

### 6.1 計時（tick）— 実時計基準

`currentTime` は「tick 回数のカウンタ」ではなく**実経過秒から算出**する（バックグラウンドでの `setInterval` スロットリング/凍結でタイマーが遅れないようにするため）:

```
currentTime = anchorSec + floor((performance.now() − anchorPerf) / 1000)
```

- `isPlaying` の間だけ **250ms 間隔**で再計算し、`setCurrentTime(prev => target > prev ? target : prev)` で前進（値が変わらなければ再レンダーされず、実質 1 秒に 1 回更新）。停止/アンマウントで clear。
- **アンカー（`anchorPerf`/`anchorSec`）は `start()`（開始・再開）/ `jumpHelper` / `jumpFinish` / `reset` で `reanchor()` により貼り直す**。pause 中は tick を止めるだけで、経過時間は加算されない。
- `performance.now()`（単調増加）を使用し、`Date.now()` は使わない（端末の時刻変更・NTP 補正の影響を避けるため）。

### 6.2 ステップ点火（`currentTime` 監視 effect）

`isPlaying` 中、`currentTime` 変化のたびに:

1. `timeSeconds <= currentTime` かつ未点火のステップを時刻順に集める（`passed`）。**通常の 1 秒進行では `passed` は 0 個か 1 個**で、旧来の `===` 判定と**同一の発火**になる。
   - `passed` があれば全て `firedRef` に追加。**`currentTime < FINISH_TIME` のときだけ最新（＝最後）のステップを告知**: `activeStep`/`highlightStep` を更新し、`seActive` で `playStep`、`ttsActive` で累積湯量を読み上げ、2 秒後に highlight 解除。
   - **P1 キャッチアップ**: 背景復帰などで複数秒ジャンプし `passed` が複数になった場合、通過した**中間ステップの SE/TTS は鳴らさず**、最新ステップだけを告知する（＝遅れて無意味に鳴るはずだった音を抑制）。定刻に鳴る音・完了音は失われない。
2. `currentTime >= FINISH_TIME + 60`（= **270 秒**）かつ `finished` なら **自動停止**（`setIsPlaying(false)`）。
3. `currentTime >= FINISH_TIME`（210 秒）かつセンチネル未点火なら: センチネル `99` を追加、`finished=true`、`activeStep=null`、`seActive` で `playFinish`、`ttsActive` で完了アナウンス。**ジャンプで 210 を跨いでも完了音は必ず 1 度鳴る**。

> **重要**: 完了しても計時は止まらず、`FINISH_TIME`〜`+60秒` は**オーバータイム表示**（`+Ns`、60 秒到達で「60s over」）を続け、270 秒で自動停止する。
> **実時計化（P1）の要点**: 前景の通常利用では発火挙動は従来と**完全に同一**。差が出るのは「タイマーが 2 秒以上遅れて追いつく」局面のみで、そこは P1 が**中間キューを抑制**する（定刻キューは抑制しない）。バックグラウンド/画面ロックで失った時間は取り戻さない（音のバースト/脱落を避けるため）。iOS ロック等は OS が JS/AudioContext ごとサスペンドするため、背景での発音自体が不可能。

### 6.3 操作関数

| 関数 | 挙動 |
| --- | --- |
| `start()` | `finished` なら何もしない。`ensureRunning()` で AudioContext を resume。`currentTime===0` の初回のみステップ 0 を点火（**起動音**は `playStart`、TTS はステップ 0 を読み上げ）。`setIsPlaying(true)`。ボタン名は `currentTime===0` で「スタート」/それ以外「再開」 |
| `pause()` | `setIsPlaying(false)` + `cancelSpeech()`。効果音は鳴らさない |
| `requestReset()` | 常に確認ダイアログ（`confirmReset`）を開く。OK で `reset()` |
| `reset()` | 停止・`currentTime=0`・`activeStep=0`・`finished=false`・`firedRef` を空 Set に・発話停止 |
| `guardChange(fn)` | 計時中/進行中（`isPlaying \|\| currentTime>0`）なら確認ダイアログ（`confirmChange`）→ OK で reset してから fn 実行。アイドル時は即 fn |
| `selectRecipe(id)` | `guardChange` 経由でレシピ変更 + 味わい・濃度を新レシピの既定へ。**粉量 `powder` は据え置き**（レシピ変更ではリセットされない） |

### 6.4 スキップ / 巻き戻し（タイムラインのタップ）

- `jumpTo(idx)`: 確認ダイアログ。文言は移動方向で「巻き戻し」/「スキップ」を出し分け（`step.timeSeconds < currentTime` なら巻き戻し）。OK で `jumpHelper(step.timeSeconds)` を実行し、TTS 有効なら当該ステップを読み上げ、**移動前が再生中なら 50ms 後に再生再開**。
- `jumpHelper(e)`: `timeSeconds <= e` の全ステップを点火済みとして `firedRef` を再構築（`e >= FINISH_TIME` ならセンチネルも追加）、`currentTime=e`・`activeStep=最後に該当した index`・`finished=false`。**`isPlaying` は変更しない**。
- `jumpFinish()`: 確認ダイアログ（`confirmFinish`）。OK で全ステップ index を点火済みにし（**センチネルは入れない**）、`currentTime = FINISH_TIME − 1`（=209）にして 50ms 後に再生開始 → 次の tick で 210 に達し、通常のステップ点火 effect 経由で完了処理（＝完了音）が走る。

### 6.5 画面スリープ防止（`src/hooks/wakeLock.ts`）

- `useWakeLock(isPlaying)`：**`isPlaying` の間だけ** Screen Wake Lock（`navigator.wakeLock.request('screen')`）を保持する。一時停止・リセット・270 秒の自動停止で `isPlaying=false` になると解放。完了後のオーバータイム（210〜270 秒）中は保持を継続。
- ページ非表示でブラウザが自動解放するため、`visibilitychange` で可視に戻ったとき `isPlaying` なら再取得する。
- 非対応環境（`'wakeLock' in navigator` が false）では何もしない。`request()` の失敗（省電力モード等の `NotAllowedError`）は握りつぶし、計時・音声に影響させない。
- 取得中に解放条件が成立した場合（StrictMode の effect 二重実行・素早いタブ切替）でも取り残しが出ないよう、取得完了時に破棄済みなら即 `release()` する。二重取得は取得中フラグで抑止。
- 要セキュアコンテキスト（GitHub Pages の https / `localhost` の開発サーバは可）。

### 6.6 PiP 表示（`src/hooks/timerPip.ts`、試験的）

ホーム画面や他アプリに切り替えてもタイマーを小窓で見られるようにする。主に Android Chrome を想定。

- **方式**: タイマー表示を `<canvas>`（480×270）に描画し、`canvas.captureStream()` を消音の `<video>` に流して `requestPictureInPicture()` で PiP 化する（動画 PiP）。Document PiP はモバイル非対応のため不採用。
- **表示内容**: 経過時間（完了後は `3:30` 固定）、オーバータイム（完了後のみ、時間表示の下に小さく `+Ns`。60 秒以上は `+60s over`。アプリ本体の表記と同じ）、状態（スタート待機中 / 一時停止中 / 現在ステップのラベル / 抽出完了）、目標湯量（`Xg まで`。ステップ 0 の min/max は範囲、`noWater` は非表示）。配色は現在のテーマに追従。表示状態が変わるたびに再描画する（video が再生中のときのみ新フレームが小窓に届く）。
- **操作**: PiP 小窓の再生/一時停止ボタンを Media Session の `play` / `pause` アクションハンドラで `start()` / `pause()` に割り当てる（MediaStream 映像は既定で再生/一時停止ボタンが出ないため、ハンドラ登録が必須）。**`<video>` の再生/一時停止を `isPlaying` に同期**してボタン表示（⏸/▶）を切り替える。Media Session 仕様上、実効の再生状態は「宣言 `playbackState` が playing か、または再生中のメディア要素がある」と playing になるため、`playbackState='paused'` を宣言しても video が再生中だとボタンが ⏸ のまま残り、`play`（再開）が呼ばれない。停止時は「一時停止中」等の最終フレームを描画してからストリームに乗る猶予（約 200ms）を置いて video を pause する。停止中に表示内容が変わった場合（テーマ切替等）は、一瞬 play して再描画を反映してから再度 pause する。`playbackState` も補助的に同期する。リセット・スキップは確認ダイアログを出せないため PiP からは操作不可。
- **ライフサイクル**: タイマーカード右上の PiP アイコン（トグル。表示中はアクセント色の枠でアクティブ表示、`aria-pressed` 連動）で開閉。開く際に AudioContext も生成/再開する（PiP から初回スタートしても SE が鳴るように）。`leavepictureinpicture` でハンドラ解除・ストリーム停止・要素破棄。
- **ハンドラ登録中の副作用**: PiP 表示中はメディアキー / Bluetooth ヘッドセットの再生・一時停止でもタイマーが操作される。
- **対応判定**: `document.pictureInPictureEnabled` かつ `captureStream` / `requestPictureInPicture` が存在する場合のみアイコンを表示。iOS（`captureStream` 非対応。ホーム画面 PWA では PiP 自体も不可）・Samsung Internet（PiP API 非対応）では表示しない。
- **既知の制約**: ホーム画面へ戻ったときの自動 PiP 化はしない（Android の自動 PiP は全画面動画のみが対象）。先に PiP アイコンで小窓を出してから移動する。バックグラウンド中の描画更新・小窓ボタンの反応は端末依存で、実機検証が必要。

### 6.7 入力ロック

`SettingsCard` の `locked = isPlaying || currentTime>0`:
- 粉量数値入力は `readOnly`/`disabled`。ロック中に入力欄をタップすると `guardChange`（リセット確認）が発火。
- 味わい・濃度・±ボタンは `guardChange` 経由（リセットを挟んでから変更）。

---

## 7. 音声

### 7.1 効果音エンジン（`src/audio/se.ts`）

- **オリジナルバンドルからの直訳ポート**。変数名（`e`,`t`,`w`,`T`,`S`,`me`,`it`,`ot` 等）とバリアント構造 `current / A〜G / D2〜D6`（ステップ 13 種・完了 13 種）を意図的に保存。**可読性目的のリネームはパリティを壊すので禁止**。
- Web Audio API のオシレータ合成で音を生成。`getAudioContext()` が遅延生成（`webkitAudioContext` フォールバックあり）、`ensureRunning()` が suspended 状態を resume。
- 公開 API:
  - `playStep(ctx, volume, variant='F')` … ステップ点火音。実行バリアントは **'F' 固定**（`w()`: 740/1480Hz の triangle+sine）。
  - `playFinish(ctx, volume, variant='F')` … 完了音。**'F' 固定**（`T()`: 587/740/880Hz のアルペジオ）。
  - `playStart(ctx, volume, variant='F')` … 起動音。**最初から合成音（F バリアントのステップ音）を使用する**。外部音声ファイルには依存しない（詳細は §11.4）。
- `volume` は gain 係数として直接乗算（`seVolume` がそのまま渡る）。

### 7.2 音声ガイダンス（`src/audio/tts.ts` / `tts-phrases.ts`）

- Web Speech API（`speechSynthesis`）ベース。SE とは独立。
- `isTtsSupported()` … `'speechSynthesis' in window`。false の場合はモード切替 UI 自体を出さず、`soundMode='tts'` にもならない。
- `speak(text, {lang, volume})` … 発話前に `cancel()`、`lang`（ja-JP/en-US）・`rate=1.0`・`pitch=1.0`・`volume`（0〜1）を設定。`voiceschanged` 対応の遅延ボイス取得あり。
- `cancelSpeech()` … 発話停止。**TTS が非アクティブ化したとき / 言語切替時 / pause / reset / jump 時**に呼ばれる。
- `buildStepTts(step, index, cumulative, s, lang)`:
  - `noWater` でなければ湯量を読む。先頭ステップで min/max があれば範囲読み（`ttsPourRange`）、それ以外は累積読み（`ttsPourTo`）。
  - `instruction` があれば表示用文言 → 短縮 TTS 文言へ**値マッチで引き当て**（`recipes.ts` を触らないための設計）。`instruction` が無く `stir` なら撹拌読み。
  - 区切りは ja が「。」、en が半角スペース。
- `buildFinishTts(s)` … 完了アナウンス（`ttsFinish`）。

---

## 8. 永続化（`src/hooks/cookie.ts`）

`localStorage` ではなく **Cookie**（`path=/`, `SameSite=Lax`, 有効期限 365 日）。`encodeURIComponent` で符号化。

保存キー（`App` の `useEffect` で各 state 変更時に書き込み）:

| キー | 値 | 備考 |
| --- | --- | --- |
| `recipeId` | `RecipeId` | 起動時に読み込み（既定 `hot`） |
| `seVolume` | 数値文字列 | 起動時 `parseFloat` → `[0, seVolumeMax]` に clamp。不正なら既定 |
| `soundMode` | `'se'` / `'tts'` | `'tts'` は `ttsSupported` の場合のみ採用。旧値 `'off'` は下記参照 |
| `soundEnabled` | `'1'` / `'0'` | ON/OFF |
| `lang` | `'ja'` / `'en'` | 起動時に読み込み。それ以外の値・未設定は `ja` |
| `theme` | `'dark'` / `'light'` | 起動時に読み込み。それ以外の値・未設定は `dark` |

初期化の後方互換: `soundEnabled` が未設定でも旧 `soundMode==='off'` を OFF として解釈する。

> Cookie は `path=/` のため同一オリジン（`korohunk0.github.io`）の他アプリと名前空間を共有する。`lang` / `theme` のような汎用名は衝突し得るため、読み込み時は**許可値以外を既定値に丸める**（不正値で UI を壊さない）。

---

## 9. 国際化（`src/i18n/strings.ts`）

- `Lang = 'ja' | 'en'`、`getStrings(lang)` が `Strings` を返す。`Strings` は全文言 + 関数文言（`pour(n)`, `pourAmount(n)`, `pourTotal(n)`, `confirmSkip(...)`, `ttsPourTo(n)` 等）を含む。
- 表示用文言（`instr*`）と TTS 用短縮文言（`tts*`）は別に定義され、`tts-phrases.ts` が値マッチで対応付ける。
- レシピラベルは末尾に `#HOT` / `#ICED` タグを含む（例「4:6メソッド #HOT」）。`RecipeLabel` が正規表現 `/^(.*?)\s*#(\S+)$/` で分割し、HOT/ICED で色分けバッジ表示。
- 「定番」バッジ文言 `recommend` は **ja/en とも `'定番'`**（英語版も日本語のまま＝意図的）。

---

## 10. UI 細部の仕様

### 10.1 TimerCard 表示状態

| 状態 | 条件 | 表示 |
| --- | --- | --- |
| アイドル | `currentTime===0 && !isPlaying && !finished` | 「⏵ スタート待機中 / ⏵ Ready」、タイマー淡色点滅 |
| 一時停止 | `!isPlaying && currentTime>0 && !finished` | 「⏸ 一時停止中 / ⏸ Paused」、タイマー点滅 |
| 再生中 | `isPlaying` | 現在ステップの目標湯量「**Xg** まで注いでください」+ 指示文 |
| 完了 | `finished` | 「抽出完了！」バナー、タイマーはアクセント色で 210 固定表示 + オーバータイム |

- 目標湯量表示: 通常は**累積湯量**（`cumulativeAtActive`）。ステップ 0 で min/max を持つ場合のみ範囲「min~max g」。`noWater` ステップは湯量非表示。
- アイドル時（未スタート）も `activeStep=0` のため、**1投目の目標湯量が薄表示**（idle 点滅）される。表示内容は再生中と同じで、点滅スタイルのみ異なる。
- 指示文 `ActionInstruction`: `instruction` を `" / "` で改行分割し、トークン `(透過)(浸漬)撹拌開放閉鎖` を `<strong>` で強調。

### 10.2 投入タイムライン

- 各ステップ行 = 時刻 / ラベル / 追加湯量 / 累積（`計 n g`、`cumTarget` があれば優先、min/max なら範囲）/ バッジ群 / 移動リンク。
- バッジ: 撹拌 `撹拌`、浸漬 `浸漬/Imm.`、透過 `透過/Perc.`、`stepTag`（湯温75℃）。
- ドット/塗りは進捗（`currentTime` と各セグメント長から `pct` 算出）で past/active を表現。
- 行タップ → `jumpTo(idx)`、末尾の完了行/ドット → `jumpFinish()`。

### 10.3 SegSlider の既知の意図的挙動

`seg-thumb` の `left`/`width` に**改行入り `calc()`**（`calc(... 100%\n2 ...)`）を渡している。これは構文的に不正で**ブラウザに無視される**が、**オリジナルバンドルの見た目を再現するための意図的な移植**。可視ハイライトは active ボタンの outline が担う。修正しないこと。

### 10.4 レスポンシブ / テーマ

- ヘッダー操作は幅 ≤560px でハンバーガーメニューに集約。
- 幅 ≥700px でタイマーカードが横 2 カラム（タイマー | タイムライン）。
- テーマは CSS 変数（`--bg`,`--accent` 等）を `:root` と `[data-theme=light]` で切替。基調はダーク（焙煎色）。
- `data-theme` は `.app` と **`<html>` の両方**に付ける。`body` は `<html>` 側の変数を参照するため、`.app` だけだとライトテーマでも `body` がダークのまま残り、React マウント前の一瞬やオーバースクロール時の余白にダークが見える。
  - 起動時: `index.html` の `<head>` 内 inline script が Cookie `theme=light` を見て、初回描画前に `<html data-theme="light">` を付ける（マウント前のダーク→ライトのちらつき防止）。
  - 切替時: `App` の effect が `<html>` の `data-theme` を `dark`/`light` に同期する。
- ステータスバー色（`meta theme-color` / `manifest.json` の `theme_color`）は `#1a1108` 固定でテーマに追従しない（既知の制約）。
- **外側クリックで閉じる**: ハンバーガーメニューは `.app` ルート要素の `onClick`（`setMenuOpen(false)`）で、レシピドロップダウンは document の `mousedown` リスナで、それぞれ外側クリック時に閉じる。

### 10.5 味わいヘルプ（FlavorHelpDialog）

SettingsCard の「?」ボタンで開くダイアログ。味わい選択の 2 語をドメイン知識として定義する:

- **明るい (bright)**: 爽やかな（スッキリとした）酸味を感じられること。
- **甘い (sweet)**: 舌で感じる直接的な甘味ではなく、香りから感じられるもの。

---

## 11. PWA / Service Worker / ビルド

### 11.1 単一ファイルバンドル

`vite-plugin-singlefile` により JS/CSS を HTML にインライン化（`assetsInlineLimit: 100_000_000`, `cssCodeSplit: false`）。`base: './'` で GitHub Pages のサブパス配信に対応。

### 11.2 manifest.json の配置（非自明・重要）

- `manifest.json` は `public/` ではなく**プロジェクト直下**（`index.html` の隣）に置く。
- Vite は `<link rel="manifest">` をアセット追跡し、`assetFileNames` を**関数化して `manifest.json` だけ root**（`dist/manifest.json`）に出力する特例を入れている（それ以外は `assets/`）。
- 理由: `public/sw.js` が `./manifest.json`（root）を `ASSETS` でキャッシュしているため、`dist/assets/manifest.json` になると SW キャッシュと HTML の要求パスがズレてオフライン時に失敗する。
- **`manifest.json` を `public/` に戻す / `assetFileNames` を一律 `assets/[name][extname]` に戻すと、このズレが再発する。**
- ビルド時の「NOTE: asset not inlined: manifest.json」は仕様（`<link>` 経由参照のためインライン不可）。
- 主要フィールド: `name`/`short_name` は「BrewRig」、`start_url: ./index.html`、`display: standalone`、`orientation: portrait`、`background_color`/`theme_color` = `#1a1108`、`lang: ja`、`categories: [utilities, lifestyle]`。アイコンは `icon-padding-{192,512}.png` と `icon-padding.svg`（すべて `purpose: "any maskable"`）。

### 11.3 Service Worker（`public/sw.js`）

- `CACHE_NAME = 'brewrig-v3'`。install で `ASSETS` を precache、activate で旧キャッシュ削除、fetch は cache-first（文書は失敗時 `./index.html` にフォールバック）。
- **`ASSETS` に旧バンドル時代の名残**（`./app.js`, `./app.css`, `./assets/submit-button-click2.mp3`）が含まれ、singlefile 化後の実ファイル名（インライン化済み HTML / `_submit-button-click2.mp3`）と一致しない。これらは初回オンライン取得経由でキャッシュに乗る前提。触る場合は要確認。

### 11.4 起動音は合成音（外部音声ファイル非依存）

- **仕様**: 起動音・ステップ点火音・完了音はすべて Web Audio による**合成音**で生成する。起動音も最初から合成音（F バリアントのステップ音）を鳴らし、外部音声ファイルは参照しない。この「合成音のみ」の挙動が正しい仕様である。
- 実装: `se.ts` の `playStart` は合成音（F バリアント = `playStep`）を直接呼ぶだけで、音声ファイルの fetch は行わない（同期関数）。
- リポジトリに `public/assets/_submit-button-click2.mp3` が残っているが、アプリの起動音はこれを使用しない。オリジナル旧バンドル (`backup/`) も同名ファイルの参照でファイル名不一致により常に合成音へフォールバックしていたため、本実装はその実挙動と一致する（＝**パリティ保持**）。

### 11.5 静的ページ

`public/credits.html` は JS バンドル対象外の独立静的ページ（アイコン素材のクレジット表記。SVG Repo「Barista Beverage Bottle」CC Attribution）。フッターの Credits リンクから開く。

### 11.6 index.html（エントリ HTML）

- **テーマの先行適用**: `<head>` 内 inline script が Cookie `theme=light` なら `<html>` に `data-theme="light"` を付ける（§10.4）。
- **SW 登録**: inline script が `window` の `load` イベントで `navigator.serviceWorker.register('./sw.js')` を実行（失敗は `console.warn`）。SW 登録はここだけで、`src/` 側からは行わない。
- **PWA / 表示メタ**: `theme-color = #1a1108`、`apple-mobile-web-app-capable = yes`、`apple-mobile-web-app-status-bar-style = black-translucent`、`apple-mobile-web-app-title = BrewRig`、`apple-touch-icon = ./assets/icon-192.png`、`<link rel="icon">` = `favicon.svg`、`<link rel="manifest" href="./manifest.json">`。
- **OGP**: `og:title = BrewRig`、`og:description`、`og:type = website`、`og:url`（公開 URL）。`<meta name="description">` あり、ドキュメント言語は `<html lang="ja">`。
- `<script type="module" src="/src/main.tsx">` が唯一のエントリ（ビルド時に単一 HTML へインライン化）。

---

## 12. デプロイ（`.github/workflows/deploy.yml`）

- `main` への push（または手動 `workflow_dispatch`）で発火。
- Node 22 で `npm ci` → `npm run build` → `dist/` を `actions/upload-pages-artifact` → `actions/deploy-pages` で GitHub Pages へ。
- `concurrency: {group: pages, cancel-in-progress: false}` … 進行中デプロイは中断せず順番待ち。
- 権限は最小（`contents: read`, `pages: write`, `id-token: write`）。

---

## 13. 編集時の主な注意点（不変条件）

1. **`FINISH_TIME`（210秒）を変えない**。変えると `App.tsx` の完了センチネル（`FINISH_SENTINEL=99`）と自動停止（`+60秒`）・SE 発火タイミングに波及する。全レシピの累積湯量も `FINISH_TIME` 前提で設計されている。
2. **`src/audio/se.ts` の命名・バリアント構造を変えない**（オリジナルとのパリティ保持）。
3. **`SegSlider` の壊れた `calc()` を「直さない」**（見た目の再現のため意図的）。
4. **`manifest.json` の配置と `assetFileNames` の関数を維持**（SW キャッシュとの整合）。
5. `public/` にアセットを追加するときは SW の `ASSETS` リストとの整合を確認。
6. TypeScript は `strict` だが未使用変数チェックは OFF（直訳由来の未使用変数を残すため）。CI ゲートは `npm run build`。
7. `noWater` ステップは湯量表示・TTS 湯量読み上げの抑止対象。新ステップ追加時は各バッジ/表示分岐（TimerCard）と TTS 分岐（tts-phrases）の両方を確認。

---

## 14. ソースツリー早見表

| パス | 役割 |
| --- | --- |
| `src/main.tsx` | エントリ。`StrictMode` で `App` をマウント |
| `src/App.tsx` | 全状態・全ロジック（計時/点火/スキップ/確認ダイアログ/音声発火） |
| `src/types/index.ts` | 型定義（Recipe / PourStep 他） |
| `src/data/recipes.ts` | 4 レシピ定義・`FINISH_TIME`・焙煎度チップ・レジストリ |
| `src/i18n/strings.ts` | ja/en 文言辞書（表示用 + TTS 用） |
| `src/audio/se.ts` | 効果音エンジン（直訳ポート、13×2 バリアント、実行 'F' 固定） |
| `src/audio/tts.ts` | Web Speech API ラッパ |
| `src/audio/tts-phrases.ts` | ステップ→TTS 文言組み立て（値マッチ） |
| `src/hooks/cookie.ts` | Cookie 読み書き |
| `src/hooks/wakeLock.ts` | 計時中の画面スリープ防止（Screen Wake Lock） |
| `src/hooks/timerPip.ts` | タイマーの PiP 表示（canvas → video PiP + Media Session、試験的） |
| `src/utils/format.ts` | `formatTime`（mm:ss）・`isMobileUserAgent` |
| `src/components/Header.tsx` | ヘッダー（言語/テーマ/ハンバーガー） |
| `src/components/RecipeCard.tsx` `RecipeDropdown.tsx` `RecipeLabel.tsx` | レシピ選択 + 説明 + 出典 |
| `src/components/SettingsCard.tsx` | 粉量/味わい/濃度/器具/挽き目/湯温/備考 |
| `src/components/TimerCard.tsx` | タイマー本体 + 操作 + サウンド設定 + タイムライン |
| `src/components/SegSlider.tsx` | セグメント型スライダー（味わい/濃度/サウンドモード） |
| `src/components/Dialogs.tsx` | 確認ダイアログ + 味わい説明ダイアログ |
| `src/index.css` | 全スタイル（CSS 変数テーマ、単一ファイル） |
| `manifest.json` | PWA マニフェスト（**プロジェクト直下**） |
| `public/sw.js` | Service Worker（precache + cache-first） |
| `public/credits.html` | 静的クレジットページ |
| `vite.config.ts` | 単一ファイル化 + manifest 配置特例 |
| `.github/workflows/deploy.yml` | GitHub Pages デプロイ |

---

_初版はコミット `64d6b04`（音声ガイダンス TTS 追加）時点で作成。以後、起動音の合成音化・手動 audit スクリプトの撤去・**タイマーの実時計化（P1 キャッチアップ）** を反映済みで、現行 `main` の実装と整合。_
