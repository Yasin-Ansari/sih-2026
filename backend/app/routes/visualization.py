from fastapi import APIRouter
from app.schemas.visualization import VisualizationRequest, VisualizationResponse
from app.services.visualization_service import VisualizationService

router = APIRouter(prefix="/api/visualization", tags=["Visualization Explorer"])

@router.post("", response_model=VisualizationResponse)
def generate_visualization(body: VisualizationRequest):
    expr = body.expression.strip()
    plot_type = body.type.lower().strip()

    if plot_type == "3d" or ("x" in expr.lower() and "y" in expr.lower()):
        data = VisualizationService.generate_3d_plot(
            expr_str=expr,
            x_min=body.x_min,
            x_max=body.x_max,
            y_min=body.y_min,
            y_max=body.y_max
        )
        return VisualizationResponse(**data)
    else:
        data = VisualizationService.generate_2d_plot(
            expr_str=expr,
            x_min=body.x_min,
            x_max=body.x_max,
            points=body.points
        )
        return VisualizationResponse(**data)
