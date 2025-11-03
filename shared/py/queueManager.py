"""
Queue Manager for FastAPI applications
Provides job queue functionality using Redis
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, Callable
from datetime import datetime

from .redisManager import RedisManager


class QueueManager:
    """Job queue manager using Redis"""

    def __init__(self, redis_manager: RedisManager):
        self.redis = redis_manager
        self.logger = logging.getLogger(__name__)
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.handlers: Dict[str, Callable] = {}

    async def add_job(
        self, queue_name: str, job_data: Dict[str, Any], job_id: Optional[str] = None
    ) -> str:
        """Add a job to the queue"""
        if not job_id:
            job_id = f"{queue_name}_{int(datetime.now().timestamp() * 1000)}"

        job = {
            "id": job_id,
            "queue": queue_name,
            "data": job_data,
            "status": "queued",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }

        # Store job in Redis
        await self.redis.set(f"job:{job_id}", json.dumps(job))

        # Add to queue
        await self.redis.client.lpush(f"queue:{queue_name}", job_id)

        self.jobs[job_id] = job
        self.logger.info(f"Added job {job_id} to queue {queue_name}")

        return job_id

    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job by ID"""
        job_data = await self.redis.get(f"job:{job_id}")
        if job_data:
            return json.loads(job_data)
        return None

    async def update_job_status(
        self, job_id: str, status: str, result: Any = None
    ) -> None:
        """Update job status"""
        job = await self.get_job(job_id)
        if job:
            job["status"] = status
            job["updated_at"] = datetime.now().isoformat()
            if result is not None:
                job["result"] = result

            await self.redis.set(f"job:{job_id}", json.dumps(job))
            self.jobs[job_id] = job

            self.logger.info(f"Updated job {job_id} status to {status}")

    async def process_queue(self, queue_name: str) -> None:
        """Process jobs in a queue"""
        while True:
            try:
                # Get next job from queue
                job_id = await self.redis.client.rpop(f"queue:{queue_name}")
                if not job_id:
                    await asyncio.sleep(1)  # Wait before checking again
                    continue

                job = await self.get_job(job_id)
                if not job:
                    continue

                # Mark job as processing
                await self.update_job_status(job_id, "processing")

                # Process the job
                handler = self.handlers.get(queue_name)
                if handler:
                    try:
                        result = await handler(job["data"])
                        await self.update_job_status(job_id, "completed", result)
                    except Exception as e:
                        self.logger.error(f"Job {job_id} failed: {e}")
                        await self.update_job_status(job_id, "failed", str(e))
                else:
                    self.logger.warning(f"No handler for queue {queue_name}")
                    await self.update_job_status(job_id, "failed", "No handler")

            except Exception as e:
                self.logger.error(f"Error processing queue {queue_name}: {e}")
                await asyncio.sleep(5)  # Wait before retrying

    def register_handler(self, queue_name: str, handler: Callable) -> None:
        """Register a handler for a queue"""
        self.handlers[queue_name] = handler
        self.logger.info(f"Registered handler for queue {queue_name}")

    async def start_worker(self, queue_name: str) -> None:
        """Start a worker for a queue"""
        self.logger.info(f"Starting worker for queue {queue_name}")
        await self.process_queue(queue_name)

    async def get_queue_stats(self, queue_name: str) -> Dict[str, Any]:
        """Get statistics for a queue"""
        queue_length = await self.redis.client.llen(f"queue:{queue_name}")

        # Count jobs by status (this is a simplified version)
        stats = {
            "queue_length": queue_length,
            "active_jobs": len(
                [
                    j
                    for j in self.jobs.values()
                    if j["queue"] == queue_name and j["status"] == "processing"
                ]
            ),
            "completed_jobs": len(
                [
                    j
                    for j in self.jobs.values()
                    if j["queue"] == queue_name and j["status"] == "completed"
                ]
            ),
            "failed_jobs": len(
                [
                    j
                    for j in self.jobs.values()
                    if j["queue"] == queue_name and j["status"] == "failed"
                ]
            ),
        }

        return stats
