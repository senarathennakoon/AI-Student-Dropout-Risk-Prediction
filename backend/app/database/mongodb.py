from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, ReturnDocument
from bson import ObjectId
import os
from dotenv import load_dotenv
from datetime import datetime
from typing import Optional, List, Dict, Any
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

class MongoDB:
    """MongoDB Connection Manager for Student Dropout System"""
    
    def __init__(self):
        self.client = None
        self.db = None
        self._initialized = False
    
    async def connect_to_database(self):
        """Initialize MongoDB connection"""
        try:
            # Get connection string from environment variable
            mongodb_url = os.getenv("MONGODB_URL")
            db_name = os.getenv("MONGODB_DB_NAME", "student_dropout_db")
            
            if not mongodb_url:
                raise ValueError("MONGODB_URL not found in environment variables")
            
            logger.info(f"📡 Connecting to MongoDB Atlas...")
            self.client = AsyncIOMotorClient(mongodb_url)
            self.db = self.client[db_name]
            
            # Test connection
            await self.db.command("ping")
            logger.info("✅ Connected to MongoDB Atlas successfully!")
            
            # Create indexes for better performance
            await self.create_indexes()
            self._initialized = True
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            raise
    
    async def close_database_connection(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("🔌 MongoDB connection closed")
    
    async def create_indexes(self):
        """Create indexes for faster queries"""
        try:
            # Students collection indexes
            await self.db.students.create_index("student_id", unique=True)
            await self.db.students.create_index([("created_at", DESCENDING)])
            await self.db.students.create_index([("course", ASCENDING)])
            
            # Predictions collection indexes
            await self.db.predictions.create_index(
                [("student_id", ASCENDING), ("created_at", DESCENDING)]
            )
            await self.db.predictions.create_index("risk_level")
            await self.db.predictions.create_index("created_at")

            # Explanations collection indexes
            await self.db.explanations.create_index(
                [("student_id", ASCENDING), ("timestamp", DESCENDING)]
            )
            await self.db.explanations.create_index("prediction_id")
            
            # Users collection indexes
            await self.db.users.create_index("username", unique=True)
            await self.db.users.create_index("email", unique=True)

            # Chat collections indexes
            await self.db.messages.create_index([("user_id", ASCENDING), ("timestamp", DESCENDING)])
            await self.db.messages.create_index("session_id")
            await self.db.chat_sessions.create_index("session_id", unique=True)
            await self.db.chat_sessions.create_index([("user_id", ASCENDING), ("last_updated", DESCENDING)])

            # Interventions collection indexes
            await self.db.interventions.create_index("intervention_id", unique=True)
            await self.db.interventions.create_index([("student_id", ASCENDING), ("date", DESCENDING)])
            await self.db.interventions.create_index([("staff_id", ASCENDING), ("status", ASCENDING)])
            await self.db.interventions.create_index([("status", ASCENDING), ("intervention_type", ASCENDING)])

            # Analytics reports collection indexes
            await self.db.analytics_reports.create_index("report_id", unique=True)
            await self.db.analytics_reports.create_index([("report_type", ASCENDING), ("generated_date", DESCENDING)])
            await self.db.analytics_reports.create_index([("generated_date", DESCENDING)])
            
            logger.info("✅ Database indexes created")
        except Exception as e:
            logger.warning(f"⚠️ Index creation failed: {e}")
    
    # ============================================
    # STUDENT OPERATIONS
    # ============================================
    
    async def create_student(self, student_data: dict) -> str:
        """Insert a new student record"""
        result = await self.db.students.insert_one(student_data)
        logger.info(f"✅ Student created with ID: {result.inserted_id}")
        return str(result.inserted_id)
    
    async def get_student(self, student_id: str) -> Optional[dict]:
        """Get student by custom ID"""
        return await self.db.students.find_one({"student_id": student_id})
    
    async def update_student(self, student_id: str, update_data: dict) -> bool:
        """Update student record"""
        update_data["updated_at"] = datetime.utcnow()
        result = await self.db.students.update_one(
            {"student_id": student_id},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    async def list_students(
        self, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict] = None
    ) -> List[dict]:
        """List students with pagination"""
        query = filters or {}
        cursor = self.db.students.find(query)
        cursor = cursor.sort("created_at", DESCENDING).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    # ============================================
    # PREDICTION OPERATIONS
    # ============================================
    
    async def save_prediction(self, prediction_data: dict) -> str:
        """Save prediction result"""
        result = await self.db.predictions.insert_one(prediction_data)
        return str(result.inserted_id)
    
    async def get_student_predictions(
        self, 
        student_id: str,
        limit: int = 10
    ) -> List[dict]:
        """Get prediction history for a student"""
        cursor = self.db.predictions.find(
            {"student_id": student_id}
        ).sort("created_at", DESCENDING).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def get_recent_predictions(
        self,
        limit: int = 50,
        risk_level: Optional[str] = None
    ) -> List[dict]:
        """Get recent predictions with optional risk filter"""
        query = {}
        if risk_level:
            query["risk_level"] = risk_level
        
        cursor = self.db.predictions.find(query)
        cursor = cursor.sort("created_at", DESCENDING).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def get_prediction_stats(self) -> dict:
        """Get prediction statistics"""
        pipeline = [
            {
                "$group": {
                    "_id": "$risk_level",
                    "count": {"$sum": 1}
                }
            }
        ]
        cursor = self.db.predictions.aggregate(pipeline)
        stats = await cursor.to_list(length=100)
        
        result = {"total": 0}
        for stat in stats:
            result[stat["_id"]] = stat["count"]
            result["total"] += stat["count"]
        
        return result

    async def save_explanation(self, explanation_data: dict) -> str:
        """Save risk explanation result"""
        result = await self.db.explanations.insert_one(explanation_data)
        return str(result.inserted_id)

    async def get_student_explanations(
        self,
        student_id: str,
        limit: int = 10
    ) -> List[dict]:
        """Get explanation history for a student"""
        cursor = self.db.explanations.find(
            {"student_id": student_id}
        ).sort("timestamp", DESCENDING).limit(limit)
        return await cursor.to_list(length=limit)

    # ============================================
    # CHAT OPERATIONS
    # ============================================

    async def save_chat_message(self, message_data: dict) -> str:
        """Save chat message"""
        message_data["timestamp"] = message_data.get("timestamp", datetime.utcnow())
        result = await self.db.messages.insert_one(message_data)
        return str(result.inserted_id)

    async def get_chat_history(self, user_id: str, limit: int = 50) -> List[dict]:
        """Get chat history for a user"""
        cursor = self.db.messages.find({"user_id": user_id}).sort("timestamp", DESCENDING).limit(limit)
        return await cursor.to_list(length=limit)

    async def upsert_chat_session(self, session_id: str, user_id: str, last_message: str, last_response: str) -> bool:
        """Create or update chat session"""
        await self.db.chat_sessions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "user_id": user_id,
                    "last_updated": datetime.utcnow(),
                    "last_message": last_message,
                    "last_response": last_response[:100],
                },
                "$setOnInsert": {
                    "created_at": datetime.utcnow(),
                },
            },
            upsert=True,
        )
        return True
    
    # ============================================
    # USER OPERATIONS (for authentication)
    # ============================================
    
    async def create_user(self, user_data: dict) -> str:
        """Create new user"""
        try:
            result = await self.db.users.insert_one(user_data)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            raise
    
    async def get_user(self, username: str) -> Optional[dict]:
        """Get user by username"""
        return await self.db.users.find_one({"username": username})
    
    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get user by email"""
        return await self.db.users.find_one({"email": email})

    async def list_users(self, limit: int = 200) -> List[dict]:
        """List users for admin dashboard"""
        cursor = self.db.users.find({}).sort("created_at", DESCENDING).limit(limit)
        return await cursor.to_list(length=limit)

    async def update_user_role_status(self, username: str, role: str, status: str) -> bool:
        """Update a user's role and status"""
        update_data = {
            "role": role,
            "status": status,
            "updated_at": datetime.utcnow()
        }
        result = await self.db.users.update_one(
            {"username": username},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def delete_user(self, username: str) -> bool:
        """Delete a user by username"""
        result = await self.db.users.delete_one({"username": username})
        return result.deleted_count > 0

    async def is_email_used_by_other_user(self, username: str, email: str) -> bool:
        """Check if the email is used by another user"""
        existing = await self.db.users.find_one({
            "email": email,
            "username": {"$ne": username}
        })
        return existing is not None

    async def update_user_profile(self, username: str, first_name: str, last_name: str) -> Optional[dict]:
        """Update own profile name fields and return updated user"""
        update_data = {
            "first_name": first_name,
            "last_name": last_name,
            "updated_at": datetime.utcnow()
        }
        result = await self.db.users.find_one_and_update(
            {"username": username},
            {"$set": update_data},
            return_document=ReturnDocument.AFTER
        )
        return result

    async def update_user_password(self, username: str, password_hash: str) -> bool:
        """Update a user's password hash"""
        result = await self.db.users.update_one(
            {"username": username},
            {
                "$set": {
                    "password_hash": password_hash,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0

    # ============================================
    # INTERVENTION OPERATIONS
    # ============================================

    async def create_intervention(self, intervention_data: dict) -> str:
        result = await self.db.interventions.insert_one(intervention_data)
        return str(result.inserted_id)

    async def get_intervention_by_intervention_id(self, intervention_id: str) -> Optional[dict]:
        return await self.db.interventions.find_one({"intervention_id": intervention_id})

    async def list_interventions(
        self,
        filters: Optional[Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[dict]:
        query = filters or {}
        cursor = self.db.interventions.find(query).sort("date", DESCENDING).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    async def count_interventions(self, filters: Optional[Dict[str, Any]] = None) -> int:
        query = filters or {}
        return await self.db.interventions.count_documents(query)

    async def update_intervention_by_intervention_id(self, intervention_id: str, update_data: dict) -> bool:
        update_data["updated_at"] = datetime.utcnow()
        result = await self.db.interventions.update_one(
            {"intervention_id": intervention_id},
            {"$set": update_data},
        )
        return result.modified_count > 0

    async def delete_intervention_by_intervention_id(self, intervention_id: str) -> bool:
        result = await self.db.interventions.delete_one({"intervention_id": intervention_id})
        return result.deleted_count > 0

    # ============================================
    # ANALYTICS REPORT OPERATIONS
    # ============================================

    async def create_analytics_report(self, report_data: dict) -> str:
        result = await self.db.analytics_reports.insert_one(report_data)
        return str(result.inserted_id)

    async def get_analytics_report_by_report_id(self, report_id: str) -> Optional[dict]:
        return await self.db.analytics_reports.find_one({"report_id": report_id})

    async def list_analytics_reports(
        self,
        filters: Optional[Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[dict]:
        query = filters or {}
        cursor = self.db.analytics_reports.find(query).sort("generated_date", DESCENDING).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    async def count_analytics_reports(self, filters: Optional[Dict[str, Any]] = None) -> int:
        query = filters or {}
        return await self.db.analytics_reports.count_documents(query)


# Create singleton instance
mongodb = MongoDB()