#!/bin/bash

# Deployment script for Replit
# This script is used for Replit deployments

# Ensure we exit on any error
set -e

echo "=== Starting deployment process ==="
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Install root dependencies
echo "=== Installing root dependencies ==="
npm install

# Run the custom deployment build script
echo "=== Running deployment build script ==="
node deploy-build.js

# Make sure the dist directory exists
if [ ! -d "dist" ]; then
  echo "Creating dist directory"
  mkdir -p dist
  
  # If there's no client build, try to copy from client/dist
  if [ -d "client/dist" ]; then
    echo "Copying client build from client/dist"
    mkdir -p dist/client
    cp -r client/dist/* dist/client/
  fi
fi

# Ensure the proper directory structure exists
if [ ! -d "dist/client" ]; then
  echo "Creating dist/client directory"
  mkdir -p dist/client
  
  # If there's no client build, try to copy from client/dist
  if [ -d "client/dist" ]; then
    echo "Copying client build from client/dist"
    cp -r client/dist/* dist/client/
  fi
fi

# Inform about success
echo "=== Deployment preparation completed ==="
echo "The application is ready to be deployed"