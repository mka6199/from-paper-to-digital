# Google Sign-In Setup Instructions

## ⚠️ IMPORTANT: You need to configure Google Sign-In in Firebase Console

### Step 1: Enable Google Sign-In in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **from-paper-to-digital**
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. Click **Enable**
6. Set the **Project support email** (your email)
7. Click **Save**

### Step 2: Get OAuth Client IDs

#### For Web:
1. The Web Client ID is automatically created by Firebase
2. Copy the **Web client ID** shown in the Google sign-in configuration
3. Update `src/hooks/useGoogleAuth.ts` line 16:
   ```typescript
   clientId: 'YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com',
   ```

#### For iOS (Optional):
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Create OAuth 2.0 Client ID for iOS
5. Add the iOS Client ID to `src/hooks/useGoogleAuth.ts`

#### For Android (Optional):
1. In Google Cloud Console → **Credentials**
2. Create OAuth 2.0 Client ID for Android
3. You'll need your app's SHA-1 fingerprint
4. Add the Android Client ID to `src/hooks/useGoogleAuth.ts`

### Step 3: Update app.json (for Expo Go)

Add to your `app.json`:

```json
{
  "expo": {
    "scheme": "from-paper-to-digital",
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

### Step 4: Test

1. Restart your Expo server: `npx expo start -c`
2. Open the app
3. Click **"Continue with Google"** button
4. Sign in with your Google account
5. Check Firestore → `users` collection to see the created profile

## Current Status

✅ Code implemented
✅ UI added (Google button with icon)
⚠️ Needs Firebase configuration
⚠️ Needs OAuth Client IDs

## For Web Testing (Easiest)

For web, you just need the Web Client ID from Firebase:

1. Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration
2. Copy the **Web client ID**
3. Paste it in `src/hooks/useGoogleAuth.ts` line 16
4. Test on web: `npx expo start --web`

## Notes

- Google Sign-In works best on **web** out of the box
- For **mobile** (iOS/Android), you need platform-specific client IDs
- Users signing in with Google will have their profile auto-created in Firestore
- Their name from Google will be split into firstName/lastName
