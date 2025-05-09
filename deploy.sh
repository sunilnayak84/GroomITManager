#!/bin/bash

# Simple deployment script
echo "=== Starting deployment process ==="

# Install server dependencies
echo "Installing server dependencies..."
npm install

# Build the client application
echo "Building client application..."
./build-client.sh

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "Client build successful!"
else
  echo "Client build failed! Cannot deploy."
  exit 1
fi

# Start the production server
echo "=== Deployment complete ==="
echo "To start the server, run: node server.js"