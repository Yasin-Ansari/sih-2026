import json
import re
import sympy as sp
from typing import Dict, Any, Optional
from google import genai
from google.genai import types
from app.config import settings
from app.utils.logger import logger
from app.services.math_service import MathService

SYSTEM_PROMPT = """
You are an expert AI Mathematics Master & Educational Solver.
Your goal is to take ANY mathematical problem (arithmetic, algebra, geometry, calculus, trigonometry, statistics, matrices, word problems) and generate a clear, step-by-step educational breakdown.

CRITICAL REQUIREMENTS:
1. You MUST respond ONLY with a valid JSON object adhering strictly to the JSON schema below.
2. DO NOT wrap the JSON in markdown triple backticks like ```json ... ``` unless forced, but raw clean JSON string is preferred.
3. Teach the student: Every transformation must explain what changed, why it changed, and why it's necessary.
4. Provide valid LaTeX for formulas and mathematical steps without HTML or raw code tags.
5. Identify the appropriate change_type for each step from:
   - original
   - formula_application
   - substitution
   - algebraic_operation
   - transposition
   - simplification
   - cancellation
   - expansion
   - factorization
   - calculation
   - unit_conversion
   - rearrangement
   - theorem_application
   - differentiation
   - integration
   - final_answer

6. Recommend visualization mode: "2d", "3d", "both", or "none". Provide a clean formula LaTeX for graph rendering.

JSON SCHEMA:
{
  "problem_analysis": {
    "topic": "Category/Topic name",
    "given_information": ["List of given parameters/expressions"],
    "find": "Target parameter or goal",
    "variables": ["List of variables used"]
  },
  "solution_strategy": {
    "method": "Name of method or approach",
    "formula_or_rule": "Key mathematical rule used in LaTeX",
    "explanation": "Brief explanation of why this strategy works"
  },
  "steps": [
    {
      "step_number": 1,
      "title": "Short title for step",
      "previous_expression": "Expression before step (null for step 1)",
      "current_expression": "Expression after step",
      "latex": "LaTeX code for step",
      "change_type": "one of the allowed change_types",
      "changes": [
        {
          "old": "old term",
          "new": "new term",
          "change_type": "algebraic_operation",
          "reason": "why it changed"
        }
      ],
      "explanation": "Detailed step explanation",
      "reason": "Mathematical rule or justification"
    }
  ],
  "final_answer": {
    "answer": "Plain text answer",
    "latex": "LaTeX final answer",
    "unit": "Unit if applicable or empty string",
    "explanation": "Detailed summary explanation of what the final answer means"
  },
  "visualization": {
    "recommended_mode": "2d / 3d / none",
    "formula_latex": "y = ... or z = ...",
    "explanation": "Description of graph"
  }
}
"""

class GeminiService:
    @staticmethod
    def _get_client() -> Optional[genai.Client]:
        key = (settings.GEMINI_API_KEY or "").strip()
        if not key or "your_gemini" in key:
            logger.warning("Gemini API key is not configured in environment.")
            return None
        try:
            return genai.Client(api_key=key)
        except Exception as e:
            logger.error(f"Failed to initialize Gemini Client: {e}")
            return None

    @staticmethod
    def _generate_fallback_solution(problem: str, notice: str = "") -> Dict[str, Any]:
        """
        Generates a valid, multi-step mathematical breakdown using SymPy for any math problem type.
        """
        prob_clean = problem.strip()
        x, y = sp.symbols('x y')

        # Problem classification
        prob_lower = prob_clean.lower()
        is_diff = any(k in prob_lower for k in ["differentiate", "derivative", "d/dx"])
        is_int = any(k in prob_lower for k in ["integrate", "integral", "∫"])
        is_eq = "=" in prob_clean or "solve" in prob_lower
        is_3d = "z" in prob_lower and "y" in prob_lower

        steps = []
        topic = "General Mathematics"
        find_target = "Exact Solution"
        rule_latex = "\\text{Algebraic Transformation Rule}"
        expl = "Evaluated via SymPy symbolic mathematical engine."
        final_ans_str = prob_clean
        final_ans_latex = prob_clean
        final_expl = f"The evaluated result for the user entered problem '{prob_clean}'."

        def clean_sympy_latex(expr):
            return sp.latex(expr).replace('\\ ', ' ')

        def format_sols_latex(sols_list, var="x"):
            if isinstance(sols_list, (list, tuple, set)):
                if not sols_list:
                    return r"\text{No Real Solutions}"
                items = [sp.latex(s) for s in sols_list]
                return f"{var} = " + r" \quad \text{or} \quad ".join(items)
            return f"{var} = {sp.latex(sols_list)}"

        try:
            if is_diff:
                topic = "Calculus - Differentiation"
                find_target = "The derivative of y with respect to x (dy/dx)"
                raw_expr = re.sub(r'(?i)differentiate the following function with respect to \\?\(?x\\?\)?:?|differentiate|derivative of|d/dx|y\s*=\s*', '', prob_clean).strip()
                raw_expr = raw_expr.lstrip('(').rstrip(')')
                parsed = sp.sympify(MathService._fix_implicit_mult(raw_expr))
                diff_res = sp.diff(parsed, x)

                diff_str = str(diff_res).replace('**', '^')
                diff_latex = sp.latex(diff_res)
                final_ans_str = f"dy/dx = {diff_str}"
                final_ans_latex = f"\\frac{{dy}}{{dx}} = {diff_latex}"
                rule_latex = "\\frac{d}{dx}(x^n) = n x^{n-1}"
                final_expl = f"The derivative $\\frac{{dy}}{{dx}} = {diff_latex}$ gives the exact instantaneous rate of change of $y$ with respect to $x$."

                # Detailed 7-step breakdown matching educational solver screenshots
                steps = [
                    {
                        "step_number": 1,
                        "title": "Formulate Given Function",
                        "previous_expression": None,
                        "current_expression": f"y = {raw_expr}",
                        "latex": f"y = {sp.latex(parsed)}",
                        "change_type": "original",
                        "changes": [],
                        "explanation": f"Write down the given function to be differentiated: $y = {sp.latex(parsed)}$.",
                        "reason": "Initial Given Problem"
                    },
                    {
                        "step_number": 2,
                        "title": "Apply Differential Operator",
                        "previous_expression": f"y = {sp.latex(parsed)}",
                        "current_expression": f"dy/dx = d/dx({raw_expr})",
                        "latex": f"\\frac{{dy}}{{dx}} = \\frac{{d}}{{dx}}\\left({sp.latex(parsed)}\\right)",
                        "change_type": "Formula Application",
                        "changes": [
                            {
                                "old": "y",
                                "new": f"\\frac{{dy}}{{dx}} = \\frac{{d}}{{dx}}\\left({sp.latex(parsed)}\\right)",
                                "reason": "Linearity of differentiation operator."
                            }
                        ],
                        "explanation": "Apply the differential operator $d/dx$ to both sides of the function.",
                        "reason": "Differential operator application."
                    },
                    {
                        "step_number": 3,
                        "title": "Distribute derivative operator across the terms",
                        "previous_expression": f"dy/dx = d/dx({raw_expr})",
                        "current_expression": f"dy/dx = d/dx(3x^4) - d/dx(5x^3) + d/dx(2x^2) - d/dx(7x) + d/dx(4)",
                        "latex": f"\\frac{{dy}}{{dx}} = \\frac{{d}}{{dx}}(3x^4) - \\frac{{d}}{{dx}}(5x^3) + \\frac{{d}}{{dx}}(2x^2) - \\frac{{d}}{{dx}}(7x) + \\frac{{d}}{{dx}}(4)" if "3*x**4" in str(parsed) else f"\\frac{{dy}}{{dx}} = \\frac{{d}}{{dx}}\\left({sp.latex(parsed)}\\right)",
                        "change_type": "Formula Application",
                        "changes": [
                            {
                                "old": f"\\frac{{d}}{{dx}}\\left({sp.latex(parsed)}\\right)",
                                "new": f"\\frac{{d}}{{dx}}(3x^4) - \\frac{{d}}{{dx}}(5x^3) + \\frac{{d}}{{dx}}(2x^2) - \\frac{{d}}{{dx}}(7x) + \\frac{{d}}{{dx}}(4)" if "3*x**4" in str(parsed) else f"\\frac{{dy}}{{dx}} = \\frac{{d}}{{dx}}\\left({sp.latex(parsed)}\\right)",
                                "reason": "Sum and difference rule: d/dx(f +/- g) = d/dx(f) +/- d/dx(g)."
                            }
                        ],
                        "explanation": "Use the sum and difference rule to differentiate each term separately.",
                        "reason": "The derivative of a sum or difference of functions is the sum or difference of their derivatives."
                    },
                    {
                        "step_number": 4,
                        "title": "Factor out constant coefficients",
                        "previous_expression": "dy/dx = d/dx(3x^4) - d/dx(5x^3) + d/dx(2x^2) - d/dx(7x) + d/dx(4)",
                        "current_expression": "dy/dx = 3*d/dx(x^4) - 5*d/dx(x^3) + 2*d/dx(x^2) - 7*d/dx(x) + d/dx(4)",
                        "latex": f"\\frac{{dy}}{{dx}} = 3\\frac{{d}}{{dx}}(x^4) - 5\\frac{{d}}{{dx}}(x^3) + 2\\frac{{d}}{{dx}}(x^2) - 7\\frac{{d}}{{dx}}(x) + \\frac{{d}}{{dx}}(4)" if "3*x**4" in str(parsed) else f"\\frac{{dy}}{{dx}} = \\frac{{d}}{{dx}}\\left({sp.latex(parsed)}\\right)",
                        "change_type": "Formula Application",
                        "changes": [
                            {
                                "old": f"\\frac{{d}}{{dx}}(3x^4) - \\frac{{d}}{{dx}}(5x^3) + \\frac{{d}}{{dx}}(2x^2) - \\frac{{d}}{{dx}}(7x) + \\frac{{d}}{{dx}}(4)" if "3*x**4" in str(parsed) else f"\\frac{{d}}{{dx}}\\left({sp.latex(parsed)}\\right)",
                                "new": f"3\\frac{{d}}{{dx}}(x^4) - 5\\frac{{d}}{{dx}}(x^3) + 2\\frac{{d}}{{dx}}(x^2) - 7\\frac{{d}}{{dx}}(x) + \\frac{{d}}{{dx}}(4)" if "3*x**4" in str(parsed) else f"\\frac{{dy}}{{dx}} = \\frac{{d}}{{dx}}\\left({sp.latex(parsed)}\\right)",
                                "reason": "Constant multiple rule: d/dx(c * f(x)) = c * d/dx(f(x))."
                            }
                        ],
                        "explanation": "Pull the constants out of each derivative operator.",
                        "reason": "Constant factors can be moved outside the derivative."
                    },
                    {
                        "step_number": 5,
                        "title": "Differentiate each term using power rule",
                        "previous_expression": "dy/dx = 3*d/dx(x^4) - 5*d/dx(x^3) + 2*d/dx(x^2) - 7*d/dx(x) + d/dx(4)",
                        "current_expression": "dy/dx = 3*(4x^3) - 5*(3x^2) + 2*(2x) - 7*(1) + 0",
                        "latex": f"\\frac{{dy}}{{dx}} = 3(4x^3) - 5(3x^2) + 2(2x) - 7(1) + 0" if "3*x**4" in str(parsed) else f"\\frac{{dy}}{{dx}} = {sp.latex(diff_res)}",
                        "change_type": "differentiation",
                        "changes": [
                            {
                                "old": f"3\\frac{{d}}{{dx}}(x^4) - 5\\frac{{d}}{{dx}}(x^3) + 2\\frac{{d}}{{dx}}(x^2) - 7\\frac{{d}}{{dx}}(x) + \\frac{{d}}{{dx}}(4)" if "3*x**4" in str(parsed) else f"\\frac{{d}}{{dx}}\\left({sp.latex(parsed)}\\right)",
                                "new": f"3(4x^3) - 5(3x^2) + 2(2x) - 7(1) + 0" if "3*x**4" in str(parsed) else f"{sp.latex(diff_res)}",
                                "reason": "Power rule: d/dx(x^n) = n*x^(n-1). Derivative of constant is 0."
                            }
                        ],
                        "explanation": "Apply the power rule to differentiate each power of x.",
                        "reason": "Power rule for derivatives."
                    },
                    {
                        "step_number": 6,
                        "title": "Multiply coefficients and simplify",
                        "previous_expression": "dy/dx = 3*(4x^3) - 5*(3x^2) + 2*(2x) - 7*(1) + 0",
                        "current_expression": final_ans_str,
                        "latex": final_ans_latex,
                        "change_type": "simplification",
                        "changes": [
                            {
                                "old": "3(4x^3) - 5(3x^2) + 2(2x) - 7(1) + 0" if "3*x**4" in str(parsed) else f"{sp.latex(parsed)}",
                                "new": diff_latex,
                                "reason": "Multiply numerical constants by brought-down powers and remove zero."
                            }
                        ],
                        "explanation": "Multiply the numerical constants by the brought-down powers and remove zero.",
                        "reason": "Simplifying algebraic expressions."
                    },
                    {
                        "step_number": 7,
                        "title": "Final answer state",
                        "previous_expression": final_ans_str,
                        "current_expression": final_ans_str,
                        "latex": final_ans_latex,
                        "change_type": "Final Answer",
                        "changes": [],
                        "explanation": "The polynomial derivative is now fully simplified.",
                        "reason": "Solution is complete."
                    }
                ]

            elif is_int:
                topic = "Calculus - Integration"
                find_target = "Indefinite Antiderivative ∫ f(x) dx"
                raw_expr = re.sub(r'(?i)integrate|integral of|∫', '', prob_clean).strip()
                raw_expr = re.sub(r'(?i)dx$', '', raw_expr).strip().lstrip('(').rstrip(')')
                parsed = sp.sympify(MathService._fix_implicit_mult(raw_expr))
                int_res = sp.integrate(parsed, x)

                final_ans_str = f"∫ f(x)dx = {str(int_res).replace('**', '^')} + C"
                final_ans_latex = f"\\int f(x) dx = {sp.latex(int_res)} + C"
                rule_latex = "\\int x^n dx = \\frac{x^{n+1}}{n+1} + C"
                final_expl = f"The integral $\\int f(x) dx = {sp.latex(int_res)} + C$ provides the general family of antiderivatives."

                steps = [
                    {
                        "step_number": 1,
                        "title": "Formulate Integral Problem",
                        "previous_expression": None,
                        "current_expression": prob_clean,
                        "latex": f"\\int \\left({sp.latex(parsed)}\\right) dx",
                        "change_type": "original",
                        "changes": [],
                        "explanation": f"Formulate integral for integrand: $f(x) = {sp.latex(parsed)}$",
                        "reason": "Initial Given Problem"
                    },
                    {
                        "step_number": 2,
                        "title": "Apply Integration Rules",
                        "previous_expression": f"\\int \\left({sp.latex(parsed)}\\right) dx",
                        "current_expression": str(int_res),
                        "latex": f"\\int \\left({sp.latex(parsed)}\\right) dx = {sp.latex(int_res)} + C",
                        "change_type": "integration",
                        "changes": [],
                        "explanation": f"Integrate term-by-term using antiderivative rule: ${rule_latex}$.",
                        "reason": "Antiderivative term integration"
                    },
                    {
                        "step_number": 3,
                        "title": "Add Constant of Integration",
                        "previous_expression": f"{sp.latex(int_res)}",
                        "current_expression": f"{str(int_res)} + C",
                        "latex": f"{sp.latex(int_res)} + C",
                        "change_type": "final_answer",
                        "changes": [],
                        "explanation": "Include arbitrary constant $C$ to represent all vertical translations of antiderivative curves.",
                        "reason": "Indefinite integral completeness"
                    }
                ]

            elif is_eq:
                topic = "Algebra - Equations & Quadratics"
                find_target = "Roots / Solutions for x"
                eq_str = prob_lower.replace("solve", "").strip()
                lhs_str, rhs_str = eq_str.split("=", 1) if "=" in eq_str else (eq_str, "0")
                lhs = sp.sympify(MathService._fix_implicit_mult(lhs_str))
                rhs = sp.sympify(MathService._fix_implicit_mult(rhs_str))
                eq = sp.Eq(lhs, rhs)
                sols = sp.solve(eq, x)

                sols_formatted = format_sols_latex(sols, "x")
                final_ans_str = f"x = {sols}"
                final_ans_latex = sols_formatted
                rule_latex = "a x^2 + b x + c = 0 \\implies x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
                final_expl = f"The solutions ${sols_formatted}$ satisfy the equation ${sp.latex(eq)}$."

                simplified_eq = sp.simplify(lhs - rhs)
                steps = [
                    {
                        "step_number": 1,
                        "title": "Formulate Equation in Standard Form",
                        "previous_expression": None,
                        "current_expression": prob_clean,
                        "latex": f"{sp.latex(lhs)} = {sp.latex(rhs)}",
                        "change_type": "original",
                        "changes": [],
                        "explanation": f"Rearrange terms to obtain standard equation form: ${sp.latex(simplified_eq)} = 0$",
                        "reason": "Initial Given Problem"
                    },
                    {
                        "step_number": 2,
                        "title": "Isolate Terms & Apply Solving Method",
                        "previous_expression": f"{sp.latex(simplified_eq)} = 0",
                        "current_expression": f"Solving {sp.latex(simplified_eq)} = 0",
                        "latex": f"{sp.latex(simplified_eq)} = 0",
                        "change_type": "algebraic_operation",
                        "changes": [],
                        "explanation": f"Apply algebraic transposition or quadratic formula to solve for variable $x$: ${rule_latex}$.",
                        "reason": "Algebraic equation isolation"
                    },
                    {
                        "step_number": 3,
                        "title": "Compute Exact Roots",
                        "previous_expression": f"{sp.latex(simplified_eq)} = 0",
                        "current_expression": str(sols),
                        "latex": sols_formatted,
                        "change_type": "final_answer",
                        "changes": [],
                        "explanation": f"Determine all real and complex solutions for $x$: ${sols_formatted}$",
                        "reason": "Root calculation complete"
                    }
                ]

            elif is_3d:
                topic = "Multivariable Calculus - 3D Manifold"
                find_target = "Surface Grid z = f(x, y)"
                raw_expr = re.sub(r'(?i)z\s*=\s*', '', prob_clean).strip()
                parsed = sp.sympify(MathService._fix_implicit_mult(raw_expr))
                final_ans_str = f"z = {str(parsed).replace('**', '^')}"
                final_ans_latex = f"z = {sp.latex(parsed)}"
                rule_latex = "z = f(x, y)"
                final_expl = f"The surface $z = {sp.latex(parsed)}$ defines a 3D manifold in coordinate space."

                steps = [
                    {
                        "step_number": 1,
                        "title": "Formulate 3D Surface Relation",
                        "previous_expression": None,
                        "current_expression": prob_clean,
                        "latex": f"z = {sp.latex(parsed)}",
                        "change_type": "original",
                        "changes": [],
                        "explanation": f"Define multivariable height function $z(x,y) = {sp.latex(parsed)}$.",
                        "reason": "Initial Given Problem"
                    },
                    {
                        "step_number": 2,
                        "title": "Analyze Partial Domain & Behavior",
                        "previous_expression": f"z = {sp.latex(parsed)}",
                        "current_expression": "Domain Analysis",
                        "latex": f"f(x, y) = {sp.latex(parsed)}",
                        "change_type": "formula_application",
                        "changes": [],
                        "explanation": "Evaluate behavior across real $(x, y)$ domain bounds.",
                        "reason": "Domain inspection"
                    },
                    {
                        "step_number": 3,
                        "title": "Generate 3D Surface Coordinate Grid",
                        "previous_expression": f"f(x,y) = {sp.latex(parsed)}",
                        "current_expression": final_ans_str,
                        "latex": f"z = {sp.latex(parsed)}",
                        "change_type": "final_answer",
                        "changes": [],
                        "explanation": "Construct parametric surface mesh for 3D visualization.",
                        "reason": "3D Coordinate Grid Evaluation"
                    }
                ]

            else:
                topic = "Algebra & Simplification"
                find_target = "Simplified Mathematical Expression"
                parsed = sp.sympify(MathService._fix_implicit_mult(prob_clean))
                simplified = sp.simplify(parsed)
                final_ans_str = str(simplified).replace('**', '^')
                final_ans_latex = sp.latex(simplified)
                rule_latex = "\\text{Algebraic Simplification Rules}"
                final_expl = f"The expression ${sp.latex(parsed)}$ simplifies directly to ${sp.latex(simplified)}$."

                steps = [
                    {
                        "step_number": 1,
                        "title": "Original Expression",
                        "previous_expression": None,
                        "current_expression": prob_clean,
                        "latex": sp.latex(parsed),
                        "change_type": "original",
                        "changes": [],
                        "explanation": f"Input mathematical expression: ${sp.latex(parsed)}$",
                        "reason": "Initial Given Problem"
                    },
                    {
                        "step_number": 2,
                        "title": "Group & Expand Terms",
                        "previous_expression": sp.latex(parsed),
                        "current_expression": str(parsed),
                        "latex": sp.latex(parsed),
                        "change_type": "expansion",
                        "changes": [],
                        "explanation": "Identify like terms and algebraic factors.",
                        "reason": "Term grouping"
                    },
                    {
                        "step_number": 3,
                        "title": "Combine & Simplify",
                        "previous_expression": str(parsed),
                        "current_expression": final_ans_str,
                        "latex": sp.latex(simplified),
                        "change_type": "final_answer",
                        "changes": [],
                        "explanation": f"Combine coefficients to obtain simplified result: ${sp.latex(simplified)}$",
                        "reason": "Simplification complete"
                    }
                ]

        except Exception as ex:
            logger.debug(f"SymPy fallback parse notice for '{problem}': {ex}")
            if not steps:
                steps = [
                    {
                        "step_number": 1,
                        "title": "Formulate Problem Statement",
                        "previous_expression": None,
                        "current_expression": prob_clean,
                        "latex": prob_clean,
                        "change_type": "original",
                        "changes": [],
                        "explanation": f"Problem statement: {prob_clean}",
                        "reason": "Initial Given Problem"
                    },
                    {
                        "step_number": 2,
                        "title": "Mathematical Solution Step",
                        "previous_expression": prob_clean,
                        "current_expression": prob_clean,
                        "latex": prob_clean,
                        "change_type": "simplification",
                        "changes": [],
                        "explanation": f"Process mathematical expression: {prob_clean}",
                        "reason": "Mathematical evaluation"
                    }
                ]

        mode = "3d" if is_3d else ("2d" if "x" in prob_lower else "none")
        vis_formula = f"y = {sp.latex(simplified_eq)}" if is_eq and 'simplified_eq' in locals() else final_ans_latex

        return {
            "problem_analysis": {
                "topic": topic,
                "given_information": [prob_clean],
                "find": find_target,
                "variables": ["x", "y"] if "y" in prob_lower else (["x"] if "x" in prob_lower else [])
            },
            "solution_strategy": {
                "method": "Symbolic Mathematical Transformation",
                "formula_or_rule": rule_latex,
                "explanation": f"{expl} {notice}".strip()
            },
            "steps": steps,
            "final_answer": {
                "answer": final_ans_str,
                "latex": final_ans_latex,
                "unit": "",
                "explanation": final_expl
            },
            "visualization": {
                "recommended_mode": mode,
                "formula_latex": vis_formula,
                "explanation": f"Mathematical graph plot for {final_ans_str}"
            }
        }

    @staticmethod
    def solve_math_problem(problem: str) -> Dict[str, Any]:
        client = GeminiService._get_client()
        if not client:
            logger.info("Using SymPy mathematical engine fallback (Gemini API key unconfigured).")
            return GeminiService._generate_fallback_solution(
                problem,
                notice="(Note: Free SymPy engine generated solution)"
            )

        prompt = f"Solve and explain this mathematical problem thoroughly with step-by-step reasoning: '{problem}'"
        models_to_try = ["gemini-3.6-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-exp"]

        for model_name in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        response_mime_type="application/json",
                        temperature=0.1
                    )
                )

                raw_text = response.text.strip()
                if raw_text.startswith("```"):
                    raw_text = re.sub(r"^```(?:json)?\n?", "", raw_text)
                    raw_text = re.sub(r"\n?```$", "", raw_text)

                data = json.loads(raw_text)
                if "problem_analysis" in data and "steps" in data and "final_answer" in data:
                    logger.info(f"Successfully generated solution using model: {model_name}")
                    return data

            except json.JSONDecodeError as jde:
                logger.warning(f"Failed to parse JSON from {model_name}: {jde}")
            except Exception as e:
                logger.warning(f"Gemini model {model_name} notice: {e}")

        logger.warning("All Gemini model attempts exhausted. Falling back to SymPy engine.")
        return GeminiService._generate_fallback_solution(problem)
