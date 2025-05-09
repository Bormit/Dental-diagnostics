import os
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.backend.api import app

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
