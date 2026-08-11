# NTT DATA人口ブラックジャック MVP

NTT DATA人口ブラックジャックは、日本全国の市区町村人口を使ってTARGETに近づくことを目指す、ブラックジャック形式の2人対戦ゲームです。

このリポジトリでは、ハッカソン向けの検証用MVPとして、まず「2人が同じ部屋に入り、Firebase Realtime Database経由でリアルタイムに対戦できるか」を確認することを目的にしています。現在の市区町村データは仮データで、Firebaseプロジェクト設定値は後から差し込める構成です。

## アプリの概要・目的

プレイヤーは、次に引く候補として表示される市区町村名と都道府県名だけを見て、その人口を予想しながらHITまたはSTANDを選びます。

HITすると、その市区町村の人口が初めて公開され、自分の現在人口に加算されます。TARGETを超えずに、よりTARGETへ近づいたプレイヤーが勝利します。

このMVPの主な目的は次の通りです。

- Firebase Realtime Databaseで2人対戦の同期が成立するか確認する
- 部屋IDによる作成・参加フローを検証する
- HIT / STAND / BUST / JUST / 勝敗判定までのゲームの核を確認する
- Firebase CLIやローカルへの特別なインストールなしで、Web SDK CDNから動かせる構成にする

## ゲームルール

### TARGET

2人とも同じTARGETを使います。現在のMVPでは `200,000` 人をTARGETにしています。

将来的には、NTT DATAグループ社員数など、NTT DATAに関連する人数をTARGETとして使う想定です。

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

2人とも終了した時点で勝敗を判定します。

- 片方だけBUST: BUSTしていないプレイヤーの勝利
- 両方BUST: 引き分け
- 両方BUSTしていない: TARGETとの差が小さいプレイヤーの勝利
- TARGETとの差が同じ: 引き分け
- 片方だけJUST: JUSTしたプレイヤーの勝利
- 両方JUST: 引き分け

### 対戦形式

ターン制ではありません。2人はそれぞれ自分のタイミングでHIT / STANDを選びます。

## 現在実装済みの機能

- 表示名入力
- 部屋IDの自動生成
- 部屋IDによる参加
- 2人参加後、ホストがゲーム開始
- 各プレイヤーに別々の候補市区町村を表示
- 候補表示時は市区町村名と都道府県名のみ表示
- HIT後の人口公開と現在人口への加算
- STAND
- BUST
- JUST
- HIT回数表示
- 相手の表示名、現在人口、状態、HIT回数のリアルタイム同期
- 両者終了後の勝敗表示
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
- `firebase-config.js`: Firebaseプロジェクト設定
- `README.md`: プロジェクト説明
- `AGENTS.md`: Codex向け開発ルール

## 起動方法

### 1. Firebase設定を入れる

Firebase ConsoleでWebアプリを作成し、表示された設定値を `firebase-config.js` に貼り付けます。

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

検証用にすぐ動かす場合は、Rulesを一時的に以下のようにできます。

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

このルールは検証専用です。公開環境や長期利用では使わないでください。

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

### 4. 2人プレイを試す

同じPCで試す場合は、別ブラウザまたはシークレットウィンドウで同じURLを開きます。

同じWi-Fi内の別端末で試す場合は、自分のPCのIPアドレスを使います。

```text
http://自分のPCのIPアドレス:5173
```

WindowsでIPアドレスを確認する場合:

```powershell
ipconfig
```

離れた場所にいる人と試す場合は、Firebase Hosting、GitHub Pages、Vercel、Netlifyなどに静的ファイルとして公開してください。

## 今後実装したい機能

- 実データの全国市区町村人口データへの差し替え
- TARGETをNTT DATA公式情報に基づく値へ更新
- TARGETを複数から選べる機能
- 部屋の再戦機能
- 部屋の削除または期限切れ処理
- プレイヤー離脱時の処理
- Firebase Authenticationによる簡易認証
- Realtime Database Rulesの本番向け制御
- 対戦履歴の保存
- 結果画面の演出
- 市区町村の地図表示
- スマートフォンでの操作性改善
- UIデザインのハッカソン発表向けブラッシュアップ

## 現在わかっている課題

- `firebase-config.js` にFirebase設定値を入れないと部屋を作れない
- `localhost` は自分のPC専用なので、そのままでは別の人と試せない
- 現在のRealtime Database Rules例は検証用であり、本番利用には危険
- 市区町村データは仮データで、人口値も正式な出典に基づくものではない
- 部屋IDの衝突チェックはまだ入っていない
- 部屋に入れる人数はアプリ側で制限しているが、セキュリティルールでは制限していない
- ブラウザのセッション情報でプレイヤーIDを管理しているため、厳密な本人確認はない
- 同時操作時の競合制御はMVP水準で、厳密なトランザクション処理ではない
- 公開URLで試すためのホスティング設定はまだ含めていない
- 自動テストは未整備
