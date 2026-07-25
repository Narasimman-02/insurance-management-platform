from datetime import date, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func
from extensions import db
from models.customer import Customer
from models.policy import Policy
from models.claim import Claim
from models.premium_payment import PremiumPayment
from middleware.role_required import role_required

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


@reports_bp.get("/summary")
@jwt_required()
@role_required("admin", "agent")
def summary():
    """
    Top-line counts for dashboard cards: active/expired/cancelled policies,
    pending claims, total premium collected.
    """
    active_policies = Policy.query.filter_by(status="active").count()
    expired_policies = Policy.query.filter_by(status="expired").count()
    cancelled_policies = Policy.query.filter_by(status="cancelled").count()
    pending_claims = Claim.query.filter_by(status="pending").count()
    total_customers = Customer.query.count()
    total_premium_collected = db.session.query(
        func.coalesce(func.sum(PremiumPayment.amount), 0)
    ).filter(PremiumPayment.payment_status == "paid").scalar()

    return jsonify({
        "active_policies": active_policies,
        "expired_policies": expired_policies,
        "cancelled_policies": cancelled_policies,
        "pending_claims": pending_claims,
        "total_customers": total_customers,
        "total_premium_collected": float(total_premium_collected),
    }), 200


@reports_bp.get("/policies-by-status")
@jwt_required()
@role_required("admin", "agent")
def policies_by_status():
    """Pie/bar chart data: count of policies grouped by status."""
    rows = db.session.query(Policy.status, func.count(Policy.id)).group_by(Policy.status).all()
    return jsonify([{"status": s, "count": c} for s, c in rows]), 200


@reports_bp.get("/claims-by-status")
@jwt_required()
@role_required("admin", "agent")
def claims_by_status():
    """Pie/bar chart data: count of claims grouped by status."""
    rows = db.session.query(Claim.status, func.count(Claim.id)).group_by(Claim.status).all()
    return jsonify([{"status": s, "count": c} for s, c in rows]), 200


@reports_bp.get("/premium-collection")
@jwt_required()
@role_required("admin", "agent")
def premium_collection():
    """
    Line/bar chart data: total premium paid per month, for the last N months
    (default 6). e.g. /api/reports/premium-collection?months=6
    """
    months = request.args.get("months", 6, type=int)
    today = date.today()
    start_month = (today.month - months) % 12 or 12
    # Simple approach: pull everything and bucket in Python (dataset is small for a student project)
    payments = PremiumPayment.query.filter(PremiumPayment.payment_status == "paid").all()

    buckets = {}
    cutoff = today - timedelta(days=30 * months)
    for p in payments:
        pay_date = p.payment_date.date() if hasattr(p.payment_date, "date") else p.payment_date
        if pay_date >= cutoff:
            key = pay_date.strftime("%Y-%m")
            buckets[key] = buckets.get(key, 0) + float(p.amount)

    sorted_data = [{"month": k, "total": v} for k, v in sorted(buckets.items())]
    return jsonify(sorted_data), 200


@reports_bp.get("/customer-growth")
@jwt_required()
@role_required("admin", "agent")
def customer_growth():
    """Line chart data: new customers registered per month, last N months (default 6)."""
    months = request.args.get("months", 6, type=int)
    today = date.today()
    cutoff = today - timedelta(days=30 * months)

    customers = Customer.query.filter(Customer.created_at >= cutoff).all()
    buckets = {}
    for c in customers:
        key = c.created_at.strftime("%Y-%m")
        buckets[key] = buckets.get(key, 0) + 1

    sorted_data = [{"month": k, "new_customers": v} for k, v in sorted(buckets.items())]
    return jsonify(sorted_data), 200


@reports_bp.get("/monthly-business")
@jwt_required()
@role_required("admin", "agent")
def monthly_business():
    """
    Combined monthly report: new policies written, premium collected,
    claims filed — the 'Monthly Business Reports' feature.
    """
    months = request.args.get("months", 6, type=int)
    today = date.today()
    cutoff = today - timedelta(days=30 * months)

    policies = Policy.query.filter(Policy.created_at >= cutoff).all()
    payments = PremiumPayment.query.filter(
        PremiumPayment.payment_status == "paid", PremiumPayment.payment_date >= cutoff
    ).all()
    claims = Claim.query.filter(Claim.submission_date >= cutoff).all()

    result = {}

    def bucket(d):
        key = d.strftime("%Y-%m")
        result.setdefault(key, {"month": key, "new_policies": 0, "premium_collected": 0.0, "claims_filed": 0})
        return result[key]

    for p in policies:
        bucket(p.created_at)["new_policies"] += 1
    for pay in payments:
        pay_date = pay.payment_date.date() if hasattr(pay.payment_date, "date") else pay.payment_date
        bucket(pay.payment_date)["premium_collected"] += float(pay.amount)
    for c in claims:
        bucket(c.submission_date)["claims_filed"] += 1

    return jsonify(sorted(result.values(), key=lambda r: r["month"])), 200
