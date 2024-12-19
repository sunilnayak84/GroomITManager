import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { createServer, type Server } from "http";
import { terminateProcessOnPort } from "./utils/port_cleanup.js";
import { initializeFirebaseAdmin } from "./firebase.js";

// Configure Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

// CORS configuration
import cors from 'cors';
const corsOptions = {
  origin: process.env.NODE_ENV === 'development'
    ? ['http://localhost:5174', 'https://c2ee078f-4b26-4083-bd08-de31e29653e1-00-348t03dcz03jn.sisko.replit.dev', 'http://0.0.0.0:5174']
    : [process.env.CORS_ORIGIN || 'https://c2ee078f-4b26-4083-bd08-de31e29653e1-00-348t03dcz03jn.sisko.replit.dev'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// Global error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err.message);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

let server: Server | null = null;

async function gracefulShutdown() {
  console.log('[SERVER] Initiating graceful shutdown...');
  if (server) {
    return new Promise<void>((resolve) => {
      server!.close(() => {
        console.log('[SERVER] Closed out remaining connections.');
        resolve();
      });

      // Force close after timeout
      setTimeout(() => {
        console.log('[SERVER] Could not close connections in time, forcefully shutting down');
        resolve();
      }, 10000);
    });
  }
}

async function startServer(port: number): Promise<Server> {
  try {
    console.log('[SERVER] Initializing server...');
    
    // Initialize Firebase first
    await initializeFirebaseAdmin();
    console.log('[SERVER] Firebase Admin initialized successfully');

    // Create HTTP server
    server = createServer(app);

    // Register routes
    registerRoutes(app);
    console.log('[SERVER] Routes registered successfully');

    // Add API request logging
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) {
        console.log(`[API] ${req.method} ${req.path}`);
      }
      next();
    });

    // Start server with proper error handling
    return new Promise((resolve, reject) => {
      if (!server) {
        return reject(new Error('Server was not properly initialized'));
      }

      const onError = (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`[SERVER] Port ${port} is already in use`);
          reject(new Error(`Port ${port} is already in use`));
        } else {
          console.error('[SERVER] Server error:', error);
          reject(error);
        }
      };

      const onListening = () => {
        const addr = server!.address();
        const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
        console.log(`[SERVER] Server is listening on ${bind}`);
        resolve(server!);
      };

      server
        .once('error', onError)
        .once('listening', onListening)
        .listen(port, '0.0.0.0');
    });

  } catch (error) {
    console.error('[SERVER] Startup error:', error);
    throw error;
  }
}

const MAX_STARTUP_RETRIES = 3;
const STARTUP_RETRY_DELAY = 2000;

async function main() {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  let startupAttempt = 1;

  while (startupAttempt <= MAX_STARTUP_RETRIES) {
    try {
      console.log(`[SERVER] Startup attempt ${startupAttempt}/${MAX_STARTUP_RETRIES}`);
      
      // Clean up port
      await terminateProcessOnPort(PORT);
      console.log(`[SERVER] Port ${PORT} is available`);
      
      // Add delay to ensure port is fully released
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Attempt to start server
      server = await startServer(PORT);
      console.log('[SERVER] Server started successfully');
      break;
    } catch (error) {
      console.error(`[SERVER] Startup attempt ${startupAttempt} failed:`, error);
      
      if (startupAttempt === MAX_STARTUP_RETRIES) {
        console.error('[SERVER] Maximum retry attempts reached, exiting');
        process.exit(1);
      }
      
      console.log(`[SERVER] Retrying in ${STARTUP_RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, STARTUP_RETRY_DELAY));
      startupAttempt++;
    }
  }
}

// Handle process signals
process.on('SIGTERM', async () => {
  console.log('[SERVER] Received SIGTERM signal');
  await gracefulShutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[SERVER] Received SIGINT signal');
  await gracefulShutdown();
  process.exit(0);
});

// Start the server
main().catch(error => {
  console.error('[SERVER] Fatal error:', error);
  process.exit(1);
});