from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import LoginRequest, LoginResponse, PasswordResetRequest, UserProfileResponse
from backend.app.services.auth_service import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    require_admin
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.username == login_data.username.strip())
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated"
        )

    token = create_access_token({"sub": user.username, "role": user.role, "id": user.id})
    return LoginResponse(
        access_token=token,
        role=user.role,
        username=user.username,
        full_name=user.full_name,
        user_id=user.id
    )

@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return UserProfileResponse(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        full_name=current_user.full_name,
        is_active=current_user.is_active
    )

@router.get("/participants", response_model=List[UserProfileResponse])
async def list_participants(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.role == "participant").order_by(User.username)
    res = await db.execute(stmt)
    participants = res.scalars().all()
    return [
        UserProfileResponse(
            id=p.id,
            username=p.username,
            role=p.role,
            full_name=p.full_name,
            is_active=p.is_active
        )
        for p in participants
    ]

@router.post("/reset-password")
async def reset_participant_password(
    data: PasswordResetRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.username == data.participant_id.strip(), User.role == "participant")
    res = await db.execute(stmt)
    participant = res.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=404, detail=f"Participant {data.participant_id} not found")

    participant.hashed_password = get_password_hash(data.new_password)
    await db.commit()
    return {"message": f"Password for {participant.username} has been successfully updated"}
