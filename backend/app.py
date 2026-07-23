from flask import Flask, jsonify
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
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    # Import models so Flask-Migrate can see them
    from models import User, Customer, Policy, Claim, PremiumPayment, Document  # noqa: F401

    # Register blueprints
    from routes.auth import auth_bp
    from routes.customers import customers_bp
    from routes.policies import policies_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(customers_bp)
    app.register_blueprint(policies_bp)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"}), 200

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
