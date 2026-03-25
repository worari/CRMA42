#!/bin/bash

# Quick Start Guide for Next.js Military Alumni Directory
# Run this script or follow the commands below

echo "🚀 Military Alumni Directory - Next.js Setup"
echo "============================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "⚙️  Creating .env.local..."
    cat > .env.local << EOF
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crma42"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="crma42"

JWT_SECRET="crma42_secret_key"

NEXT_PUBLIC_API_URL="http://localhost:3000"
EOF
    echo "✅ .env.local created"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "🗄️  Database Setup Required"
echo "============================"
echo ""
echo "Make sure PostgreSQL is running and execute:"
echo "  createdb -U postgres crma42"
echo ""
echo "Then initialize the database:"
echo "  npm run init-db"
echo ""

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Set up PostgreSQL database: createdb -U postgres crma42"
echo "2. Initialize database: npm run init-db"
echo "3. Start development: npm run dev"
echo "4. Open browser: http://localhost:3000"
echo ""
echo "🎉 Happy coding!"
