from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    institution: str = "Student / Academic"
    solved_count: int = 0
    favorites_count: int = 0
    created_at: datetime | str | None = None

class UpdateProfileRequest(BaseModel):
    name: str | None = None
    institution: str | None = None

class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str
