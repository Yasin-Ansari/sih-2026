import sys
import os
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv("c:/Users/yasin/Desktop/SIH_2026/backend/.env")
sys.path.insert(0, "c:/Users/yasin/Desktop/SIH_2026/backend")

from app.services.gemini_service import GeminiService

user_problem = """Given f(x) = x^3 - 3x^2 + 2x + 1:

1. Find f'(x).
2. Find the critical points of f(x).
3. Find the indefinite integral ∫ f(x) dx.
4. Evaluate ∫₀² f(x) dx."""

print("Testing Multi-Part User Request:")
print(user_problem)
print("="*60)

res = GeminiService.solve_math_problem(user_problem)
print("Topic:", res.get("problem_analysis", {}).get("topic"))
print("Strategy:", res.get("solution_strategy", {}).get("method"))
print("Steps Count:", len(res.get("steps", [])))
print("\nSTEPS BREAKDOWN:")
for st in res.get("steps", []):
    print(f"Step {st.get('step_number')}: {st.get('title')}")
    print(f"  Current: {st.get('current_expression')}")
    print(f"  LaTeX: {st.get('latex')}")
    print(f"  Explanation: {st.get('explanation')}")

print("\nFINAL ANSWER:")
print("Answer:", res.get("final_answer", {}).get("answer"))
print("LaTeX:", res.get("final_answer", {}).get("latex"))
print("Explanation:", res.get("final_answer", {}).get("explanation"))
