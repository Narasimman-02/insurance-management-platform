from extensions import db
from datetime import datetime, timezone


class Claim(db.Model):
    __tablename__ = "claims"

    id = db.Column(db.Integer, primary_key=True)
    policy_id = db.Column(db.Integer, db.ForeignKey("policies.id"), nullable=False)
    claim_amount = db.Column(db.Numeric(12, 2), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending")  # pending | approved | rejected
    submission_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "policy_id": self.policy_id,
            "claim_amount": float(self.claim_amount),
            "reason": self.reason,
            "status": self.status,
            "submission_date": self.submission_date.isoformat(),
        }
