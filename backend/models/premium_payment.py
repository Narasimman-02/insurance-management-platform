from extensions import db
from datetime import datetime, timezone


class PremiumPayment(db.Model):
    __tablename__ = "premium_payments"

    id = db.Column(db.Integer, primary_key=True)
    policy_id = db.Column(db.Integer, db.ForeignKey("policies.id"), nullable=False)
    payment_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    payment_status = db.Column(db.String(20), nullable=False, default="paid")  # paid | due | overdue

    def to_dict(self):
        return {
            "id": self.id,
            "policy_id": self.policy_id,
            "payment_date": self.payment_date.isoformat(),
            "amount": float(self.amount),
            "payment_status": self.payment_status,
        }
