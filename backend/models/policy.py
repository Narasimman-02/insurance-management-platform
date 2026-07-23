from extensions import db
from datetime import datetime, timezone


class Policy(db.Model):
    __tablename__ = "policies"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    policy_type = db.Column(db.String(50), nullable=False)   # life, health, vehicle, etc.
    policy_number = db.Column(db.String(50), unique=True, nullable=False)
    premium_amount = db.Column(db.Numeric(12, 2), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="active")  # active | expired | cancelled
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    claims = db.relationship("Claim", backref="policy", cascade="all, delete-orphan")
    payments = db.relationship("PremiumPayment", backref="policy", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "policy_type": self.policy_type,
            "policy_number": self.policy_number,
            "premium_amount": float(self.premium_amount),
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "status": self.status,
        }
