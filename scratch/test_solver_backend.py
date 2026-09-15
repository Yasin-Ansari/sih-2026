import sys
sys.path.insert(0, "c:/Users/yasin/Desktop/SIH2/backend")

from app.services.gemini_service import GeminiService

test_problems = [
    "Differentiate y = 3x^4 - 5x^3 + 2x^2 - 7x + 4",
    "Find \\int (4x^3 + 6x - 5) dx",
    "Solve 2x^2 - 8x + 6 = 0",
    "z = x^2 + y^2",
    "Evaluate 3x + 5y - 2x + y"
]

for p in test_problems:
    print("\n" + "="*50)
    print("Testing Problem:", p)
    res = GeminiService.solve_math_problem(p)
    print("Topic:", res["problem_analysis"]["topic"])
    print("Strategy Rule:", res["solution_strategy"]["formula_or_rule"])
    print("Steps count:", len(res["steps"]))
    for st in res["steps"]:
        print(f"  Step {st['step_number']}: {st['title']} -> {st['latex']}")
    print("Final Answer:", res["final_answer"])
