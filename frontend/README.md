# Student Dropout Prediction System - Setup Guide

This project has two parts:
1. Backend: FastAPI + MongoDB
2. Frontend: React + TypeScript

Follow the steps below to run the full system locally.

## Prerequisites

1. Python 3.10 or newer
2. Node.js 18 or newer (npm included)
3. MongoDB Atlas connection string (or local MongoDB)

## 1) Backend Setup (FastAPI)

Open PowerShell in the project root, then run:

```powershell
cd backend
python -m venv ..\.venv
..\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create or update [backend/.env](../backend/.env) with these keys:

```env
MONGODB_URL=your_mongodb_connection_string
MONGODB_DB_NAME=student_dropout_db

JWT_SECRET=your_random_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password
ADMIN_EMAIL=admin@example.com
```

Run backend:

```powershell
python run.py
```

Backend URL: http://127.0.0.1:8000

Health check: http://127.0.0.1:8000/health

## 2) Frontend Setup (React)

Open a second terminal in the project root, then run:

```powershell
cd frontend
npm install --legacy-peer-deps
```

Create or update [frontend/.env](.env):

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENV=development
```

Run frontend:

```powershell
npm start
```

Frontend URL: http://localhost:3000

## 3) Run Both Services

Keep both terminals running:
1. Backend terminal: python run.py
2. Frontend terminal: npm start

Then open http://localhost:3000 in your browser.

## 4) Build Frontend for Production

```powershell
cd frontend
npm run build
```

Build output folder: [frontend/build](build)

## Troubleshooting

1. npm install fails with peer dependency errors:
Use npm install --legacy-peer-deps.

2. Backend fails with MONGODB_URL not found:
Check [backend/.env](../backend/.env) and confirm the file is in the backend folder.

3. Frontend cannot call API:
Confirm REACT_APP_API_URL in [frontend/.env](.env) points to your running backend.

4. Authentication issues:
Set a valid JWT_SECRET in [backend/.env](../backend/.env), then restart backend.

## Security Note

Do not commit real credentials in .env files. If credentials were committed previously, rotate them.
