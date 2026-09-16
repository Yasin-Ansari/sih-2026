import os
import sys

FILE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(FILE_DIR)

if os.path.basename(PARENT_DIR) == "frontend":
    ROOT_DIR = os.path.dirname(PARENT_DIR)
else:
    ROOT_DIR = PARENT_DIR

BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

sys.path.insert(0, ROOT_DIR)
sys.path.insert(0, BACKEND_DIR)

from backend.app.main import app
