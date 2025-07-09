## NEWREPO
# Create new GitHub repository
git init
git add .
git commit -m "Initial commit - GroomIT Manager"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/groomit-manager.git
git push -u origin main

## EXISTINGREPO
# Sync with existing GitHub repository
git add .
git commit -m "Update GroomIT Manager - 2025-07-09T13:07:51.313Z"
git push origin main

## GITHUBCLI
# Using GitHub CLI (if available)
gh auth login
gh repo create groomit-manager --public --source=. --remote=origin --push
