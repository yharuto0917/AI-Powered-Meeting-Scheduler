# Firebase Emulator 使用ガイド

Firebase Emulatorを使用することで、実際のFirebaseプロジェクトに接続せずにローカル開発ができます。

## 🚀 Emulatorの起動方法

### オプション1: Emulator + Dev Server 同時起動
```bash
npm run dev:emulator
```

このコマンドは以下を同時に実行します：
- Firebase Emulator (Auth + Firestore)
- Next.js 開発サーバー
- 環境変数を Emulator 用に自動切り替え

### オプション2: 手動起動
```bash
# 1. Emulator環境変数を適用
cp .env.local.emulator .env.local

# 2. Emulatorを起動
npm run emulator

# 3. 別ターミナルで開発サーバーを起動
npm run dev
```

## 📱 アクセスURL

- **アプリケーション**: http://localhost:3001
- **Firebase Emulator UI**: http://localhost:4000
- **Authentication Emulator**: http://localhost:9099
- **Firestore Emulator**: http://localhost:8080

## ✨ Emulatorの利点

### 🔒 **セキュリティ**
- 実際のFirebaseプロジェクトにアクセスしない
- テストデータが本番環境に影響しない

### 🏃 **高速開発**
- インターネット接続不要
- データのリセットが簡単
- リアルタイムでの動作確認

### 💰 **コスト削減**
- Firebase使用料金が発生しない
- 無制限のテストが可能

## 🛠 Emulator機能テスト

### 1. 認証テスト
```bash
# Emulator UIでユーザーを作成
# http://localhost:4000 → Authentication タブ
```

### 2. Firestoreテスト
```bash
# データの作成・読み書きをテスト
# リアルタイムでデータ変更を確認
```

### 3. データリセット
Emulatorを停止して再起動すると、全てのデータがリセットされます。

## 🔧 トラブルシューティング

### Emulatorが起動しない場合
```bash
# Firebase CLIのログイン確認
npx firebase login

# プロジェクトの関連付け確認  
npx firebase projects:list
```

### ポート競合の場合
`firebase.json`のemulator設定でポートを変更：
```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 }
  }
}
```

### 接続エラーの場合
1. `.env.local`が正しく設定されているか確認
2. ブラウザの開発者ツールでコンソールエラーを確認
3. Emulatorが正常に起動しているかチェック

## 📊 データの永続化

### エクスポート (データ保存)
```bash
npx firebase emulators:export ./emulator-data
```

### インポート (データ復元)
```bash
npx firebase emulators:start --import=./emulator-data
```

## 🔄 本番環境への切り替え

開発完了後、本番環境に戻すには：
```bash
# 元の環境変数に戻す
cp .env.example .env.local
# 実際のFirebase認証情報を設定
```

## 📈 パフォーマンス

Emulatorは本番環境より高速ですが、一部の動作が異なる場合があります：
- セキュリティルールの適用タイミング
- ネットワーク遅延の有無
- 大量データでの処理速度

## 💡 開発のベストプラクティス

1. **機能開発**: Emulatorで開発・テスト
2. **統合テスト**: 本番環境で最終確認
3. **データ設計**: Emulatorで構造を検証
4. **セキュリティ**: ルールをEmulatorで事前テスト

Emulatorを活用して、安全で効率的な開発を行いましょう！