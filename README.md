# Meeting Scheduler - AI-Powered Scheduling App

An intelligent meeting scheduling application built with React/Next.js, Firebase, and Gemini AI. This app allows users to create meetings, share scheduling links, and uses AI to suggest optimal meeting times based on participant availability.

## Features

- 🤖 **AI-Powered Scheduling**: Gemini AI analyzes participant availability to suggest optimal meeting times
- 📅 **Google Calendar Integration**: Import existing schedules to automatically block busy times
- 🔗 **Easy Sharing**: Share meeting links with participants - no account required to participate
- 🔐 **Secure Authentication**: Firebase Authentication with email link sign-in
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Real-time Updates**: Live updates using Firebase Firestore

## Tech Stack

### Frontend
- **Next.js 15** with TypeScript
- **ShadcnUI** for UI components
- **Tailwind CSS** for styling
- **Firebase SDK** for authentication and database

### Backend
- **Firebase Cloud Functions** (Python)
- **Firebase Firestore** for data storage
- **Gemini AI** for intelligent scheduling
- **Google Calendar API** for calendar integration

## Project Structure

```
meeting-app/
├── client/                     # Next.js frontend
│   ├── app/                   # Next.js app router
│   │   ├── api/              # API routes
│   │   ├── auth/             # Authentication pages
│   │   ├── meeting/          # Meeting pages
│   │   └── ...
│   ├── components/           # React components
│   │   ├── ui/              # ShadcnUI components
│   │   └── meeting/         # Meeting-specific components
│   └── lib/                 # Utility functions
├── functions/                 # Firebase Cloud Functions (Python)
│   ├── main.py             # Entry point
│   ├── future/             # Individual function handlers
│   └── requirements.txt    # Python dependencies
├── firebase.json            # Firebase configuration
├── firestore.rules         # Firestore security rules
└── firestore.indexes.json  # Firestore indexes
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Firebase CLI
- Google Cloud account

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd meeting-app
npm install
```

### 2. Firebase Project Setup

1. Create a new Firebase project at https://console.firebase.google.com
2. Enable the following services:
   - Authentication (Email/Password and Email Link)
   - Firestore Database
   - Cloud Functions
   - App Hosting (optional, for deployment)

3. Install Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase init
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Functions Configuration
FIREBASE_FUNCTIONS_URL=https://your_region-your_project_id.cloudfunctions.net

# Google AI Configuration
GOOGLE_AI_API_KEY=your_gemini_api_key

# Google Calendar API (optional)
GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_oauth_client_secret
```

### 4. Get Required API Keys

#### Gemini AI API Key
1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Add it to your environment variables as `GOOGLE_AI_API_KEY`

#### Google Calendar API (Optional)
1. Go to Google Cloud Console
2. Enable the Google Calendar API
3. Create OAuth 2.0 credentials
4. Add client ID and secret to environment variables

### 5. Deploy Firebase Services

```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy Cloud Functions
firebase deploy --only functions

# Deploy hosting (if using Firebase Hosting)
npm run build
firebase deploy --only hosting
```

### 6. Run Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

## Usage

### Creating a Meeting

1. Visit the home page
2. Click "Create New Meeting"
3. Fill in meeting details:
   - Meeting title and description
   - Date range for possible meeting times
   - Time range (start/end times for each day)
   - Response deadline
4. Click "Create Meeting"
5. Share the generated meeting URL with participants

### Participating in a Meeting

1. Open the meeting link shared by the host
2. Optionally sign in with email (or participate as guest)
3. Enter your name
4. For each time slot, select:
   - ✓ Available (green)
   - △ Maybe available (yellow) - can add comments
   - ✗ Not available (red)
5. Save your availability

### AI Scheduling

1. Host can run AI suggestion after participants submit availability
2. Gemini AI analyzes all responses and suggests optimal meeting time
3. AI considers:
   - Maximum participant availability
   - Comments and preferences
   - Host instructions
4. Meeting status changes to "confirmed" with chosen date/time

### Google Calendar Integration (Optional)

1. Sign in to the application
2. Click "Import from Google Calendar"
3. Authorize calendar access
4. Busy times will be automatically marked as unavailable

## Deployment

### Firebase App Hosting

1. Build the application:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
firebase deploy
```

### Custom Deployment

The application can be deployed to any platform that supports Next.js:
- Vercel
- Netlify
- AWS Amplify
- Google Cloud Run

Make sure to configure environment variables on your chosen platform.

## Security Features

- **Authentication**: Secure email link authentication
- **Authorization**: Meeting creators have admin rights
- **Data Protection**: Firestore security rules prevent unauthorized access
- **Input Validation**: Server-side validation for all API endpoints

## API Endpoints

### Meeting Management
- `POST /api/meetings` - Create new meeting
- `GET /api/meetings/[id]` - Get meeting details
- `PUT /api/meetings/[id]` - Update meeting (host only)

### Availability
- `POST /api/meetings/[id]/availability` - Submit participant availability

### AI Features
- `POST /api/meetings/[id]/ai-suggestion` - Run AI scheduling (host only)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions, please create an issue in the GitHub repository.
