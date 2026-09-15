from fastapi import APIRouter, HTTPException, Depends, status
from app.schemas.auth import RegisterRequest, LoginRequest, ForgotPasswordRequest, AuthResponse, AuthUser
from app.schemas.user import UserProfile
from app.database import get_supabase_client
from app.services.supabase_service import SupabaseService
from app.middleware.auth_middleware import get_current_user_required
from app.utils.logger import logger

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest):
    client = get_supabase_client()
    if client:
        try:
            res = client.auth.sign_up({
                "email": body.email,
                "password": body.password,
                "options": {
                    "data": {"name": body.name}
                }
            })
            if res.user:
                # Save profile
                SupabaseService.create_or_update_profile(res.user.id, body.name, body.email)
                token = res.session.access_token if res.session else "dev_token_" + res.user.id
                return AuthResponse(
                    success=True,
                    user=AuthUser(id=res.user.id, name=body.name, email=body.email),
                    access_token=token,
                    message="Registration successful."
                )
        except Exception as e:
            logger.error(f"Supabase auth sign_up error: {e}")
            raise HTTPException(status_code=400, detail=str(e))

    # Dev mode fallback
    fake_id = "user_" + str(hash(body.email) & 0xffffffff)
    SupabaseService.create_or_update_profile(fake_id, body.name, body.email)
    return AuthResponse(
        success=True,
        user=AuthUser(id=fake_id, name=body.name, email=body.email),
        access_token=f"mock_token_{fake_id}",
        message="Registration successful (Development Mode)."
    )

@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest):
    client = get_supabase_client()
    if client:
        try:
            res = client.auth.sign_in_with_password({
                "email": body.email,
                "password": body.password
            })
            if res.user:
                name = res.user.user_metadata.get("name") or "Ansari Yasin"
                profile = SupabaseService.get_profile(res.user.id)
                if profile and profile.get("name"):
                    name = profile["name"]
                
                token = res.session.access_token if res.session else "dev_token_" + res.user.id
                return AuthResponse(
                    success=True,
                    user=AuthUser(id=res.user.id, name=name, email=body.email),
                    access_token=token,
                    message="Login successful."
                )
        except Exception as e:
            logger.error(f"Supabase login error: {e}")
            raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Dev mode fallback for Ansari Yasin or any demo login
    fake_id = "user_" + str(hash(body.email) & 0xffffffff)
    name = "Ansari Yasin" if "ansari" in body.email.lower() or "yasin" in body.email.lower() else body.email.split("@")[0].title()
    SupabaseService.create_or_update_profile(fake_id, name, body.email)
    return AuthResponse(
        success=True,
        user=AuthUser(id=fake_id, name=name, email=body.email),
        access_token=f"mock_token_{fake_id}",
        message="Login successful (Development Mode)."
    )

@router.post("/logout")
def logout():
    client = get_supabase_client()
    if client:
        try:
            client.auth.sign_out()
        except Exception:
            pass
    return {"success": True, "message": "Successfully logged out."}

@router.get("/me", response_model=UserProfile)
def get_me(user: dict = Depends(get_current_user_required)):
    user_id = user["id"]
    profile = SupabaseService.get_profile(user_id)
    if profile:
        return UserProfile(
            id=profile["id"],
            name=profile.get("name", user.get("name", "Ansari Yasin")),
            email=profile.get("email", user.get("email", "")),
            institution=profile.get("institution", "Student / Academic"),
            solved_count=profile.get("solved_count", 0),
            created_at=profile.get("created_at")
        )
    return UserProfile(
        id=user_id,
        name=user.get("name", "Ansari Yasin"),
        email=user.get("email", "ansari.yasin@student.edu"),
        institution="Student / Academic",
        solved_count=0
    )

@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest):
    client = get_supabase_client()
    if client:
        try:
            client.auth.reset_password_for_email(body.email)
        except Exception as e:
            logger.warning(f"Forgot password reset error: {e}")
    return {"success": True, "message": "Password reset instructions sent to email."}
