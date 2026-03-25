# ทำเนียบรุ่นเตรียมทหาร - Military Alumni Directory (Next.js)

Enterprise-grade Military Alumni Directory system built with Next.js 14, React, and PostgreSQL.

## 🚀 Project Migration to Next.js

This project has been successfully migrated from:
- **Frontend**: Vue.js 3 + Vite → **React 18 + Next.js 14**
- **Backend**: Express.js → **Next.js API Routes**
- **Database**: PostgreSQL (unchanged)
- **UI Framework**: Tailwind CSS (maintained)

## 📋 Prerequisites

- **PostgreSQL** 12+ running on `localhost:5432`
- **Node.js** 18+ and npm/yarn
- Create a database named `crma42`

### Database Setup

```bash
# Using PostgreSQL CLI
createdb -U postgres crma42
```

Set credentials in `.env.local`:
```
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crma42
```

## 🔧 Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Initialize Database (First Time Only)

```bash
npm run init-db
```

This script will:
- Create all necessary database tables
- Seed 20 sample alumni records
- Set up user authentication table

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
app/
├── api/
│   ├── auth/              # Authentication routes
│   │   ├── register/route.js
│   │   ├── login/route.js
│   │   └── users/[id]/route.js
│   ├── alumni/            # Alumni CRUD routes
│   │   ├── route.js
│   │   ├── [id]/route.js
│   │   └── dictionary/[type]/route.js
│   └── dashboard/         # Dashboard stats routes
│       ├── stats/route.js
│       └── map/route.js
│
├── (authenticated)/       # Protected pages
│   ├── layout.js
│   ├── directory/page.js
│   ├── dashboard/page.js
│   ├── profile/[id]/page.js
│   ├── form/[[...id]]/page.js
│   └── admin/
│       └── users/page.js
│
├── (public)/              # Public pages
│   ├── login/page.js
│   └── register/page.js
│
└── layout.js              # Root layout

components/
├── Navbar.js              # Navigation component
├── AlumniCard.js          # Alumni profile card
└── ThaiDatePicker.js      # Date picker component

lib/
├── db.js                  # PostgreSQL connection
├── auth.js                # JWT utilities
├── api.js                 # API client
└── store.js               # Zustand state management

styles/
└── globals.css            # Tailwind CSS

scripts/
└── init_db.js             # Database initialization
```

## 🔑 Key Features Migrated

### ✅ Authentication
- User registration with approval system
- JWT-based login
- Role-based access control (User/Admin)

### ✅ Alumni Directory
- Search by name/nickname
- Filter by affiliation (สังกัด)
- Create/Update/Delete profiles
- Detailed profile view with family & position history

### ✅ Dashboard
- Alumni distribution statistics
- Rank distribution chart
- Affiliation distribution
- Branch distribution
- Geographic map distribution

### ✅ Admin Panel
- Manage user approvals
- User status updates (approved/rejected/pending)

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/users` - Get all users (admin only)
- `PUT /api/auth/users/[id]/status` - Update user status (admin only)

### Alumni
- `GET /api/alumni` - Get all alumni (supports filters)
- `GET /api/alumni/[id]` - Get alumni by ID
- `POST /api/alumni` - Create new alumni
- `PUT /api/alumni/[id]` - Update alumni
- `DELETE /api/alumni/[id]` - Delete alumni
- `GET /api/alumni/dictionary/[type]` - Get position/province lists

### Dashboard
- `GET /api/dashboard/stats` - Get statistics
- `GET /api/dashboard/map` - Get geographic distribution

## 🔐 Environment Variables

Create `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crma42"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="crma42"

# JWT
JWT_SECRET="crma42_secret_key"

# API
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

## 📝 Sample Login Credentials

After running `npm run init-db`, you can create test users through the registration page.

## 🚀 Production Build

```bash
npm run build
npm start
```

## 📊 Technologies Used

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **State Management**: Zustand
- **API Client**: Axios
- **Charts**: Chart.js / React-ChartJS-2
- **Icons**: Lucide React
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs

## 🔄 Migration Notes

### Components Converted
- `Directory.vue` → `app/(authenticated)/directory/page.js`
- `Dashboard.vue` → `app/(authenticated)/dashboard/page.js`
- `ProfileDetail.vue` → `app/(authenticated)/profile/[id]/page.js`
- `AlumniForm.vue` → `app/(authenticated)/form/[[...id]]/page.js`
- `Login.vue` → `app/(public)/login/page.js`
- `Register.vue` → `app/(public)/register/page.js`
- `AdminUsers.vue` → `app/(authenticated)/admin/users/page.js`
- `AlumniCard.vue` → `components/AlumniCard.js`

### Backend Routes Migrated
All Express routes have been converted to Next.js App Router API routes with identical functionality.

### Database
- PostgreSQL schema remains unchanged
- Uses native `pg` library for connections

## ⚠️ Notes

- Socket.IO real-time updates can be added using Next.js WebSocket integration
- Add `.env.local` to `.gitignore` for security
- Update JWT_SECRET in production

## 📞 Support

For issues or questions about the migration, refer to the original file structure in `backend/` and `frontend/` directories for reference.

---

**Status**: ✅ Fully migrated to Next.js with all features implemented
