"""
One-time backfill: link existing 'customer'-role Users to a Customer record.

Needed because the auto-linking (registration creates a matching Customer
row automatically) was added after some test accounts already existed.
Safe to run multiple times — skips anyone already linked.

Usage:
    python backfill_customer_links.py
"""
from app import create_app
from extensions import db
from models.user import User
from models.customer import Customer

app = create_app()
with app.app_context():
    customer_role_users = User.query.filter_by(role="customer").all()
    linked = 0
    matched_existing = 0
    created = 0

    for user in customer_role_users:
        already_linked = Customer.query.filter_by(user_id=user.id).first()
        if already_linked:
            linked += 1
            continue

        # If a Customer record with the same email already exists (e.g. an
        # admin/agent registered them manually before they had a login),
        # link that one instead of creating a duplicate.
        existing_by_email = Customer.query.filter_by(email=user.email).first()
        if existing_by_email and not existing_by_email.user_id:
            existing_by_email.user_id = user.id
            matched_existing += 1
        else:
            new_customer = Customer(user_id=user.id, name=user.name, email=user.email)
            db.session.add(new_customer)
            created += 1

    db.session.commit()
    print(f"Already linked: {linked}")
    print(f"Linked to existing Customer record by email: {matched_existing}")
    print(f"New Customer records created: {created}")
