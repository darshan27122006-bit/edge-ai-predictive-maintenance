"""
FastAPI Main Application Entry Point.
Initializes database tables, CORS middleware, WebSocket hub,
REST routes, and background simulation services.
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base, SessionLocal
from app import crud
from app.simulator import simulator
from app.ml_service import ml_service
from app.routes.websocket import ws_manager, router as ws_router
from app.routes.machines import router as machines_router
from app.routes.telemetry import router as telemetry_router
from app.routes.alerts import router as alerts_router
from app.routes.analytics import router as analytics_router
from app.routes.model import router as model_router
from app.routes.export import router as export_router
from app.routes.simulation import router as simulation_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("predictive_maintenance")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle startup and shutdown management."""
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    # Seed default demonstration machines
    db = SessionLocal()
    try:
        crud.seed_default_machines(db)
        logger.info("Default machinery seeded successfully.")
    except Exception as e:
        logger.error(f"Error seeding default machines: {e}")
    finally:
        db.close()

    # Hook simulator to WebSocket broadcaster
    simulator.set_broadcast_callback(ws_manager.broadcast)

    # Automatically start simulation in normal mode so frontend immediately has live demo data
    simulator.start(scenario="normal", interval=1.5)
    logger.info("Simulation engine started in 'normal' demonstration mode.")

    yield

    # Clean shutdown
    simulator.stop()
    logger.info("Application shutdown complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Edge-AI Predictive Maintenance for Rotating Machinery Using TinyML and ESP32. "
                "Provides REST endpoints, WebSocket streaming, and TinyML evaluation.",
    version="1.2.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(machines_router, prefix=settings.API_V1_STR)
app.include_router(telemetry_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(model_router, prefix=settings.API_V1_STR)
app.include_router(export_router, prefix=settings.API_V1_STR)
app.include_router(simulation_router, prefix=settings.API_V1_STR)
app.include_router(ws_router)


@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend operational readiness."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.2.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": "connected",
        "models_loaded": ml_service.is_model_loaded(),
        "simulation_running": simulator.is_running,
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to Edge-AI Predictive Maintenance API",
        "documentation": "/docs",
        "health": "/api/health",
    }
