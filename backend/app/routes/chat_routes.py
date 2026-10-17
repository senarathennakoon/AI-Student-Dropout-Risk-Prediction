from datetime import datetime, timezone
from typing import Any, Dict, Optional
import os

from fastapi import APIRouter, Header, HTTPException
from jose import jwt, JWTError

from app.database.mongodb import mongodb
from app.core.helpers import mongo_to_json
from app.services.chatbot_service import StudentSupportChatbot

chat_router = APIRouter(prefix="/api", tags=["chatbot"])
chatbot = StudentSupportChatbot()


SUGGESTIONS_MAP = {
    "academic_difficulty": [
        "How can I improve my grades this semester?",
        "Can you help me create a weekly study plan?",
        "How do I prepare better for exams?",
    ],
    "financial_concerns": [
        "What should I do if I cannot pay tuition on time?",
        "How can I find scholarship opportunities?",
        "Can I talk to someone about financial aid?",
    ],
    "time_management": [
        "How do I manage assignments and exams together?",
        "Can you suggest a daily timetable?",
        "How can I stop procrastinating?",
    ],
    "motivation_issues": [
        "I feel like giving up, what should I do?",
        "How can I stay motivated in university?",
        "Can you suggest small goals to restart?",
    ],
    "study_tips": [
        "What are the best study techniques for retention?",
        "How can I revise effectively in limited time?",
        "Can you share active recall tips?",
    ],
    "mental_health": [
        "How do I handle stress before exams?",
        "What can I do when I feel overwhelmed?",
        "Where can I get counseling support?",
    ],
    "general": [
        "Can you help me with study planning?",
        "How can I reduce my dropout risk?",
        "What support services should I contact?",
    ],
}

def _extract_user_id_from_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None

    token = authorization.split(" ", 1)[1].strip()
    try:
        jwt_secret = os.getenv("JWT_SECRET", "")
        jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
        return payload.get("sub")
    except JWTError:
        return None


@chat_router.post("/chat")
async def chat(payload: Dict[str, Any], authorization: Optional[str] = Header(None)):
    message = (payload.get("message") or "").strip()
    risk_level = (payload.get("risk_level") or "MEDIUM").upper()
    body_user_id = payload.get("user_id")
    session_id = payload.get("session_id")

    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    token_user_id = _extract_user_id_from_token(authorization)
    user_id = token_user_id or body_user_id

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    response = chatbot.chat(message=message, risk_level=risk_level, user_id=user_id)

    if not session_id:
        session_id = f"session_{user_id}_{datetime.now().timestamp()}"

    if mongodb.db is not None:
        try:
            await mongodb.save_chat_message(
                {
                    "user_id": user_id,
                    "session_id": session_id,
                    "message": message,
                    "risk_level": risk_level,
                    "intent": response.get("intent"),
                    "confidence": response.get("confidence"),
                    "response": response.get("response"),
                    "tips": response.get("tips", []),
                    "resources": response.get("resources", []),
                    "timestamp": datetime.now(timezone.utc),
                }
            )

            await mongodb.upsert_chat_session(
                session_id=session_id,
                user_id=user_id,
                last_message=message,
                last_response=response.get("response", ""),
            )
        except Exception as error:
            print(f"MongoDB chat save failed: {error}")

    return response


@chat_router.get("/chat/health")
async def chat_health():
    db_status = "connected" if mongodb.db is not None else "disconnected"
    return {
        "status": "healthy",
        "database": db_status,
        "database_name": os.getenv("MONGODB_DB_NAME", "student_dropout_db"),
    }


@chat_router.get("/chat/history/{user_id}")
async def get_chat_history(user_id: str, limit: int = 50):
    if mongodb.db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    history = await mongodb.get_chat_history(user_id=user_id, limit=limit)
    return {
        "user_id": user_id,
        "count": len(history),
        "messages": mongo_to_json(history),
    }


@chat_router.get("/suggestions")
async def get_suggestions(intent: Optional[str] = None):
    key = (intent or "general").strip().lower()
    suggestions = SUGGESTIONS_MAP.get(key, SUGGESTIONS_MAP["general"])
    return {"intent": key, "suggestions": suggestions}
