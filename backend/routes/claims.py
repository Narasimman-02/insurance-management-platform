from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from marshmallow import ValidationError
from extensions import db
from models.policy import Policy
from models.customer import Customer
from models.claim import Claim
from schemas.claim_schema import claim_schema, claim_list_schema
from middleware.role_required import role_required

claims_bp = Blueprint("claims", __name__, url_prefix="/api/claims")


def _own_policy_ids(user_id):
    """Policy IDs belonging to the customer record linked to this user."""
    customer = Customer.query.filter_by(user_id=int(user_id)).first()
    if not customer:
        return []
    return [p.id for p in customer.policies]


@claims_bp.post("")
@jwt_required()
def submit_claim():
    """Submit a claim against a policy. Any logged-in role can submit (typically the customer)."""
    json_data = request.get_json(silent=True) or {}
    try:
        data = claim_schema.load(json_data)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    policy = Policy.query.get(data["policy_id"])
    if not policy:
        return jsonify({"error": "policy not found"}), 404

    if policy.status != "active":
        return jsonify({"error": f"cannot claim against a policy with status '{policy.status}'"}), 400

    if get_jwt().get("role") == "customer" and policy.id not in _own_policy_ids(get_jwt_identity()):
        return jsonify({"error": "you can only submit claims on your own policies"}), 403

    claim = Claim(
        policy_id=data["policy_id"],
        claim_amount=data["claim_amount"],
        reason=data["reason"],
        status="pending",
    )
    db.session.add(claim)
    db.session.commit()
    return jsonify(claim_schema.dump(claim)), 201


@claims_bp.get("")
@jwt_required()
def list_claims():
    """
    Claim history / queue.
    e.g. /api/claims?status=pending&policy_id=3

    Customer-role accounts are automatically scoped to claims on their
    own policies only.
    """
    status = request.args.get("status")
    policy_id = request.args.get("policy_id", type=int)
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    query = Claim.query
    if get_jwt().get("role") == "customer":
        own_ids = _own_policy_ids(get_jwt_identity())
        if policy_id:
            query = query.filter(Claim.policy_id.in_([pid for pid in own_ids if pid == policy_id]))
        else:
            query = query.filter(Claim.policy_id.in_(own_ids or [-1]))
    elif policy_id:
        query = query.filter_by(policy_id=policy_id)

    if status:
        query = query.filter_by(status=status)

    pagination = query.order_by(Claim.submission_date.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "items": claim_list_schema.dump(pagination.items),
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
    }), 200


@claims_bp.get("/<int:claim_id>")
@jwt_required()
def get_claim(claim_id):
    claim = Claim.query.get_or_404(claim_id)
    return jsonify(claim_schema.dump(claim)), 200


@claims_bp.post("/<int:claim_id>/verify")
@jwt_required()
@role_required("admin", "agent")
def verify_claim(claim_id):
    """Agent marks a claim as under review after checking documents — the 'Claim Verification' step."""
    claim = Claim.query.get_or_404(claim_id)
    if claim.status != "pending":
        return jsonify({"error": f"cannot verify a claim with status '{claim.status}'"}), 400
    claim.status = "under_review"
    db.session.commit()
    return jsonify(claim_schema.dump(claim)), 200


@claims_bp.post("/<int:claim_id>/approve")
@jwt_required()
@role_required("admin", "agent")
def approve_claim(claim_id):
    claim = Claim.query.get_or_404(claim_id)
    if claim.status not in ("pending", "under_review"):
        return jsonify({"error": f"cannot approve a claim with status '{claim.status}'"}), 400
    claim.status = "approved"
    db.session.commit()
    return jsonify(claim_schema.dump(claim)), 200


@claims_bp.post("/<int:claim_id>/reject")
@jwt_required()
@role_required("admin", "agent")
def reject_claim(claim_id):
    claim = Claim.query.get_or_404(claim_id)
    if claim.status not in ("pending", "under_review"):
        return jsonify({"error": f"cannot reject a claim with status '{claim.status}'"}), 400
    claim.status = "rejected"
    db.session.commit()
    return jsonify(claim_schema.dump(claim)), 200
