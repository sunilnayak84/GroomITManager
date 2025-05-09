# Deploying to Firebase from Your Local Machine

If you prefer to deploy directly from your local machine rather than using Replit, follow these steps:

## Prerequisites

1. Node.js and npm installed on your machine
2. Git installed on your machine
3. A Firebase project created in the [Firebase Console](https://console.firebase.google.com/)

## Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd <repository-directory>
```

## Step 2: Install Dependencies

```bash
npm install
cd client && npm install && cd ..
cd functions && npm install && cd ..
```

## Step 3: Install Firebase CLI

```bash
npm install -g firebase-tools
```

## Step 4: Login to Firebase

```bash
firebase login
```

This will open a browser window where you can authenticate with your Google account.

## Step 5: Select Your Firebase Project

```bash
firebase use --add
```

Select your Firebase project from the list and give it an alias (e.g., "default").

## Step 6: Build the Client Application

```bash
cd client && npm run build && cd ..
```

## Step 7: Deploy to Firebase

```bash
firebase deploy
```

This will deploy:
- Your React application to Firebase Hosting
- Your server as Cloud Functions
- Firestore security rules
- Storage security rules

## Step 8: Access Your Deployed Application

After deployment is complete, your application will be available at:
- https://[your-project-id].web.app
- https://[your-project-id].firebaseapp.com

## Troubleshooting

- **Build Errors**: Make sure all dependencies are installed and the build command is successful
- **Deployment Errors**: Check the Firebase CLI output for specific errors
- **Functions Errors**: Check if your Node.js version matches the one specified in functions/package.json
- **Authorization Errors**: Make sure you're logged in with the correct Google account that has access to your Firebase project

## Partial Deployments

You can deploy specific resources:

- Deploy only hosting: `firebase deploy --only hosting`
- Deploy only functions: `firebase deploy --only functions`
- Deploy only Firestore rules: `firebase deploy --only firestore:rules`
- Deploy only Storage rules: `firebase deploy --only storage:rules`

## CI/CD Integration

For continuous integration/deployment, use the CI token:

```bash
firebase login:ci
```

This will generate a token you can use in your CI/CD pipeline.