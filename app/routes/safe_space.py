from flask import Blueprint, jsonify
import random

safe_space_bp = Blueprint("safe_space", __name__)

affirmations = [
    "You are enough just as you are.",
    "You are strong and capable.",
    "You deserve happiness and love.",
    "Every day is a new opportunity.",
    "You are doing your best, and that is enough."
]

@safe_space_bp.route("/affirmation", methods=["GET"])
def get_affirmation():
    return jsonify({"affirmation": random.choice(affirmations)}), 200
