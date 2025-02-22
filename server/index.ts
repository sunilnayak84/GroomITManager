import express, { type Request, type Response } from "express";
import { registerRoutes } from "./routes.js";
import { createServer } from "http";
import { terminateProcessOnPort } from "./utils/port_cleanup.js";
import { initializeFirebaseAdmin } from "./firebase.js";
import { setupAuth } from "./auth.js";
import cors from 'cors';
import { logger } from "./utils/logger.js";
import { setupVite } from "./vite.js";

// Configure Express app
const app = express();

// Basic middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`Incoming ${req.method} request to ${req.path}`, {
    headers: req.headers,
    query: req.query,
    body: req.body
  });
  next();
});


//Billing routes and middleware
const billingRouter = express.Router();
const billingAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  //Implementation for authentication middleware.  Placeholder for now.
  next();
};

billingRouter.get('/invoices', billingAuthMiddleware, async (req, res) => {
  try {
    const invoices = await BillingService.getInvoices();
    res.json(invoices);
  } catch (error) {
    logger.error("Error getting invoices:", error);
    res.status(500).json({ error: 'Failed to retrieve invoices' });
  }
});


// ... other billing routes as needed


//Billing Service (Placeholder Implementation)
class BillingService {
  static async getInvoices() {
    //Implementation to fetch invoices from Firebase or other source.  Placeholder for now.
    return [];
  }
  //Add other billing methods here.
}


app.use('/api/billing', billingRouter);


async function startServer(port: number) {
  try {
    // Initialize Firebase
    const firebaseApp = await initializeFirebaseAdmin();
    if (!firebaseApp) {
      throw new Error('Failed to initialize Firebase Admin');
    }
    logger.info('Firebase Admin initialized successfully');

    // Setup authentication
    await setupAuth(app);
    logger.info('Authentication setup completed');

    // Start server
    const server = createServer(app);

    // Register API routes before Vite middleware
    await registerRoutes(app);
    logger.info('API routes registered');

    // Setup Vite after API routes
    await setupVite(app, server);
    logger.info('Vite middleware setup completed');

    // Start listening
    server.listen(port, '0.0.0.0', () => {
      logger.info(`Server started on port ${port}`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      logger.error('Server error:', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Server startup error:', error);
    process.exit(1);
  }
}

// Start the server
const PORT = parseInt(process.env.PORT || '3000', 10);

// Clean up port before starting
await terminateProcessOnPort(PORT).catch(error => {
  logger.warn('Port cleanup warning:', error.message);
});

// Start server
startServer(PORT);

// Handle process signals
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT signal, shutting down gracefully');
  process.exit(0);
});