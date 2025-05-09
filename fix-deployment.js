import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a .env file for production mode
console.log('Creating production .env file...');
fs.writeFileSync('.env', 'NODE_ENV=production\n');

// Checking if the static files directory exists
console.log('Checking for client build directory...');
const distClientDir = path.join(__dirname, 'dist', 'client');
const clientDistDir = path.join(__dirname, 'client', 'dist');

// Create directories if they don't exist
if (!fs.existsSync(path.join(__dirname, 'dist'))) {
  console.log('Creating dist directory...');
  fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
}

if (!fs.existsSync(distClientDir)) {
  console.log('Creating dist/client directory...');
  fs.mkdirSync(distClientDir, { recursive: true });
}

// Check if we need to create a sample index.html
const distClientIndexPath = path.join(distClientDir, 'index.html');
if (!fs.existsSync(distClientIndexPath)) {
  console.log('Creating a placeholder index.html in dist/client...');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GroomIT Manager</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f1f5f9; color: #334155; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 20px; flex-direction: column; text-align: center; }
    .container { max-width: 800px; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
    h1 { color: #0f766e; margin-top: 0; }
    .loader { margin: 20px auto; border: 5px solid #f3f3f3; border-top: 5px solid #0f766e; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .message { margin-top: 20px; }
    .info { font-size: 0.9rem; color: #64748b; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>GroomIT Manager</h1>
    <div class="loader"></div>
    <div class="message">The application is starting...</div>
    <div class="info">
      <p>This is a placeholder page. If you continue seeing this, it means the full application hasn't been built properly.</p>
      <p>Try running the build process again.</p>
    </div>
  </div>
</body>
</html>`;
  fs.writeFileSync(distClientIndexPath, html);
}

// Create a server.js file in the root for Replit Deployments
console.log('Creating production server.js file...');
const serverJs = `
// This is a simple Express server to serve static files in production
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Find the client build directory
let clientBuildPath = '';
const possiblePaths = [
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'dist/client'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist/client')
];

for (const pathToCheck of possiblePaths) {
  if (fs.existsSync(pathToCheck) && fs.existsSync(path.join(pathToCheck, 'index.html'))) {
    clientBuildPath = pathToCheck;
    console.log('Found client build at:', clientBuildPath);
    break;
  }
}

if (!clientBuildPath) {
  throw new Error('Could not find client build directory. Please run the build process first.');
}

// Serve static files
app.use(express.static(clientBuildPath));

// All routes redirect to index.html (SPA client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Production server running on port \${PORT}\`);
});
`;

fs.writeFileSync('server.js', serverJs);

// Create a deployment README
console.log('Creating deployment README...');
const readmeContent = `# Deployment Guide for GroomIT Manager

## Steps to deploy this application

1. Make sure you've built both client and server:
   \`\`\`
   # Build the client
   cd client
   npm run build
   cd ..
   
   # Create the dist/client directory
   mkdir -p dist/client
   
   # Copy client build to dist/client
   cp -r client/dist/* dist/client/
   \`\`\`

2. To deploy on Replit:
   - Go to "Deployments" tab in the Replit interface
   - Click "Deploy"
   - Replit will build and deploy your application

## Production Configuration

In production, the application should:
- Use the \`dist/client\` directory for serving static files
- Default to production mode with \`NODE_ENV=production\`
- Serve the frontend for all routes that aren't API routes

## Troubleshooting

If you see API responses instead of the UI:
- Make sure the client has been built (\`cd client && npm run build\`)
- Ensure the server is configured to serve static files
- Check that the static file middleware is registered AFTER API routes
`;

fs.writeFileSync('DEPLOYMENT.md', readmeContent);

console.log('\nDeployment setup complete! Now you can:');
console.log('1. Run node server.js to test the production server locally');
console.log('2. Deploy the application using Replit Deployments');
console.log('3. Refer to DEPLOYMENT.md for additional deployment instructions');