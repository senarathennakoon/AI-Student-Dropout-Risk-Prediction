import os
from datetime import datetime

from app.database.mongodb import mongodb
from app.core.security import hash_password
from app.services.risk_explanation_service import risk_explanation_service


async def startup_event() -> None:
    await mongodb.connect_to_database()
    risk_explanation_service.initialize()
    admin_username = os.getenv("ADMIN_USERNAME", "")
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    admin_email = os.getenv("ADMIN_EMAIL", "")

    if admin_username and admin_password and admin_email:
        existing_admin = await mongodb.get_user(admin_username)
        if not existing_admin:
            admin_user = {
                "username": admin_username,
                "first_name": "Admin",
                "last_name": "User",
                "email": admin_email,
                "password_hash": hash_password(admin_password),
                "role": "admin",
                "status": "active",
                "created_at": datetime.utcnow(),
            }
            await mongodb.create_user(admin_user)
            print("✅ Default admin account created")
    else:
        print("⚠️ Admin seed skipped: ADMIN_USERNAME/ADMIN_PASSWORD/ADMIN_EMAIL not set")

    print("🚀 Application started successfully!")


async def shutdown_event() -> None:
    await mongodb.close_database_connection()
    print("👋 Application shutting down...")
