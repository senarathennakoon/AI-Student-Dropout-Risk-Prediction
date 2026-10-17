from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Header

from app.database.mongodb import mongodb
from app.core.helpers import build_user_response
from app.core.security import (
    validate_user_id,
    validate_password_policy,
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.schemas.schemas import (
    UserRegisterRequest,
    UserResponse,
    LoginRequest,
    AuthResponse,
    UserProfileUpdateRequest,
    UserPasswordChangeRequest,
)

router = APIRouter(tags=["auth"])


@router.post("/auth/register-student", response_model=UserResponse)
async def register_student(request: UserRegisterRequest):
    id_type = validate_user_id(request.username)
    if id_type != "STU":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student ID must start with STU")
    validate_password_policy(request.password)

    existing = await mongodb.get_user(request.username)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student ID already exists")

    if await mongodb.get_user_by_email(request.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    user_data = {
        "username": request.username,
        "first_name": request.first_name,
        "last_name": request.last_name,
        "email": request.email,
        "password_hash": hash_password(request.password),
        "role": "student",
        "status": "active",
        "created_at": datetime.utcnow(),
    }

    await mongodb.create_user(user_data)
    return build_user_response(user_data)


@router.post("/auth/register-staff", response_model=UserResponse)
async def register_staff(request: UserRegisterRequest):
    id_type = validate_user_id(request.username)
    if id_type != "STA":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Staff ID must start with STA")

    validate_password_policy(request.password)

    existing = await mongodb.get_user(request.username)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Staff ID already exists")

    if await mongodb.get_user_by_email(request.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    user_data = {
        "username": request.username,
        "first_name": request.first_name,
        "last_name": request.last_name,
        "email": request.email,
        "password_hash": hash_password(request.password),
        "role": "staff",
        "status": "pending",
        "created_at": datetime.utcnow(),
    }

    await mongodb.create_user(user_data)
    return build_user_response(user_data)


@router.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    user = await mongodb.get_user(request.username)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    password_hash = user.get("password_hash")
    if not password_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    password_ok = verify_password(request.password, password_hash)
    if not password_ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if user.get("status") != "active":
        user_status = user.get("status")
        if user_status == "pending":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account pending admin approval")
        if user_status == "disabled":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")

    token = create_access_token(
        {
            "sub": user.get("username"),
            "role": user.get("role"),
            "status": user.get("status"),
        }
    )

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=build_user_response(user),
    )


@router.get("/auth/me", response_model=UserResponse)
async def get_me(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    return build_user_response(user)


@router.put("/auth/me", response_model=UserResponse)
async def update_me(request: UserProfileUpdateRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    username = user.get("username")

    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    updated_user = await mongodb.update_user_profile(
        username=username,
        first_name=request.first_name,
        last_name=request.last_name,
    )

    if not updated_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return build_user_response(updated_user)


@router.put("/auth/me/password")
async def update_my_password(request: UserPasswordChangeRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    username = user.get("username")
    current_hash = user.get("password_hash")

    if not username or not current_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    if not verify_password(request.current_password, current_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    if request.current_password == request.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different")

    validate_password_policy(request.new_password)

    updated = await mongodb.update_user_password(username, hash_password(request.new_password))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {"message": "Password updated successfully"}
