import os
import uuid
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
from extensions import db
from models.customer import Customer
from models.document import Document
from schemas.document_schema import document_schema, document_list_schema
from middleware.role_required import role_required

documents_bp = Blueprint("documents", __name__, url_prefix="/api/documents")

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "doc", "docx"}
# Sub-categories from the brief: identity docs vs policy docs.
# The Document model doesn't have a dedicated column for this, so we
# fold it into the stored filename as a prefix (e.g. "identity__myid.pdf").
ALLOWED_CATEGORIES = {"identity", "policy", "other"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@documents_bp.post("/upload")
@jwt_required()
def upload_document():
    """
    Upload a document for a customer. multipart/form-data with:
    - file: the file itself
    - customer_id: which customer this belongs to
    - category: 'identity' | 'policy' | 'other' (default 'other')
    """
    if "file" not in request.files:
        return jsonify({"error": "no file part in the request"}), 400

    file = request.files["file"]
    customer_id = request.form.get("customer_id", type=int)
    category = request.form.get("category", "other")

    if not customer_id:
        return jsonify({"error": "customer_id is required"}), 400
    if category not in ALLOWED_CATEGORIES:
        return jsonify({"error": f"category must be one of {sorted(ALLOWED_CATEGORIES)}"}), 400
    if file.filename == "":
        return jsonify({"error": "no file selected"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": f"file type not allowed. Allowed: {sorted(ALLOWED_EXTENSIONS)}"}), 400

    if not Customer.query.get(customer_id):
        return jsonify({"error": "customer not found"}), 404

    original_name = secure_filename(file.filename)
    unique_name = f"{category}__{uuid.uuid4().hex[:8]}__{original_name}"

    customer_folder = os.path.join(current_app.config["UPLOAD_FOLDER"], str(customer_id))
    os.makedirs(customer_folder, exist_ok=True)
    file_path = os.path.join(customer_folder, unique_name)
    file.save(file_path)

    document = Document(
        customer_id=customer_id,
        file_name=unique_name,
        file_path=file_path,
    )
    db.session.add(document)
    db.session.commit()
    return jsonify(document_schema.dump(document)), 201


@documents_bp.get("")
@jwt_required()
def list_documents():
    """View uploaded files for a customer. e.g. /api/documents?customer_id=3"""
    customer_id = request.args.get("customer_id", type=int)
    if not customer_id:
        return jsonify({"error": "customer_id is required"}), 400

    documents = Document.query.filter_by(customer_id=customer_id).order_by(
        Document.uploaded_at.desc()
    ).all()
    return jsonify(document_list_schema.dump(documents)), 200


@documents_bp.get("/<int:document_id>/download")
@jwt_required()
def download_document(document_id):
    document = Document.query.get_or_404(document_id)
    directory = os.path.dirname(document.file_path)
    filename = os.path.basename(document.file_path)
    return send_from_directory(directory, filename, as_attachment=True, download_name=document.file_name)


@documents_bp.delete("/<int:document_id>")
@jwt_required()
@role_required("admin", "agent")
def delete_document(document_id):
    document = Document.query.get_or_404(document_id)
    if os.path.exists(document.file_path):
        os.remove(document.file_path)
    db.session.delete(document)
    db.session.commit()
    return jsonify({"message": "document deleted"}), 200
