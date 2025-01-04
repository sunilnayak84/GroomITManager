
import { initializeFirebaseAdmin } from '../firebase';
import * as fs from 'fs';
import * as path from 'path';

async function deployRules() {
  try {
    console.log('Deploying Firestore rules...');
    const app = await initializeFirebaseAdmin();

    // Read rules file
    const rulesPath = path.join(__dirname, '../../firebase.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');

    // Deploy rules
    await app.firestore().settings({
      ignoreUndefinedProperties: true,
      rules: rules
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
