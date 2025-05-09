
// Production Express server with API forwarding to server/index.js
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { createServer } from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Basic Express middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
  origin: ['https://groomery.replit.app', 'https://*.replit.dev', 'https://*.repl.co'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Create HTTP server
const server = createServer(app);

// Try to import API routes from server/index.js
console.log('Checking for API routes from server/index.js...');
try {
  const { registerRoutes } = await import('./server/routes.js');
  if (typeof registerRoutes === 'function') {
    console.log('Found API routes, registering them...');
    await registerRoutes(app);
    console.log('API routes registered successfully');
  }
} catch (error) {
  console.error('Failed to import API routes:', error.message);
  console.log('Continuing without API routes');
}

// Find the client build directory
console.log('Looking for client build directory...');
let clientBuildPath = '';
const possiblePaths = [
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'dist/client'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist/client')
];

for (const pathToCheck of possiblePaths) {
  try {
    if (fs.existsSync(pathToCheck) && fs.existsSync(path.join(pathToCheck, 'index.html'))) {
      clientBuildPath = pathToCheck;
      console.log('Found client build at:', clientBuildPath);
      break;
    }
  } catch (error) {
    console.error(`Error checking path ${pathToCheck}:`, error.message);
  }
}

if (!clientBuildPath) {
  console.error('Could not find client build directory. Creating placeholder content...');
  clientBuildPath = path.join(__dirname, 'dist/client');
  
  if (!fs.existsSync(clientBuildPath)) {
    fs.mkdirSync(clientBuildPath, { recursive: true });
  }
  
  // Create a simple placeholder index.html
  const placeholderHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GroomIT Manager</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f1f5f9; color: #334155; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 20px; }
    .container { max-width: 600px; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
    h1 { color: #0f766e; margin-top: 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>GroomIT Manager</h1>
    <p>The client application needs to be built. Please run:</p>
    <pre>cd client && npm run build</pre>
    <p>Then copy the build files to dist/client:</p>
    <pre>mkdir -p dist/client && cp -r client/dist/* dist/client/</pre>
  </div>
</body>
</html>`;
  
  fs.writeFileSync(path.join(clientBuildPath, 'index.html'), placeholderHtml);
}

// Serve static files from the client build directory
console.log('Setting up static file serving from:', clientBuildPath);
app.use(express.static(clientBuildPath));

// API 404 handler for unmatched API routes
app.use('/api/*', (req, res) => {
  console.warn(`API route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Not Found',
    message: `API route ${req.method} ${req.path} not found`
  });
});

// All other routes redirect to index.html (SPA client-side routing)
app.use('*', (req, res) => {
  // Skip if it's already been handled (e.g., API routes)
  if (res.headersSent) return;
  
  // Send the index.html for client-side routing
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server running on port ${PORT}`);
  console.log(`Static files served from: ${clientBuildPath}`);
  console.log(`Server available at: http://localhost:${PORT}`);
});
