from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class HistoryItem(BaseModel):
    id: str
    problem: str
    topic: Optional[str] = "General Mathematics"
    solution_json: Any
    final_answer: Optional[str] = ""
    is_favorite: bool = False
    created_at: Optional[str] = None

class ToggleFavoriteResponse(BaseModel):
    success: bool
    is_favorite: bool
    message: Optional[str] = None
