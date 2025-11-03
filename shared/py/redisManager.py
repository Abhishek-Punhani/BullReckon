"""
Redis Manager for FastAPI applications
Provides Redis connection and operations
"""

import redis.asyncio as redis
import os
import logging
from typing import Optional, Any, Dict
from contextlib import asynccontextmanager


class RedisManager:
    """Redis connection manager"""

    def __init__(self):
        self.client: Optional[redis.Redis] = None
        self.logger = logging.getLogger(__name__)

        # Redis configuration
        self.host = os.getenv("REDIS_HOST", "localhost")
        self.port = int(os.getenv("REDIS_PORT", "6379"))
        self.password = os.getenv("REDIS_PASSWORD")
        self.db = int(os.getenv("REDIS_DB", "0"))

    async def connect(self) -> None:
        """Connect to Redis"""
        try:
            self.client = redis.Redis(
                host=self.host,
                port=self.port,
                password=self.password,
                db=self.db,
                decode_responses=True,
            )

            # Test connection
            await self.client.ping()
            self.logger.info(f"Connected to Redis at {self.host}:{self.port}")

        except Exception as e:
            self.logger.error(f"Failed to connect to Redis: {e}")
            raise

    async def disconnect(self) -> None:
        """Disconnect from Redis"""
        if self.client:
            await self.client.close()
            self.logger.info("Disconnected from Redis")

    async def get(self, key: str) -> Optional[str]:
        """Get value from Redis"""
        if not self.client:
            return None
        return await self.client.get(key)

    async def set(self, key: str, value: str, expire: Optional[int] = None) -> bool:
        """Set value in Redis"""
        if not self.client:
            return False
        return await self.client.set(key, value, ex=expire)

    async def delete(self, key: str) -> int:
        """Delete key from Redis"""
        if not self.client:
            return 0
        return await self.client.delete(key)

    async def exists(self, key: str) -> bool:
        """Check if key exists in Redis"""
        if not self.client:
            return False
        return await self.client.exists(key)

    async def expire(self, key: str, time: int) -> bool:
        """Set expiration time for key"""
        if not self.client:
            return False
        return await self.client.expire(key, time)

    async def publish(self, channel: str, message: str) -> int:
        """Publish message to Redis channel"""
        if not self.client:
            return 0
        return await self.client.publish(channel, message)

    async def subscribe(self, *channels: str):
        """Subscribe to Redis channels"""
        if not self.client:
            return None
        pubsub = self.client.pubsub()
        await pubsub.subscribe(*channels)
        return pubsub

    @asynccontextmanager
    async def pipeline(self):
        """Redis pipeline context manager"""
        if not self.client:
            raise RuntimeError("Redis client not connected")

        async with self.client.pipeline() as pipe:
            yield pipe

    async def health_check(self) -> bool:
        """Check Redis connection health"""
        try:
            if not self.client:
                return False
            await self.client.ping()
            return True
        except Exception:
            return False
