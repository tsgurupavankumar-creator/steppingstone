from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    full_name: str
    user_id: str

class PasswordResetRequest(BaseModel):
    participant_id: str
    new_password: str

class UserProfileResponse(BaseModel):
    id: str
    username: str
    role: str
    full_name: str
    is_active: bool
