import express from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { createServer } from "http";
import { setupAuth } from "./auth.js";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

const isDevelopment = process.env.NODE_ENV === 'development';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function checkDatabaseConnection() {
  try {
    await db.execute(sql`SELECT 1`);
    console.log("Database connection successful");
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

async function startServer() {
  try {
    // Create Express app
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.set('trust proxy', 1);

    // CORS configuration
    app.use((req, res, next) => {
      const origin = isDevelopment 
        ? (req.get('origin') || 'http://localhost:5174') 
        : req.get('origin');
        
      if (origin) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      }

      if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }
      next();
    });

    // Check database connection
    const isDatabaseConnected = await checkDatabaseConnection();
    if (!isDatabaseConnected) {
      throw new Error("Cannot start server without database connection");
    }

    // Setup authentication
    await setupAuth(app);
    console.log("Authentication middleware configured");

    // Register routes
    registerRoutes(app);
    console.log("Routes registered successfully");

    // Create HTTP server
    const server = createServer(app);

    // Setup development or production mode
    if (isDevelopment) {
      await setupVite(app, server);
      console.log("Vite middleware setup complete");
    } else {
      serveStatic(app);
      console.log("Static file serving setup complete");
    }

    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server started successfully on port ${PORT}`);
      console.log(`Server is accessible at http://0.0.0.0:${PORT}`);
    });

    // Handle shutdown
    process.on('SIGTERM', () => {
      console.log("Received shutdown signal");
      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch(error => {
  console.error('Unhandled server startup error:', error);
  process.exit(1);
});