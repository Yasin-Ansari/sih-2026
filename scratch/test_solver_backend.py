import sys
import os
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

SCRATCH_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRATCH_DIR)
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

load_dotenv(os.path.join(BACKEND_DIR, ".env"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.services.gemini_service import GeminiService

user_prompt_tests = [
    ("Integrate: ∫(sin(x) + cos(x)) dx", "sin(x) - cos(x) + C"),
    ("Differentiate x^2 + 3x", "2*x + 3"),
    ("Solve 2x + 5 = 15", "x = 5"),
    ("x^2 - 5x + 6 = 0", "x = 2, 3"),
    ("Simplify (x^2 - 9)/(x - 3)", "x + 3"),
    ("Factor x^2 - 5x + 6", "(x - 2)*(x - 3)"),
    ("Expand (x + 2)(x + 3)", "x**2 + 5*x + 6"),
    ("Differentiate sin(x)*cos(x)", "cos(x)**2 - sin(x)**2"),
    ("∫ e^x dx", "exp(x) + C"),
    ("∫ 1/x dx", "log(x) + C")
]

def main():
    passed = 0
    failed = 0

    for idx, (p, expected_contain) in enumerate(user_prompt_tests, 1):
        print(f"\n[{idx}/{len(user_prompt_tests)}] Testing: '{p}'")
        try:
            res = GeminiService.solve_math_problem(p)
            topic = res.get("problem_analysis", {}).get("topic", "N/A")
            steps = res.get("steps", [])
            final_ans = res.get("final_answer", {})
            ans_str = final_ans.get("answer", "")
            ans_latex = final_ans.get("latex", "")
            
            print(f"  Topic: {topic}")
            print(f"  Final Answer Answer: {ans_str}")
            print(f"  Final Answer LaTeX: {ans_latex}")
            
            # Verify final answer DOES NOT repeat raw question prefix "Integrate:" or "Differentiate"
            if ans_str == p or "Integrate:" in ans_latex or "Differentiate x" in ans_latex:
                print("  [FAIL] Raw input was repeated inside final answer!")
                failed += 1
            else:
                print("  [PASS] Clean calculated result produced.")
                passed += 1
        except Exception as e:
            print(f"  [FAIL] Exception: {e}")
            failed += 1

    print("\n" + "="*50)
    print(f"CATEGORIES TEST SUMMARY: {passed} PASSED, {failed} FAILED out of {len(user_prompt_tests)} tests.")

if __name__ == "__main__":
    main()
