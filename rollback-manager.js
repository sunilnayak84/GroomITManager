#!/usr/bin/env node

/**
 * ROLLBACK MANAGER - Create Rollback Points and GitHub Sync
 * 
 * This script helps you:
 * 1. Create rollback points with timestamps
 * 2. Backup current state
 * 3. Prepare for GitHub synchronization
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

class RollbackManager {
  constructor() {
    this.backupDir = './rollback-points';
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.currentState = `rollback-${this.timestamp}`;
  }

  createBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`✓ Created backup directory: ${this.backupDir}`);
    }
  }

  async createRollbackPoint() {
    console.log('🔄 Creating rollback point...');
    this.createBackupDirectory();

    const rollbackPoint = path.join(this.backupDir, this.currentState);
    fs.mkdirSync(rollbackPoint, { recursive: true });

    // Define critical files and directories to backup
    const criticalPaths = [
      'client/src',
      'server',
      'package.json',
      'client/package.json',
      'replit.md',
      'index.js',
      'replit_deployment.js',
      '.replit',
      'vite.config.ts',
      'tailwind.config.js',
      'postcss.config.js',
      'tsconfig.json',
      'client/tsconfig.json'
    ];

    let backedUpFiles = 0;
    const manifest = {
      timestamp: new Date().toISOString(),
      version: this.currentState,
      files: [],
      description: 'Automatic rollback point before GitHub sync'
    };

    for (const filePath of criticalPaths) {
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          const backupPath = path.join(rollbackPoint, filePath);
          
          if (stats.isDirectory()) {
            // Copy directory recursively
            this.copyDirectory(filePath, backupPath);
            manifest.files.push({
              path: filePath,
              type: 'directory',
              size: this.getDirectorySize(filePath)
            });
          } else {
            // Copy individual file
            fs.mkdirSync(path.dirname(backupPath), { recursive: true });
            fs.copyFileSync(filePath, backupPath);
            manifest.files.push({
              path: filePath,
              type: 'file',
              size: stats.size
            });
          }
          backedUpFiles++;
        }
      } catch (error) {
        console.warn(`⚠️ Could not backup ${filePath}: ${error.message}`);
      }
    }

    // Save manifest
    fs.writeFileSync(
      path.join(rollbackPoint, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    console.log(`✓ Rollback point created: ${this.currentState}`);
    console.log(`✓ Backed up ${backedUpFiles} items`);
    console.log(`✓ Location: ${rollbackPoint}`);

    return rollbackPoint;
  }

  copyDirectory(source, destination) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    const items = fs.readdirSync(source);
    
    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);
      
      // Skip node_modules and other large directories
      if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'build') {
        continue;
      }

      const stats = fs.statSync(sourcePath);
      
      if (stats.isDirectory()) {
        this.copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }

  getDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        if (item === 'node_modules' || item === '.git') continue;
        
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          totalSize += this.getDirectorySize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Ignore errors
    }
    
    return totalSize;
  }

  generateGitHubSyncInstructions() {
    const instructions = `
# GitHub Sync Instructions

## Current Rollback Point: ${this.currentState}

### Option 1: Manual GitHub Sync (Recommended)

1. **Initialize Git repository locally:**
   \`\`\`bash
   git init
   git add .
   git commit -m "Initial commit - Rollback point ${this.currentState}"
   \`\`\`

2. **Create GitHub repository:**
   - Go to https://github.com/new
   - Create a new repository (e.g., "groomit-manager")
   - Don't initialize with README, .gitignore, or license

3. **Connect and push to GitHub:**
   \`\`\`bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   \`\`\`

### Option 2: Using GitHub CLI (if available)

1. **Install GitHub CLI:**
   - Visit https://cli.github.com/
   - Follow installation instructions

2. **Authenticate and create repo:**
   \`\`\`bash
   gh auth login
   gh repo create groomit-manager --public --source=. --remote=origin --push
   \`\`\`

### Option 3: Import to existing GitHub repo

If you already have a GitHub repository:

1. **Clone your existing repo to a new folder:**
   \`\`\`bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git temp-repo
   \`\`\`

2. **Copy your current code to the cloned repo:**
   - Copy all files except .git folder
   - Commit and push changes

### Files Excluded from Sync (.gitignore)

The following should be added to .gitignore:
- node_modules/
- .env
- .env.local
- dist/
- build/
- *.log
- .DS_Store
- rollback-points/

## Rollback Instructions

To restore from this rollback point:

1. **Copy files back:**
   \`\`\`bash
   cp -r rollback-points/${this.currentState}/* .
   \`\`\`

2. **Reinstall dependencies:**
   \`\`\`bash
   npm install
   cd client && npm install
   \`\`\`

3. **Restart development servers:**
   \`\`\`bash
   npm run dev
   \`\`\`

## Project State Summary

- **Timestamp:** ${new Date().toISOString()}
- **Environment:** Replit Development
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express + Firebase
- **Database:** Firebase Firestore
- **Deployment:** Multiple strategies available

## Important Notes

- This rollback point preserves your current working state
- All critical configuration files are backed up
- Firebase configuration and secrets are preserved
- Development and deployment scripts are included
`;

    fs.writeFileSync('./GITHUB_SYNC_INSTRUCTIONS.md', instructions);
    console.log('✓ GitHub sync instructions created: GITHUB_SYNC_INSTRUCTIONS.md');
  }

  createGitignore() {
    const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
client/dist/
client/build/

# Rollback points
rollback-points/

# Logs
*.log
logs/

# Firebase
.firebase/
firebase-debug.log

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Temporary files
*.tmp
*.temp

# Cache
.cache/
.parcel-cache/

# Testing
coverage/

# Misc
.replit
.replit.nix
`;

    fs.writeFileSync('.gitignore', gitignoreContent);
    console.log('✓ .gitignore file created');
  }

  async listExistingRollbackPoints() {
    if (!fs.existsSync(this.backupDir)) {
      console.log('📝 No previous rollback points found');
      return [];
    }

    const rollbackPoints = fs.readdirSync(this.backupDir)
      .filter(item => item.startsWith('rollback-'))
      .sort()
      .reverse(); // Most recent first

    if (rollbackPoints.length === 0) {
      console.log('📝 No previous rollback points found');
      return [];
    }

    console.log('\n📚 Existing rollback points:');
    rollbackPoints.forEach((point, index) => {
      const manifestPath = path.join(this.backupDir, point, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        console.log(`${index + 1}. ${point}`);
        console.log(`   Created: ${new Date(manifest.timestamp).toLocaleString()}`);
        console.log(`   Files: ${manifest.files.length}`);
      } else {
        console.log(`${index + 1}. ${point} (no manifest)`);
      }
    });

    return rollbackPoints;
  }

  async run() {
    console.log('🚀 GroomIT Manager - Rollback & GitHub Sync Manager');
    console.log('==================================================\n');

    // List existing rollback points
    await this.listExistingRollbackPoints();

    // Create new rollback point
    const rollbackPath = await this.createRollbackPoint();

    // Generate GitHub sync instructions
    this.generateGitHubSyncInstructions();

    // Create .gitignore
    this.createGitignore();

    console.log('\n✅ Rollback point created successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Review GITHUB_SYNC_INSTRUCTIONS.md for detailed sync steps');
    console.log('2. Your current state is safely backed up');
    console.log('3. You can now proceed with GitHub synchronization');
    console.log('\n💡 Tip: Keep this rollback point until you confirm GitHub sync is successful');

    return {
      rollbackPath,
      timestamp: this.timestamp,
      currentState: this.currentState
    };
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new RollbackManager();
  manager.run().catch(console.error);
}

export default RollbackManager;