# Firebase CI/CD Deployment Instructions

Since Replit runs in a non-interactive environment, we need to use a Firebase CI token for deployment.

## Step 1: Generate a Firebase CI Token (On Your Local Machine)

1. Install Firebase tools on your local computer:
   ```
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```
   firebase login
   ```

3. Generate a CI token:
   ```
   firebase login:ci
   ```

4. Copy the token that's generated. It will look something like:
   ```
   1/a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6
   ```

## Step 2: Set up the CI Token in Replit

1. In your Replit project, go to the "Secrets" tab (lock icon in the sidebar)

2. Add a new secret with:
   - Key: `FIREBASE_TOKEN`
   - Value: (paste the token you generated in step 1)

## Step 3: Update the Firebase Deployment Script

1. In your Replit, open the `firebase-deploy.sh` file

2. Replace the content with:
   ```bash
   #!/bin/bash

   # Exit on error
   set -e

   # Check if FIREBASE_TOKEN is available
   if [ -z "$FIREBASE_TOKEN" ]; then
     echo "Error: FIREBASE_TOKEN is not set. Please set it in the Replit Secrets."
     exit 1
   fi

   echo "📦 Building client application..."
   cd client && npm run build && cd ..

   echo "🔄 Preparing for deployment..."
   # Using the CI token for authentication
   echo "🔑 Authenticating with Firebase..."

   echo "🚀 Deploying to Firebase..."
   npx firebase deploy --token "$FIREBASE_TOKEN" --non-interactive

   echo "✅ Deployment completed successfully!"
   echo "Your app should now be available at: https://replit-5ac6a.web.app"
   ```

## Step 4: Run the Deployment Script

Once you've set up the token, run:

```
./firebase-deploy.sh
```

This will:
1. Build your client React application
2. Use your CI token to authenticate with Firebase
3. Deploy your entire application (hosting, functions, and rules)

## Troubleshooting

- If you get authentication errors, check that your token is correctly set in Replit Secrets
- If you get build errors, check the client build process
- If deployment fails, check the Firebase CLI output for specific errors

## Note on Service Account Keys

For Firebase Admin SDK functionality (which your backend uses), you'll also need to make sure your Firebase service account key is properly set up in Replit Secrets.