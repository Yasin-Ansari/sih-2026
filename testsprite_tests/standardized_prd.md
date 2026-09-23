# 📋 Standardized Product Requirements Document (PRD)

## Project Name: AI Mathematics Visual Solver

### 1. Overview & Core Mission
The AI Mathematics Visual Solver is an academic problem-solving platform combining Google Gemini AI reasoning, SymPy symbolic verification, dynamic 2D/3D Plotly visual surface rendering, and Supabase authentication & state persistence.

---

### 2. Core Functional Requirements

#### 2.1 AI Mathematical Reasoning & Breakdown Engine
- **Input**: Natural language or algebraic math problem (e.g. calculus, algebra, trigonometry, coordinate geometry, multivariable functions).
- **Processing**:
  - Invokes Google Gemini 3.6 AI for step-by-step reasoning.
  - Categorizes each step (`formula_application`, `substitution`, `differentiation`, `simplification`, `cancellation`).
  - Explains *what* changed, *why* it changed, and *why* it is necessary.
- **Verification**: Evaluates symbolic equality using SymPy (`verified`, `partially_verified`, `unable_to_verify`).

#### 2.2 Interactive 2D & 3D Visualization Explorer
- **2D Graphing**: Evaluates $y = f(x)$ coordinate matrices over configurable domains ($x \in [-10, 10]$).
- **3D Surface Manifold**: Computes $z = f(x, y)$ grid meshes over $40 \times 40$ resolution coordinates.
- **Random Formula Generator**: Generates graphable formulas across categories (Quadratic, Cubic, Damped Wave, Paraboloid, Saddle Surface).

#### 2.3 User Authentication & History Manager
- JWT Bearer token authentication via Supabase.
- User profile updates and solution history tracking.
- Solution bookmarking and favorites filtering.

---

### 3. Test Cases & Example Suite

| Test ID | Category | Feature Under Test | Test Input / Problem Example | Expected Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **TC-001** | Calculus | Indefinite Integration | `integrate x^2 + 3*x` | Returns step-by-step antiderivative $x^3/3 + 3x^2/2$, SymPy verified. |
| **TC-002** | Algebra | Quadratic Equation | `solve x^2 - 5*x + 6 = 0` | Isolates roots $x = 2, 3$, verified by SymPy. |
| **TC-003** | Trigonometry | Trigonometric Identity | `simplify sin(x)^2 + cos(x)^2` | Reduces expression to $1$. |
| **TC-004** | 3D Geometry | Multivariable Manifold | `z = sin(sqrt(x^2 + y^2))` | Generates 3D ripple grid mesh with $z$ values. |
| **TC-005** | Calculus | Product Rule Differentiation | `d/dx (x^3 * sin(x))` | Computes $3x^2\sin(x) + x^3\cos(x)$. |
| **TC-006** | Visualization | 2D Custom Curve Evaluation | `y = 3x^2 - 5x + 2` | Evaluates 50 coordinate points cleanly. |
| **TC-007** | Visualization | 3D Paraboloid Surface Mesh | `z = x^2 + y^2` | Generates $40 \times 40$ numerical matrix. |
| **TC-008** | Edge Cases | Undefined Function Sanitization | `y = 1/x` | Replaces division-by-zero singularities with safe numeric bounds without crashing. |
| **TC-009** | Health | Server Liveness Check | `GET /api/health` | Returns HTTP 200 with status `"ok"`. |
| **TC-010** | Random Formula | Formula Explorer | `GET /api/random-formula` | Returns random graphable 2D/3D math formula with LaTeX formatting. |
