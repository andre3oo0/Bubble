def test_add_journal_entry(client):
    """Test adding a journal entry"""
    response = client.post("/journal/add", json={"user_id": 1, "entry": "This is my journal entry."})

    assert response.status_code == 201
    assert response.json["message"] == "Entry added"

def test_delete_journal_entry(client):
    """Test deleting a journal entry"""
    client.post("/journal/add", json={"user_id": 1, "entry": "Entry to delete"})

    response = client.get("/journal/list/1")
    assert response.status_code == 200, "Journal list retrieval failed"

    entries = response.json
    assert entries, "No journal entries found"

    entry_id = entries[0]["id"]

    response = client.delete(f"/journal/delete/{entry_id}")

    assert response.status_code == 200
    assert response.json["message"] == "Entry deleted"
