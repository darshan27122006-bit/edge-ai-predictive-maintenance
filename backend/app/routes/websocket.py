"""
WebSocket Hub for Real-time Dashboard Updates.
Maintains active client connections and broadcasts live telemetry events.
"""

import json
import logging
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        dead_connections = []
        payload_str = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(payload_str)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            if dead in self.active_connections:
                self.active_connections.remove(dead)


ws_manager = ConnectionManager()


@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial confirmation message
        await websocket.send_json({
            "type": "connection_status",
            "status": "connected",
            "message": "Connected to Edge-AI Predictive Maintenance Telemetry Stream"
        })
        while True:
            # Keep connection open and receive optional ping/control from client
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                if parsed.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)
