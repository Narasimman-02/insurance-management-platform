from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from marshmallow import ValidationError
from extensions import db
from models.customer import Customer
from schemas.customer_schema import customer_schema, customer_list_schema
from middleware.role_required import role_required

customers_bp = Blueprint("customers", __name__, url_prefix="/api/customers")


@customers_bp.get("/me")
@jwt_required()
def get_my_profile():
    """A customer-role account's own linked Customer record."""
    from flask_jwt_extended import get_jwt_identity
    user_id = get_jwt_identity()
    customer = Customer.query.filter_by(user_id=user_id).first()
    if not customer:
        return jsonify({"error": "no customer profile linked to this account"}), 404
    return jsonify(customer_schema.dump(customer)), 200


@customers_bp.put("/me")
@jwt_required()
def update_my_profile():
    """Let a customer-role account fill in/update their own details."""
    from flask_jwt_extended import get_jwt_identity
    user_id = get_jwt_identity()
    customer = Customer.query.filter_by(user_id=user_id).first()
    if not customer:
        return jsonify({"error": "no customer profile linked to this account"}), 404

    json_data = request.get_json(silent=True) or {}
    try:
        data = customer_schema.load(json_data, partial=True)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    for key, value in data.items():
        setattr(customer, key, value)
    db.session.commit()
    return jsonify(customer_schema.dump(customer)), 200


@customers_bp.post("")
@jwt_required()
@role_required("admin", "agent")
def create_customer():
    """Register a new customer (admin or agent only)."""
    json_data = request.get_json() or {}
    try:
        data = customer_schema.load(json_data)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    if Customer.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "a customer with this email already exists"}), 409

    customer = Customer(**data)
    db.session.add(customer)
    db.session.commit()
    return jsonify(customer_schema.dump(customer)), 201


@customers_bp.get("")
@jwt_required()
@role_required("admin", "agent")
def list_customers():
    """
    List customers, with optional search by name/email and pagination.
    e.g. /api/customers?search=john&page=1&per_page=10
    """
    search = request.args.get("search", "").strip()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    query = Customer.query
    if search:
        like = f"%{search}%"
        query = query.filter(db.or_(Customer.name.ilike(like), Customer.email.ilike(like)))

    pagination = query.order_by(Customer.id.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "items": customer_list_schema.dump(pagination.items),
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
    }), 200


@customers_bp.get("/<int:customer_id>")
@jwt_required()
@role_required("admin", "agent")
def get_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    return jsonify(customer_schema.dump(customer)), 200


@customers_bp.put("/<int:customer_id>")
@jwt_required()
@role_required("admin", "agent")
def update_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    json_data = request.get_json() or {}
    try:
        data = customer_schema.load(json_data, partial=True)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    for key, value in data.items():
        setattr(customer, key, value)
    db.session.commit()
    return jsonify(customer_schema.dump(customer)), 200


@customers_bp.delete("/<int:customer_id>")
@jwt_required()
@role_required("admin")
def delete_customer(customer_id):
    """Only admin can delete a customer record."""
    customer = Customer.query.get_or_404(customer_id)
    db.session.delete(customer)
    db.session.commit()
    return jsonify({"message": "customer deleted"}), 200


@customers_bp.get("/<int:customer_id>/history")
@jwt_required()
@role_required("admin", "agent")
def customer_history(customer_id):
    """Policies, claims, and payments tied to this customer — the 'Customer History' feature."""
    customer = Customer.query.get_or_404(customer_id)
    policies = [p.to_dict() for p in customer.policies]
    claims = [c.to_dict() for p in customer.policies for c in p.claims]
    payments = [pay.to_dict() for p in customer.policies for pay in p.payments]
    return jsonify({
        "customer": customer_schema.dump(customer),
        "policies": policies,
        "claims": claims,
        "payments": payments,
    }), 200
