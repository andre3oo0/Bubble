from flask import Blueprint, request, jsonify
from app.models import Reminder
from app import db
import datetime

reminders_bp = Blueprint("reminders", __name__)

@reminders_bp.route("/add", methods=["POST"])
def add_reminder():
    data = request.get_json()
    reminder = Reminder(user_id=data["user_id"], text=data["text"], scheduled_time=datetime.strptime(data["scheduled_time"], "%Y-%m-%d %H:%M:%S"))
    db.session.add(reminder)
    db.session.commit()
    return jsonify({"message": "Reminder added successfully"}), 201