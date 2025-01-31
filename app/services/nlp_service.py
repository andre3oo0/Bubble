import openai
import os
import urllib3

# Disable SSL warnings (for local testing only)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def generate_ai_response(user_input):
    """Generate AI response using OpenAI API with SSL verification disabled (for testing only)."""
    if os.getenv("TESTING") == "true":
        return "Mock AI Response"

    try:
        openai.api_key = os.getenv("OPENAI_API_KEY")
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": user_input}],
            request_kwargs={"verify": False},  # ⬅️ Disable SSL verification
        )
        return response["choices"][0]["message"]["content"]
    except Exception as e:
        return f"Error: {str(e)}"
