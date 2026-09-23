import shutil

src = r"c:\Users\yasin\Desktop\SIH_2026\js\solver.js"
dst = r"c:\Users\yasin\Desktop\SIH_2026\frontend\js\solver.js"

shutil.copy2(src, dst)
print("Synced solver.js to frontend/js/solver.js!")
