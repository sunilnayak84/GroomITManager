# Deployment Guide for GroomIT Manager

## Important: Fixing Frontend Deployment

If your deployment shows backend API responses instead of the frontend UI, follow these steps:

1. Build the client before deploying:
   ```
   # Build the client
   cd client
   npm run build
   cd ..
   ```

2. Run the deployment script to set up everything correctly:
   ```
   node fix-deployment.js
   ```

3. Deploy on Replit:
   - Go to the "Deployments" tab in the Replit interface
   - Click "Deploy"

## Deployment Configuration

The deployment configuration in the `.replit` file should have:

```
[deployment]
deploymentTarget = "cloudrun"
build = ["sh", "-c", "npm install && cd client && npm install && npm run build && cd .. && node fix-deployment.js"]
run = ["sh", "-c", "NODE_ENV=production node index.js"]
```

## Deployment Troubleshooting

If you see API responses instead of the UI:
1. Make sure the client is built (`cd client && npm run build`)
2. Check that the `replit_deployment.js` has the correct route order (API routes first, then static files, then catch-all)
3. Verify the client build files exist in one of these locations:
   - `client/dist/`
   - `dist/client/`
