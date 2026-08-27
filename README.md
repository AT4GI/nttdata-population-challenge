# NTT DATA人口ブラックジャック MVP

NTT DATA人口ブラックジャックは、日本全国の市区町村人口を使ってTARGETに近づくことを目指す、ブラックジャック形式の2〜10人対戦ゲームです。

このリポジトリでは、ハッカソン向けの検証用MVPとして、まず「複数人が同じ部屋に入り、Firebase Realtime Database経由でターン制対戦できるか」を確認することを目的にしています。市区町村データは総務省の公式統計（全国2,220件）で、Firebaseプロジェクト設定値は後から差し込める構成です。

## アプリの概要・目的

プレイヤーは、次に引く候補として表示される市区町村名と都道府県名だけを見て、その人口を予想しながらHITまたはSTANDを選びます。

HITすると、その市区町村の人口が初めて公開され、自分の現在人口に加算されます。TARGETを超えずに、よりTARGETへ近づいたプレイヤーが勝利します。

このMVPの主な目的は次の通りです。

- Firebase Realtime Databaseで2〜10人対戦の同期が成立するか確認する
- 部屋IDによる作成・参加フローを検証する
- 1人でもCPUを加えてターン制対戦できるか確認する
- HIT / STAND / BUST / JUST / 勝敗判定までのゲームの核を確認する
- Firebase CLIやローカルへの特別なインストールなしで、Web SDK CDNから動かせる構成にする

## ゲームルール

### TARGET

参加者全員が同じTARGETを使います。部屋を作る人がTARGETを選び、ゲーム開始後はその部屋のTARGETで固定されます。CPU戦ではTARGETを選ぶか、ランダムで選ばせることができます。

現在選べるTARGETは次の6つです。

| TARGET | 人数 | 時点 | 難易度 |
| --- | ---: | --- | --- |
| NTT DATAグループ社員数 | 206,900 | 2026年6月30日時点 | 標準 |
| 豊洲駅 2社合算乗降客数 | 235,989 | 2023年度 | 標準 |
| NTTグループ全社員数 | 344,196 | 2026年3月31日時点 | 高め |
| 東京都江東区人口 | 544,929 | 2026年8月1日時点 | 高め |
| NTT株式会社の株主数 | 3,386,781 | 2026年6月30日時点 | 特別 |
| NTT東日本 加入電話（住宅用）契約数 | 3,606,000 | 2026年3月末現在 | 特別 |

CPU戦の「ランダム」は、通常のゲームテンポを保つため、特別TARGET（NTT株式会社の株主数、NTT東日本 加入電話（住宅用）契約数）を除いた4つから選びます。

### HIT

HITを押すと、表示中の市区町村を獲得します。

- HIT前に人口は表示されません
- HIT後に人口が公開されます
- 公開された人口が現在人口へ加算されます
- TARGETを超えていなければ、次の候補市区町村が表示されます

### STAND

STANDを押すと、その時点の現在人口を最終人口として確定します。一度STANDした後に再びHITすることはできません。

### BUST

HITした結果、現在人口がTARGETを超えた場合はBUSTです。そのプレイヤーのゲームは終了します。

### JUST

現在人口がTARGETと完全一致した場合はJUSTです。そのプレイヤーのゲームは終了します。

### 勝敗判定

全員が終了した時点で勝敗を判定します。

- JUSTしたプレイヤーが1人だけ: そのプレイヤーの勝利
- JUSTしたプレイヤーが複数: 引き分け
- BUSTしていないプレイヤーの中でTARGETとの差が最小: そのプレイヤーの勝利
- TARGETとの差が同じプレイヤーが複数: 引き分け
- 全員BUST: 引き分け

### 対戦形式

ターン制です。ゲーム開始時点の参加者順で1人ずつHIT / STANDを選びます。STAND / BUST / JUST済みのプレイヤーは以降のターンをスキップします。ゲーム開始後の途中参加はできません。

### CPU戦

1人で遊ぶ場合は、CPUを1〜4人加えてすぐにゲームを開始できます。CPUも通常の参加者と同じターン順で行動し、自分の番になると少し待ってから自動でHITまたはSTANDを選びます。

CPUは人数に応じて自動で強さが調整されます。CPUが1人のときは少し強め、CPUが2人以上のときは1人だけやや強めで、残りは弱めです。

## 現在実装済みの機能

- 表示名入力
- 部屋IDの自動生成
- 部屋IDによる参加
- TARGET選択
- CPU戦の作成
- 2〜10人参加後、全員が「準備OK」を押すとホストがゲーム開始できる
- CPU1〜4人との即時対戦開始
- 各プレイヤーに別々の候補市区町村を表示
- 候補表示時は市区町村名と都道府県名のみ表示
- HIT後の人口公開と現在人口への加算
- STAND
- BUST
- JUST
- HIT回数表示
- 参加者の表示名、現在人口、状態、HIT回数のリアルタイム同期
- 現在ターンの表示
- CPUの自動HIT / STAND
- 全員終了後の勝敗表示
- 結果画面のランキング表示
- 部屋の再戦機能（ホスト操作、同じ参加者・TARGETで再戦）
- 結果画面からの戦績共有リンク発行（試合ごとに固定のリンクで、再戦しても内容は変わらない）
- 対戦中のループBGM、効果音（HIT / STAND / BUST / JUST / 勝敗）とミュート切り替え
- Firebase設定値の分離
- Firebase設定未入力、接続失敗、権限エラーの画面表示

## 使用技術

- HTML
- CSS
- JavaScript ES Modules
- Firebase Web SDK CDN
- Firebase Realtime Database

Firebase CLIは前提にしていません。

## ファイル構成

- `index.html`: 画面構造
- `styles.css`: 画面デザイン
- `app.js`: ゲーム処理とFirebase連携
- `data/municipalities/`: 市区町村人口カードのデータ
- `data/municipalities/municipalities.csv`: 収集・確認用の市区町村人口CSV
- `data/municipalities/municipalities.js`: アプリが読み込む人口カードのデータ（排出確率はTARGETから自動計算するため、このファイルには含まない）
- `config-loader.js`: Firebase設定の実行時読み込み
- `firebase-config.example.js`: Firebase設定ファイルのテンプレート
- `firebase-config.js`: Firebaseプロジェクト設定（ローカル作成、Git管理対象外）
- `database.rules.example.json`: Realtime Database検証用Rulesテンプレート
- `firebase.json`: Firebase Hosting用の静的サイト設定
- `.github/workflows/pages.yml`: GitHub Pages用のデプロイワークフロー
- `README.md`: プロジェクト説明
- `AGENTS.md`: Codex向け開発ルール

## 起動方法

### 1. Firebase設定ファイルをローカルで作成する

Firebase ConsoleでWebアプリを作成し、表示された設定値を使って `firebase-config.js` を作成します。

`firebase-config.js` はGit管理対象外です。Firebase Webアプリ設定値はブラウザに配信される値ですが、このプロジェクトでは秘密情報と同じ扱いにし、リポジトリへコミットしません。

PowerShell:

```powershell
Copy-Item firebase-config.example.js firebase-config.js
```

macOS/Linux:

```bash
cp firebase-config.example.js firebase-config.js
```

作成した `firebase-config.js` のプレースホルダーをFirebase Consoleの値に差し替えます。

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

`databaseURL` はRealtime DatabaseのURLです。Firestoreではありません。

### 2. Realtime Databaseを作成する

Firebase ConsoleでRealtime Databaseを作成します。

検証用にすぐ動かす場合は、Rulesを一時的に以下のようにできます。このリポジトリには同じ内容のテンプレートとして `database.rules.example.json` も含めています。

```json
{
  "rules": {
    "rooms": {
      ".read": true,
      ".write": true
    },
    "results": {
      ".read": true,
      ".write": true
    }
  }
}
```

`results` は、結果画面から発行する戦績共有リンク用のデータです。試合が終わった瞬間に `rooms/{roomId}` とは別ノードへ結果のスナップショットを複製保存するため、再戦して `rooms` 側の内容が上書きされても、共有済みのリンクが指す結果は変わりません。

このルールは検証専用です。URLを知っている人が `rooms` / `results` 配下を読み書きできるため、公開環境や長期利用では使わないでください。

### 3. ローカルサーバーを起動する

`index.html` をダブルクリックして開く方法は使わないでください。JavaScript ModulesとFirebase SDKを使うため、ローカルサーバーまたは公開URLから開く必要があります。

Pythonがある場合:

```bash
python -m http.server 5173
```

ブラウザで以下を開きます。

```text
http://localhost:5173
```

### 4. 2〜10人プレイを試す

同じPCで試す場合は、別ブラウザまたはシークレットウィンドウで同じURLを開きます。

同じWi-Fi内の別端末で試す場合は、自分のPCのIPアドレスを使います。

```text
http://自分のPCのIPアドレス:5173
```

WindowsでIPアドレスを確認する場合:

```powershell
ipconfig
```

離れた場所にいる人と試す場合は、Firebase Hosting、GitHub Pages、Vercel、Netlifyなどに静的ファイルとして公開してください。公開後は、参加者全員が同じ公開URLを開き、同じRealtime Databaseを参照することで対戦できます。

CPU戦を試す場合は、トップ画面で「CPU戦をする」を選びます。表示名、CPU人数、TARGETを選んで「CPU戦を始める」を押すと、すぐにゲーム画面へ移動します。TARGETをランダムにした場合は、特別TARGETを除いた候補から自動で選ばれます。

## 市区町村人口データ

人口カードは `data/municipalities/` に分離しています。全国の市区町村2,220件（総務省「住民基本台帳に基づく人口、人口動態及び世帯数調査」令和8年1月1日現在）を収録しています。政令指定都市の区や東京都特別区も個別の1件として含まれます。

`category` は対戦画面でのカード枠の色・記号（見た目）を決める人口帯で、下記の排出確率の計算には使いません。

| category | 人口帯 |
| --- | --- |
| `village_town` | 5万人未満 |
| `small_city` | 5万人以上10万人未満 |
| `mid_city` | 10万人以上20万人未満 |
| `large_city` | 20万人以上30万人未満 |
| `major_city` | 30万人以上70万人未満 |
| `ordinance_city` | 70万人以上 |

### 排出確率の仕組み

TARGETごとに排出表を手作りするのではなく、市区町村1件ごとの人口とTARGETとの近さから毎回自動計算しています。

1. 基準値 = (TARGET − 現在人口) ÷ 残りターン数の目安（既定3ターン）を計算する
2. 基準値に人口が近い市区町村ほど引きやすくなる（対数距離に対する指数関数で減衰）
3. 「現在人口に足してもTARGETを超えない人口」から92%、「超えてしまう人口」から8%の確率で選ぶ

現在人口とHIT回数から基準値を毎ターン計算し直すため、序盤は大きめ、終盤は細かい人口のカードが出やすくなります。新しいTARGETを数値だけ追加しても、この計算式がそのまま働くので、TARGETごとの排出比率を個別に作り直す必要はありません。事前画面の「人口カード構成」も、この計算からTARGETごとに毎回キリのいい数字で組み立て直しています。表示上四捨五入して0%になる帯が末尾に連続する場合は、1件ずつ並べず「◯万人以上」の1行にまとめて表示します。

### 人口データの更新方法

`data/municipalities/municipalities.csv` が収集・確認用の元データ、`data/municipalities/municipalities.js` がアプリの読み込む配信用データです。より新しい時点の統計に更新する場合は、同じ列構成（詳細は `data/municipalities/README.md`）でCSVを作り直し、`municipalities.js` の `MUNICIPALITIES` 配列を差し替えてください。排出確率はTARGETの数値と各市区町村の `population` から自動計算されるため、データを差し替えても排出比率を個別に調整する必要はありません。

CSVでは最低限、次の列を埋めます。

```csv
id,prefecture,municipality,population,category,populationDate,sourceName,sourceUrl
```

`category` は手で入れてもよいですが、最終的には `population` から自動分類できます。データ収集時は、人口、時点、出典URLを正確に残すことを優先してください。

## 公開方法

このMVPは静的HTML/CSS/JavaScriptだけで動くため、静的ホスティングにそのまま公開できます。Firebase設定値はコードに直書きせず、公開環境のSecretsまたはローカルの未追跡ファイルから注入してください。

公開前に、Firebase側で次の準備が必要です。

- Firebase Webアプリを作成し、Webアプリ設定値を取得する
- Realtime Databaseを作成する
- 検証用Rulesを設定し、`rooms` / `results` 配下を読み書きできる状態にする
- 公開先で `firebase-config.js` が生成または配置されるようにする

### GitHub Pagesで公開する

このリポジトリにはGitHub ActionsのPagesデプロイ設定を含めています。現在の構成では、GitHub Pagesが最もそのまま使いやすい公開方法です。

1. GitHubリポジトリの Settings > Pages で Source を `GitHub Actions` にします。
2. Settings > Secrets and variables > Actions に次のRepository secretsを登録します。

```text
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_DATABASE_URL
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
```

3. `main` ブランチへpushするか、Actionsから `Deploy GitHub Pages` を手動実行します。

ワークフローはデプロイ時にだけ `firebase-config.js` を生成し、`index.html`、`styles.css`、`app.js`、`config-loader.js`、`bg-sky.png` と一緒にPagesへアップロードします。Secretsが不足している場合、デプロイは失敗します。

GitHub Pagesで公開した場合も、Firebase Realtime Database RulesはFirebase Console側で設定してください。GitHub Actions SecretsにはFirebase Webアプリ設定値だけを入れ、サービスアカウント鍵や秘密鍵は入れないでください。

### Firebase Hostingで公開する

Firebase CLIを使える場合は、ローカルに `firebase-config.js` を作成した状態で以下を実行します。

```bash
firebase login
firebase use --add
firebase deploy --only hosting
```

`firebase.json` はこのリポジトリ直下を静的サイトとして配信し、`.git`、`.github`、`sources/`、README、AGENTSなどはデプロイ対象から除外します。`firebase-config.js` はGitには入れず、デプロイ時にだけローカルから含めます。

Firebase Hostingで配信する場合も、検証用RulesはFirebase Consoleで設定するか、`database.rules.example.json` の内容を確認したうえでFirebase CLIから別途反映してください。検証後は必ず本番向けRulesへ置き換えてください。

### 複数人で試すときの確認ポイント

- 1人目が公開URLを開き、表示名を入れて「部屋を作る」を押す
- 表示された部屋IDを他の参加者に共有する
- 2〜10人が同じ公開URLで表示名と部屋IDを入れて参加する
- ホスト側に「ゲーム開始」が表示されたら開始する
- 現在の番になった参加者だけがHIT / STANDできることを確認する
- STAND / BUST / JUST済みの参加者がターンスキップされることを確認する
- 全員が終了し、勝敗表示まで同期されることを確認する

### CPU戦で試すときの確認ポイント

- トップ画面で「CPU戦をする」を選ぶ
- 表示名、CPU人数、TARGETを選び、「CPU戦を始める」を押す
- CPUが参加者一覧に表示されることを確認する
- CPUの番になったら、約1秒後に自動でHIT / STANDされることを確認する
- 全員が終了し、WIN / LOSE / DRAWが表示されることを確認する

### 戦績共有リンクを試すときの確認ポイント

- 対戦を1つ終わらせ、結果画面で「共有リンクをコピー」を押す
- コピーしたURL（`?share=...` 付き）を別タブや別ブラウザで開き、結果（TARGET、ランキング）が表示されることを確認する
- 元の部屋でホストが「もう一戦する」を押して再戦しても、既にコピーした共有リンクの内容が変わらないことを確認する
- 存在しない `share` パラメータでアクセスした場合に「見つかりませんでした」の表示になることを確認する

## 今後実装したい機能

- TARGETをNTT DATA公式情報に基づく値へ更新
- 部屋の削除または期限切れ処理
- プレイヤー離脱時の処理
- Firebase Authenticationによる簡易認証
- Realtime Database Rulesの本番向け制御
- 対戦履歴の保存
- 市区町村の地図表示
- スマートフォンでの操作性改善
- UIデザインのハッカソン発表向けブラッシュアップ

## 現在わかっている課題

- `firebase-config.js` をローカル作成するか、GitHub Actions Secretsからデプロイ時に生成しないと部屋を作れない
- `localhost` は自分のPC専用なので、そのままでは別の人と試せない
- 現在のRealtime Database Rules例は検証用であり、本番利用には危険
- 部屋IDの衝突チェックはまだ入っていない
- 部屋に入れる人数はアプリ側で最大10人に制限しているが、セキュリティルールでは制限していない
- ブラウザのセッション情報でプレイヤーIDを管理しているため、厳密な本人確認はない
- 同時操作時の競合制御はMVP水準で、厳密なトランザクション処理ではない
- 自動テストは未整備
- 戦績共有リンク（`results/{shareId}`）は無期限保存で、削除・期限切れの仕組みは未実装（`rooms` の削除処理と合わせて今後対応）
