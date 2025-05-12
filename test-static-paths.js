/**
 * Client Build Path Verification and Deployment Test
 * 
 * This script checks if the client build is properly set up for deployment
 * and provides guidance on fixing deployment issues.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('=================================================');
console.log('DEPLOYMENT TROUBLESHOOTING TOOL');
console.log('=================================================');
console.log('Testing static file paths and deployment configuration...\n');

// Environment check
console.log('Environment Information:');
console.log(`- Current directory: ${process.cwd()}`);
console.log(`- __dirname: ${__dirname}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`- PORT: ${process.env.PORT || '3000 (default)'}`);

// Check .replit deployment configuration
console.log('\nChecking Replit deployment configuration:');
try {
  if (fs.existsSync('.replit')) {
    const replitConfig = fs.readFileSync('.replit', 'utf8');
    console.log('- .replit file found');
    
    // Check deployment configuration
    if (replitConfig.includes('[deployment]')) {
      console.log('- Deployment configuration found');
      
      // Check for potential issues
      const hasBuildClient = replitConfig.includes('cd client && npm') || 
                             replitConfig.includes('client/npm') || 
                             replitConfig.includes('npm run build');
      
      console.log(`- Client build in deployment: ${hasBuildClient ? 'YES' : 'NO'}`);
      
      if (!hasBuildClient) {
        console.log('  ⚠️ Warning: Deployment may not be building the client');
      }
      
      // Check if index.js is used for deployment
      const usesIndexJs = replitConfig.includes('node index.js') || 
                          replitConfig.includes('node ./index.js');
      
      console.log(`- Uses index.js as entry point: ${usesIndexJs ? 'YES' : 'NO'}`);
      
      if (!usesIndexJs) {
        console.log('  ⚠️ Warning: Deployment should use index.js as the entry point');
      }
    } else {
      console.log('- ⚠️ No deployment configuration found in .replit file');
    }
  } else {
    console.log('- ⚠️ .replit file not found');
  }
} catch (error) {
  console.log(`- Error checking .replit file: ${error.message}`);
}

// Possible client build paths in order of priority
const possibleClientPaths = [
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'dist/client'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist/client')
];

console.log('\nChecking for client build paths:');

let clientBuildFound = false;
let validPath = null;

// Find the first valid client build path
for (const candidatePath of possibleClientPaths) {
  try {
    const exists = fs.existsSync(candidatePath);
    const hasIndexHtml = exists && fs.existsSync(path.join(candidatePath, 'index.html'));
    const isDirectory = exists && fs.statSync(candidatePath).isDirectory();
    
    console.log(`\nPath: ${candidatePath}`);
    console.log(`  - Exists: ${exists ? 'YES' : 'NO'}`);
    console.log(`  - Is Directory: ${isDirectory ? 'YES' : 'NO'}`);
    console.log(`  - Has index.html: ${hasIndexHtml ? 'YES' : 'NO'}`);
    
    if (hasIndexHtml) {
      console.log('  ✅ VALID CLIENT BUILD FOUND!');
      
      // Check if it has assets
      const files = fs.readdirSync(candidatePath);
      const hasAssets = files.some(file => 
        file === 'assets' || 
        file.endsWith('.js') || 
        file.endsWith('.css')
      );
      
      console.log(`  - Has assets/JS/CSS: ${hasAssets ? 'YES' : 'NO'}`);
      
      if (hasAssets) {
        console.log('  ✅ Build appears to be complete with assets');
      } else {
        console.log('  ⚠️ Build may be incomplete - missing expected assets');
      }
      
      // Check contents
      try {
        const indexContent = fs.readFileSync(path.join(candidatePath, 'index.html'), 'utf8');
        const firstLine = indexContent.split('\n')[0].trim();
        console.log(`  - First line: ${firstLine}`);
        
        // Check if it's the expected React build
        const isReactBuild = indexContent.includes('react') || 
                            indexContent.includes('React') || 
                            indexContent.includes('chunk');
        
        console.log(`  - Appears to be React build: ${isReactBuild ? 'YES' : 'NO'}`);
        
        clientBuildFound = true;
        validPath = candidatePath;
      } catch (err) {
        console.log('  - Error reading index.html content');
      }
    } else if (exists && isDirectory) {
      console.log('  ⚠️ Directory exists but no index.html found');
      
      // List contents to see what's there
      try {
        const files = fs.readdirSync(candidatePath);
        if (files.length === 0) {
          console.log('  - Directory is empty');
        } else {
          console.log(`  - Directory contains ${files.length} files/dirs`);
          console.log(`  - First few items: ${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''}`);
        }
      } catch (err) {
        console.log(`  - Error listing directory: ${err.message}`);
      }
    }
  } catch (error) {
    console.log(`  - Error checking ${candidatePath}: ${error.message}`);
  }
}

// Check the client's package.json to verify build script
console.log('\nChecking client build configuration:');
try {
  const clientPackageJsonPath = path.join(__dirname, 'client', 'package.json');
  if (fs.existsSync(clientPackageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(clientPackageJsonPath, 'utf8'));
    console.log('- Client package.json found');
    
    // Check build script
    if (packageJson.scripts && packageJson.scripts.build) {
      console.log(`- Build script: ${packageJson.scripts.build}`);
    } else {
      console.log('- ⚠️ No build script found in client package.json');
    }
    
    // Check build output directory
    const hasBuildConfig = packageJson.scripts && 
                          packageJson.scripts.build && 
                          packageJson.scripts.build.includes('build');
    
    if (hasBuildConfig) {
      console.log('- Build configuration appears valid');
    } else {
      console.log('- ⚠️ Build configuration may be missing or invalid');
    }
  } else {
    console.log('- ⚠️ Client package.json not found');
  }
} catch (error) {
  console.log(`- Error checking client package.json: ${error.message}`);
}

// Check main files used in deployment
console.log('\nChecking deployment files:');
const deploymentFiles = [
  'index.js',
  'replit_deployment.js',
  'server.js',
  'fix-deployment.js'
];

for (const file of deploymentFiles) {
  try {
    const exists = fs.existsSync(file);
    console.log(`- ${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
    
    if (exists) {
      const stats = fs.statSync(file);
      console.log(`  - Last modified: ${stats.mtime.toLocaleString()}`);
      
      // For special files, check their content for potential issues
      if (file === 'replit_deployment.js' || file === 'index.js') {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for common issues
        const hasStaticServing = content.includes('express.static') || 
                                content.includes('static(');
        
        const hasApiRoutes = content.includes('/api') || 
                             content.includes('apiRouter');
        
        console.log(`  - Has static file serving: ${hasStaticServing ? 'YES' : 'NO'}`);
        console.log(`  - Has API routes: ${hasApiRoutes ? 'YES' : 'NO'}`);
        
        // Check route order (very basic check)
        if (hasStaticServing && hasApiRoutes) {
          const staticIndex = content.indexOf('express.static');
          const apiIndex = content.indexOf('/api');
          
          if (staticIndex !== -1 && apiIndex !== -1) {
            if (apiIndex < staticIndex) {
              console.log('  ✅ API routes appear before static file serving (good)');
            } else {
              console.log('  ⚠️ Static file serving appears before API routes (potential issue)');
            }
          }
        }
      }
    }
  } catch (error) {
    console.log(`- Error checking ${file}: ${error.message}`);
  }
}

// Final diagnostics and solution recommendations
console.log('\n=================================================');
console.log('DEPLOYMENT DIAGNOSTICS RESULTS');
console.log('=================================================');

if (clientBuildFound) {
  console.log('✅ CLIENT BUILD FOUND at:', validPath);
  console.log('The client build appears to exist. If the deployment is still showing the backend instead of frontend, the issue is likely with the routing order in the deployment server.');
} else {
  console.log('❌ NO CLIENT BUILD FOUND');
  console.log('This is likely why your deployment is showing the backend API instead of the frontend.');
}

console.log('\nRECOMMENDED ACTIONS:');

if (!clientBuildFound) {
  console.log(`
1. Build the client first:
   cd client
   npm install
   npm run build
   cd ..
  `);
}

console.log(`
2. Run the deployment preparation script:
   node fix-deployment.js

3. Deploy the app:
   - Go to the "Deployments" tab in the Replit interface
   - Click "Deploy"
`);

console.log('\nFor manual verification, you can run:');
console.log('node -e "console.log(require(\'fs\').existsSync(\'client/dist/index.html\'))"');

console.log('\nTest complete!');

// Offer to run the fix script automatically
console.log('\nWould you like to run the fix-deployment.js script now?');
console.log('To run it, execute this command:');
console.log('node fix-deployment.js');