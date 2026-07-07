# Spellwars

Vite + React製。ホットシート対戦とFirebase Realtime Databaseを使ったオンライン対戦の両方に対応。

## セットアップ

```bash
npm install
```

### 1. Firebaseプロジェクトの準備

以前の移行チェックリスト通り、生きてるGoogleアカウントで:

1. Firebaseコンソールで新規プロジェクト作成(Google Analyticsはオフでいい)
2. Realtime Database を有効化 → ロケーションは **asia-southeast1**
3. Authentication → **Anonymous** を有効化
4. セキュリティルールを以下にする(ルール→ロックモードのまま、匿名認証済みなら読み書き可):

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

5. プロジェクトの設定 → 全般 → マイアプリ でWebアプリを追加し、表示された設定値を `src/firebase.js` の `firebaseConfig` に貼り付ける(`YOUR_API_KEY` などのプレースホルダーを差し替える)

### 2. ローカルで動作確認

```bash
npm run dev
```

### 3. デプロイ(Vercel)

```bash
npm run build
```

GitHubリポジトリにpushして、Vercelでそのリポジトリをインポートするだけ。ビルドコマンドは `npm run build`、出力ディレクトリは `dist`。

## 構成

- `src/Spellwars.jsx` — ゲーム本体(呪文データ・対戦エンジン・UI・オンライン同期すべて)
- `src/firebase.js` — Firebase初期化(匿名認証 + Realtime Database)
- ホットシートモードはFirebase不要。オンラインモードのみFirebaseの設定が必要
