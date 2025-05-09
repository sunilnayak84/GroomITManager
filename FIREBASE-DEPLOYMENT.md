# Firebase Deployment Guide for GroomIT Manager

This guide will walk you through deploying your GroomIT Manager application to Firebase.

## Prerequisites

1. A Firebase project created in the [Firebase Console](https://console.firebase.google.com/)
2. Firebase CLI installed (already done in this project)
3. Firebase configurations set up (already done in this project)

## Deployment Steps

### Step 1: Log in to Firebase

```bash
npx firebase login
```

Follow the browser prompts to complete the login process.

### Step 2: Build the Client Application

The client application needs to be built before deployment:

```bash
cd client && npm run build && cd ..
```

### Step 3: Deploy to Firebase

Deploy the entire application (hosting, functions, and Firestore rules):

```bash
npx firebase deploy
```

Or you can use the prepared script:

```bash
./firebase-deploy.sh
```

## What Gets Deployed

- **Client App**: The built React application from `client/dist`
- **API Functions**: The Express server running as Firebase Cloud Functions
- **Firestore Rules**: Security rules for your database
- **Storage Rules**: Security rules for file storage

## Accessing Your Deployed App

After deployment, your application will be available at:
- https://replit-5ac6a.web.app
- https://replit-5ac6a.firebaseapp.com

## Deployment Configuration

The deployment is configured in these files:

1. **firebase.json**: Main configuration for deployment
2. **functions/index.js**: Cloud Functions entry point
3. **.firebaserc**: Project linking configuration
4. **firestore.rules**: Database security rules
5. **firebase.rules**: Storage security rules

## Troubleshooting

- **Deployment Errors**: Check the Firebase CLI output for specific errors
- **Function Logs**: View Cloud Function logs in the Firebase Console
- **Missing Dependencies**: Ensure all dependencies are installed in both the root and functions directories
- **Authentication Issues**: Make sure your Firebase service account is properly configured

## Important Notes

- The application is configured to use Firebase hosting with Cloud Functions for the API
- API requests are routed to Cloud Functions through the `/api/**` rewrite rule
- Client-side routing is supported through the catch-all rewrite rule

## Next Steps After Deployment

1. Configure custom domains in the Firebase Console (optional)
2. Set up Firebase Authentication for your users
3. Monitor application performance in the Firebase Console
4. Set up Firebase Analytics to track user behavior