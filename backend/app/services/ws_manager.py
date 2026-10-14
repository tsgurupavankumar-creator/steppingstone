import asyncio
import json
from typing import Dict, Set, Any
from fastapi import WebSocket

class WebSocketConnectionManager:
    def __init__(self):
        # participant_id -> WebSocket
        self.participant_sockets: Dict[str, WebSocket] = {}
        # Set of admin WebSockets
        self.admin_sockets: Set[WebSocket] = set()

    async def connect_admin(self, websocket: WebSocket):
        await websocket.accept()
        self.admin_sockets.add(websocket)

    def disconnect_admin(self, websocket: WebSocket):
        self.admin_sockets.discard(websocket)

    async def connect_participant(self, participant_id: str, websocket: WebSocket):
        await websocket.accept()
        self.participant_sockets[participant_id] = websocket

    def disconnect_participant(self, participant_id: str):
        if participant_id in self.participant_sockets:
            del self.participant_sockets[participant_id]

    async def broadcast_to_participants(self, message: Dict[str, Any]):
        """Broadcast event to all connected participant browsers"""
        payload = json.dumps(message)
        dead = []
        for p_id, ws in list(self.participant_sockets.items()):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(p_id)
        for p_id in dead:
            self.disconnect_participant(p_id)

    async def send_to_participant(self, participant_id: str, message: Dict[str, Any]):
        """Send message to a specific participant"""
        ws = self.participant_sockets.get(participant_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                self.disconnect_participant(participant_id)

    async def broadcast_to_admins(self, message: Dict[str, Any]):
        """Broadcast live monitoring events to admin dashboard"""
        payload = json.dumps(message)
        dead = set()
        for ws in list(self.admin_sockets):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect_admin(ws)

    def is_participant_connected(self, participant_id: str) -> bool:
        return participant_id in self.participant_sockets

ws_manager = WebSocketConnectionManager()
