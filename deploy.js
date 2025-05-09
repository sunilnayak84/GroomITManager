// Specialized entry point for Replit deployments
// This file prioritizes serving static files over API routes
// to ensure the frontend is displayed correctly
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';

console.log('Starting GroomIT Manager Deployment Server...');
process.env.NODE_ENV = 'production';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Basic Express middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Find the client build directory
let clientBuildPath = '';
const possiblePaths = [
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'dist/client'),
  path.join(__dirname, 'dist/public'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist/client'),
  path.join(process.cwd(), 'dist/public')
];

for (const pathToCheck of possiblePaths) {
  if (fs.existsSync(pathToCheck) && fs.existsSync(path.join(pathToCheck, 'index.html'))) {
    clientBuildPath = pathToCheck;
    console.log('Found client build at:', clientBuildPath);
    break;
  }
}

if (!clientBuildPath) {
  console.error('No client build directory found. Creating a placeholder.');
  clientBuildPath = path.join(__dirname, 'dist/client');
  if (!fs.existsSync(clientBuildPath)) {
    fs.mkdirSync(clientBuildPath, { recursive: true });
  }
  
  // Create a simple placeholder index.html
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
  fs.writeFileSync(path.join(clientBuildPath, 'index.html'), html);
}

// MOST IMPORTANT: Serve static files FIRST, before any API routes
console.log('Setting up static file serving from:', clientBuildPath);
app.use(express.static(clientBuildPath));

// Handle root path explicitly to ensure frontend is served
app.get('/', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Try to load the API routes, but only AFTER static files are configured
try {
  const serverModule = await import('./dist/index.js').catch(() => null);
  if (serverModule && typeof serverModule.registerRoutes === 'function') {
    await serverModule.registerRoutes(app);
    console.log('API routes registered successfully');
  } else {
    // Fallback for API routes if server module couldn't be loaded
    app.use('/api/*', (req, res) => {
      res.status(200).json({
        status: "limited",
        message: "API routes configured in fallback mode",
        note: "The full server implementation could not be loaded"
      });
    });
  }
} catch (error) {
  console.error('Failed to register API routes:', error);
  // Simple API route fallback
  app.use('/api/*', (req, res) => {
    res.status(200).json({
      status: "error",
      message: "API configuration failed",
      error: error.message
    });
  });
}

// Catch-all route for client-side routing (AFTER API routes)
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return; // Let the API handlers deal with this
  }
  
  // For all other routes, serve the SPA's index.html
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Deployment server running on port ${PORT}`);
  console.log(`Static files served from: ${clientBuildPath}`);
});