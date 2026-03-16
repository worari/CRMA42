# Military Preparatory School Alumni Directory

Enterprise grade Monorepo for Alumni Directory management.

## Setup Instructions

Ensure you have PostgreSQL running locally on `localhost:5432` with username `postgres` and password `postgres`. Create a database named `crma42`.

### 1. Database & Backend
```bash
cd backend
npm install
npm run init-db  # Creates schema and seeds 20 records
npm run dev      # Starts API on http://localhost:3000
```

### 2. Frontend
```bash
cd ../frontend
npm install
npm run dev      # Starts Vue on http://localhost:5173
```
