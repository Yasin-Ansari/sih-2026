# 🧮 AI Mathematics Visual Solver — Full-Stack Academic Platform

An AI-powered mathematical problem solver, step-by-step reasoning engine, and dynamic 2D/3D visualization platform built specifically for the **Google Stitch** frontend design.

Powered by **Python (FastAPI)**, **Google Gemini 2.5 AI**, **SymPy Mathematical Verification Engine**, **NumPy & Plotly Graphics**, and **Supabase Authentication & Database**.

---

## 📐 Key Features

1. **AI Step-by-Step Educational Breakdown**:
   - Solves arithmetic, algebra, trigonometry, coordinate geometry, calculus (differentiation & integration), linear equations, and word problems.
   - Categorizes every transformation (`formula_application`, `substitution`, `differentiation`, `simplification`, `cancellation`, etc.).
   - Explains *what* changed, *why* it changed, and *why* it is necessary.

2. **SymPy Symbolic Verification Engine**:
   - Validates Gemini AI outputs using symbolic mathematics.
   - Provides explicit verification metadata (`Verified`, `Partially Verified`, `Unable to Verify`).

3. **Dynamic 2D & 3D Plotly Visualization**:
   - Safe numerical data generation for 2D curve plots ($y = f(x)$) and 3D surface manifolds ($z = f(x, y)$).
   - Interactive camera orbit, zoom, preset formula buttons, and random formula explorer.

4. **Real User Account System**:
   - Integrated Supabase Authentication (`register`, `login`, `logout`, `me`).
   - Dynamic user profile management ("Ansari Yasin") backed by Supabase Row Level Security (RLS).
   - Saved problem history, search/filter, and solution bookmarking.

---

## 📁 Project Architecture & Folder Structure

```text
AI-Mathematics-Visual-Solver/
│
├── frontend/                     # Stitch Frontend Application
│   ├── index.html                # Single Page App Master Interface
│   ├── css/                      # Custom styles & Tailwind CSS
│   ├── js/                       # Modular REST API Integration
│   │   ├── api.js                # API client helper & JWT bearer token handler
│   │   ├── auth.js               # Supabase authentication & user profile state
│   │   ├── solver.js             # Solver form, AI loading states & KaTeX rendering
│   │   ├── visualization.js      # Plotly 2D/3D visual explorer
│   │   └── history.js            # Solution history & bookmarks manager
│   └── assets/                   # Static assets & images
│
├── backend/                      # Python FastAPI Backend
│   ├── app/
│   │   ├── main.py               # FastAPI application entry point & CORS
│   │   ├── config.py             # Pydantic settings manager
│   │   ├── database.py           # Supabase client initialization
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.py           # User registration, login, logout, me
│   │   │   ├── users.py          # User profile & password updates
│   │   │   ├── solver.py         # AI math solver endpoint (/api/solve)
│   │   │   ├── history.py        # History CRUD & bookmarks (/api/history)
│   │   │   ├── visualization.py  # 2D & 3D Plotly data generator (/api/visualization)
│   │   │   └── random_formula.py # Random formula generator (/api/random-formula)
│   │   │
│   │   ├── services/
│   │   │   ├── gemini_service.py # Gemini AI structured JSON breakdown engine
│   │   │   ├── math_service.py   # SymPy verification layer
│   │   │   ├── visualization_service.py # Numerical graph data evaluator
│   │   │   └── supabase_service.py    # Database CRUD operations
│   │   │
│   │   ├── schemas/              # Pydantic request/response models
│   │   ├── middleware/           # JWT Authentication middleware
│   │   └── utils/                # Logger & utilities
│   │
│   ├── database/
│   │   └── schema.sql            # Supabase SQL script & RLS policies
│   ├── API_CONTRACT.md           # API specification document
│   ├── requirements.txt          # Python dependencies
│   ├── .env                      # Local environment configuration
│   ├── .env.example              # Environment template
│   ├── .gitignore
│   └── README.md                 # Backend technical documentation
│
├── .gitignore
└── README.md
```

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, Vanilla JavaScript (ES6 Modules), Tailwind CSS, KaTeX, Plotly.js |
| **Backend** | Python 3.10+, FastAPI, Pydantic v2, Uvicorn |
| **AI Solver** | Google Gemini API (`google-genai` SDK) |
| **Math Engine** | SymPy (Symbolic Mathematics & Verification) |
| **Data/Plotting**| NumPy (Grid Mesh & Numerical Evaluation) |
| **Auth & DB** | Supabase (PostgreSQL + Auth + Row Level Security) |

---

## 🚀 How to Run Locally in VS Code

### Prerequisites
- **Python 3.10+** installed
- **Node.js** or standard Python HTTP server for serving static frontend
- **Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))
- **Supabase Account & Project** ([Supabase Console](https://supabase.com/))

---

### Step 1: Backend Setup

1. Open terminal and navigate to `backend`:
   ```bash
   cd backend
   ```

2. Create and activate Python virtual environment:
   - **Windows**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure `.env` file:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Open `backend/.env` and insert your API credentials:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   FRONTEND_URL=http://localhost:5500
   BACKEND_URL=http://localhost:8000
   ```

5. Run FastAPI Backend Server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *The backend will start at `http://localhost:8000`.*
   *Interactive API documentation is available at `http://localhost:8000/docs`.*

---

### Step 2: Supabase Database Setup

1. Open your [Supabase SQL Editor](https://supabase.com/dashboard).
2. Copy the contents of [`backend/database/schema.sql`](file:///c:/Users/yasin/Desktop/SIH2/backend/database/schema.sql).
3. Execute the SQL script to create the `profiles`, `solutions`, and `favorites` tables with Row Level Security (RLS) policies.

---

### Step 3: Frontend Setup

1. Open a new terminal tab at project root:
   ```bash
   cd frontend
   ```

2. Serve static files:
   - Using Python:
     ```bash
     python -m http.server 5500
     ```
   - Or open `frontend/index.html` with VS Code **Live Server** extension (Port 5500).

3. Access application in browser:
   `http://localhost:5500`

---

## 📡 Key API Endpoints

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account | Public |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Bearer Token |
| `POST` | `/api/solve` | AI math reasoning, SymPy check, Plotly graph | Optional |
| `POST` | `/api/visualization` | Safe 2D curve or 3D surface mesh generator | Public |
| `GET` | `/api/random-formula` | Generate random graphable formula | Public |
| `GET` | `/api/history` | Retrieve user's saved solution history | Bearer Token |
| `PATCH`| `/api/history/{id}/favorite` | Toggle solution bookmark status | Bearer Token |
| `DELETE`| `/api/history/{id}` | Remove item from solution history | Bearer Token |
| `GET` | `/api/health` | Health check (`{"status": "ok"}`) | Public |

For detailed payloads and schemas, see [`backend/API_CONTRACT.md`](file:///c:/Users/yasin/Desktop/SIH2/backend/API_CONTRACT.md).

---

## 🧪 Troubleshooting

- **CORS Errors**: Ensure `FRONTEND_URL` in `backend/.env` matches your frontend origin (`http://localhost:5500`).
- **Gemini API Errors**: Verify `GEMINI_API_KEY` is active and quota is available.
- **SymPy Notice**: Complex word problems may show `unable_to_verify` — this is normal when symbolic parsing cannot isolate closed-form equations.
