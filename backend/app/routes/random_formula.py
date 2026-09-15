from fastapi import APIRouter
from app.services.visualization_service import VisualizationService

router = APIRouter(prefix="/api", tags=["Random Formula Explorer"])

@router.get("/random-formula")
def get_random_formula():
    """
    Generates a random valid graphable formula across mathematical categories.
    """
    return VisualizationService.get_random_formula()
