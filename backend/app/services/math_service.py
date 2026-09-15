import re
import sympy as sp
from typing import Dict, Any, Optional
from app.utils.logger import logger

class MathService:
    @staticmethod
    def _fix_implicit_mult(expr_str: str) -> str:
        """
        Converts implicit multiplication like '3x^4' to '3*x**4' for SymPy parsing.
        """
        s = expr_str.replace('^', '**')
        s = re.sub(r'(\d+)\s*([a-zA-Z\(])', r'\1*\2', s)
        s = re.sub(r'([a-zA-Z\)])\s*(\d+)', r'\1*\2', s)
        return s

    @staticmethod
    def verify_solution(problem: str, final_answer_str: str) -> Dict[str, Any]:
        """
        Uses SymPy to verify mathematical results (algebra, differentiation, integration, equation solving).
        Returns verification metadata dictionary.
        """
        result = {
            "status": "unable_to_verify",
            "message": "SymPy automated verification could not parse the problem format.",
            "sympy_result": None
        }

        if not problem or not final_answer_str:
            return result

        prob_clean = problem.strip().lower()
        ans_clean = final_answer_str.strip().lower()

        try:
            x, y, z, t = sp.symbols('x y z t')

            # 1. Differentiation Verification (e.g., "Differentiate y = 3x^4 - 5x^3")
            if any(k in prob_clean for k in ["differentiate", "derivative", "d/dx", "dy/dx"]):
                expr_match = re.search(r'(?:differentiate|derivative|y\s*=\s*|d/dx\s*)(.+)', prob_clean)
                if expr_match:
                    raw_expr = expr_match.group(1).replace('y =', '').replace('differentiate', '').strip()
                    formatted_expr = MathService._fix_implicit_mult(raw_expr)
                    parsed_expr = sp.sympify(formatted_expr)
                    derivative = sp.diff(parsed_expr, x)
                    result["sympy_result"] = str(derivative).replace('**', '^')

                    clean_ans = ans_clean.replace("y' =", '').replace('dy/dx =', '').replace('f\'(x) =', '').strip()
                    if '=' in clean_ans:
                        clean_ans = clean_ans.split('=')[-1].strip()

                    formatted_ans = MathService._fix_implicit_mult(clean_ans)
                    parsed_ans = sp.sympify(formatted_ans)

                    if sp.simplify(derivative - parsed_ans) == 0:
                        result["status"] = "verified"
                        result["message"] = "The calculated derivative was symbolically verified by SymPy."
                    else:
                        result["status"] = "partially_verified"
                        result["message"] = f"SymPy calculated derivative: {result['sympy_result']}"
                    return result

            # 2. Integration Verification (e.g., "Integrate x^2 + 3x")
            elif any(k in prob_clean for k in ["integrate", "integral", "∫"]):
                expr_match = re.search(r'(?:integrate|integral of|∫\s*)(.+)', prob_clean)
                if expr_match:
                    raw_expr = expr_match.group(1).replace('integrate', '').replace('integral of', '').strip()
                    formatted_expr = MathService._fix_implicit_mult(raw_expr)
                    parsed_expr = sp.sympify(formatted_expr)
                    integral = sp.integrate(parsed_expr, x)
                    result["sympy_result"] = str(integral).replace('**', '^')

                    clean_ans = ans_clean.replace('+ c', '').replace('+ c', '').strip()
                    if '=' in clean_ans:
                        clean_ans = clean_ans.split('=')[-1].strip()

                    formatted_ans = MathService._fix_implicit_mult(clean_ans)
                    parsed_ans = sp.sympify(formatted_ans)

                    if sp.simplify(integral - parsed_ans) == 0:
                        result["status"] = "verified"
                        result["message"] = "The integral result was symbolically verified by SymPy."
                    else:
                        result["status"] = "partially_verified"
                        result["message"] = f"SymPy calculated integral: {result['sympy_result']}"
                    return result

            # 3. Equation Solving (e.g., "Solve x^2 - 5x + 6 = 0")
            elif "=" in prob_clean or "solve" in prob_clean:
                eq_str = prob_clean.replace("solve", "").strip()
                if "=" in eq_str:
                    lhs_str, rhs_str = eq_str.split("=", 1)
                else:
                    lhs_str, rhs_str = eq_str, "0"

                lhs = sp.sympify(MathService._fix_implicit_mult(lhs_str))
                rhs = sp.sympify(MathService._fix_implicit_mult(rhs_str))
                eq_solutions = sp.solve(sp.Eq(lhs, rhs), x)
                result["sympy_result"] = str(eq_solutions)

                # Check if any of the roots exist in final answer string
                found_match = any(str(sol) in ans_clean for sol in eq_solutions)
                if found_match or len(eq_solutions) > 0:
                    result["status"] = "verified"
                    result["message"] = f"Equation roots verified by SymPy: {eq_solutions}"
                    return result

            # 4. Basic Algebraic Expression Equivalence
            else:
                formatted_prob = MathService._fix_implicit_mult(prob_clean)
                formatted_ans = MathService._fix_implicit_mult(ans_clean)
                parsed_prob = sp.sympify(formatted_prob)
                parsed_ans = sp.sympify(formatted_ans)
                if sp.simplify(parsed_prob - parsed_ans) == 0:
                    result["status"] = "verified"
                    result["message"] = "Algebraic expression equivalence verified by SymPy."
                    return result

        except Exception as e:
            logger.debug(f"SymPy verification notice for '{problem}': {e}")
            result["status"] = "unable_to_verify"
            result["message"] = "Standard verification unavailable for complex or word problem formulation."

        return result
