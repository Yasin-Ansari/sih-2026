import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

url = "http://127.0.0.1:8000/api/solve"

test_problems = [
    "Integrate: ∫(sin(x) + cos(x)) dx",
    "Differentiate: x^2 + 3x",
    "Solve: 2x + 5 = 15",
    "Solve: x^2 - 5x + 6 = 0",
    "Integrate: ∫ (3x^2 + 4x - 5) dx",
    "Differentiate: sin(x)*cos(x)",
    "Simplify: (x^2 - 16)/(x - 4)"
]

print("=== TESTING LIVE RUNNING BACKEND API (http://127.0.0.1:8000/api/solve) ===")

for p in test_problems:
    req_data = json.dumps({"problem": p}).encode("utf-8")
    req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"})
    
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            topic = data.get("problem_analysis", {}).get("topic")
            final_ans = data.get("final_answer", {}).get("answer")
            final_latex = data.get("final_answer", {}).get("latex")
            steps = data.get("steps", [])
            step2_expr = steps[1].get("current_expression") if len(steps) > 1 else "N/A"
            
            print(f"\nPROBLEM: {p}")
            print(f"  Topic: {topic}")
            print(f"  Step 2 Expression: {step2_expr}")
            print(f"  Final Answer Answer: {final_ans}")
            print(f"  Final Answer LaTeX: {final_latex}")
            
            if final_ans == p or "Integrate:" in str(final_ans) or "Integrate:" in str(final_latex):
                print("  [FAIL] Raw input repeated in final answer!")
            else:
                print("  [PASS] Clean mathematical result returned!")
    except Exception as e:
        print(f"\nPROBLEM: {p}")
        print(f"  [ERROR] Request failed: {e}")
