import uuid
from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError
from extensions import db
from models.customer import Customer
from models.policy import Policy
from schemas.policy_schema import policy_schema, policy_list_schema
from middleware.role_required import role_required

policies_bp = Blueprint("policies", __name__, url_prefix="/api/policies")


def generate_policy_number():
    """POL-XXXXXXXX unique policy number."""
    return f"POL-{uuid.uuid4().hex[:8].upper()}"


@policies_bp.post("")
@jwt_required()
@role_required("admin", "agent")
def create_policy():
    json_data = request.get_json(silent=True) or {}
    try:
        data = policy_schema.load(json_data)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    if data["end_date"] <= data["start_date"]:
        return jsonify({"errors": {"end_date": ["must be after start_date"]}}), 400

    if not Customer.query.get(data["customer_id"]):
        return jsonify({"error": "customer not found"}), 404

    policy = Policy(
        customer_id=data["customer_id"],
        policy_type=data["policy_type"],
        policy_number=generate_policy_number(),
        premium_amount=data["premium_amount"],
        start_date=data["start_date"],
        end_date=data["end_date"],
        status="active" if data["end_date"] >= date.today() else "expired",
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
    """
    status = request.args.get("status")
    customer_id = request.args.get("customer_id", type=int)
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    query = Policy.query
    if status:
        query = query.filter_by(status=status)
    if customer_id:
        query = query.filter_by(customer_id=customer_id)

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
@role_required("admin", "agent")
def cancel_policy(policy_id):
    policy = Policy.query.get_or_404(policy_id)
    policy.status = "cancelled"
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
