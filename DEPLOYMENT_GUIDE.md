# GroomIT Manager Deployment Guide

## Deployment Issue Fix

If you're experiencing the issue where the deployment shows the backend API instead of the frontend, follow these steps:

## Option 1: Quick Deploy Method

1. Make sure the client is built:
   ```
   cd client
   npm run build
   cd ..
   ```

2. Run the standalone deployment server:
   ```
   node deploy.js
   ```

3. Then test it by visiting your deployment URL.

## Option 2: Modify Replit Deployment Settings

Since we can't directly edit the `.replit` file through the API, you'll need to manually update it in the Replit interface:

1. Open the `.replit` file in the Replit editor
2. Replace the deployment section with:
   ```
   [deployment]
   deploymentTarget = "cloudrun"
   build = ["sh", "-c", "npm install && cd client && npm install && npm run build && cd .. && node prepare-deployment.js"]
   run = ["sh", "-c", "NODE_ENV=production node deploy.js"]
   ```

3. Update the `run = ` line to use the new deployment server:
   ```
   run = "node deploy.js"
   ```

4. Keep the existing port mappings.

## Troubleshooting the Deployment

When deploying, make sure:

1. The client build exists at `client/dist/index.html`
2. The deployment is using `deploy.js` as its entry point
3. The `NODE_ENV` is set to `production`

If you continue to have issues, run:
```
node test-static-paths.js
```

This will diagnose any issues with the client build paths and deployment configuration.

## Understanding the Issue

The problem is likely due to a route order issue in the deployment server. The backend API routes need to be defined BEFORE the static file serving middleware to ensure proper routing.

In the improved deployment server (`deploy.js`), we've:
1. Clearly separated API routes from static file serving
2. Ensured API routes are registered first
3. Added a specific handling for the root route to ensure the frontend is served
4. Added better error handling and logging

## Reference Files

- `deploy.js`: Standalone deployment server that prioritizes the frontend
- `prepare-deployment.js`: Prepares the application for deployment
- `test-static-paths.js`: Diagnoses issues with client build paths and deployment configuration
- `DEPLOYMENT_GUIDE.md`: This guide