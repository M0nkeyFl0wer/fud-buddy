
# Git Setup Instructions

Since the `.gitignore` file cannot be modified directly in Lovable, follow these steps when setting up Git locally:

## Setting up Git with proper exclusions

1. Clone or download your project from Lovable
2. Navigate to your project directory
3. Create a `.gitignore` file with these recommended contents:

```
# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build
/dist

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Editor directories and files
.idea
.vscode
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# System files that were causing warnings
AppData/
Local Settings/
My Documents/
NetHood/
PrintHood/
Recent/
SendTo/
Start Menu/
Templates/
Cookies/
Application Data/
```

## Initializing Git and pushing to your repository

```bash
# Initialize Git (if not already done)
git init

# Add your GitHub repository as remote
git remote add origin https://github.com/M0nkeyFl0wer/fud-buddy.git

# Stage your files (this will respect your .gitignore)
git add .

# Commit your changes
git commit -m "Initial commit of FUD Buddy"

# Push to your repository
git push -u origin main
```

If you're working with a branch other than `main`, replace `main` with your branch name.

## Ignoring files without modifying .gitignore

If you need to ignore files without modifying `.gitignore`, you can use:

```bash
# To ignore specific files locally without changing .gitignore
git update-index --assume-unchanged [file]

# To start tracking the file again
git update-index --no-assume-unchanged [file]
```

This guide can be deleted once you've successfully set up your Git repository.
