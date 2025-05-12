#!/bin/bash

# ABSOLUTE LAST RESORT DEPLOYMENT SCRIPT
# This script creates the absolute minimum necessary for deployment
echo "=================================================="
echo "LAST RESORT FRONTEND-ONLY DEPLOYMENT"
echo "=================================================="

# Build the client
echo "Building client..."
cd client && npm run build
if [ $? -ne 0 ]; then
  echo "❌ Client build failed"
  exit 1
fi
cd ..

# Create the dist directory
mkdir -p dist

# Copy minimal server for deployment
echo "Setting up minimal deployment server..."
cp last-resort-deploy.js dist/index.js

# Create minimal package.json
echo "Creating minimal package.json..."
cat > dist/package.json << EOF
{
  "name": "groomit-deployment",
  "type": "module",
  "dependencies": {
    "express": "^4.18.2"
  }
}
EOF

echo "DEPLOYMENT PREPARED" > dist/deployment-ready.txt

echo "=================================================="
echo "LAST RESORT DEPLOYMENT READY"
echo "=================================================="
echo "To deploy:"
echo "1. Go to the Replit Deployments tab"
echo "2. Click Deploy"
echo "=================================================="