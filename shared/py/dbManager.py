"""
Database Manager for FastAPI applications
Provides MongoDB connection and operations
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import os
import logging
from typing import Optional, Dict, Any, List
from pymongo.errors import ConnectionFailure


class DBManager:
    """MongoDB connection manager"""

    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db: Optional[AsyncIOMotorDatabase] = None
        self.logger = logging.getLogger(__name__)

        # Database configuration
        self.url = os.getenv("DB_URL", "mongodb://localhost:27017")
        self.db_name = os.getenv("DB_NAME", "bullreckon")

    async def connect(self) -> None:
        """Connect to MongoDB"""
        try:
            self.client = AsyncIOMotorClient(self.url)
            self.db = self.client[self.db_name]

            # Test connection
            await self.client.admin.command("ping")
            self.logger.info(f"Connected to MongoDB: {self.db_name}")

        except ConnectionFailure as e:
            self.logger.error(f"Failed to connect to MongoDB: {e}")
            raise

    async def disconnect(self) -> None:
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            self.logger.info("Disconnected from MongoDB")

    def get_collection(self, name: str):
        """Get a collection from the database"""
        if not self.db:
            raise RuntimeError("Database not connected")
        return self.db[name]

    async def insert_one(self, collection: str, document: Dict[str, Any]) -> str:
        """Insert a single document"""
        coll = self.get_collection(collection)
        result = await coll.insert_one(document)
        return str(result.inserted_id)

    async def insert_many(
        self, collection: str, documents: List[Dict[str, Any]]
    ) -> List[str]:
        """Insert multiple documents"""
        coll = self.get_collection(collection)
        result = await coll.insert_many(documents)
        return [str(id) for id in result.inserted_ids]

    async def find_one(
        self, collection: str, query: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Find a single document"""
        coll = self.get_collection(collection)
        return await coll.find_one(query)

    async def find_many(
        self,
        collection: str,
        query: Dict[str, Any] = None,
        skip: int = 0,
        limit: int = 0,
    ) -> List[Dict[str, Any]]:
        """Find multiple documents"""
        coll = self.get_collection(collection)
        cursor = coll.find(query or {}).skip(skip).limit(limit)
        return await cursor.to_list(length=None)

    async def update_one(
        self, collection: str, query: Dict[str, Any], update: Dict[str, Any]
    ) -> int:
        """Update a single document"""
        coll = self.get_collection(collection)
        result = await coll.update_one(query, {"$set": update})
        return result.modified_count

    async def update_many(
        self, collection: str, query: Dict[str, Any], update: Dict[str, Any]
    ) -> int:
        """Update multiple documents"""
        coll = self.get_collection(collection)
        result = await coll.update_many(query, {"$set": update})
        return result.modified_count

    async def delete_one(self, collection: str, query: Dict[str, Any]) -> int:
        """Delete a single document"""
        coll = self.get_collection(collection)
        result = await coll.delete_one(query)
        return result.deleted_count

    async def delete_many(self, collection: str, query: Dict[str, Any]) -> int:
        """Delete multiple documents"""
        coll = self.get_collection(collection)
        result = await coll.delete_many(query)
        return result.deleted_count

    async def count_documents(
        self, collection: str, query: Dict[str, Any] = None
    ) -> int:
        """Count documents in collection"""
        coll = self.get_collection(collection)
        return await coll.count_documents(query or {})

    async def create_index(
        self, collection: str, keys: Dict[str, Any], unique: bool = False
    ) -> str:
        """Create an index on a collection"""
        coll = self.get_collection(collection)
        return await coll.create_index(keys, unique=unique)

    async def health_check(self) -> bool:
        """Check database connection health"""
        try:
            if not self.client:
                return False
            await self.client.admin.command("ping")
            return True
        except Exception:
            return False
