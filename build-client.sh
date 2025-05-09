#!/bin/bash

# Build script for client application
echo "=== Building client application ==="

# Navigate to client directory
cd client

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the client
echo "Building client..."
npm run build

# Check if build was successful
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
  echo "Build successful!"
  exit 0
else
  echo "Build failed!"
  exit 1
fi