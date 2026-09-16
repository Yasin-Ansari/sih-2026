import sys
import os

# Add root directory to path so imports like 'from backend.app.main import app' work on Vercel
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.main import app
