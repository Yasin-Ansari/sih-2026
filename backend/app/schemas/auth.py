from pydantic import BaseModel, EmailStr

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class AuthUser(BaseModel):
    id: str
    name: str
    email: str

class AuthResponse(BaseModel):
    success: bool
    user: AuthUser | None = None
    access_token: str | None = None
    message: str | None = None
