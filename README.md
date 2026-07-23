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

## Frontend setup (Day 3+ once we scaffold it)
```
cd frontend
npm create vite@latest . -- --template react
npm install
npm install axios react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm run dev
```
