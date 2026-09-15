# 🐍 AI Mathematics Visual Solver — Backend Service

FastAPI Python backend powering the AI Mathematics Visual Solver platform.

---

## 🛠 Tech Stack & Dependencies

- **Framework**: FastAPI (Python 3.10+)
- **Server**: Uvicorn
- **Validation**: Pydantic v2 & Pydantic-Settings
- **AI Model**: Google Gemini API (`google-genai` SDK)
- **Math Verification**: SymPy
- **Graph Generator**: NumPy
- **Database & Auth**: Supabase (`supabase-py`)
- **Authentication**: PyJWT

---

## 🚀 Quick Setup

```bash
# 1. Create Virtual Environment
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# 2. Install Dependencies
pip install -r requirements.txt

# 3. Configure .env
cp .env.example .env
# Edit .env with your credentials

# 4. Start Server
uvicorn app.main:app --reload --port 8000
```

---

## 📄 API Documentation

Once the server is running, visit:
- **Swagger Interactive Docs**: `http://localhost:8000/docs`
- **ReDoc API Spec**: `http://localhost:8000/redoc`
- **API Contract**: [`API_CONTRACT.md`](file:///c:/Users/yasin/Desktop/SIH2/backend/API_CONTRACT.md)
