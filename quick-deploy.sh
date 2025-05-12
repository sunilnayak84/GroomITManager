#!/bin/bash

# Quick Frontend-Only Deployment Script
echo "====================================="
echo "QUICK FRONTEND-ONLY DEPLOYMENT"
echo "====================================="

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

# Step 2: Prepare node modules for deployment
echo "Setting up deployment node modules..."
mkdir -p dist/node_modules
cp -R node_modules/express dist/node_modules/
cp -R node_modules/cors dist/node_modules/
echo "✅ Node modules copied"

# Step 3: Copy deployment files
echo "Setting up deployment files..."
cp frontend-deploy.js dist/
cp index.js dist/
echo "✅ Deployment files copied"

# Step 4: Create a client directory in dist
echo "Copying client files to deployment location..."
mkdir -p dist/client
cp -r client/dist/* dist/client/

# Step 5: Create a package.json for the dist directory
echo "Creating package.json for deployment..."
cat > dist/package.json << EOF
{
  "name": "groomit-manager-frontend-deployment",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
EOF
echo "✅ Package.json created"

# Step 6: Create a marker file
echo "Frontend-only deployment prepared on $(date)" > dist/frontend-deploy-ready.txt

echo "====================================="
echo "DEPLOYMENT PREPARATION COMPLETE"
echo "====================================="
echo "To deploy:"
echo "1. Go to the Replit deployments tab"
echo "2. Click 'Deploy'"
echo "====================================="