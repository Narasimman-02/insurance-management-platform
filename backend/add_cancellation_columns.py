"""
One-off patch for existing databases: db.create_all() only creates tables
that don't exist yet, it won't add new columns to a table that's already
there. Run this once after pulling the policy-cancellation-with-reason
feature, so the `policies` table gets the new columns.

Safe to run multiple times (IF NOT EXISTS guards).
"""
from sqlalchemy import text
from app import create_app
from extensions import db

app = create_app()
with app.app_context():
    with db.engine.begin() as conn:
        conn.execute(text("ALTER TABLE policies ADD COLUMN IF NOT EXISTS cancelled_reason TEXT"))
        conn.execute(text("ALTER TABLE policies ADD COLUMN IF NOT EXISTS cancelled_by_role VARCHAR(20)"))
        conn.execute(text("ALTER TABLE policies ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP"))
    print("policies table patched with cancellation columns (if not already present).")
