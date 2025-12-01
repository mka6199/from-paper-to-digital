# How to Create Admin User

Since Firebase Authentication requires server-side access, you have two options:

## Option 1: Use Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Authentication** → **Users**
4. Click **Add User**
5. Enter:
   - Email: `admin@admin.com`
   - Password: `123456`
6. Copy the UID of the created user
7. Go to **Firestore Database**
8. Navigate to `users` collection
9. Click **Add Document**
10. Set Document ID to the UID you copied
11. Add fields:
    - `role`: `admin` (string)
    - `email`: `admin@admin.com` (string)
    - `isActive`: `true` (boolean)
    - `createdAt`: (timestamp - click "Add timestamp")

## Option 2: Use the Node.js Script (If you have Admin SDK)

1. Download your Firebase Admin SDK key:
   - Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `serviceAccountKey.json` in your project root

2. Install firebase-admin:
   ```bash
   npm install firebase-admin
   ```

3. Run the script:
   ```bash
   node create-admin.js
   ```

## Option 3: Quick Fix - Make Yourself Admin

If you already have an account in the app:

1. Go to Firebase Console → Firestore Database
2. Find your user document in the `users` collection
3. Edit the `role` field from `user` to `admin`
4. Log out and log back in

**Recommendation**: Use Option 1 (Firebase Console) - it's the fastest and most reliable.
