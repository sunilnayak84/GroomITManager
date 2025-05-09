#!/bin/bash

# This script prepares the app for deployment to Replit Deployments
echo "Preparing application for deployment..."

# Create .env file for production mode
echo "Creating production .env file..."
cat > .env << EOF
NODE_ENV=production
EOF

# Create a production-specific entrypoint
echo "Creating start.sh entrypoint..."
cat > start.sh << EOF
#!/bin/bash
export NODE_ENV=production
npm run build
node dist/index.js
EOF

# Make start.sh executable
chmod +x start.sh

# Build the client
echo "Building client..."
cd client
npm run build
cd ..

# Create the dist directory structure for client files
echo "Preparing dist directory structure..."
mkdir -p dist/client

# Copy client build to dist/client
echo "Copying client build files..."
cp -r client/dist/* dist/client/

# Make a simpler package.json for deployment
echo "Creating deployment package.json..."
cat > package.json.deploy << EOF
{
  "name": "groomery-manager",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "NODE_ENV=production node dist/index.js",
    "build": "npm run build:client && npm run build:server && npm run copy-client",
    "build:client": "cd client && vite build",
    "build:server": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "copy-client": "mkdir -p dist/client && cp -r client/dist/* dist/client/"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

echo "Deployment preparation complete!"
echo ""
echo "To deploy your application, perform the following steps:"
echo "1. In the Replit interface, click on 'Deployments' (rocket icon)"
echo "2. Click 'Deploy'"
echo "3. Wait for the deployment process to complete"
echo ""
echo "After deployment, your app should be available at: https://groomery.replit.app"