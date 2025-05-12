
// Optimized Express server for GroomIT Manager production deployment
import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';

// Setup basic configuration
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Configure middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// CORS headers for compatibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

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

// Define API routes first - these must come BEFORE static file serving
const apiRouter = express.Router();

// Define your API endpoints here
apiRouter.get('/stats', (req, res) => {
  res.json({
    status: 'success',
    message: 'API endpoint working',
    stats: {
      activeAppointments: 5,
      completedAppointments: 12,
      customers: 34,
      revenue: 45600
    }
  });
});

apiRouter.get('/customers', (req, res) => {
  res.json({
    status: 'success', 
    message: 'Customers fetched',
    data: {
      customerCount: 3,
      customerIds: ["sample1", "sample2", "sample3"], 
      customerNames: ["Demo Customer 1", "Demo Customer 2", "Demo Customer 3"]
    }
  });
});

// Mount API routes - MUST be before static file handling
app.use('/api', apiRouter);

// Then serve static files AFTER API routes
if (clientBuildPath) {
  console.log('Setting up static file serving from:', clientBuildPath);
  app.use(express.static(clientBuildPath));
  
  // Finally, handle client-side routing - this must be the LAST route
  app.get('*', (req, res) => {
    // Skip API routes (but they should already be handled above)
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    
    // Send the React frontend for all other routes
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  console.error('ERROR: No client build found for static file serving');
  // Add a fallback handler if no client build exists
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.status(500).send('<h1>Server Error</h1><p>Client build not found. Please rebuild the application.</p>');
    }
  });
}

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server running on port ${PORT}`);
  if (clientBuildPath) {
    console.log(`Static files served from: ${clientBuildPath}`);
  } else {
    console.log(`WARNING: No static files being served - client build not found!`);
  }
  console.log(`API endpoints available at /api/*`);
});
