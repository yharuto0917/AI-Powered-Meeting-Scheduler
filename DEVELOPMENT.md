# 開発環境セットアップガイド

## 🚀 クイックスタート

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを編集して、実際のFirebaseプロジェクトの認証情報を設定してください：

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com  
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Firebaseプロジェクトの設定

1. [Firebase Console](https://console.firebase.google.com) でプロジェクトを作成
2. **Authentication** を有効化
   - Sign-in method で "Email link (passwordless sign-in)" を有効にする
3. **Firestore Database** を作成
   - テストモードで開始（後でセキュリティルールを適用）
4. プロジェクト設定から構成オブジェクトをコピーして `.env.local` に貼り付け

### 4. 開発サーバーの起動
```bash
npm run dev
```

アプリケーションは http://localhost:3001 で利用できます。

## 📝 機能テスト手順

### 1. ミーティング作成のテスト
1. ホームページで「Create New Meeting」をクリック
2. ミーティング詳細を入力：
   - タイトル: "チームミーティング"
   - 説明: "週次定例会議"
   - 開始日・終了日を選択
   - 時間帯を設定（例：9:00-18:00）
   - 回答期限を設定
3. 「Create Meeting」をクリック

### 2. 参加者としてのテスト
1. 生成されたミーティングURLにアクセス
2. 名前を入力
3. 各時間スロットに対して可否を選択：
   - ✓ 参加可能（緑）
   - △ 条件付き参加可能（黄）- コメント入力可能
   - ✗ 参加不可（赤）
4. 「Save Availability」をクリック

### 3. エラーハンドリングの確認
- Firebase未設定の場合：「Firebase is not configured」エラーが表示される
- 不正な入力の場合：適切なバリデーションエラーが表示される

## 🔧 トラブルシューティング

### "Firebase is not configured" エラー
- `.env.local` の環境変数が正しく設定されているか確認
- Firebaseプロジェクトが作成され、必要なサービスが有効化されているか確認

### "Cannot read properties of null" エラー
- Firebase認証情報が正しいか確認  
- ブラウザの開発者ツールでネットワークエラーがないか確認

### ポート3000が使用中の場合
- アプリは自動的に3001ポートを使用します
- `.env.local` の `NEXT_PUBLIC_AUTH_REDIRECT_URL` も適切なポートに設定してください

## 🎯 本格運用前の設定

### 1. セキュリティルールの適用
```bash
firebase deploy --only firestore:rules
```

### 2. Cloud Functionsのデプロイ
```bash
firebase deploy --only functions
```

### 3. Gemini API設定
- [Google AI Studio](https://aistudio.google.com/app/apikey) でAPIキーを取得
- `.env.local` の `GOOGLE_AI_API_KEY` に設定

## 📚 その他のリソース

- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)  
- [ShadcnUI Documentation](https://ui.shadcn.com)