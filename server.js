
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
  console.log(`Production server running on port ${PORT}`);
});
