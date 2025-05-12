# Deployment Guide for GroomIT Manager

## Issue: Backend API Shows Instead of Frontend

If your deployment is showing the backend API response instead of the frontend, we need to ensure the frontend routes have priority over the backend routes.

## Solution: Frontend-First Deployment

This guide uses a frontend-first deployment approach which prioritizes the frontend routes over the backend API routes.

## Step 1: Build the Application with Frontend Priority

Run the following command to build both the frontend and backend with frontend-priority settings:

```bash
./build-frontend-first.sh
```

This script will:
1. Build the client application
2. Create a special deployment-specific server entry point
3. Build the server with the frontend-first configuration
4. Set up the correct file structure for deployment

## Step 2: Deploy the Application

1. Go to the Replit "Deployments" tab
2. Click "Deploy"
3. Wait for the deployment to complete (this may take a few minutes)

## Step 3: Verify the Deployment

When the deployment is complete:
1. Visit your deployment URL (e.g., `https://groomery.replit.app`)
2. You should see the frontend application instead of the backend API

## How This Works

The normal server configuration registers API routes first, and then adds the frontend static file serving afterward. In some environments, this can cause the API routes to take precedence.

Our frontend-first approach:
1. Sets up the static file serving BEFORE registering API routes
2. Uses a special catch-all route for non-API paths that serves the frontend
3. Only allows API routes to be matched if the frontend doesn't handle the route

## Troubleshooting

If you're still seeing the backend API instead of the frontend:

1. Verify that the frontend build was successful:
   ```bash
   ls -la client/dist
   ```
   
2. Check the logs after deployment to see which routes are being matched:
   - Look for log messages that show which paths are being requested
   - Check for any error messages about missing files

3. Make a request to the deployed API health endpoint:
   ```
   curl https://your-deployment-url.replit.app/api/health
   ```
   This should return a JSON response indicating the server is running in frontend-first mode.

## For Development

Your local development server will continue to work normally with the original configuration. These changes only affect the deployment.