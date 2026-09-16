import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
root_dir = os.path.dirname(parent_dir)

sys.path.insert(0, root_dir)
sys.path.insert(0, parent_dir)
sys.path.insert(0, os.path.join(parent_dir, "backend"))
sys.path.insert(0, os.path.join(root_dir, "backend"))

try:
    from backend.app.main import app
except ImportError:
    from app.main import app
