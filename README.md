# AI-Based Student Dropout Risk Prediction System

A full-stack web application that predicts student dropout risk early and supports academic intervention through risk explanations, staff dashboards, intervention tracking, and an NLP student assistant.

> **Team project.** Built by a group of students at SLIIT (Year 2, Semester 2). The project was divided into modules among team members and later integrated into a single application. See [My Individual Contribution](#my-individual-contribution) for the parts I built.

## Overview

The system classifies students into **Low**, **Medium**, and **High** risk using a dataset of **4,424 student records** covering academic, demographic, and socio-economic information. Beyond a prediction, it shows *why* a student is at risk (SHAP explanations) and gives staff tools to act on it.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js (TypeScript) |
| Backend | FastAPI (Python) |
| Database | MongoDB Atlas |
| Machine Learning | Logistic Regression, Decision Tree, Random Forest (best model ~75% accuracy) |
| Explainability | SHAP (SHapley Additive exPlanations) |
| NLP | Intent-based student assistant chatbot (11 intent categories) |

## Features

- **Student form:** multi-step data collection (personal, demographic, financial, academic performance across semesters).
- **Risk prediction:** risk level, prediction probabilities (Dropout / Enrolled / Graduate), and key influencing factors.
- **Student profile:** individual risk assessment and prediction details.
- **Staff dashboard:** enrollment overview, High / Medium / Low risk distribution, and monthly trends.
- **Prediction history:** searchable table of past predictions, risk levels, and confidence.
- **Risk explanation (SHAP):** top risk factors vs. top protective factors per student.
- **Interventions:** staff can log, track, edit, and manage support actions for at-risk students.
- **Admin dashboard:** approve or reject staff registrations and manage roles (Student / Staff).
- **NLP student assistant:** study strategies, active recall tips, and quick guidance.

## My Individual Contribution

- **Staff Dashboard:** designed and built the staff dashboard interface: summary cards (total students and High / Medium / Low risk counts), filters by course, academic year, and risk level, a risk level distribution chart, dropout risk by course, monthly prediction trends, a recent students table, and PDF export of the dashboard data.
- **Decision Tree model:** trained and tuned a Decision Tree classifier (Dropout / Enrolled / Graduate) in Python with scikit-learn: compared full vs. selected feature sets, ran a grid search with 5-fold cross-validation over 192 parameter combinations, and evaluated with accuracy, precision, recall, F1, confusion matrices, and ROC curves.
  - Best parameters: `criterion=gini`, `max_depth=10`, `min_samples_split=20`, `min_samples_leaf=5`.
  - Held-out test set results: accuracy 67.8%, weighted F1 69.1%, weighted ROC-AUC 0.82.
- **Feature importance analysis:** used the tuned tree to rank the factors most associated with dropout risk (top features: `risk_score`, `academic_performance_score`, `failure_rate_sem2`).

The remaining modules (such as the other ML models, chatbot, intervention management, administration, and system integration) were developed by other team members.

## Project Structure

```
backend/
  app/
    core/        # helpers, security, model loading, startup
    data/        # chatbot intents and response templates
    database/    # MongoDB connection and operations
    models/      # trained ML model files
    routes/      # API endpoints
    schemas/     # data schemas
    services/    # chatbot, feature engineering, risk explanation
    main.py
  requirements.txt
  run.py
frontend/
  public/
  src/
    components/  pages/  services/  context/  types/  constants/
```

## Getting Started

**Prerequisites:** Python 3.10+, Node.js 18+, and a MongoDB Atlas connection string (you can create a free cluster at mongodb.com).

### 1. Backend

```powershell
cd backend
python -m venv ..\.venv
..\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copy `backend/.env.example` to `backend/.env` and fill in your own values (your own MongoDB connection string, a random JWT secret, and a strong admin password). Then run:

```powershell
python run.py
```

Backend: http://127.0.0.1:8000 (health check at `/health`)

### 2. Frontend

```powershell
cd frontend
npm install --legacy-peer-deps
```

Copy `frontend/.env.example` to `frontend/.env`, then run:

```powershell
npm start
```

Frontend: http://localhost:3000

## Security Note

Real credentials are not included in this repository. `.env` files are excluded via `.gitignore`; use the provided `.env.example` files as templates and supply your own values.

## Dataset

The model was trained on a dataset of 4,424 student records. <!-- Add the dataset name, source, and license/link here. -->

## License

This project was created for academic purposes at SLIIT.
