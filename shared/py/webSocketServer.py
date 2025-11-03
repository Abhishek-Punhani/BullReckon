"""
WebSocket Server for FastAPI applications
Provides real-time communication using WebSockets
"""

import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
import uuid

from .redisManager import RedisManager


class WebSocketServer:
    """WebSocket server for real-time communication"""

    def __init__(self, redis_manager: Optional[RedisManager] = None):
        self.redis = redis_manager
        self.logger = logging.getLogger(__name__)

        # Connected clients
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, Set[str]] = (
            {}
        )  # user_id -> set of connection_ids

        # Pub/Sub for cross-instance communication
        self.pubsub_task: Optional[asyncio.Task] = None

    async def connect(self, websocket: WebSocket, user_id: Optional[str] = None) -> str:
        """Connect a new WebSocket client"""
        await websocket.accept()

        connection_id = str(uuid.uuid4())
        self.active_connections[connection_id] = websocket

        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(connection_id)

        self.logger.info(
            f"WebSocket client connected: {connection_id} (user: {user_id})"
        )

        # Start listening for messages if Redis is available
        if self.redis:
            self.pubsub_task = asyncio.create_task(self._listen_pubsub())

        return connection_id

    async def disconnect(self, connection_id: str) -> None:
        """Disconnect a WebSocket client"""
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            try:
                await websocket.close()
            except Exception:
                pass  # Connection might already be closed

            del self.active_connections[connection_id]

            # Remove from user connections
            for user_id, connections in self.user_connections.items():
                if connection_id in connections:
                    connections.remove(connection_id)
                    if not connections:
                        del self.user_connections[user_id]
                    break

            self.logger.info(f"WebSocket client disconnected: {connection_id}")

    async def send_to_connection(
        self, connection_id: str, message: Dict[str, Any]
    ) -> bool:
        """Send message to a specific connection"""
        if connection_id not in self.active_connections:
            return False

        try:
            await self.active_connections[connection_id].send_json(message)
            return True
        except Exception as e:
            self.logger.error(f"Failed to send message to {connection_id}: {e}")
            await self.disconnect(connection_id)
            return False

    async def send_to_user(self, user_id: str, message: Dict[str, Any]) -> int:
        """Send message to all connections of a user"""
        if user_id not in self.user_connections:
            return 0

        sent_count = 0
        connection_ids = self.user_connections[user_id].copy()

        for connection_id in connection_ids:
            if await self.send_to_connection(connection_id, message):
                sent_count += 1

        return sent_count

    async def broadcast(
        self, message: Dict[str, Any], exclude_user: Optional[str] = None
    ) -> int:
        """Broadcast message to all connected clients"""
        sent_count = 0

        for connection_id, websocket in list(self.active_connections.items()):
            # Skip if user should be excluded
            if exclude_user:
                user_id = None
                for uid, connections in self.user_connections.items():
                    if connection_id in connections:
                        user_id = uid
                        break
                if user_id == exclude_user:
                    continue

            if await self.send_to_connection(connection_id, message):
                sent_count += 1

        return sent_count

    async def publish_message(self, channel: str, message: Dict[str, Any]) -> None:
        """Publish message to Redis channel for cross-instance communication"""
        if self.redis:
            await self.redis.publish(channel, json.dumps(message))

    async def _listen_pubsub(self) -> None:
        """Listen for messages from Redis pubsub"""
        if not self.redis:
            return

        try:
            pubsub = await self.redis.subscribe("websocket_broadcast")
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        await self.broadcast(data)
                    except json.JSONDecodeError:
                        self.logger.error("Invalid JSON in pubsub message")
        except Exception as e:
            self.logger.error(f"PubSub listener error: {e}")

    async def handle_client_messages(self, connection_id: str) -> None:
        """Handle incoming messages from a client"""
        websocket = self.active_connections.get(connection_id)
        if not websocket:
            return

        try:
            while True:
                data = await websocket.receive_json()

                # Handle different message types
                message_type = data.get("type")

                if message_type == "ping":
                    await self.send_to_connection(connection_id, {"type": "pong"})
                elif message_type == "subscribe":
                    # Handle subscription to channels/topics
                    channels = data.get("channels", [])
                    self.logger.info(
                        f"Client {connection_id} subscribed to: {channels}"
                    )
                elif message_type == "unsubscribe":
                    # Handle unsubscription
                    channels = data.get("channels", [])
                    self.logger.info(
                        f"Client {connection_id} unsubscribed from: {channels}"
                    )
                else:
                    # Echo or handle custom messages
                    await self.send_to_connection(
                        connection_id, {"type": "echo", "data": data}
                    )

        except WebSocketDisconnect:
            await self.disconnect(connection_id)
        except Exception as e:
            self.logger.error(f"Error handling client {connection_id}: {e}")
            await self.disconnect(connection_id)

    def get_connection_count(self) -> int:
        """Get total number of active connections"""
        return len(self.active_connections)

    def get_user_count(self) -> int:
        """Get number of unique users connected"""
        return len(self.user_connections)

    async def cleanup(self) -> None:
        """Cleanup all connections"""
        connection_ids = list(self.active_connections.keys())
        for connection_id in connection_ids:
            await self.disconnect(connection_id)

        if self.pubsub_task:
            self.pubsub_task.cancel()
            try:
                await self.pubsub_task
            except asyncio.CancelledError:
                pass
