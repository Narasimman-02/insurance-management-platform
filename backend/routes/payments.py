from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from marshmallow import ValidationError
from extensions import db
from models.policy import Policy
from models.customer import Customer
from models.premium_payment import PremiumPayment
from schemas.premium_payment_schema import premium_payment_schema, premium_payment_list_schema
from middleware.role_required import role_required

payments_bp = Blueprint("payments", __name__, url_prefix="/api/payments")


def _own_policy_ids(user_id):
    """Policy IDs belonging to the customer record linked to this user."""
    customer = Customer.query.filter_by(user_id=user_id).first()
    if not customer:
        return []
    return [p.id for p in customer.policies]


@payments_bp.post("")
@jwt_required()
def record_payment():
    """
    Record a premium payment that has just been made (status='paid',
    payment_date=today). This is the customer-facing 'Pay premium' action,
    so any logged-in role can call it — the policy_id scopes it.
    """
    json_data = request.get_json(silent=True) or {}
    try:
        data = premium_payment_schema.load(json_data, partial=True)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    if "policy_id" not in data or "amount" not in data:
        return jsonify({"error": "policy_id and amount are required"}), 400

    policy = Policy.query.get(data["policy_id"])
    if not policy:
        return jsonify({"error": "policy not found"}), 404

    if get_jwt().get("role") == "customer" and policy.id not in _own_policy_ids(get_jwt_identity()):
        return jsonify({"error": "you can only record payments on your own policies"}), 403

    payment = PremiumPayment(
        policy_id=data["policy_id"],
        amount=data["amount"],
        payment_status="paid",
    )
    db.session.add(payment)
    db.session.commit()
    return jsonify(premium_payment_schema.dump(payment)), 201


@payments_bp.post("/due")
@jwt_required()
@role_required("admin", "agent")
def schedule_due_payment():
    """
    Create a pending ('due') payment entry for a policy ahead of time —
    powers 'Due Date Tracking'. due_date defaults to 30 days out if not given.
    """
    json_data = request.get_json(silent=True) or {}
    policy_id = json_data.get("policy_id")
    amount = json_data.get("amount")
    due_date_str = json_data.get("due_date")

    if not policy_id or not amount:
        return jsonify({"error": "policy_id and amount are required"}), 400

    policy = Policy.query.get(policy_id)
    if not policy:
        return jsonify({"error": "policy not found"}), 404

    if due_date_str:
        from datetime import datetime
        due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
    else:
        from datetime import timedelta
        due_date = date.today() + timedelta(days=30)

    payment = PremiumPayment(
        policy_id=policy_id,
        amount=amount,
        payment_date=due_date,
        payment_status="due",
    )
    db.session.add(payment)
    db.session.commit()
    return jsonify(premium_payment_schema.dump(payment)), 201


@payments_bp.get("")
@jwt_required()
def list_payments():
    """
    Payment history / status list.
    e.g. /api/payments?policy_id=3&status=due

    Customer-role accounts are automatically scoped to payments on their
    own policies only.
    """
    policy_id = request.args.get("policy_id", type=int)
    status = request.args.get("status")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    query = PremiumPayment.query
    if get_jwt().get("role") == "customer":
        own_ids = _own_policy_ids(get_jwt_identity())
        if policy_id:
            # if they asked for a specific policy, only honor it if it's theirs
            query = query.filter(PremiumPayment.policy_id.in_([pid for pid in own_ids if pid == policy_id]))
        else:
            query = query.filter(PremiumPayment.policy_id.in_(own_ids or [-1]))
    elif policy_id:
        query = query.filter_by(policy_id=policy_id)

    if status:
        query = query.filter_by(payment_status=status)

    pagination = query.order_by(PremiumPayment.payment_date.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "items": premium_payment_list_schema.dump(pagination.items),
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
    }), 200


@payments_bp.post("/<int:payment_id>/pay")
@jwt_required()
def pay_due_payment(payment_id):
    """Mark a pending ('due'/'overdue') payment as paid today."""
    payment = PremiumPayment.query.get_or_404(payment_id)

    if get_jwt().get("role") == "customer" and payment.policy_id not in _own_policy_ids(get_jwt_identity()):
        return jsonify({"error": "you can only pay your own policy's premiums"}), 403

    payment.payment_status = "paid"
    payment.payment_date = date.today()
    db.session.commit()
    return jsonify(premium_payment_schema.dump(payment)), 200


@payments_bp.get("/overdue")
@jwt_required()
@role_required("admin", "agent")
def overdue_payments():
    """
    Any 'due' payment whose due date has already passed gets flagged
    'overdue' and returned — powers 'Overdue Premium Alerts'.
    """
    due_past = PremiumPayment.query.filter(
        PremiumPayment.payment_status == "due",
        PremiumPayment.payment_date < date.today(),
    ).all()

    for p in due_past:
        p.payment_status = "overdue"
    if due_past:
        db.session.commit()

    overdue = PremiumPayment.query.filter_by(payment_status="overdue").order_by(
        PremiumPayment.payment_date.asc()
    ).all()
    return jsonify(premium_payment_list_schema.dump(overdue)), 200
