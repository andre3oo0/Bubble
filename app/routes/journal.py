from flask import Blueprint, request, jsonify
from app.models import JournalEntry, db

journal_bp = Blueprint("journal", __name__)

@journal_bp.route("/add", methods=["POST"])
def add_journal_entry():
    data = request.get_json()
    user_id = data.get("user_id")
    entry_text = data.get("entry")

    if not user_id or not entry_text:
        return jsonify({"error": "Missing user_id or entry text"}), 400

    entry = JournalEntry(user_id=user_id, entry_text=entry_text)
    db.session.add(entry)
    db.session.commit()
    return jsonify({"message": "Entry added"}), 201

@journal_bp.route("/list/<int:user_id>", methods=["GET"])
def list_journal_entries(user_id):
    entries = JournalEntry.query.filter_by(user_id=user_id).all()
    return jsonify([{ "id": e.id, "entry": e.entry_text } for e in entries]), 200

@journal_bp.route("/delete/<int:entry_id>", methods=["DELETE"])
def delete_journal_entry(entry_id):
    entry = db.session.get(JournalEntry, entry_id)
    if not entry:
        return jsonify({"error": "Entry not found"}), 404
    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Entry deleted"}), 200
