import os

with open('js/solver.js', 'r', encoding='utf-8') as f:
    solver_code = f.read()

target = '  <script src="js/solver.js?v=2.2.0"></script>'
replacement = '  <script>\n/* Embedded Solver Engine */\n' + solver_code + '\n</script>'

for filepath in ['index.html', 'frontend/index.html']:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            html = f.read()
        if target in html:
            html = html.replace(target, replacement)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f'Successfully embedded solver into {filepath}')
        else:
            print(f'Target not found in {filepath}')
