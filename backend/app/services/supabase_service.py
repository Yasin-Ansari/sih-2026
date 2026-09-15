import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.database import get_supabase_client, get_supabase_admin_client
from app.utils.logger import logger

class SupabaseService:
    @staticmethod
    def get_profile(user_id: str) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return None
        try:
            res = client.table("profiles").select("*").eq("id", user_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.error(f"Error fetching profile for user {user_id}: {e}")
        return None

    @staticmethod
    def create_or_update_profile(user_id: str, name: str, email: str, institution: str = "Student / Academic") -> Dict[str, Any]:
        client = get_supabase_admin_client() or get_supabase_client()
        data = {
            "id": user_id,
            "name": name,
            "email": email,
            "institution": institution,
            "updated_at": datetime.utcnow().isoformat()
        }
        if not client:
            return data
        try:
            res = client.table("profiles").upsert(data).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.error(f"Error upserting profile: {e}")
        return data

    @staticmethod
    def save_solution(user_id: str, problem: str, topic: str, solution_json: Dict[str, Any], final_answer: str) -> Optional[str]:
        client = get_supabase_client()
        sol_id = str(uuid.uuid4())
        data = {
            "id": sol_id,
            "user_id": user_id,
            "problem": problem,
            "topic": topic,
            "solution_json": solution_json,
            "final_answer": final_answer,
            "is_favorite": False,
            "created_at": datetime.utcnow().isoformat()
        }
        if not client:
            return sol_id
        try:
            res = client.table("solutions").insert(data).execute()
            if res.data:
                # Increment solved count on profile
                try:
                    profile = SupabaseService.get_profile(user_id)
                    curr_count = profile.get("solved_count", 0) if profile else 0
                    client.table("profiles").update({"solved_count": curr_count + 1}).eq("id", user_id).execute()
                except Exception as ex:
                    logger.warning(f"Could not update solved count: {ex}")
                return res.data[0]["id"]
        except Exception as e:
            logger.error(f"Error saving solution for user {user_id}: {e}")
        return sol_id

    @staticmethod
    def get_user_history(user_id: str) -> List[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return []
        try:
            res = client.table("solutions").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            logger.error(f"Error fetching history for user {user_id}: {e}")
            return []

    @staticmethod
    def get_solution_by_id(solution_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return None
        try:
            res = client.table("solutions").select("*").eq("id", solution_id).eq("user_id", user_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.error(f"Error fetching solution {solution_id}: {e}")
        return None

    @staticmethod
    def toggle_favorite(solution_id: str, user_id: str) -> bool:
        client = get_supabase_client()
        if not client:
            return False
        try:
            res = client.table("solutions").select("is_favorite").eq("id", solution_id).eq("user_id", user_id).execute()
            if not res.data:
                return False
            curr_fav = res.data[0].get("is_favorite", False)
            new_fav = not curr_fav
            client.table("solutions").update({"is_favorite": new_fav}).eq("id", solution_id).eq("user_id", user_id).execute()
            
            if new_fav:
                client.table("favorites").upsert({"user_id": user_id, "solution_id": solution_id}).execute()
            else:
                client.table("favorites").delete().eq("user_id", user_id).eq("solution_id", solution_id).execute()
                
            return new_fav
        except Exception as e:
            logger.error(f"Error toggling favorite for solution {solution_id}: {e}")
            return False

    @staticmethod
    def delete_solution(solution_id: str, user_id: str) -> bool:
        client = get_supabase_client()
        if not client:
            return False
        try:
            client.table("solutions").delete().eq("id", solution_id).eq("user_id", user_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting solution {solution_id}: {e}")
            return False
