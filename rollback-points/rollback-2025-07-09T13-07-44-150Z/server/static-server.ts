import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Configure the Express app to serve static files from the built client
 * This is used in production mode
 */
export function setupStaticFileServing(app: Express): boolean {
  // Try different possible paths for the client build
  const possiblePaths = [
    path.resolve(__dirname, "..", "client", "dist"),        // Standard path
    path.resolve(__dirname, "..", "dist", "client"),        // Replit build path
    path.resolve(__dirname, "../../dist"),                  // Another possible Replit path
    path.resolve(__dirname, "..", "..", "client", "dist"),  // Alternative structure
    path.resolve(__dirname, "dist")                         // Fallback
  ];
  
  let staticPath = "";
  
  // Find the first path that exists
  for (const potentialPath of possiblePaths) {
    if (fs.existsSync(potentialPath) && fs.existsSync(path.join(potentialPath, "index.html"))) {
      staticPath = potentialPath;
      break;
    }
  }
  
  // If no valid path was found, return false
  if (!staticPath) {
    console.error("Could not find a valid static build directory");
    return false;
  }
  
  console.log(`Serving static files from: ${staticPath}`);
  
  // Configure Express to serve static files
  app.use(express.static(staticPath));
  
  // SPA fallback - serve index.html for any unknown routes
  app.use("*", (req, res, next) => {
    // Skip API routes
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }
    
    res.sendFile(path.resolve(staticPath, "index.html"));
  });
  
  return true;
}