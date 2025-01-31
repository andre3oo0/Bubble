from flask import Blueprint, request, jsonify
from app.models import Interaction, db
from app.services.nlp_service import generate_ai_response

interactions_bp = Blueprint("interactions", __name__)

@interactions_bp.route("/process", methods=["POST"])
def process_interaction():
    data = request.get_json()
    user_id = data.get("user_id")
    user_input = data.get("text")

    if not user_id or not user_input:
        return jsonify({"error": "Missing user_id or text"}), 400

    ai_response = generate_ai_response(user_input)

    interaction = Interaction(
        user_id=user_id,
        input_text=user_input,
        response_text=ai_response
    )
    db.session.add(interaction)
    db.session.commit()

    return jsonify({"user_input": user_input, "ai_response": ai_response}), 200
