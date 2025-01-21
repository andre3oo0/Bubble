from flask import Blueprint

interactions_bp = Blueprint("interactions", __name__)

@interactions_bp.route("/process", methods=["POST"])
def process_interaction():
    return {"message": "Process interaction endpoint"}, 