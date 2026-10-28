"""
Backend Server Launcher Script.
Run directly using: python backend/run.py
"""

import os
import sys
import uvicorn

# Ensure backend root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Ensure project root is in python path for ml model imports
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

if __name__ == "__main__":
    print("Starting Edge-AI Predictive Maintenance FastAPI Server...")
    print("API Documentation: http://127.0.0.1:8000/docs")
    print("WebSocket Endpoint: ws://127.0.0.1:8000/ws/telemetry")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
