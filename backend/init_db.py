"""
Creates all database tables if they don't already exist.
Used as part of Render's build step instead of Flask-Migrate,
since this project doesn't need migration history tracking —
just "make sure the tables exist" on a fresh database.
"""
from app import create_app
from extensions import db

app = create_app()
with app.app_context():
    db.create_all()
    print("Database tables created (if not already present).")
