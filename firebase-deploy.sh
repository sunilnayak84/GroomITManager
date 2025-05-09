#!/bin/bash

# Exit on error
set -e

# Check if FIREBASE_TOKEN is available
if [ -z "$FIREBASE_TOKEN" ]; then
  echo "Error: FIREBASE_TOKEN is not set. Please set it in the Replit Secrets."
  echo "See FIREBASE-CI-DEPLOY.md for instructions on how to generate and set up the token."
  exit 1
fi

echo "📦 Building client application..."
# Export Firebase config from Replit secrets to environment
export VITE_FIREBASE_API_KEY="$VITE_FIREBASE_API_KEY"
export VITE_FIREBASE_APP_ID="$VITE_FIREBASE_APP_ID"
export VITE_FIREBASE_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID"
export VITE_FIREBASE_AUTH_DOMAIN="$VITE_FIREBASE_PROJECT_ID.firebaseapp.com"
export VITE_FIREBASE_STORAGE_BUCKET="$VITE_FIREBASE_PROJECT_ID.appspot.com"

# Build with production environment
cd client && npm run build && cd ..

echo "🔄 Preparing for deployment..."
echo "🔑 Authenticating with Firebase using CI token..."

echo "🚀 Deploying to Firebase..."
npx firebase deploy --token "$FIREBASE_TOKEN" --non-interactive

echo "✅ Deployment completed successfully!"
echo "Your app should now be available at: https://replit-5ac6a.web.app"
echo "And at: https://replit-5ac6a.firebaseapp.com"