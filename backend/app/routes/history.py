from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.history import HistoryItem, ToggleFavoriteResponse
from app.middleware.auth_middleware import get_current_user_required
from app.services.supabase_service import SupabaseService
from app.utils.logger import logger

router = APIRouter(prefix="/api/history", tags=["Solution History"])

@router.get("", response_model=List[HistoryItem])
def get_history(user: dict = Depends(get_current_user_required)):
    user_id = user["id"]
    items = SupabaseService.get_user_history(user_id)
    return [
        HistoryItem(
            id=item["id"],
            problem=item["problem"],
            topic=item.get("topic", "General Mathematics"),
            solution_json=item.get("solution_json", {}),
            final_answer=item.get("final_answer", ""),
            is_favorite=item.get("is_favorite", False),
            created_at=item.get("created_at")
        )
        for item in items
    ]

@router.get("/{id}", response_model=HistoryItem)
def get_history_by_id(id: str, user: dict = Depends(get_current_user_required)):
    user_id = user["id"]
    item = SupabaseService.get_solution_by_id(id, user_id)
    if not item:
        raise HTTPException(status_code=404, detail="Solution not found in history.")
    return HistoryItem(
        id=item["id"],
        problem=item["problem"],
        topic=item.get("topic", "General Mathematics"),
        solution_json=item.get("solution_json", {}),
        final_answer=item.get("final_answer", ""),
        is_favorite=item.get("is_favorite", False),
        created_at=item.get("created_at")
    )

@router.patch("/{id}/favorite", response_model=ToggleFavoriteResponse)
def toggle_favorite(id: str, user: dict = Depends(get_current_user_required)):
    user_id = user["id"]
    is_fav = SupabaseService.toggle_favorite(id, user_id)
    return ToggleFavoriteResponse(
        success=True,
        is_favorite=is_fav,
        message="Solution bookmark updated."
    )

@router.delete("/{id}")
def delete_history_item(id: str, user: dict = Depends(get_current_user_required)):
    user_id = user["id"]
    deleted = SupabaseService.delete_solution(id, user_id)
    if not deleted:
        raise HTTPException(status_code=400, detail="Could not delete solution.")
    return {"success": True, "message": "Solution deleted from history."}
