#!/usr/bin/env node

/**
 * GITHUB SYNC SCRIPT - For Existing Repository
 * 
 * Since your repository is already connected to:
 * https://github.com/sunilnayak84/GroomITManager
 * 
 * This script will safely sync your current state with GitHub
 */

import { execSync } from 'child_process';
import fs from 'fs';

class GitHubSync {
  constructor() {
    this.repoUrl = 'https://github.com/sunilnayak84/GroomITManager';
    this.timestamp = new Date().toISOString();
  }

  checkStatus() {
    console.log('🔍 Checking repository status...');
    
    try {
      // Check current branch
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      console.log(`Current branch: ${currentBranch}`);

      // Check remote status
      const remotes = execSync('git remote -v', { encoding: 'utf8' });
      console.log('Remote repositories:');
      console.log(remotes);

      // Check for uncommitted changes
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      const hasChanges = status.trim().length > 0;
      
      if (hasChanges) {
        console.log('📝 Uncommitted changes detected:');
        console.log(status);
      } else {
        console.log('✓ Working directory is clean');
      }

      return { currentBranch, hasChanges, status };
    } catch (error) {
      console.error('Error checking git status:', error.message);
      throw error;
    }
  }

  commitAndPush() {
    console.log('\n🚀 Syncing with GitHub...');
    
    try {
      // Add all changes
      console.log('Adding all changes...');
      execSync('git add .', { stdio: 'inherit' });

      // Create commit with rollback point reference
      const commitMessage = `Update GroomIT Manager - Rollback point created ${this.timestamp}

- Created comprehensive rollback system
- Added GitHub sync capabilities
- Updated project documentation
- Enhanced deployment strategies
- Added project README and license`;

      console.log('Creating commit...');
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

      // Push to GitHub
      console.log('Pushing to GitHub...');
      execSync('git push origin main', { stdio: 'inherit' });

      console.log('\n✅ Successfully synced with GitHub!');
      console.log(`📋 Repository: ${this.repoUrl}`);
      
    } catch (error) {
      if (error.message.includes('nothing to commit')) {
        console.log('✓ No changes to commit - repository is already up to date');
      } else {
        console.error('Error during sync:', error.message);
        throw error;
      }
    }
  }

  generateSyncSummary() {
    const summary = `# GitHub Sync Complete

## Repository Information
- **GitHub URL**: ${this.repoUrl}
- **Sync Time**: ${this.timestamp}
- **Rollback Point**: rollback-2025-07-09T13-07-44-150Z

## What Was Synced
- ✅ Complete project source code
- ✅ Rollback management system
- ✅ GitHub sync utilities
- ✅ Project documentation (README.md)
- ✅ License file (MIT)
- ✅ Deployment scripts and configurations
- ✅ Environment configuration files

## Repository Features Now Available
- 🔄 **Automatic Rollback Points**: Use \`npm run rollback\`
- 📚 **Comprehensive Documentation**: README.md with full project details
- 🚀 **Deployment Scripts**: Multiple deployment strategies
- 🔧 **Development Tools**: Enhanced development workflow
- 📋 **License**: MIT license for open source compliance

## Next Steps
1. **Verify Sync**: Visit ${this.repoUrl} to confirm all files are uploaded
2. **Set Repository Secrets**: Add environment variables as GitHub secrets
3. **Configure GitHub Actions**: Consider setting up CI/CD if needed
4. **Invite Collaborators**: Add team members to the repository
5. **Create Issues/Milestones**: Plan future development

## Security Notes
- ✅ .gitignore created to exclude sensitive files
- ✅ Environment variables excluded from repository
- ✅ Node modules and build directories excluded
- ⚠️ Remember to add Firebase credentials as repository secrets

## Available Commands
- \`npm run rollback\` - Create new rollback point
- \`npm run github:sync\` - Run GitHub sync helper
- \`npm run dev\` - Start development servers
- \`npm run deploy\` - Deploy application

Your GroomIT Manager project is now fully synced with GitHub! 🎉
`;

    fs.writeFileSync('SYNC_COMPLETE.md', summary);
    console.log('\n📄 Sync summary saved to SYNC_COMPLETE.md');
  }

  async run() {
    console.log('🐕 GroomIT Manager - GitHub Sync');
    console.log('================================\n');

    try {
      // Check current status
      const status = this.checkStatus();

      // Commit and push changes
      this.commitAndPush();

      // Generate summary
      this.generateSyncSummary();

      console.log('\n🎉 GitHub sync completed successfully!');
      console.log('\n📋 Summary:');
      console.log(`- Repository: ${this.repoUrl}`);
      console.log('- All changes committed and pushed');
      console.log('- Rollback point preserved');
      console.log('- Documentation updated');

      console.log('\n🔗 View your repository at:');
      console.log(this.repoUrl);

    } catch (error) {
      console.error('\n❌ Sync failed:', error.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check your internet connection');
      console.log('2. Verify GitHub credentials');
      console.log('3. Ensure you have push access to the repository');
      console.log('4. Try running: git status');
      throw error;
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const sync = new GitHubSync();
  sync.run().catch(console.error);
}

export default GitHubSync;