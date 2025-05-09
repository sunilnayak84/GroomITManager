import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Possible client build paths in order of priority
const possibleClientPaths = [
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'dist/client'),
  path.join(__dirname, '../client/dist'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist/client')
];

console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('\nChecking for client build paths:');

// Find the first valid client build path
for (const candidatePath of possibleClientPaths) {
  try {
    const exists = fs.existsSync(candidatePath);
    const hasIndexHtml = exists && fs.existsSync(path.join(candidatePath, 'index.html'));
    
    console.log(`\nPath: ${candidatePath}`);
    console.log(`  - Exists: ${exists ? 'YES' : 'NO'}`);
    console.log(`  - Has index.html: ${hasIndexHtml ? 'YES' : 'NO'}`);
    
    if (hasIndexHtml) {
      console.log('  - VALID PATH FOUND!');
      console.log(`  - Content of index.html: ${fs.readFileSync(path.join(candidatePath, 'index.html'), 'utf8').substring(0, 50)}...`);
    }
  } catch (error) {
    console.log(`  - Error checking ${candidatePath}:`, error.message);
  }
}

console.log('\nTest complete!');