from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.mongodb import mongodb
from app.core import ml_models
from app.core.startup import startup_event, shutdown_event
from app.routes.auth_routes import router as auth_router
from app.routes.student_routes import router as student_router
from app.routes.prediction_routes import router as prediction_router
from app.routes.admin_routes import router as admin_router
from app.routes.staff_routes import router as staff_router
from app.routes.intervention_routes import router as intervention_router
from app.routes.report_routes import router as report_router
from app.routes.chat_routes import chat_router


app = FastAPI(title="Student Dropout Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(student_router)
app.include_router(prediction_router)
app.include_router(admin_router)
app.include_router(staff_router)
app.include_router(intervention_router)
app.include_router(report_router)
app.include_router(chat_router)

app.add_event_handler("startup", startup_event)
app.add_event_handler("shutdown", shutdown_event)


@app.get("/")
async def root():
    return {
        "message": "🎓 Student Dropout Prediction API",
        "version": "1.0.0",
        "status": "active",
    }


@app.get("/health")
async def health_check():
    try:
        await mongodb.db.command("ping")
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    return {
        "status": "healthy",
        "database": db_status,
        "model_loaded": ml_models.is_model_loaded(),
        "timestamp": datetime.utcnow(),
    }
