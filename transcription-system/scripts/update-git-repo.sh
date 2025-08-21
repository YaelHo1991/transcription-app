#!/bin/bash

# ============================================
# Git Repository Update Script
# Replaces old PHP system with new Node.js system
# ============================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BACKUP_BRANCH="php-backup-$(date +%Y%m%d)"
NEW_VERSION="v2.0.0"
COMMIT_MESSAGE="Complete system rewrite: Node.js/React/PostgreSQL

- Backend: Express.js with TypeScript
- Frontend: Next.js with React and TypeScript
- Database: PostgreSQL with migrations
- Features: USB pedal support, waveform visualization, virtual scrolling
- Deployment: Docker/PM2 with automated scripts
- Security: JWT authentication, permission-based access
- Performance: Handles files up to 5GB with chunked processing"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# ASCII Art Banner
show_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════╗"
    echo "║        Git Repository Update Script                ║"
    echo "║    ⚠️  This will REPLACE the old PHP system ⚠️      ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check if in git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository!"
        print_info "Please run this script from your git repository root"
        exit 1
    fi
    
    print_status "Git repository detected"
}

# Check for uncommitted changes
check_uncommitted() {
    if ! git diff-index --quiet HEAD --; then
        print_warning "You have uncommitted changes!"
        git status --short
        echo ""
        read -p "Stash these changes and continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git stash push -m "Stashed before repository update $(date)"
            print_status "Changes stashed"
        else
            print_info "Please commit or stash your changes first"
            exit 1
        fi
    fi
}

# Create backup branch
create_backup() {
    print_status "Creating backup branch: $BACKUP_BRANCH"
    
    # Get current branch name
    CURRENT_BRANCH=$(git branch --show-current)
    
    # Create and push backup branch
    git checkout -b "$BACKUP_BRANCH"
    
    print_info "Pushing backup branch to remote..."
    git push origin "$BACKUP_BRANCH"
    
    print_status "Backup branch created and pushed: $BACKUP_BRANCH"
    
    # Return to original branch
    git checkout "$CURRENT_BRANCH"
}

# Clean repository
clean_repository() {
    print_status "Removing old PHP system files..."
    
    # Remove all files except .git
    find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} \;
    
    print_status "Old files removed"
    
    # Commit the removal
    git add -A
    git commit -m "Remove old PHP transcription system

Preparing for complete system rewrite.
Old system backed up in branch: $BACKUP_BRANCH"
    
    print_status "Removal committed"
}

# Add new system files
add_new_system() {
    print_status "Adding new Node.js/React system files..."
    
    # Create .gitignore first
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
*.test.js
*.spec.js

# Production
build/
dist/
.next/
out/

# Environment files
.env
.env.local
.env.development
.env.development.local
.env.test
.env.test.local
.env.production
.env.production.local
.database.conf

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# OS files
.DS_Store
Thumbs.db
*.swp
*.swo
*~

# IDE
.vscode/
.idea/
*.sublime-project
*.sublime-workspace

# Docker
.dockerignore
docker-compose.override.yml

# Uploads and user data
uploads/
user_data/
temp/
waveform-cache/
backups/
*.backup
*.sql

# SSL certificates
*.pem
*.key
*.crt
*.cer

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/

# Misc
.cache/
.npm/
.eslintcache
.yarn-integrity
*.pid
*.seed
*.pid.lock

# TypeScript
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn
yarn-error.log
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.pnp.*

# PM2
.pm2/
pids/
logs/

# Database
*.sqlite
*.db

# Temporary files
tmp/
temp/
*.tmp
*.temp

# Lock files (keep package-lock.json)
yarn.lock
pnpm-lock.yaml
EOF
    
    print_status "Created .gitignore"
    
    # Copy all new system files
    print_info "Copying new system files..."
    
    # Note: This assumes you're running from the transcription-system directory
    # You'll need to adjust paths based on your actual structure
    
    # Create directory structure
    mkdir -p backend/src backend/migrations backend/scripts
    mkdir -p frontend/main-app/src frontend/main-app/public
    mkdir -p nginx scripts docs
    
    # Copy files (you'll need to have these ready)
    # This is where you'd copy all your new files
    
    print_warning "Please manually copy your new system files to this directory"
    print_info "Required structure:"
    echo "  - backend/         (Express.js backend)"
    echo "  - frontend/        (Next.js frontend)"
    echo "  - nginx/           (Nginx configurations)"
    echo "  - scripts/         (Deployment scripts)"
    echo "  - docs/            (Documentation)"
    echo "  - docker-compose.production.yml"
    echo "  - Dockerfile.backend"
    echo "  - Dockerfile.frontend"
    echo "  - pm2.ecosystem.config.js"
    echo "  - README.md"
    echo ""
    read -p "Have you copied all files? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Please copy files and run script again"
        exit 1
    fi
}

# Verify no sensitive files
verify_security() {
    print_status "Checking for sensitive files..."
    
    SENSITIVE_FILES=(
        ".env"
        ".env.production"
        ".env.local"
        ".database.conf"
        "*.pem"
        "*.key"
        "*.crt"
    )
    
    FOUND_SENSITIVE=0
    for pattern in "${SENSITIVE_FILES[@]}"; do
        if find . -name "$pattern" -type f 2>/dev/null | grep -q .; then
            print_warning "Found sensitive file matching: $pattern"
            find . -name "$pattern" -type f
            FOUND_SENSITIVE=1
        fi
    done
    
    if [ $FOUND_SENSITIVE -eq 1 ]; then
        print_error "Sensitive files detected!"
        print_warning "These files should NOT be committed to Git"
        read -p "Remove these files before committing? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            for pattern in "${SENSITIVE_FILES[@]}"; do
                find . -name "$pattern" -type f -delete 2>/dev/null || true
            done
            print_status "Sensitive files removed"
        else
            print_warning "Proceeding with sensitive files (NOT RECOMMENDED)"
        fi
    else
        print_status "No sensitive files found"
    fi
}

# Commit new system
commit_new_system() {
    print_status "Committing new system..."
    
    # Add all files
    git add -A
    
    # Show what will be committed
    print_info "Files to be committed:"
    git status --short
    
    echo ""
    read -p "Proceed with commit? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Commit cancelled"
        exit 1
    fi
    
    # Commit
    git commit -m "$COMMIT_MESSAGE"
    
    print_status "New system committed"
}

# Tag version
tag_version() {
    print_status "Creating version tag: $NEW_VERSION"
    
    git tag -a "$NEW_VERSION" -m "Complete system rewrite: Node.js/React/PostgreSQL

Major changes:
- Migrated from PHP to Node.js/TypeScript
- New React/Next.js frontend
- PostgreSQL database (from MySQL)
- Docker containerization
- Automated deployment scripts
- USB pedal support over HTTPS
- Large file handling (up to 5GB)
- Virtual scrolling for performance"
    
    print_status "Version tagged: $NEW_VERSION"
}

# Push to remote
push_to_remote() {
    print_warning "Ready to push to remote repository"
    print_warning "This will REPLACE the old system in the repository!"
    echo ""
    read -p "Push to remote? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Push cancelled. You can push manually later with:"
        echo "  git push origin main --force-with-lease"
        echo "  git push origin $NEW_VERSION"
        return
    fi
    
    # Get current branch
    CURRENT_BRANCH=$(git branch --show-current)
    
    # Push branch
    print_info "Pushing branch..."
    git push origin "$CURRENT_BRANCH" --force-with-lease
    
    # Push tag
    print_info "Pushing tag..."
    git push origin "$NEW_VERSION"
    
    print_status "Successfully pushed to remote!"
}

# Main execution
main() {
    show_banner
    
    print_warning "This script will:"
    echo "  1. Backup current PHP system to branch: $BACKUP_BRANCH"
    echo "  2. Remove ALL files from main branch"
    echo "  3. Add new Node.js/React system"
    echo "  4. Push changes to remote repository"
    echo ""
    print_error "⚠️  THIS IS IRREVERSIBLE! Make sure you have a backup! ⚠️"
    echo ""
    read -p "Continue? Type 'yes' to proceed: " -r
    if [[ ! $REPLY == "yes" ]]; then
        print_info "Cancelled"
        exit 0
    fi
    
    echo ""
    check_git_repo
    check_uncommitted
    
    # Step 1: Backup
    print_info "Step 1: Creating backup..."
    create_backup
    
    # Step 2: Clean
    print_info "Step 2: Cleaning repository..."
    clean_repository
    
    # Step 3: Add new files
    print_info "Step 3: Adding new system..."
    add_new_system
    
    # Step 4: Security check
    print_info "Step 4: Security verification..."
    verify_security
    
    # Step 5: Commit
    print_info "Step 5: Committing changes..."
    commit_new_system
    
    # Step 6: Tag
    print_info "Step 6: Tagging version..."
    tag_version
    
    # Step 7: Push
    print_info "Step 7: Pushing to remote..."
    push_to_remote
    
    # Summary
    echo ""
    echo "=========================================="
    print_status "Git repository update completed!"
    echo "=========================================="
    echo ""
    print_info "Summary:"
    echo "  - Old system backed up to: $BACKUP_BRANCH"
    echo "  - New system committed with tag: $NEW_VERSION"
    echo "  - Repository ready for deployment"
    echo ""
    print_info "Next steps on DigitalOcean droplet:"
    echo "  1. Clone/pull the updated repository"
    echo "  2. Run setup-droplet.sh to prepare server"
    echo "  3. Run init-database.sh to setup database"
    echo "  4. Run deploy.sh to deploy application"
    echo ""
    print_warning "Rollback instructions (if needed):"
    echo "  git checkout $BACKUP_BRANCH"
    echo "  git branch -D main"
    echo "  git checkout -b main"
    echo "  git push origin main --force"
    echo ""
}

# Run main function
main "$@"