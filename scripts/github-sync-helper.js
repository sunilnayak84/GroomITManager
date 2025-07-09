#!/usr/bin/env node

/**
 * GITHUB SYNC HELPER
 * 
 * This script helps prepare your project for GitHub synchronization
 * and provides guided steps for different sync scenarios.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

class GitHubSyncHelper {
  constructor() {
    this.projectName = 'groomit-manager';
    this.currentBranch = 'main';
  }

  checkGitStatus() {
    console.log('🔍 Checking Git status...');
    
    try {
      // Check if .git directory exists
      const gitExists = fs.existsSync('.git');
      console.log(`Git repository: ${gitExists ? '✓ Initialized' : '✗ Not initialized'}`);

      if (gitExists) {
        try {
          const status = execSync('git status --porcelain', { encoding: 'utf8' });
          const hasChanges = status.trim().length > 0;
          console.log(`Working directory: ${hasChanges ? '⚠️ Has uncommitted changes' : '✓ Clean'}`);

          // Check for remote
          try {
            const remotes = execSync('git remote -v', { encoding: 'utf8' });
            if (remotes.trim()) {
              console.log('Remote repositories:');
              console.log(remotes);
            } else {
              console.log('Remote repositories: ✗ None configured');
            }
          } catch (error) {
            console.log('Remote repositories: ✗ None configured');
          }
        } catch (error) {
          console.log('Git status check failed:', error.message);
        }
      }
    } catch (error) {
      console.log('Git check failed:', error.message);
    }
  }

  generateProjectReadme() {
    const readmeContent = `# GroomIT Manager

A comprehensive pet grooming and walking business management platform for the Indian market.

## Features

- 🐕 **Pet Management**: Detailed pet profiles with temperament tracking
- 📅 **Appointment Scheduling**: Advanced calendar-based booking system
- 👥 **Customer Management**: Complete customer relationship management
- 💰 **Billing & Payments**: Integrated billing with multiple payment options
- 📊 **Analytics Dashboard**: Business insights and performance metrics
- 🏢 **Multi-role Access**: Manager, staff, and customer portals
- 📱 **Mobile Responsive**: Works seamlessly on all devices

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Radix UI** components with Tailwind CSS
- **TanStack Query** for server state management
- **Wouter** for lightweight routing
- **FullCalendar** for appointment scheduling

### Backend
- **Node.js** with Express.js
- **Firebase Authentication** for secure user management
- **Firebase Firestore** for real-time data storage
- **Firebase Storage** for file uploads
- **WebSocket** support for real-time updates

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project setup

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/YOUR_USERNAME/groomit-manager.git
   cd groomit-manager
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   cd client && npm install && cd ..
   \`\`\`

3. **Environment Setup**
   - Copy \`.env.example\` to \`.env\`
   - Add your Firebase configuration
   - Configure other environment variables

4. **Start development servers**
   \`\`\`bash
   npm run dev
   \`\`\`

### Development Scripts

- \`npm run dev\` - Start both frontend and backend development servers
- \`npm run build\` - Build the application for production
- \`npm run deploy\` - Deploy to production
- \`npm test\` - Run tests

## Project Structure

\`\`\`
groomit-manager/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API services
│   │   └── types/         # TypeScript type definitions
│   └── package.json
├── server/                # Express backend
│   ├── routes/           # API route handlers
│   ├── middleware/       # Express middleware
│   ├── services/         # Business logic services
│   └── types/           # Backend type definitions
├── scripts/              # Build and deployment scripts
└── package.json
\`\`\`

## Deployment

The application supports multiple deployment strategies:

1. **Replit Deployment** (Recommended for development)
2. **Firebase Hosting** with Functions
3. **Traditional cloud hosting** (AWS, GCP, etc.)

See \`DEPLOYMENT.md\` for detailed deployment instructions.

## Features Overview

### Customer Management
- Complete customer profiles with contact information
- Pet registration with photos and medical records
- Service history and preferences tracking
- Loyalty points and rewards system

### Appointment Scheduling
- Calendar-based booking interface
- Service selection with duration and pricing
- Groomer assignment and availability management
- Automated reminders and notifications

### Pet Temperament Tracking
- Detailed temperament profiles for each pet
- Behavioral notes and handling instructions
- Photo documentation of pets
- Medical and dietary restrictions tracking

### Billing & Payments
- Automated invoice generation
- Multiple payment method support
- Service packages and discounts
- Payment history and reporting

### Analytics & Reporting
- Business performance metrics
- Revenue tracking and forecasting
- Customer retention analytics
- Service popularity insights

## Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## Support

For support, email support@groomit.com or join our Discord community.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with modern React and Node.js ecosystem
- Powered by Firebase for authentication and real-time data
- UI components from Radix UI and styled with Tailwind CSS
- Calendar functionality powered by FullCalendar
`;

    fs.writeFileSync('README.md', readmeContent);
    console.log('✓ README.md created with comprehensive project documentation');
  }

  generatePackageJsonScripts() {
    const packageJsonPath = './package.json';
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Ensure essential scripts exist
      packageJson.scripts = {
        ...packageJson.scripts,
        "dev": "concurrently \"cd client && npm run dev\" \"npm run dev:server\"",
        "dev:server": "cd server && npm run dev",
        "build": "npm run build:client && npm run build:server",
        "build:client": "cd client && npm run build",
        "build:server": "echo 'Server build complete'",
        "start": "node index.js",
        "deploy": "node quick-deploy.js",
        "rollback": "node rollback-manager.js",
        "github:sync": "node scripts/github-sync-helper.js"
      };

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('✓ Package.json scripts updated');
    }
  }

  createLicense() {
    const licenseContent = `MIT License

Copyright (c) ${new Date().getFullYear()} GroomIT Manager

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

    fs.writeFileSync('LICENSE', licenseContent);
    console.log('✓ LICENSE file created');
  }

  generateSyncCommands() {
    const commands = {
      newRepo: [
        '# Create new GitHub repository',
        'git init',
        'git add .',
        'git commit -m "Initial commit - GroomIT Manager"',
        'git branch -M main',
        'git remote add origin https://github.com/YOUR_USERNAME/groomit-manager.git',
        'git push -u origin main'
      ],
      existingRepo: [
        '# Sync with existing GitHub repository',
        'git add .',
        'git commit -m "Update GroomIT Manager - ' + new Date().toISOString() + '"',
        'git push origin main'
      ],
      githubCLI: [
        '# Using GitHub CLI (if available)',
        'gh auth login',
        'gh repo create groomit-manager --public --source=. --remote=origin --push'
      ]
    };

    console.log('\n📋 GitHub Sync Commands:');
    console.log('\n1️⃣ For NEW GitHub repository:');
    commands.newRepo.forEach(cmd => console.log(cmd));

    console.log('\n2️⃣ For EXISTING GitHub repository:');
    commands.existingRepo.forEach(cmd => console.log(cmd));

    console.log('\n3️⃣ Using GitHub CLI:');
    commands.githubCLI.forEach(cmd => console.log(cmd));

    // Save commands to file
    const commandsContent = Object.entries(commands)
      .map(([title, cmds]) => `## ${title.toUpperCase()}\n${cmds.join('\n')}\n`)
      .join('\n');

    fs.writeFileSync('GITHUB_COMMANDS.md', commandsContent);
    console.log('\n✓ Commands saved to GITHUB_COMMANDS.md');
  }

  async run() {
    console.log('🐕 GroomIT Manager - GitHub Sync Helper');
    console.log('=====================================\n');

    // Check current Git status
    this.checkGitStatus();

    console.log('\n📝 Preparing project for GitHub...');

    // Generate project files
    this.generateProjectReadme();
    this.generatePackageJsonScripts();
    this.createLicense();

    // Generate sync commands
    this.generateSyncCommands();

    console.log('\n✅ Project prepared for GitHub sync!');
    console.log('\n📋 Files created/updated:');
    console.log('- README.md (comprehensive project documentation)');
    console.log('- LICENSE (MIT license)');
    console.log('- package.json (updated scripts)');
    console.log('- GITHUB_COMMANDS.md (sync commands)');

    console.log('\n🚀 Next Steps:');
    console.log('1. Create a rollback point: npm run rollback');
    console.log('2. Review the generated README.md');
    console.log('3. Follow commands in GITHUB_COMMANDS.md');
    console.log('4. Set up your GitHub repository');
    console.log('5. Push your code to GitHub');

    console.log('\n💡 Pro Tips:');
    console.log('- Create a GitHub repository with the same name: groomit-manager');
    console.log('- Add environment variables as repository secrets');
    console.log('- Consider setting up GitHub Actions for deployment');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const helper = new GitHubSyncHelper();
  helper.run().catch(console.error);
}

export default GitHubSyncHelper;