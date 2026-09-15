import os
from google import genai
from dotenv import load_dotenv

load_dotenv("c:/Users/yasin/Desktop/SIH2/backend/.env")

key = os.environ.get("GEMINI_API_KEY", "")
client = genai.Client(api_key=key)

for m in ["gemini-flash-latest", "gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.6-flash"]:
    try:
        res = client.models.generate_content(
            model=m,
            contents="Explain 2+2=4 in one short sentence"
        )
        print(f"Success with {m}:", res.text.strip())
        break
    except Exception as e:
        print(f"Error with {m}:", e)
