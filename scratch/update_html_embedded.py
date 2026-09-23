import os
import re

SCRATCH_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRATCH_DIR)

solver_path = os.path.join(ROOT_DIR, 'js', 'solver.js')
with open(solver_path, 'r', encoding='utf-8') as f:
    solver_code = f.read()

pattern = r'<script>\s*/\* Embedded Solver Engine \*/[\s\S]*?</script>'
replacement = '<script>\n/* Embedded Solver Engine */\n' + solver_code + '\n</script>'

targets = [os.path.join(ROOT_DIR, 'index.html'), os.path.join(ROOT_DIR, 'frontend', 'index.html')]

for filepath in targets:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        if re.search(pattern, content):
            new_content = re.sub(pattern, lambda m: replacement, content, count=1)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Successfully updated embedded solver in {filepath}")
        else:
            print(f"Embedded pattern not found in {filepath}")
    else:
        print(f"Skipping missing file: {filepath}")
