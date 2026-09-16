import os

math_solver_path = r"c:\Users\yasin\Desktop\SIH_2026\frontend\js\math_solver.js"
solver_path = r"c:\Users\yasin\Desktop\SIH_2026\frontend\js\solver.js"

with open(math_solver_path, 'r', encoding='utf-8') as f:
    math_code = f.read()

with open(solver_path, 'r', encoding='utf-8') as f:
    solver_code = f.read()

combined = math_code.strip() + "\n\n" + solver_code.strip() + "\n"

with open(solver_path, 'w', encoding='utf-8') as f:
    f.write(combined)

print("Combined size:", len(combined))
