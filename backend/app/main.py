from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.routes import auth, users, solver, history, visualization, random_formula
from app.utils.logger import logger

app = FastAPI(
    title="AI Mathematics Visual Solver API",
    description="Backend service providing Gemini AI step reasoning, SymPy math verification, Plotly 2D/3D visualization data, and Supabase auth/history sync.",
    version="1.0.0"
)

# Configure CORS
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler to prevent technical leaks
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An unexpected server error occurred. Please try again later."
        }
    )

# Health Check Endpoint
@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok"}

# Register Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(solver.router)
app.include_router(history.router)
app.include_router(visualization.router)
app.include_router(random_formula.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
