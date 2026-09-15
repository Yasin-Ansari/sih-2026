import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.math_service import MathService
from app.services.visualization_service import VisualizationService

client = TestClient(app)

def test_health_endpoint():
    """Verify that /api/health returns 200 OK and status 'ok'."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_random_formula_endpoint():
    """Verify that /api/random-formula returns a valid formula object."""
    response = client.get("/api/random-formula")
    assert response.status_code == 200
    data = response.json()
    assert "formula" in data
    assert "latex" in data
    assert "category" in data
    assert "type" in data
    assert data["type"] in ["2d", "3d"]
    assert "plot_data" in data

def test_visualization_2d():
    """Test 2D curve generation endpoint for y = x^2 - 4."""
    payload = {
        "expression": "x^2 - 4",
        "type": "2d",
        "x_min": -5.0,
        "x_max": 5.0,
        "points": 50
    }
    response = client.post("/api/visualization", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is True
    assert len(data["x"]) == 50
    assert len(data["y"]) == 50
    assert data["type"] == "2d"

def test_visualization_3d():
    """Test 3D surface generation endpoint for z = x^2 + y^2."""
    payload = {
        "expression": "x^2 + y^2",
        "type": "3d",
        "x_min": -3.0,
        "x_max": 3.0,
        "y_min": -3.0,
        "y_max": 3.0,
        "points": 40
    }
    response = client.post("/api/visualization", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is True
    assert len(data["x"]) == 40
    assert len(data["y"]) == 40
    assert len(data["z"]) == 40
    assert len(data["z"][0]) == 40
    assert data["type"] == "3d"

def test_solve_empty_problem():
    """Verify 400 error when submitting an empty problem string."""
    response = client.post("/api/solve", json={"problem": "   "})
    assert response.status_code == 400
    assert "Please enter a valid mathematics problem" in response.json()["detail"]

@pytest.mark.parametrize("problem_input", [
    "integrate x^2 + 3*x",
    "solve x^2 - 5*x + 6 = 0",
    "simplify sin(x)^2 + cos(x)^2",
    "z = sin(sqrt(x^2 + y^2))",
    "d/dx (x^3 * sin(x))"
])
def test_solve_multiple_math_examples(problem_input):
    """Test AI math solver endpoint with multiple mathematical topics."""
    response = client.post("/api/solve", json={"problem": problem_input})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "problem_analysis" in data
    assert "steps" in data
    assert "final_answer" in data
    assert "verification" in data
    assert "visualization" in data
    assert isinstance(data["steps"], list)
    assert len(data["steps"]) > 0

def test_sympy_math_verification():
    """Test direct SymPy mathematical verification engine."""
    res_valid = MathService.verify_solution("x + 5 = 12", "x = 7")
    assert res_valid["status"] in ["verified", "partially_verified"]
    
    res_sympy = MathService.verify_solution("integrate x dx", "x^2/2")
    assert res_sympy["status"] in ["verified", "partially_verified", "unable_to_verify"]
    assert "sympy_result" in res_sympy

def test_visualization_nan_handling():
    """Verify that singular functions (e.g., 1/x) do not produce NaN or Inf JSON errors."""
    res = VisualizationService.generate_2d_plot("1/x", x_min=-5, x_max=5, points=100)
    assert res["available"] is True
    assert None not in res["x"]
    for val in res["y"]:
        assert val is None or isinstance(val, (int, float))
