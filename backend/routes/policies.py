import uuid
from datetime import date, datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from marshmallow import ValidationError
from extensions import db
from models.customer import Customer
from models.policy import Policy
from models.user import User
from schemas.policy_schema import policy_schema, policy_list_schema
from middleware.role_required import role_required

policies_bp = Blueprint("policies", __name__, url_prefix="/api/policies")


def generate_policy_number():
    """POL-XXXXXXXX unique policy number."""
    return f"POL-{uuid.uuid4().hex[:8].upper()}"


POLICY_CATALOG = [
    {"type": "life", "label": "Life Insurance", "description": "Financial protection for your family in case of the unexpected."},
    {"type": "health", "label": "Health Insurance", "description": "Covers hospitalization and medical expenses."},
    {"type": "vehicle", "label": "Vehicle Insurance", "description": "Protects your car or bike against accidents and damage."},
    {"type": "home", "label": "Home Insurance", "description": "Covers your home and belongings against loss or damage."},
    {"type": "travel", "label": "Travel Insurance", "description": "Coverage for trip cancellations, medical emergencies, and lost baggage."},
]


@policies_bp.get("/catalog")
@jwt_required()
def policy_catalog():
    """The types of policies offered — powers the customer dashboard."""
    return jsonify(POLICY_CATALOG), 200


@policies_bp.post("")
@jwt_required()
def create_policy():
    """
    Admin/agent: creates a policy that's immediately active (existing behavior).
    Customer: submits a policy APPLICATION — status starts as 'pending' and
    an admin/agent must approve or reject it (see /approve, /reject below).
    """
    claims = get_jwt()
    role = claims.get("role")

    json_data = request.get_json(silent=True) or {}
    try:
        data = policy_schema.load(json_data)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    if data["end_date"] <= data["start_date"]:
        return jsonify({"errors": {"end_date": ["must be after start_date"]}}), 400

    if role == "customer":
        # Customers apply for themselves — resolve their own Customer record,
        # ignoring any customer_id they might have sent, so they can't apply
        # a policy onto someone else's account.
        user_id = int(get_jwt_identity())
        customer = Customer.query.filter_by(user_id=user_id).first()
        if not customer:
            return jsonify({"error": "no customer profile linked to this account — contact support"}), 400
        status = "pending"
    else:
        if not data.get("customer_id"):
            return jsonify({"errors": {"customer_id": ["required"]}}), 400
        if not Customer.query.get(data["customer_id"]):
            return jsonify({"error": "customer not found"}), 404
        customer = None  # use data["customer_id"] directly below
        status = "active" if data["end_date"] >= date.today() else "expired"

    policy = Policy(
        customer_id=customer.id if customer else data["customer_id"],
        policy_type=data["policy_type"],
        policy_number=generate_policy_number(),
        premium_amount=data["premium_amount"],
        start_date=data["start_date"],
        end_date=data["end_date"],
        status=status,
    )
    db.session.add(policy)
    db.session.commit()
    return jsonify(policy_schema.dump(policy)), 201


@policies_bp.get("")
@jwt_required()
def list_policies():
    """
    Filter by status and/or customer_id.
    e.g. /api/policies?status=active&customer_id=3

    Customer-role accounts are automatically scoped to their own policies
    only, regardless of what customer_id they pass (or don't pass).
    """
    claims = get_jwt()
    status = request.args.get("status")
    customer_id = request.args.get("customer_id", type=int)
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    query = Policy.query
    if claims.get("role") == "customer":
        user_id = int(get_jwt_identity())
        own_customer = Customer.query.filter_by(user_id=user_id).first()
        query = query.filter_by(customer_id=own_customer.id if own_customer else -1)
    elif customer_id:
        query = query.filter_by(customer_id=customer_id)

    if status:
        query = query.filter_by(status=status)

    pagination = query.order_by(Policy.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "items": policy_list_schema.dump(pagination.items),
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
    }), 200


@policies_bp.get("/<int:policy_id>")
@jwt_required()
def get_policy(policy_id):
    policy = Policy.query.get_or_404(policy_id)
    return jsonify(policy_schema.dump(policy)), 200


@policies_bp.post("/<int:policy_id>/renew")
@jwt_required()
@role_required("admin", "agent")
def renew_policy(policy_id):
    """
    Extend end_date by the number of days requested (default 365) and
    reactivate the policy.
    """
    policy = Policy.query.get_or_404(policy_id)
    json_data = request.get_json(silent=True) or {}
    extend_days = json_data.get("extend_days", 365)

    from datetime import timedelta
    new_start = policy.end_date if policy.end_date >= date.today() else date.today()
    policy.start_date = new_start
    policy.end_date = new_start + timedelta(days=extend_days)
    policy.status = "active"
    db.session.commit()
    return jsonify(policy_schema.dump(policy)), 200


@policies_bp.post("/<int:policy_id>/cancel")
@jwt_required()
def cancel_policy(policy_id):
    """
    Cancel a policy with a reason.
    - Customers may cancel their OWN policy (must own it).
    - Admin/agent may cancel any policy.
    A reason is required either way, and a policy that is already
    cancelled/rejected/pending cannot be cancelled again.
    """
    policy = Policy.query.get_or_404(policy_id)
    claims = get_jwt()
    role = claims.get("role")

    if role == "customer":
        user_id = int(get_jwt_identity())
        own_customer = Customer.query.filter_by(user_id=user_id).first()
        if not own_customer or policy.customer_id != own_customer.id:
            return jsonify({"error": "you can only cancel your own policies"}), 403
    elif role not in ("admin", "agent"):
        return jsonify({"error": "insufficient permissions"}), 403

    if policy.status not in ("active", "expired"):
        return jsonify({"error": f"cannot cancel a policy with status '{policy.status}'"}), 400

    json_data = request.get_json(silent=True) or {}
    reason = (json_data.get("reason") or "").strip()
    if not reason:
        return jsonify({"error": "a cancellation reason is required"}), 400

    policy.status = "cancelled"
    policy.cancelled_reason = reason
    policy.cancelled_by_role = role
    policy.cancelled_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(policy_schema.dump(policy)), 200


@policies_bp.post("/<int:policy_id>/approve")
@jwt_required()
@role_required("admin", "agent")
def approve_policy(policy_id):
    """Approve a customer's pending policy application, activating it."""
    policy = Policy.query.get_or_404(policy_id)
    if policy.status != "pending":
        return jsonify({"error": f"cannot approve a policy with status '{policy.status}'"}), 400
    policy.status = "active"
    db.session.commit()
    return jsonify(policy_schema.dump(policy)), 200


@policies_bp.post("/<int:policy_id>/reject")
@jwt_required()
@role_required("admin", "agent")
def reject_policy(policy_id):
    """Reject a customer's pending policy application."""
    policy = Policy.query.get_or_404(policy_id)
    if policy.status != "pending":
        return jsonify({"error": f"cannot reject a policy with status '{policy.status}'"}), 400
    policy.status = "rejected"
    db.session.commit()
    return jsonify(policy_schema.dump(policy)), 200


@policies_bp.get("/expiring")
@jwt_required()
@role_required("admin", "agent")
def expiring_policies():
    """
    Policies expiring within N days (default 30) — powers the
    'Policy Expiry Notifications' feature.
    """
    from datetime import timedelta
    days = request.args.get("days", 30, type=int)
    cutoff = date.today() + timedelta(days=days)

    policies = Policy.query.filter(
        Policy.status == "active",
        Policy.end_date <= cutoff,
        Policy.end_date >= date.today(),
    ).order_by(Policy.end_date.asc()).all()

    return jsonify(policy_list_schema.dump(policies)), 200
