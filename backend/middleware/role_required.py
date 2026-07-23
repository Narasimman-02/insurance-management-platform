"""
Role-based authorization decorator.
Use after @jwt_required(): @role_required("admin", "agent")
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt


def role_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            if claims.get("role") not in allowed_roles:
                return jsonify({"error": "insufficient permissions"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
