#!/bin/bash

# This script builds the application for production deployment
echo "Starting deployment build process..."

# Set environment to production
export NODE_ENV=production

# Build the client
echo "Building client..."
cd client
npm run build
cd ..

# Create the dist/client directory if it doesn't exist
echo "Setting up dist directory structure..."
mkdir -p dist/client

# Copy the client build to the dist/client directory
echo "Copying client build to dist/client..."
cp -r client/dist/* dist/client/

# Build the server
echo "Building server..."
npm run build:server

# Create a .env file for production if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating production .env file..."
  echo "NODE_ENV=production" > .env
fi

echo "Build complete! To start the application in production mode:"
echo "NODE_ENV=production node dist/index.js"