#!/bin/bash

# Ultra-simplified frontend-only deployment script
echo "========================================"
echo "FRONTEND-ONLY DEPLOYMENT BUILD"
echo "========================================"

# Build the client
echo "Building client..."
cd client
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Client build failed"
  exit 1
fi
cd ..

# Create dist directory
mkdir -p dist

# Copy the direct deployment server as main entry point
echo "Setting up frontend-only server..."
cp direct-deploy.js dist/index.js

# Create client directory in dist and copy build files
echo "Copying client build..."
mkdir -p dist/client
cp -r client/dist/* dist/client/

# Create a simple package.json for deployment
echo "Creating package.json for deployment..."
cat > dist/package.json << EOF
{
  "name": "groomit-manager-frontend",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "express": "^4.18.2"
  }
}
EOF

echo "Deployment build complete at $(date)" > build-completed.txt

echo "========================================"
echo "FRONTEND-ONLY DEPLOYMENT BUILD COMPLETE"
echo "========================================"
echo "To deploy:"
echo "1. Go to the Replit deployments tab"
echo "2. Click 'Deploy'"
echo "========================================"