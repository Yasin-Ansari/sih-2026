import re
import numpy as np
import sympy as sp
import random
from typing import Dict, Any, List
from app.utils.logger import logger
from app.services.math_service import MathService

RANDOM_FORMULAS_2D = [
    {"formula": "3*x**2 - 5*x + 2", "latex": "y = 3x^2 - 5x + 2", "category": "Quadratic Polynomial"},
    {"formula": "x**3 - 3*x + 1", "latex": "y = x^3 - 3x + 1", "category": "Cubic Polynomial"},
    {"formula": "4*sin(2*x)", "latex": "y = 4\\sin(2x)", "category": "Trigonometric Sine Wave"},
    {"formula": "cos(x) * sin(2*x)", "latex": "y = \\cos(x)\\sin(2x)", "category": "Harmonic Oscillation"},
    {"formula": "exp(-0.2*x**2) * cos(3*x)", "latex": "y = e^{-0.2x^2}\\cos(3x)", "category": "Damped Gaussian Wave"},
    {"formula": "x**4 - 4*x**2 + 1", "latex": "y = x^4 - 4x^2 + 1", "category": "W-Curve Quartic"},
    {"formula": "2 / (1 + x**2)", "latex": "y = \\frac{2}{1+x^2}", "category": "Witch of Agnesi Curve"}
]

RANDOM_FORMULAS_3D = [
    {"formula": "x**2 + y**2", "latex": "z = x^2 + y^2", "category": "Circular Paraboloid"},
    {"formula": "x**2 - y**2", "latex": "z = x^2 - y^2", "category": "Hyperbolic Paraboloid (Saddle Surface)"},
    {"formula": "sin(x) * cos(y)", "latex": "z = \\sin(x)\\cos(y)", "category": "Eggcrate Wave Surface"},
    {"formula": "exp(-(x**2 + y**2)/4)", "latex": "z = e^{-(x^2+y^2)/4}", "category": "3D Gaussian Distribution"},
    {"formula": "0.5 * (x**3 - 3*x*y**2)", "latex": "z = 0.5(x^3 - 3xy^2)", "category": "Monkey Saddle Surface"}
]

class VisualizationService:
    @staticmethod
    def _clean_latex_for_sympy(expr_str: str) -> str:
        s = str(expr_str).strip()
        s = re.sub(r'^(?:\\frac\{dy\}\{dx\}|dy/dx|y\'|y|z|f\s*\([^\)]*\)|\\int[^=]*)\s*=\s*', '', s, flags=re.IGNORECASE)
        s = re.sub(r'\\int', '', s)
        s = re.sub(r'dx$', '', s, flags=re.IGNORECASE)
        s = re.sub(r'\+\s*C$', '', s, flags=re.IGNORECASE)
        s = re.sub(r'\^\{([^}]+)\}', r'**(\1)', s)
        s = re.sub(r'\^([0-9a-zA-Z]+)', r'**\1', s)
        s = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1)/(\2)', s)
        s = re.sub(r'\\(?:left|right|cdot|times)', '', s)
        return s.strip()

    @staticmethod
    def generate_2d_plot(expr_str: str, x_min: float = -10.0, x_max: float = 10.0, points: int = 100) -> Dict[str, Any]:
        """
        Generates 2D (x, y) numerical coordinates safely using SymPy & NumPy.
        """
        try:
            x_sym = sp.Symbol('x')
            clean_str = VisualizationService._clean_latex_for_sympy(expr_str)
            formatted_expr = MathService._fix_implicit_mult(clean_str)
            sym_expr = sp.sympify(formatted_expr)

            # Convert to numpy function safely
            f = sp.lambdify(x_sym, sym_expr, modules=['numpy', 'math'])

            x_vals = np.linspace(x_min, x_max, points)
            y_vals = f(x_vals)

            # Handle scalar output (e.g. constant function y=5)
            if isinstance(y_vals, (int, float, np.number)):
                y_vals = np.full_like(x_vals, float(y_vals))

            # Clean NaNs and Infinities
            y_vals = np.nan_to_num(y_vals, nan=0.0, posinf=100.0, neginf=-100.0)

            return {
                "available": True,
                "type": "2d",
                "formula_latex": f"y = {sp.latex(sym_expr)}",
                "x": [round(float(val), 3) for val in x_vals],
                "y": [round(float(val), 3) for val in y_vals]
            }
        except Exception as e:
            logger.warning(f"Could not generate 2D plot for '{expr_str}': {e}")
            return {
                "available": False,
                "type": "2d",
                "error": f"Unable to plot expression '{expr_str}'"
            }

    @staticmethod
    def generate_3d_plot(expr_str: str, x_min: float = -5.0, x_max: float = 5.0, y_min: float = -5.0, y_max: float = 5.0, points: int = 40) -> Dict[str, Any]:
        """
        Generates 3D (x, y, z mesh grid) numerical coordinates safely.
        """
        try:
            x_sym, y_sym = sp.symbols('x y')
            clean_str = VisualizationService._clean_latex_for_sympy(expr_str)
            formatted_expr = MathService._fix_implicit_mult(clean_str)
            sym_expr = sp.sympify(formatted_expr)

            f = sp.lambdify((x_sym, y_sym), sym_expr, modules=['numpy', 'math'])

            x_vals = np.linspace(x_min, x_max, points)
            y_vals = np.linspace(y_min, y_max, points)
            X, Y = np.meshgrid(x_vals, y_vals)
            Z = f(X, Y)

            if isinstance(Z, (int, float, np.number)):
                Z = np.full_like(X, float(Z))

            Z = np.nan_to_num(Z, nan=0.0, posinf=50.0, neginf=-50.0)

            return {
                "available": True,
                "type": "3d",
                "formula_latex": f"z = {sp.latex(sym_expr)}",
                "x": [round(float(v), 3) for v in x_vals],
                "y": [round(float(v), 3) for v in y_vals],
                "z": [[round(float(val), 3) for val in row] for row in Z]
            }
        except Exception as e:
            logger.warning(f"Could not generate 3D plot for '{expr_str}': {e}")
            return {
                "available": False,
                "type": "3d",
                "error": f"Unable to plot 3D surface for '{expr_str}'"
            }

    @staticmethod
    def get_random_formula() -> Dict[str, Any]:
        """
        Returns a random mathematical formula across categories.
        """
        is_3d = random.choice([True, False])
        if is_3d:
            choice = random.choice(RANDOM_FORMULAS_3D)
            plot_data = VisualizationService.generate_3d_plot(choice["formula"])
            return {
                "formula": choice["formula"],
                "latex": choice["latex"],
                "category": choice["category"],
                "type": "3d",
                "plot_data": plot_data
            }
        else:
            choice = random.choice(RANDOM_FORMULAS_2D)
            plot_data = VisualizationService.generate_2d_plot(choice["formula"])
            return {
                "formula": choice["formula"],
                "latex": choice["latex"],
                "category": choice["category"],
                "type": "2d",
                "plot_data": plot_data
            }
