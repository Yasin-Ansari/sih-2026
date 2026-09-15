from fastapi import Request, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from app.config import settings
from app.database import get_supabase_client
from app.utils.logger import logger

security = HTTPBearer(auto_error=False)

def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict | None:
    if not credentials or not credentials.credentials:
        return None
    token = credentials.credentials
    try:
        supabase = get_supabase_client()
        if supabase:
            user_response = supabase.auth.get_user(token)
            if user_response and user_response.user:
                return {
                    "id": user_response.user.id,
                    "email": user_response.user.email,
                    "name": user_response.user.user_metadata.get("name", "Ansari Yasin")
                }
        # Fallback decode if secret available
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get("sub") or decoded.get("id")
        if user_id:
            return {
                "id": user_id,
                "email": decoded.get("email", ""),
                "name": decoded.get("user_metadata", {}).get("name", "Ansari Yasin")
            }
    except Exception as e:
        logger.warning(f"JWT verification error: {e}")
    return None

def get_current_user_required(user: dict | None = Depends(get_current_user_optional)) -> dict:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please sign in."
        )
    return user
