# GroomIT Manager Deployment Instructions

## How to Deploy on Replit

1. ✅ First, build the application:
   ```
   npm run build
   ```

2. ✅ Prepare for deployment:
   ```
   node scripts/prepare-deploy.js
   ```

3. 🚀 Deploy using Replit's deployment feature:
   - Go to the "Deployments" tab
   - Click "Deploy"
   - Wait for the deployment to complete

## Server Configuration

The deployment uses:
- Node.js server on port 3000
- Static files from dist/client
- API routes from dist/index.js

## Troubleshooting

If you encounter issues:
- Make sure build completed successfully
- Check server logs for errors
- Verify Firebase configuration is correct

For further assistance, contact support.
