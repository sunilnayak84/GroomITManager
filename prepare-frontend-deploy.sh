#!/bin/bash

# Frontend-only deployment preparation script for GroomIT Manager
# This script prepares ONLY the frontend for deployment

echo "======================================"
echo "PREPARING FRONTEND-ONLY DEPLOYMENT"
echo "======================================"

# Set production mode
export NODE_ENV=production

# Navigate to the client directory
cd client

# Install dependencies if needed
echo "Installing client dependencies..."
npm install

# Build the client
echo "Building client..."
npm run build

# Check if the build was successful
if [ ! -f "dist/index.html" ]; then
  echo "❌ Error: Client build failed - index.html not found!"
  exit 1
fi

echo "✅ Client build successful."

# Return to the root directory
cd ..

# Create necessary directories
echo "Creating deployment directories..."
mkdir -p dist/client

# Copy client build to deployment location
echo "Copying client build to deployment location..."
cp -r client/dist/* dist/client/

# Set production environment
echo "NODE_ENV=production" > .env

# Create a marker file to indicate successful preparation
echo "Deployment prepared at $(date)" > frontend-deploy-ready.txt

echo "======================================"
echo "FRONTEND DEPLOYMENT PREPARATION COMPLETE"
echo "======================================"
echo "To deploy the frontend-only application:"
echo "1. Go to the Deployments tab in Replit"
echo "2. Click 'Deploy'"
echo "======================================"