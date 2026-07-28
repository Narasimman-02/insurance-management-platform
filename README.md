# Insurance Management Platform

Full-stack app: React + Tailwind (frontend), Flask + PostgreSQL (backend).

## Day 1 checklist
- [x] Folder structure created (backend/, frontend/)
- [x] Git repo initialized
- [ ] Push to GitHub
- [ ] Wireframes reviewed (see docs/wireframes.md)

## Backend setup
```
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # then edit DATABASE_URL etc.
flask db init
flask db migrate -m "initial tables"
flask db upgrade
python app.py
```
Health check: `GET http://localhost:5000/api/health`

## Frontend setup (local dev)
```
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Deployment (Day 14)

### Backend → Render
1. Push this repo to GitHub (already done).
2. In the Render dashboard: **New +** → **Blueprint** → connect this repo.
   Render reads `render.yaml` at the repo root and creates:
   - A free PostgreSQL database (`insurance-db`)
   - A web service running `gunicorn wsgi:app`, with `SECRET_KEY` and
     `JWT_SECRET_KEY` auto-generated and `DATABASE_URL` wired to the database
3. Render's `buildCommand` runs `flask db upgrade` automatically, so tables
   are created on first deploy — no manual migration step needed.
4. Once deployed, copy your Render URL (e.g. `https://insurance-management-backend.onrender.com`).

**No `render.yaml` support / prefer manual setup?** In the Render dashboard:
- New Web Service → connect repo → Root Directory: `backend`
- Build Command: `pip install -r requirements.txt && flask db upgrade`
- Start Command: `gunicorn wsgi:app`
- Add env vars: `SECRET_KEY`, `JWT_SECRET_KEY` (any random strings),
  `DATABASE_URL` (from a separately-created Render PostgreSQL instance),
  `FRONTEND_URL` (set after the frontend is deployed, see below)

### Frontend → Vercel
1. In the Vercel dashboard: **Add New** → **Project** → import this repo.
2. Set **Root Directory** to `frontend`.
3. Framework preset: Vite (auto-detected).
4. Add an environment variable: `VITE_API_URL` = `https://your-render-url.onrender.com/api`
5. Deploy. Vercel picks up `vercel.json` automatically for SPA routing
   (so refreshing `/policies` directly doesn't 404).
6. Copy your Vercel URL (e.g. `https://your-app.vercel.app`).

### Connect them
Go back to Render → your web service → Environment → update `FRONTEND_URL`
to your actual Vercel URL (e.g. `https://your-app.vercel.app`, no trailing
slash) and redeploy. This locks down CORS so only your deployed frontend
can call the API (instead of the permissive `*` used for local dev).

### Known limitation: file uploads on Render's free tier
Render's free tier uses an **ephemeral filesystem** — anything written to
`backend/uploads/` (identity/policy documents from Day 7) is wiped on
every redeploy or restart. This is fine for demoing the feature, but not
for real persistence. A production fix would swap local file storage for
a service like AWS S3 or Cloudinary — noted here as a natural "bonus
feature" extension, not implemented in this project.

## Important — updating from a new zip
When Claude shares an updated zip, **do NOT extract it directly into or over
`C:\insurance-management-platform`** — the zip includes a `.git` folder that
will silently overwrite your local git history and disconnect your GitHub
remote (this happened repeatedly during Days 7-9).

Instead: extract the zip to a *different* folder (e.g. `C:\Downloads\ims-update\`),
then manually copy only the new/changed files Claude lists into your real
project folder.
