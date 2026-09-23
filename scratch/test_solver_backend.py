import sys
import os
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv("c:/Users/yasin/Desktop/SIH_2026/backend/.env")
sys.path.insert(0, "c:/Users/yasin/Desktop/SIH_2026/backend")

from app.services.gemini_service import GeminiService

test_problems = [
    "Differentiate y = 3x^4 - 5x^3 + 2x^2 - 7x + 4",
    "What is the derivative of 5x^3 - 4x?",
    "Differentiate y = sin(x) + x^2",
    "Find \\int (4x^3 + 6x - 5) dx",
    "Integrate cos(x) dx",
    "Solve 2x^2 - 8x + 6 = 0",
    "Solve x^2 - 9 = 0",
    "Evaluate 3x + 5y - 2x + y",
    "15 * 4 + 10"
]

passed = 0
failed = 0

for idx, p in enumerate(test_problems, 1):
    print(f"\n[{idx}/{len(test_problems)}] Testing Problem: '{p}'")
    try:
        res = GeminiService.solve_math_problem(p)
        topic = res.get("problem_analysis", {}).get("topic", "N/A")
        steps = res.get("steps", [])
        final_ans = res.get("final_answer", {})
        print(f"  Topic: {topic}")
        print(f"  Steps Count: {len(steps)}")
        print(f"  Final Answer Answer: {final_ans.get('answer')}")
        print(f"  Final Answer LaTeX: {final_ans.get('latex')}")
        
        # Verify that no hardcoded example string "3x^4 - 5x^3" leaks into steps of non-matching problems
        has_leak = False
        if "3x^4 - 5x^3" not in p and "5x^3 - 4x" not in p:
            for st in steps:
                st_text = str(st)
                if "3x^4" in st_text or "5x^3" in st_text:
                    has_leak = True

        if has_leak:
            print("  [FAIL] Hardcoded string leak detected in steps!")
            failed += 1
        else:
            print("  [PASS] Dynamic step generation verified clean.")
            passed += 1
    except Exception as e:
        print(f"  [FAIL] Exception occurred - {e}")
        failed += 1

print("\n" + "="*50)
print(f"TEST SUMMARY: {passed} PASSED, {failed} FAILED out of {len(test_problems)} tests.")
