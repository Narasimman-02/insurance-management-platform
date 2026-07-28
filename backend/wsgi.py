"""
Entry point for production WSGI servers (gunicorn on Render).
Local dev still uses `python app.py` directly.
"""
from app import create_app

app = create_app()
