import re

with open('frontend/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the orphaned old block that starts with the old comment/div mix
# It starts right after the new sliders card closes (line 657 </div>)
# and ends just before the solver view comment

solver_marker = '<!-- =========================================================================\n         3. AI MATHEMATICS SOLVER VIEW'
old_block_start_marker = '<!-- =========================================================================\n<div>\n<h2 class="text-xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">'

start_idx = content.find(old_block_start_marker)
end_idx = content.find(solver_marker)

print(f'start_idx: {start_idx}, end_idx: {end_idx}')

if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
    clean = content[:start_idx] + '\n' + content[end_idx:]
    with open('frontend/index.html', 'w', encoding='utf-8') as f:
        f.write(clean)
    print(f'SUCCESS: removed {end_idx - start_idx} chars of old explorer HTML')
else:
    print('Markers not found, trying alternate approach...')
    # Just print lines around position 659
    lines = content.split('\n')
    for i, line in enumerate(lines[656:672], start=657):
        print(f'{i}: {repr(line[:80])}')
