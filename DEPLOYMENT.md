# Deployment Guide for GroomIT Manager

## Steps to deploy this application

1. Make sure you've built both client and server:
   ```
   # Build the client
   cd client
   npm run build
   cd ..
   
   # Create the dist/client directory
   mkdir -p dist/client
   
   # Copy client build to dist/client
   cp -r client/dist/* dist/client/
   ```

2. To deploy on Replit:
   - Go to "Deployments" tab in the Replit interface
   - Click "Deploy"
   - Replit will build and deploy your application

## Production Configuration

In production, the application should:
- Use the `dist/client` directory for serving static files
- Default to production mode with `NODE_ENV=production`
- Serve the frontend for all routes that aren't API routes

## Troubleshooting

If you see API responses instead of the UI:
- Make sure the client has been built (`cd client && npm run build`)
- Ensure the server is configured to serve static files
- Check that the static file middleware is registered AFTER API routes
