#!/bin/bash

# Exit on error
set -e

echo "📦 Building client application..."
cd client && npm run build && cd ..

echo "🔄 Preparing for deployment..."
# Ensure Firebase is logged in (you'll need to do this manually)

echo "🚀 Deploying to Firebase..."
npx firebase deploy

echo "✅ Deployment completed successfully!"
echo "Your app should now be available at: https://replit-5ac6a.web.app"