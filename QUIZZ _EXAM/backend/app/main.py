import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.routers.auth import router as auth_router
from backend.app.routers.papers import router as papers_router
from backend.app.routers.exams import router as exams_router
from backend.app.routers.session import router as session_router
from backend.app.routers.monitoring import router as monitoring_router
from backend.app.routers.reports import router as reports_router
from backend.app.routers.analytics import router as analytics_router
from backend.app.services.ws_manager import ws_manager
from backend.app.services.auth_service import decode_access_token

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router)
app.include_router(papers_router)
app.include_router(exams_router)
app.include_router(session_router)
app.include_router(monitoring_router)
app.include_router(reports_router)
app.include_router(analytics_router)

# WebSocket Endpoint for Participants
@app.websocket("/ws/participant/{participant_id}")
async def websocket_participant_endpoint(websocket: WebSocket, participant_id: str):
    await ws_manager.connect_participant(participant_id, websocket)
    # Broadcast to admin that participant connected
    await ws_manager.broadcast_to_admins({
        "event": "participant_connected",
        "participant_id": participant_id
    })
    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect_participant(participant_id)
        # Broadcast to admin that participant disconnected
        await ws_manager.broadcast_to_admins({
            "event": "participant_disconnected",
            "participant_id": participant_id
        })
    except Exception:
        ws_manager.disconnect_participant(participant_id)

# WebSocket Endpoint for Admin Dashboard Live Monitoring
@app.websocket("/ws/admin")
async def websocket_admin_endpoint(websocket: WebSocket):
    await ws_manager.connect_admin(websocket)
    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect_admin(websocket)
    except Exception:
        ws_manager.disconnect_admin(websocket)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}

# Mount frontend build if dist folder exists
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
