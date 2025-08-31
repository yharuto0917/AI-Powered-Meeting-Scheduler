# Meeting Scheduler - AI-powered Meeting Scheduler

React/Next.js、Firebase、Gemini AIで構築されたインテリジェントな会議スケジュール調整アプリケーションです。このアプリを使用すると、ユーザーは会議を作成し、スケジュール調整用のリンクを共有でき、AIが参加者の空き時間に基づいて最適な会議時間を提案します。

## 特徴

- 🤖 **AIによるスケジュール調整**: Gemini AIが参加者の空き時間を分析し、最適な会議時間を提案します
- 📅 **Googleカレンダー連携**: 既存のスケジュールをインポートして、多忙な時間を自動的にブロックします
- 🔗 **簡単な共有**: 会議リンクを参加者と共有 - 参加にアカウントは不要です
- 🔐 **安全な認証**: Firebase Authenticationによるメールリンクサインイン
- 📱 **レスポンシブデザイン**: デスクトップおよびモバイルデバイスで動作します
- ⚡ **リアルタイム更新**: Firebase Firestoreを使用したライブ更新

## 技術スタック

### フロントエンド
- **Next.js 15** と TypeScript
- **ShadcnUI** (UIコンポーネント)
- **Tailwind CSS** (スタイリング)
- **Firebase SDK** (認証とデータベース)

### バックエンド
- **Firebase Cloud Functions** (Python)
- **Firebase Firestore** (データストレージ)
- **Gemini AI** (インテリジェントなスケジュール調整)
- **Google Calendar API** (カレンダー連携)

## プロジェクト構成

```
meeting-app/
├── client/                     # Next.js フロントエンド
│   ├── app/                   # Next.js App Router
│   │   ├── api/              # APIルート
│   │   ├── auth/             # 認証ページ
│   │   ├── meeting/          # 会議ページ
│   │   └── ...
│   ├── components/           # Reactコンポーネント
│   │   ├── ui/              # ShadcnUIコンポーネント
│   │   └── meeting/         # 会議関連コンポーネント
│   └── lib/                 # ユーティリティ関数
├── functions/                 # Firebase Cloud Functions (Python)
│   ├── main.py             # エントリーポイント
│   ├── future/             # 個別の関数ハンドラ
│   └── requirements.txt    # Python依存関係
├── firebase.json            # Firebase設定
├── firestore.rules         # Firestoreセキュリティルール
└── firestore.indexes.json  # Firestoreインデックス
```

## セットアップ手順

### 前提条件

- Node.js 18+ と npm
- Python 3.11+
- Firebase CLI
- Google Cloudアカウント

### 1. クローンと依存関係のインストール

```bash
git clone <repository-url>
cd meeting-app
npm install
```

### 2. Firebaseプロジェクトのセットアップ

1. https://console.firebase.google.com で新しいFirebaseプロジェクトを作成します
2. 次のサービスを有効にします:
   - Authentication (メール/パスワード および メールリンク)
   - Firestore Database
   - Cloud Functions
   - App Hosting (デプロイ用、任意)

3. Firebase CLIをインストールします:
```bash
npm install -g firebase-tools
firebase login
firebase init
```

### 3. 環境変数の設定

ルートディレクトリに `.env.local` ファイルを作成します:

```env
# Firebase設定
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Functions設定
FIREBASE_FUNCTIONS_URL=https://your_region-your_project_id.cloudfunctions.net

# Google AI設定
GOOGLE_AI_API_KEY=your_gemini_api_key

# Google Calendar API (任意)
GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_oauth_client_secret
```

### 4. 必要なAPIキーの取得

#### Gemini AI APIキー
1. https://aistudio.google.com/app/apikey にアクセスします
2. 新しいAPIキーを作成します
3. 環境変数に `GOOGLE_AI_API_KEY` として追加します

#### Google Calendar API (任意)
1. Google Cloud Consoleにアクセスします
2. Google Calendar APIを有効にします
3. OAuth 2.0認証情報を作成します
4. クライアントIDとシークレットを環境変数に追加します

### 5. Firebaseサービスのデプロイ

```bash
# Firestoreルールとインデックスのデプロイ
firebase deploy --only firestore

# Cloud Functionsのデプロイ
firebase deploy --only functions

# ホスティングのデプロイ (Firebase Hostingを使用する場合)
npm run build
firebase deploy --only hosting
```

### 6. 開発サーバーの実行

```bash
npm run dev
```

アプリケーションは http://localhost:3000 で利用可能になります

## 使い方

### 会議の作成

1. ホームページにアクセスします
2. "Create New Meeting"をクリックします
3. 会議の詳細を入力します:
   - 会議のタイトルと説明
   - 会議候補日の日付範囲
   - 時間範囲 (各日の開始/終了時間)
   - 回答期限
4. "Create Meeting"をクリックします
5. 生成された会議URLを参加者と共有します

### 会議への参加

1. 主催者から共有された会議リンクを開きます
2. メールでサインインするか、ゲストとして参加します (任意)
3. 名前を入力します
4. 各時間スロットで以下を選択します:
   - ✓ 利用可能 (緑)
   - △ 多分利用可能 (黄) - コメントを追加できます
   - ✗ 利用不可 (赤)
5. 空き時間を保存します

### AIによるスケジュール調整

1. 参加者が空き時間を提出した後、主催者はAI提案を実行できます
2. Gemini AIがすべての回答を分析し、最適な会議時間を提案します
3. AIは以下を考慮します:
   - 最大限の参加者の空き時間
   - コメントと好み
   - 主催者の指示
4. 会議のステータスが "confirmed" に変わり、選択された日時が表示されます

### Googleカレンダー連携 (任意)

1. アプリケーションにサインインします
2. "Import from Google Calendar"をクリックします
3. カレンダーへのアクセスを承認します
4. 忙しい時間は自動的に利用不可としてマークされます

## デプロイ

### Firebase App Hosting

1. アプリケーションをビルドします:
```bash
npm run build
```

2. Firebaseにデプロイします:
```bash
firebase deploy
```

### カスタムデプロイ

アプリケーションはNext.jsをサポートする任意のプラットフォームにデプロイできます:
- Vercel
- Netlify
- AWS Amplify
- Google Cloud Run

選択したプラットフォームで環境変数を設定してください。

## セキュリティ機能

- **認証**: 安全なメールリンク認証
- **認可**: 会議作成者は管理者権限を持ちます
- **データ保護**: Firestoreセキュリティルールが不正アクセスを防ぎます
- **入力検証**: すべてのAPIエンドポイントでサーバーサイドの検証を行います

## APIエンドポイント

### 会議管理
- `POST /api/meetings` - 新しい会議の作成
- `GET /api/meetings/[id]` - 会議詳細の取得
- `PUT /api/meetings/[id]` - 会議の更新 (主催者のみ)

### 空き時間
- `POST /api/meetings/[id]/availability` - 参加者の空き時間を提出

### AI機能
- `POST /api/meetings/[id]/ai-suggestion` - AIによるスケジュール調整の実行 (主催者のみ)

## コントリビューション

1. リポジトリをフォークします
2. フィーチャーブランチを作成します
3. 変更を加えます
4. 十分にテストします
5. プルリクエストを送信します

## ライセンス

このプロジェクトはMITライセンスの下でライセンスされています - 詳細はLICENSEファイルを参照してください。

## サポート

問題や質問については、GitHubリポジトリでIssueを作成してください。
