from flask import Blueprint

reminders_bp = Blueprint("reminders", __name__)

@reminders_bp.route("/add", methods=["POST"])
def add_reminder():
    return {"message": "Add reminder endpoint"}, 200
