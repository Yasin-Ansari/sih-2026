from pydantic import BaseModel, Field
from typing import List, Optional

class VisualizationRequest(BaseModel):
    expression: str = Field(..., description="Math function to plot e.g. 'sin(x)', 'x^2 - y^2'")
    type: str = Field("2d", description="'2d' or '3d'")
    x_min: float = -10.0
    x_max: float = 10.0
    y_min: float = -10.0
    y_max: float = 10.0
    points: int = 100

class VisualizationResponse(BaseModel):
    available: bool = True
    type: str = "2d"
    formula_latex: str = ""
    x: List[float] = []
    y: List[float] = []
    z: List[List[float]] = []
    error: Optional[str] = None
