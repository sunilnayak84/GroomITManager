#!/bin/bash

# Frontend-first deployment build script
echo "========================================="
echo "BUILDING FRONTEND-FIRST DEPLOYMENT"
echo "========================================="

# Set production mode
export NODE_ENV=production

# Step 1: Build the client
echo "Building client..."
cd client
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Client build failed"
  exit 1
fi
cd ..
echo "✅ Client build successful"

# Step 2: Build the server with the deployment index
echo "Building server with frontend-first configuration..."
cd server
cp deployment-index.ts index.ts.deployment
echo "✅ Created deployment-specific server entrypoint"

# Build the server
echo "Building server..."
npx esbuild index.ts.deployment --platform=node --packages=external --bundle --format=esm --outfile=../dist/index.js
if [ $? -ne 0 ]; then
  echo "❌ Server build failed"
  exit 1
fi
cd ..
echo "✅ Server build successful"

# Step 3: Create a client directory in dist
mkdir -p dist/client
cp -r client/dist/* dist/client/

# Step 4: Create a marker file indicating successful build
echo "Deployment built with frontend-first approach at $(date)" > build-completed.txt

echo "========================================="
echo "FRONTEND-FIRST BUILD COMPLETE"
echo "========================================="
echo "To deploy:"
echo "1. Go to the Replit deployments tab"
echo "2. Click 'Deploy'"
echo "========================================="