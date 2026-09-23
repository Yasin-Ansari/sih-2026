import os
import shutil

SCRATCH_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRATCH_DIR)

src = os.path.join(ROOT_DIR, "js", "solver.js")
dst = os.path.join(ROOT_DIR, "frontend", "js", "solver.js")

shutil.copy2(src, dst)
print("Updated frontend/js/solver.js successfully from root js/solver.js!")
