"""
Base FastAPI Application
Provides common setup and utilities for FastAPI services
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import logging
import os
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

from .redisManager import RedisManager
from .dbManager import DBManager
from .queueManager import QueueManager
from .emailService import EmailService
from .webSocketServer import WebSocketServer


class BaseApp:
    """Base FastAPI application with common utilities"""

    def __init__(self, name: str, version: str = "1.0.0"):
        self.name = name
        self.version = version
        self.app = FastAPI(
            title=name,
            version=version,
            docs_url="/docs",
            redoc_url="/redoc"
        )

        # Initialize managers
        self.redis_manager: Optional[RedisManager] = None
        self.db_manager: Optional[DBManager] = None
        self.queue_manager: Optional[QueueManager] = None
        self.email_service: Optional[EmailService] = None
        self.websocket_server: Optional[WebSocketServer] = None

        # Setup logging
        self._setup_logging()

        # Setup middleware
        self._setup_middleware()

        # Setup routes
        self._setup_routes()

        # Setup lifespan
        self.app.router.lifespan_context = self._lifespan

    def _setup_logging(self):
        """Setup application logging"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(self.name)

    def _setup_middleware(self):
        """Setup FastAPI middleware"""
        # CORS middleware
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # Configure as needed
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        # Trusted host middleware (for production)
        if os.getenv("ENV") == "production":
            self.app.add_middleware(
                TrustedHostMiddleware,
                allowed_hosts=["*"]  # Configure allowed hosts
            )

    def _setup_routes(self):
        """Setup common routes"""
        @self.app.get("/health")
        async def health_check():
            """Health check endpoint"""
            return {
                "status": "healthy",
                "service": self.name,
                "version": self.version
            }

        @self.app.get("/")
        async def root():
            """Root endpoint"""
            return {
                "message": f"Welcome to {self.name}",
                "version": self.version,
                "docs": "/docs"
            }

    @asynccontextmanager
    async def _lifespan(self, app: FastAPI):
        """Application lifespan context manager"""
        # Startup
        await self._startup()
        yield
        # Shutdown
        await self._shutdown()

    async def _startup(self):
        """Application startup logic"""
        self.logger.info(f"Starting {self.name} v{self.version}")

        # Initialize Redis if configured
        if os.getenv("REDIS_HOST"):
            self.redis_manager = RedisManager()
            await self.redis_manager.connect()

        # Initialize DB if configured
        if os.getenv("DB_URL"):
            self.db_manager = DBManager()
            await self.db_manager.connect()

        # Initialize Queue Manager if Redis is available
        if self.redis_manager:
            self.queue_manager = QueueManager(self.redis_manager)

        # Initialize Email Service if configured
        if os.getenv("EMAIL_HOST"):
            self.email_service = EmailService()

        # Initialize WebSocket Server if needed
        if os.getenv("ENABLE_WEBSOCKETS", "false").lower() == "true":
            self.websocket_server = WebSocketServer(self.redis_manager)

    async def _shutdown(self):
        """Application shutdown logic"""
        self.logger.info(f"Shutting down {self.name}")

        # Close connections
        if self.redis_manager:
            await self.redis_manager.disconnect()

        if self.db_manager:
            await self.db_manager.disconnect()

        if self.websocket_server:
            await self.websocket_server.disconnect()

    def get_app(self) -> FastAPI:
        """Get the FastAPI application instance"""
        return self.app

    async def handle_error(self, request: Request, exc: Exception) -> JSONResponse:
        """Global error handler"""
        self.logger.error(f"Error processing request: {exc}")

        if isinstance(exc, HTTPException):
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail}
            )

        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )