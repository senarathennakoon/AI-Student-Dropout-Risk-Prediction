from typing import Optional, List

from fastapi import APIRouter, Header, HTTPException, status

from app.database.mongodb import mongodb
from app.core.helpers import build_user_response
from app.core.security import get_current_user, ensure_admin
from app.schemas.schemas import UserResponse, RoleUpdateRequest

router = APIRouter(tags=["admin"])


@router.get("/admin/users", response_model=List[UserResponse])
async def list_users(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    ensure_admin(user)
    users = await mongodb.list_users()
    return [build_user_response(u) for u in users]


@router.patch("/admin/users/{username}/role", response_model=UserResponse)
async def update_user_role(username: str, request: RoleUpdateRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    ensure_admin(user)

    updated = await mongodb.update_user_role_status(username, request.role, request.status)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    saved = await mongodb.get_user(username)
    return build_user_response(saved)


@router.delete("/admin/users/{username}")
async def delete_user(username: str, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    ensure_admin(user)

    existing = await mongodb.get_user(username)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    deleted = await mongodb.delete_user(username)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to delete user")

    return {"message": "User deleted successfully"}
