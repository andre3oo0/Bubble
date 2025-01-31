# Bubble - Your Safe Space for Emotional Support and Well-being

 Overview
Bubble is a Flask-based backend providing users with a safe space for emotional well-being through AI-driven interactions, journaling, affirmations, and wellness reminders.

Project Structure
```
Bubble/  
│── app/  
│   │── __init__.py          # Initializes Flask, DB, JWT, and Scheduler  
│   │── models.py            # Database models (User, Interaction, Reminder, JournalEntry)  
│   │── routes/  
│   │   │── __init__.py  
│   │   │── auth.py          # User authentication (Signup, Login)  
│   │   │── interactions.py  # AI-based user interactions  
│   │   │── reminders.py     # User wellness reminders  
│   │   │── safe_space.py    # Virtual hug, affirmations, soothing sounds  
│   │   │── journal.py       # User journal logging system  
│   │── services/  
│   │   │── nlp_service.py   # AI & NLP processing functions  
│   │── configs/  
│   │   │── __init__.py  
│   │   │── development.py   # Development settings  
│   │   │── production.py    # Production settings  
│── migrations/              # Flask-Migrate tracking folder  
│── tests/                   # Automated test cases  
│   │── __init__.py  
│   │── test_auth.py         # Tests for authentication  
│   │── test_interactions.py # Tests for AI interactions  
│   │── test_reminders.py    # Tests for reminders  
│   │── test_safe_space.py   # Tests for virtual hug & affirmations  
│   │── test_journal.py      # Tests for journaling feature  
│── venv/                    # Virtual environment  
│── run.py                   # Main entry point for running Flask app  
│── requirements.txt          # Required dependencies  
│── README.md                 # Project documentation  
```

Setup Instructions

Clone the Repository**
```bash
 git clone https://github.com/your-repo/bubble-backend.git
 cd bubble-backend
```

```bash
 python -m venv venv
 source venv/bin/activate  # macOS/Linux
 venv\Scripts\activate     # Windows
 pip install -r requirements.txt
```

Set Environment Variables**
Create a `.env` file in the project root with the following variables:
```bash
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=your_secret_key_here
DATABASE_URL=sqlite:///bubble.db
OPENAI_API_KEY=your_openai_api_key_here
```

Initialize Database**
```bash
 flask db init
 flask db migrate -m "Initial migration."
 flask db upgrade
```

Run the Application**
```bash
 flask run
```
Your API will be available at `http://127.0.0.1:5000/`

Features Implemented
✅ **User Authentication** - Signup & Login with JWT  
✅ **AI-Based Conversations** - OpenAI-powered emotional support  
✅ **Personalized Care** - AI remembers past interactions  
✅ **Safe Space Features** - Affirmations & virtual hug system  
✅ **Journaling System** - Users can log and retrieve journal entries  
✅ **Wellness Reminders** - Scheduled reminders for self-care  
✅ **Automated Testing** - Pytest-based test cases  

API Endpoints
### **🔐 Authentication**
- `POST /auth/signup` - Register new user  
- `POST /auth/login` - Authenticate user  

AI Interactions**
- `POST /interactions/process` - AI-based response to user input  

Journaling**
- `POST /journal/add` - Add a new journal entry  
- `GET /journal/list/<user_id>` - Retrieve all journal entries  
- `DELETE /journal/delete/<entry_id>` - Delete a journal entry  

Reminders**
- `POST /reminders/add` - Schedule a reminder  
- `GET /reminders/list/<user_id>` - Get reminders for a user  
- `DELETE /reminders/delete/<reminder_id>` - Delete a reminder  
Safe Space**
- `GET /safe-space/affirmation` - Retrieve a positive affirmation