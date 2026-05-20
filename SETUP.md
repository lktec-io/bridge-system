# Bridge Information System — Setup Guide

## Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm

---

## Step 1 — Create MySQL Database

Open MySQL shell and run:

```sql
CREATE DATABASE bridge_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## Step 2 — Configure Backend

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:
```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/bridge_system"
JWT_SECRET="change-this-to-a-long-random-string"
```

---

## Step 3 — Install Backend Dependencies & Run Migrations

```bash
cd server
npm install --legacy-peer-deps
npx prisma generate
npx prisma db push
```

> **If upgrading an existing database:** run `npx prisma db push` again after pulling updates — it will add the new `is_resolved`, `resolved_at`, `resolved_by` columns to the inspections table automatically.

---

## Step 4 — Start the Backend

```bash
# Inside /server
npm run dev
```

Backend runs on: http://localhost:5000

---

## Step 5 — Configure Frontend

In the root of the project, the `.env` file should contain:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Step 6 — Install Frontend & Start

```bash
# In root (bridge-system/)
npm install
npm run dev
```

Frontend runs on: http://localhost:5173

---

## Step 7 — First Login

Register your first admin account at:
**http://localhost:5173/register**

Set role = **Admin**.

---

## Folder Structure

```
bridge-system/
├── src/                   # React frontend
│   ├── api/               # Axios API calls
│   ├── components/        # Layout, Sidebar, Topbar, PrivateRoute
│   ├── context/           # AuthContext
│   └── pages/             # All pages
├── server/                # Express backend
│   ├── prisma/            # Schema + migrations
│   ├── src/
│   │   ├── controllers/   # Business logic
│   │   ├── middleware/    # Auth + Upload
│   │   ├── routes/        # API routes
│   │   └── utils/         # Helpers
│   └── uploads/           # Local photo storage
└── .env                   # Frontend env vars
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET  | /api/bridges | List all bridges |
| POST | /api/bridges | Create bridge |
| GET  | /api/bridges/:id | Get bridge + inspections |
| PUT  | /api/bridges/:id | Update bridge |
| DELETE | /api/bridges/:id | Delete bridge (Admin) |
| GET  | /api/bridges/dashboard | Dashboard stats |
| GET  | /api/bridges/:id/history | Change history |
| GET  | /api/inspections | All inspections |
| POST | /api/inspections | Create inspection |
| PUT  | /api/inspections/:id | Update inspection |
| DELETE | /api/inspections/:id | Delete inspection |
| POST | /api/photos/upload | Upload photo |
| DELETE | /api/photos/:id | Delete photo |

---

## Cloudinary Setup (Optional)

To use cloud storage instead of local files:

1. Create a Cloudinary account at cloudinary.com
2. In `server/.env` set:
```env
UPLOAD_MODE="cloudinary"
CLOUDINARY_CLOUD_NAME="your-name"
CLOUDINARY_API_KEY="your-key"
CLOUDINARY_API_SECRET="your-secret"
```

---

## VPS Deployment (Contabo)

1. Install Node.js, MySQL, and Nginx on your VPS
2. Clone the repo and follow Steps 1–6
3. Use **PM2** to keep the backend running:
   ```bash
   npm install -g pm2
   cd server && pm2 start server.js --name bis-api
   ```
4. Build the frontend:
   ```bash
   npm run build
   ```
5. Configure Nginx to:
   - Serve `dist/` as the frontend on port 80
   - Proxy `/api` requests to `localhost:5000`
