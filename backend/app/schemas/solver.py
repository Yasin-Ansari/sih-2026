from pydantic import BaseModel, Field
from typing import List, Optional, Any

class SolveRequest(BaseModel):
    problem: str = Field(..., description="Mathematical expression or problem description")

class ProblemAnalysis(BaseModel):
    topic: str = ""
    given_information: List[str] = []
    find: str = ""
    variables: List[str] = []

class SolutionStrategy(BaseModel):
    method: str = ""
    formula_or_rule: str = ""
    explanation: str = ""

class StepChange(BaseModel):
    old: str = ""
    new: str = ""
    change_type: str = "algebraic_operation"
    reason: str = ""

class SolutionStep(BaseModel):
    step_number: int
    title: str = ""
    previous_expression: Optional[str] = None
    current_expression: str = ""
    latex: str = ""
    change_type: str = "algebraic_operation"
    changes: List[StepChange] = []
    explanation: str = ""
    reason: str = ""

class FinalAnswer(BaseModel):
    answer: str = ""
    latex: str = ""
    unit: str = ""

class TwoDVisualizationData(BaseModel):
    available: bool = False
    formula_latex: str = ""
    x: List[float] = []
    y: List[float] = []

class ThreeDVisualizationData(BaseModel):
    available: bool = False
    formula_latex: str = ""
    x: List[float] = []
    y: List[float] = []
    z: List[List[float]] = []

class VisualizationRecommendation(BaseModel):
    recommended_mode: str = "none"
    formula_latex: str = ""
    two_d: TwoDVisualizationData = Field(default_factory=TwoDVisualizationData)
    three_d: ThreeDVisualizationData = Field(default_factory=ThreeDVisualizationData)
    explanation: str = ""

class VerificationData(BaseModel):
    status: str = "unverified"
    message: str = "Verification pending"
    sympy_result: Optional[str] = None

class SolveResponse(BaseModel):
    success: bool = True
    solution_id: Optional[str] = None
    problem_analysis: ProblemAnalysis = Field(default_factory=ProblemAnalysis)
    solution_strategy: SolutionStrategy = Field(default_factory=SolutionStrategy)
    steps: List[SolutionStep] = []
    final_answer: FinalAnswer = Field(default_factory=FinalAnswer)
    visualization: VisualizationRecommendation = Field(default_factory=VisualizationRecommendation)
    verification: VerificationData = Field(default_factory=VerificationData)
    message: Optional[str] = None
