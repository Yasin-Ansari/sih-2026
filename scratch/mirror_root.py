import os
import shutil

repo_root = r"c:\Users\yasin\Desktop\SIH_2026"
frontend_dir = os.path.join(repo_root, "frontend")

# Copy index.html and config.js to root
shutil.copy2(os.path.join(frontend_dir, "index.html"), os.path.join(repo_root, "index.html"))
if os.path.exists(os.path.join(frontend_dir, "config.js")):
    shutil.copy2(os.path.join(frontend_dir, "config.js"), os.path.join(repo_root, "config.js"))

# Copy js directory to root js/
root_js = os.path.join(repo_root, "js")
if os.path.exists(root_js):
    shutil.rmtree(root_js)
shutil.copytree(os.path.join(frontend_dir, "js"), root_js)

# Copy css directory to root css/ if exists
root_css = os.path.join(repo_root, "css")
frontend_css = os.path.join(frontend_dir, "css")
if os.path.exists(frontend_css):
    if os.path.exists(root_css):
        shutil.rmtree(root_css)
    shutil.copytree(frontend_css, root_css)

print("Static files successfully mirrored to root directory!")
