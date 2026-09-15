# API Contract — AI Mathematics Visual Solver

This document defines the REST API endpoints provided by the FastAPI backend to serve the Google Stitch frontend.

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
Creates a new user account via Supabase Auth and populates the `profiles` table.

* **Auth**: Public
* **Request Body**:
  ```json
  {
    "name": "Ansari Yasin",
    "email": "ansari.yasin@student.edu",
    "password": "SecurePassword123!"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "uuid-v4",
      "name": "Ansari Yasin",
      "email": "ansari.yasin@student.edu"
    },
    "access_token": "jwt-token-string"
  }
  ```
* **Frontend Mapping**: `authModal` Signup view submit button.

---

### `POST /api/auth/login`
Authenticates a user and returns a Supabase JWT access token.

* **Auth**: Public
* **Request Body**:
  ```json
  {
    "email": "ansari.yasin@student.edu",
    "password": "SecurePassword123!"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "uuid-v4",
      "name": "Ansari Yasin",
      "email": "ansari.yasin@student.edu"
    },
    "access_token": "jwt-token-string"
  }
  ```
* **Frontend Mapping**: `authModal` Login view submit button.

---

### `GET /api/auth/me`
Retrieves the currently authenticated user profile.

* **Auth**: Bearer Token (Required)
* **Response (200 OK)**:
  ```json
  {
    "id": "uuid-v4",
    "name": "Ansari Yasin",
    "email": "ansari.yasin@student.edu",
    "institution": "Student / Academic",
    "solved_count": 12,
    "favorites_count": 4,
    "created_at": "2026-09-15T10:00:00Z"
  }
  ```
* **Frontend Mapping**: Top header profile avatar, Profile page (`viewProfile`), navbar user badge.

---

### `POST /api/auth/logout`
Logs out the current session.

* **Auth**: Bearer Token (Optional)
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Successfully logged out."
  }
  ```

---

## 2. Solver Endpoints

### `POST /api/solve`
Solves a math problem using Gemini AI, verifies steps with SymPy, and stores history in Supabase.

* **Auth**: Bearer Token (Optional for guest mode, Required to save history)
* **Request Body**:
  ```json
  {
    "problem": "Differentiate y = 3x^4 - 5x^3 + 2x^2 - 7x + 4"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "solution_id": "uuid-v4",
    "problem_analysis": {
      "topic": "Calculus - Differentiation",
      "given_information": ["y = 3x^4 - 5x^3 + 2x^2 - 7x + 4"],
      "find": "dy/dx (Derivative)",
      "variables": ["x", "y"]
    },
    "solution_strategy": {
      "method": "Power Rule",
      "formula_or_rule": "d/dx(x^n) = n*x^(n-1)",
      "explanation": "Apply the power rule to each polynomial term individually."
    },
    "steps": [
      {
        "step_number": 1,
        "title": "Differentiate term by term",
        "previous_expression": "3x^4 - 5x^3 + 2x^2 - 7x + 4",
        "current_expression": "3(4x^3) - 5(3x^2) + 2(2x) - 7(1) + 0",
        "latex": "\\frac{d}{dx}(3x^4 - 5x^3 + 2x^2 - 7x + 4)",
        "change_type": "differentiation",
        "explanation": "Multiply coefficient by power and decrease power by 1.",
        "reason": "Power rule of differentiation"
      }
    ],
    "final_answer": {
      "answer": "12x^3 - 15x^2 + 4x - 7",
      "latex": "12x^3 - 15x^2 + 4x - 7",
      "unit": ""
    },
    "verification": {
      "status": "verified",
      "message": "Mathematically verified via SymPy derivative engine."
    },
    "visualization": {
      "recommended_mode": "2d",
      "formula_latex": "y = 12x^3 - 15x^2 + 4x - 7",
      "two_d": {
        "available": true,
        "x": [-3, -2, -1, 0, 1, 2, 3],
        "y": [-475, -167, -38, -7, -6, 37, 194]
      },
      "three_d": { "available": false },
      "explanation": "2D curve plot of the derivative function."
    }
  }
  ```
* **Frontend Mapping**: `view-solver` input form and Solve button.

---

## 3. Visualization Endpoints

### `POST /api/visualization`
Generates safe 2D or 3D numerical plot data for Plotly based on a user expression.

* **Auth**: Public
* **Request Body**:
  ```json
  {
    "expression": "x^2 - y^2",
    "type": "3d",
    "x_range": [-5, 5],
    "y_range": [-5, 5]
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "available": true,
    "type": "3d",
    "formula_latex": "z = x^2 - y^2",
    "x": [-5, -4, -3, ...],
    "y": [-5, -4, -3, ...],
    "z": [[0, -9, -16, ...], [9, 0, -7, ...]]
  }
  ```
* **Frontend Mapping**: `view-explorer` 2D & 3D visualization tabs.

---

## 4. History & Favorites Endpoints

### `GET /api/history`
Returns history of solved problems for the logged-in user.

* **Auth**: Bearer Token (Required)
* **Response (200 OK)**:
  ```json
  [
    {
      "id": "uuid-v4",
      "problem": "Solve x^2 - 5x + 6 = 0",
      "topic": "Algebra - Quadratic Equations",
      "final_answer": "x = 2, x = 3",
      "is_favorite": true,
      "created_at": "2026-09-15T12:00:00Z"
    }
  ]
  ```

---

### `PATCH /api/history/{id}/favorite`
Toggles favorite state for a solution.

* **Auth**: Bearer Token (Required)
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "is_favorite": true
  }
  ```

---

### `DELETE /api/history/{id}`
Deletes a solution record.

* **Auth**: Bearer Token (Required)
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Solution deleted."
  }
  ```

---

## 5. Random Formula Endpoint

### `GET /api/random-formula`
Generates a random valid graphable or solvable formula across mathematical categories.

* **Auth**: Public
* **Response (200 OK)**:
  ```json
  {
    "formula": "3*sin(2*x) + cos(x)",
    "category": "Trigonometry",
    "type": "2d"
  }
  ```
* **Frontend Mapping**: `🎲 Random Formula` buttons on solver & explorer tabs.
