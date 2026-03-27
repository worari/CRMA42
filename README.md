# Military Preparatory School Alumni Directory

## ✅ Migrated to Next.js 14

This project has been successfully converted from Vue.js + Express.js to a modern **Next.js 14 full-stack application**.


## Setup Instructions

Ensure you have PostgreSQL running locally on localhost:5432.

### 1. Initialize
npm install
copy .env.example .env.local
createdb -U postgres crma42
npm run init-db

Default seed credentials:
- Super Admin: admin@crma42.local / Admin1234!
- Member user: member1@crma42.local / Member1234!

Optional overrides in .env.local:
- SEED_ADMIN_EMAIL
- SEED_ADMIN_PASSWORD
- SEED_ADMIN_PHONE
- SEED_ADMIN_MILITARY_ID

### 2. Start Development  
npm run dev

Opens on http://localhost:3000

### 3. Run Smoke Test
npm run smoke
