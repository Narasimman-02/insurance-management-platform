from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException
from config import Config
from extensions import db, migrate, jwt, bcrypt, cors


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["FRONTEND_URL"]}})

    # Import models so Flask-Migrate can see them
    from models import User, Customer, Policy, Claim, PremiumPayment, Document  # noqa: F401

    # Register blueprints
    from routes.auth import auth_bp
    from routes.customers import customers_bp
    from routes.policies import policies_bp
    from routes.payments import payments_bp
    from routes.claims import claims_bp
    from routes.documents import documents_bp
    from routes.reports import reports_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(customers_bp)
    app.register_blueprint(policies_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(claims_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(reports_bp)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"}), 200

    # --- Global error handlers: keep every error response JSON, never Flask's
    # default HTML error page, so the React frontend can always parse it. ---

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "resource not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "method not allowed"}), 405

    @app.errorhandler(413)
    def payload_too_large(e):
        return jsonify({"error": "file too large (max 10MB)"}), 413

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        return jsonify({"error": e.description or e.name}), e.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(e):
        # Catch-all for anything not already handled above (e.g. a bug in a
        # route). Never leak internal details to the client; log server-side.
        app.logger.exception("Unhandled exception")
        return jsonify({"error": "an unexpected error occurred"}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
