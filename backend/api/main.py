"""FastAPI application entry point for the Image Pixel Reducer API.

Provides CORS, health check, and the upload + export routers.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.upload import router as upload_router
from .routes.export import router as export_router

app = FastAPI(
    title="PixelArt Image Reducer API",
    description="Upload an image, match to a palette, and export a printable PDF grid.",
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# CORS — allow the React dev server and production origin
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative React port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(upload_router)
app.include_router(export_router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/", tags=["health"])
def health_check() -> dict[str, str]:
    """Simple liveness check."""
    return {"status": "ok"}
