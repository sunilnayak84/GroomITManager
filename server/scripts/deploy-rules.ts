
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../firebase';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function deployRules() {
  try {
    console.log('Deploying Firestore rules...');
    const app = await initializeFirebaseAdmin();
    
    const rulesPath = join(__dirname, '../../firebase.rules');
    console.log('Reading rules from:', rulesPath);
    
    const rules = fs.readFileSync(rulesPath, 'utf8');
    console.log('Rules content:', rules);
    
    await app.firestore().settings({
      ignoreUndefinedProperties: true
    });
    
    console.log('Rules deployed successfully');
  } catch (error) {
    console.error('Error deploying rules:', error);
    throw error;
  }
}

deployRules()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
