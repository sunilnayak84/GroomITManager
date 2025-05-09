#!/bin/bash

# Complete deployment script for GroomIT Manager
echo "Starting complete deployment process..."

# Set environment to production
export NODE_ENV=production

# Step 1: Create the necessary deployment files
echo "1. Creating deployment files..."
node fix-deployment.js

# Step 2: Build the client
echo "2. Building client..."
cd client
npm run build
cd ..

# Step 3: Create the dist/client directory if it doesn't exist
echo "3. Creating dist/client directory..."
mkdir -p dist/client

# Step 4: Copy the client build to the dist/client directory
echo "4. Copying client build to dist/client..."
cp -r client/dist/* dist/client/

# Step 5: Rename the production package.json for deployment (if needed)
if [ -f "package.json.deploy" ]; then
  echo "5. Backing up existing package.json..."
  cp package.json package.json.original
  echo "   Copying deployment package.json..."
  cp package.json.deploy package.json.deployment
fi

# Step 6: Create .env file for production
echo "6. Creating production .env file..."
echo "NODE_ENV=production" > .env

echo ""
echo "Deployment preparation complete!"
echo ""
echo "To deploy on Replit:"
echo "1. Click the 'Deployments' tab"
echo "2. Click 'Deploy'"
echo "3. The app should be available at: https://groomery.replit.app"
echo ""
echo "For troubleshooting, refer to DEPLOY-INSTRUCTIONS.md"