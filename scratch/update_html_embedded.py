import re

with open('js/solver.js', 'r', encoding='utf-8') as f:
    solver_code = f.read()

pattern = r'<script>\s*/\* Embedded Solver Engine \*/[\s\S]*?</script>'
replacement = '<script>\n/* Embedded Solver Engine */\n' + solver_code + '\n</script>'

for filepath in ['index.html', 'frontend/index.html']:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if re.search(pattern, content):
        new_content = re.sub(pattern, lambda m: replacement, content, count=1)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Successfully updated embedded solver in {filepath}")
    else:
        print(f"Embedded pattern not found in {filepath}")
