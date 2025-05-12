#!/bin/bash

# Deployment script for GroomIT Manager
# This script ensures the client is built and deployed correctly

echo "======================================"
echo "PREPARING DEPLOYMENT FOR GROOMIT MANAGER"
echo "======================================"

# Set production mode
export NODE_ENV=production

# Build the client
echo "Building client..."
cd client && npm install && npm run build
if [ $? -ne 0 ]; then
  echo "❌ Client build failed. Aborting deployment."
  exit 1
fi
cd ..

echo "✅ Client build successful."

# Ensure client build is available
if [ ! -f "client/dist/index.html" ]; then
  echo "❌ Error: client/dist/index.html not found after build."
  exit 1
fi

echo "Checking dist directory..."
mkdir -p dist/client

echo "Copying client build to dist/client..."
cp -r client/dist/* dist/client/

echo "Creating production environment file..."
echo "NODE_ENV=production" > .env

echo "======================================"
echo "DEPLOYMENT PREPARATION COMPLETE"
echo "======================================"
echo "You can now deploy the application via Replit Deployments."
echo ""
echo "To test the deployment server, run:"
echo "  node index.js"
echo ""
echo "For the official deployment:"
echo "1. Go to the Deployments tab in Replit"
echo "2. Click Deploy"
echo "======================================"