from fastapi import APIRouter, Depends, HTTPException
from app.schemas.solver import SolveRequest, SolveResponse, VerificationData, VisualizationRecommendation, TwoDVisualizationData, ThreeDVisualizationData
from app.middleware.auth_middleware import get_current_user_optional
from app.services.gemini_service import GeminiService
from app.services.math_service import MathService
from app.services.visualization_service import VisualizationService
from app.services.supabase_service import SupabaseService
from app.utils.logger import logger

router = APIRouter(prefix="/api", tags=["Math Solver"])

@router.post("/solve", response_model=SolveResponse)
def solve_problem(body: SolveRequest, user: dict | None = Depends(get_current_user_optional)):
    problem = body.problem.strip()
    if not problem:
        raise HTTPException(status_code=400, detail="Please enter a valid mathematics problem.")

    logger.info(f"Solving problem: '{problem}' for user: {user['email'] if user else 'Anonymous'}")

    try:
        # 1. AI Reasoning & Breakdown from Gemini
        ai_data = GeminiService.solve_math_problem(problem)
    except Exception as e:
        logger.error(f"Gemini solver error for '{problem}': {e}")
        return SolveResponse(
            success=False,
            message=f"Sorry, I couldn't process the mathematical solution right now ({str(e)}). Please try again."
        )

    # Extract components
    prob_analysis = ai_data.get("problem_analysis", {})
    sol_strategy = ai_data.get("solution_strategy", {})
    steps = ai_data.get("steps", [])
    final_ans = ai_data.get("final_answer", {})
    vis_rec = ai_data.get("visualization", {})

    final_text = final_ans.get("answer", "") or final_ans.get("latex", "")

    # 2. Mathematical Verification Layer (SymPy)
    verification_dict = MathService.verify_solution(problem, final_text)

    # 3. Dynamic Visualization Generation (Plotly 2D/3D Data)
    vis_formula = vis_rec.get("formula_latex", "") or final_text
    mode = vis_rec.get("recommended_mode", "none").lower()

    two_d_data = TwoDVisualizationData(available=False)
    three_d_data = ThreeDVisualizationData(available=False)

    if mode in ["2d", "both"] or ("x" in problem.lower() and "y" not in problem.lower()):
        res_2d = VisualizationService.generate_2d_plot(vis_formula or problem)
        if res_2d.get("available"):
            two_d_data = TwoDVisualizationData(
                available=True,
                formula_latex=res_2d.get("formula_latex", ""),
                x=res_2d.get("x", []),
                y=res_2d.get("y", [])
            )
            mode = "2d" if mode == "none" else mode

    if mode in ["3d", "both"] or ("x" in problem.lower() and "y" in problem.lower()):
        res_3d = VisualizationService.generate_3d_plot(vis_formula or problem)
        if res_3d.get("available"):
            three_d_data = ThreeDVisualizationData(
                available=True,
                formula_latex=res_3d.get("formula_latex", ""),
                x=res_3d.get("x", []),
                y=res_3d.get("y", []),
                z=res_3d.get("z", [])
            )
            mode = "3d" if mode == "none" else mode

    vis_obj = VisualizationRecommendation(
        recommended_mode=mode,
        formula_latex=vis_formula,
        two_d=two_d_data,
        three_d=three_d_data,
        explanation=vis_rec.get("explanation", "Dynamic mathematical graph visualization.")
    )

    full_response_dict = {
        "success": True,
        "problem_analysis": prob_analysis,
        "solution_strategy": sol_strategy,
        "steps": steps,
        "final_answer": final_ans,
        "visualization": vis_obj.model_dump(),
        "verification": verification_dict
    }

    # 4. Save to User History in Supabase if logged in
    sol_id = None
    if user:
        user_id = user["id"]
        topic = prob_analysis.get("topic", "General Mathematics")
        sol_id = SupabaseService.save_solution(user_id, problem, topic, full_response_dict, final_text)

    return SolveResponse(
        success=True,
        solution_id=sol_id,
        problem_analysis=prob_analysis,
        solution_strategy=sol_strategy,
        steps=steps,
        final_answer=final_ans,
        visualization=vis_obj,
        verification=VerificationData(**verification_dict)
    )
