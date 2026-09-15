from fastapi import APIRouter, Depends, HTTPException
from app.schemas.user import UserProfile, UpdateProfileRequest, UpdatePasswordRequest
from app.middleware.auth_middleware import get_current_user_required
from app.services.supabase_service import SupabaseService
from app.database import get_supabase_client
from app.utils.logger import logger

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/me", response_model=UserProfile)
def get_user_profile(user: dict = Depends(get_current_user_required)):
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
        email=user.get("email", ""),
        institution="Student / Academic"
    )

@router.patch("/me", response_model=UserProfile)
def update_user_profile(body: UpdateProfileRequest, user: dict = Depends(get_current_user_required)):
    user_id = user["id"]
    email = user.get("email", "ansari.yasin@student.edu")
    name = body.name or user.get("name", "Ansari Yasin")
    institution = body.institution or "Student / Academic"

    updated = SupabaseService.create_or_update_profile(user_id, name, email, institution)
    return UserProfile(
        id=user_id,
        name=updated.get("name", name),
        email=updated.get("email", email),
        institution=updated.get("institution", institution),
        solved_count=updated.get("solved_count", 0)
    )

@router.patch("/me/password")
def update_user_password(body: UpdatePasswordRequest, user: dict = Depends(get_current_user_required)):
    client = get_supabase_client()
    if client:
        try:
            client.auth.update_user({"password": body.new_password})
            return {"success": True, "message": "Password updated successfully."}
        except Exception as e:
            logger.error(f"Error updating password: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    return {"success": True, "message": "Password updated (Development Mode)."}
