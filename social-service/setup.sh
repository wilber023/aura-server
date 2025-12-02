#!/bin/bash

# =================================================================
# Setup Script for Social Service
#
# This script prepares the environment for running the social service:
# 1. Verifies Node.js and npm installation
# 2. Verifies MySQL/MariaDB installation and status
# 3. Creates database and user
# 4. Installs npm dependencies
# 5. Runs database migrations
# 
# After successful execution, you can run: npm run dev
# =================================================================

# --- Colors for better output ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Social Service Setup${NC}\n"

# --- STEP 1: VERIFY NODE.JS AND NPM ---
echo -e "${YELLOW}Step 1: Verifying Node.js and npm...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed.${NC}"
    echo "Please install Node.js v16 or higher from https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ Error: npm is not installed.${NC}"
    echo "Please install npm (usually comes with Node.js)"
    exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ Node.js ${NODE_VERSION} installed${NC}"
echo -e "${GREEN}✅ npm ${NPM_VERSION} installed${NC}"
echo ""

# --- STEP 2: VERIFY MYSQL/MARIADB ---
echo -e "${YELLOW}Step 2: Verifying MySQL/MariaDB installation...${NC}"

if ! command -v mysql &> /dev/null; then
    echo -e "${RED}❌ Error: MySQL/MariaDB client is not installed.${NC}"
    echo "Installing MySQL/MariaDB Server..."
    
    # Try to install on Debian/Ubuntu systems
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y mariadb-server mariadb-client
    # Try to install on RedHat/CentOS systems
    elif command -v yum &> /dev/null; then
        sudo yum install -y mariadb-server mariadb
    # Try to install on macOS
    elif command -v brew &> /dev/null; then
        brew install mysql
    else
        echo -e "${RED}❌ Could not auto-install MySQL/MariaDB.${NC}"
        echo "Please install it manually and run this script again."
        exit 1
    fi
    
    if ! command -v mysql &> /dev/null; then
        echo -e "${RED}❌ Error: Failed to install MySQL/MariaDB.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ MySQL/MariaDB Server installed successfully.${NC}"
else
    echo -e "${GREEN}✅ MySQL/MariaDB client is installed.${NC}"
fi

# Verify MySQL service is running
if command -v systemctl &> /dev/null; then
    # Try mariadb first, then mysql
    if systemctl list-units --type=service | grep -q mariadb; then
        SERVICE_NAME="mariadb"
    elif systemctl list-units --type=service | grep -q mysql; then
        SERVICE_NAME="mysql"
    else
        echo -e "${YELLOW}⚠️ Warning: Could not find MySQL/MariaDB service.${NC}"
        echo "Please ensure MySQL/MariaDB is running before continuing."
        SERVICE_NAME=""
    fi
    
    if [ -n "$SERVICE_NAME" ]; then
        if ! systemctl is-active --quiet $SERVICE_NAME; then
            echo "Starting $SERVICE_NAME service..."
            sudo systemctl start $SERVICE_NAME
            if ! systemctl is-active --quiet $SERVICE_NAME; then
                echo -e "${RED}❌ Error: Could not start $SERVICE_NAME service.${NC}"
                echo "Please start it manually and run this script again."
                exit 1
            fi
            echo -e "${GREEN}✅ $SERVICE_NAME service started successfully.${NC}"
        else
            echo -e "${GREEN}✅ $SERVICE_NAME service is running.${NC}"
        fi
    fi
elif command -v service &> /dev/null; then
    # Fallback to service command
    if service mysql status &> /dev/null || service mariadb status &> /dev/null; then
        echo -e "${GREEN}✅ MySQL/MariaDB service is running.${NC}"
    else
        echo -e "${YELLOW}⚠️ Warning: Could not verify MySQL/MariaDB status.${NC}"
        echo "Please ensure it is running before continuing."
    fi
else
    echo -e "${YELLOW}⚠️ Warning: Could not check MySQL/MariaDB service status.${NC}"
    echo "Please ensure it is running before continuing."
fi
echo ""

# --- STEP 3: SETUP DATABASE AND USER ---
echo -e "${YELLOW}Step 3: Creating database and user...${NC}"
echo "You will be prompted for MySQL root password."

if [ -f "scripts/database-setup.sql" ]; then
    if sudo mysql -u root < scripts/database-setup.sql 2>/dev/null; then
        echo -e "${GREEN}✅ Database 'posts_dev_db' and user 'posts_user' created successfully.${NC}"
    else
        echo -e "${YELLOW}⚠️ Database setup completed with warnings (user/database may already exist).${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Warning: scripts/database-setup.sql not found. Skipping database setup.${NC}"
    echo "You may need to create the database manually."
fi
echo ""

# --- STEP 4: INSTALL DEPENDENCIES ---
echo -e "${YELLOW}Step 4: Installing npm dependencies...${NC}"

if npm install; then
    echo -e "${GREEN}✅ Dependencies installed successfully.${NC}"
else
    echo -e "${RED}❌ Error: Failed to install dependencies.${NC}"
    echo "Please check your internet connection and npm configuration."
    exit 1
fi
echo ""

# --- STEP 5: RUN MIGRATIONS ---
echo -e "${YELLOW}Step 5: Running database migrations...${NC}"

if npm run migrate:up; then
    echo -e "${GREEN}✅ Migrations executed successfully. Tables have been created.${NC}"
else
    echo -e "${YELLOW}⚠️ Warning: Migration errors occurred.${NC}"
    echo "This might be normal if migrations have already been run."
    echo "Check the output above for details."
fi
echo ""

# --- STEP 6: RUN ADDITIONAL SETUP SCRIPTS (if needed) ---
echo -e "${YELLOW}Step 6: Running additional setup scripts...${NC}"

if [ -f "scripts/migrations/add-missing-columns.js" ]; then
    echo "Adding missing columns to user_profiles table..."
    if node scripts/migrations/add-missing-columns.js; then
        echo -e "${GREEN}✅ Missing columns added successfully.${NC}"
    else
        echo -e "${YELLOW}⚠️ Warning: Could not add missing columns (may already exist).${NC}"
    fi
else
    echo "ℹ️ No additional column migrations needed."
fi
echo ""

# --- COMPLETION ---
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo -e "  1. Review your .env file and update configuration if needed"
echo -e "  2. Start the development server with: ${GREEN}npm run dev${NC}"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo -e "  • API Documentation: docs/API_DOCUMENTATION.md"
echo -e "  • DDD Structure: docs/ESTRUCTURA_DDD.md"
echo -e "  • Profile Upload: docs/PROFILE_UPLOAD_IMPLEMENTATION.md"
echo ""
echo -e "${BLUE}🛠️ Available npm scripts:${NC}"
echo -e "  • ${GREEN}npm run dev${NC}        - Start development server"
echo -e "  • ${GREEN}npm start${NC}          - Start production server"
echo -e "  • ${GREEN}npm test${NC}           - Run tests"
echo -e "  • ${GREEN}npm run migrate:up${NC} - Run migrations"
echo ""
