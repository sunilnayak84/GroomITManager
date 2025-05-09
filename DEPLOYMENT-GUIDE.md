# Deployment Guide for Pet Grooming Management System

This guide explains how to deploy the Pet Grooming Management application on Replit.

## Prerequisites

- A Replit account
- The application codebase

## Deployment Process

### 1. Prepare the Application

Make sure the application is properly configured:

- All dependencies are correctly listed in package.json
- Environment variables are properly set in .env files
- Build scripts are properly configured

### 2. Configure the Deployment Server

The application uses a simplified deployment server that:
- Serves static files from the client build directory
- Handles API requests properly
- Provides proper routing for Single-Page Application (SPA)

The key files for deployment are:
- `simple-deploy.js` - The main deployment server
- `index.js` - The entry point that loads the deployment server

### 3. Build the Application

The build process creates optimized production assets:

```bash
# Navigate to the client directory
cd client

# Install dependencies (if needed)
npm install

# Build the client
npm run build
```

This creates a `dist` directory with optimized assets.

### 4. Start the Deployment Server

The deployment server runs on port 5000:

```bash
# Start the deployment server
PORT=5000 NODE_ENV=production node index.js
```

### 5. Deploy to Replit

To deploy to Replit:

1. Click the "Deploy" button in the Replit interface
2. Select the appropriate deployment settings:
   - Build command: `./deploy.sh`
   - Run command: `NODE_ENV=production node index.js`
3. Click "Deploy"

**Important Note**: If the deployment fails in the build phase, you may need to run the build process manually:
```bash
# Run deployment script to build and prepare assets
./deploy.sh

# Verify that the dist/client directory exists and contains the built assets
ls -la dist/client
```

## Troubleshooting

### Common Issues

1. **Missing Dependencies**
   - Make sure all dependencies are correctly listed in package.json
   - Run `npm install` to install dependencies

2. **Port Conflicts**
   - The application uses port 5000 by default
   - If port 5000 is already in use, modify the PORT environment variable

3. **Static Files Not Found**
   - Verify that the client build process completed successfully
   - Check that the deployment server is pointing to the correct build directory

4. **API Endpoints Not Accessible**
   - Ensure that API routes are defined after static file serving but before the catch-all route

## Maintenance

For future updates:

1. Make code changes locally
2. Test thoroughly
3. Build the client application
4. Deploy using the steps above

## Notes

- The application uses Firebase for authentication and data storage
- Environment variables should be properly configured for Firebase
- The deployment server prioritizes static file serving over API routes