"""
Auth Service Client for FastAPI applications
Provides authentication and user management functionality
"""

import httpx
import jwt
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import os


class AuthServiceClient:
    """Client for communicating with the auth service"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

        # Auth service configuration
        self.base_url = os.getenv("AUTH_SERVICE_URL", "http://localhost:4000")
        self.jwt_secret = os.getenv("JWT_SECRET", "default-secret")
        self.timeout = httpx.Timeout(10.0)

    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])

            # Check if token is expired
            exp = payload.get("exp")
            if exp and datetime.utcnow().timestamp() > exp:
                return None

            return payload

        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user information from auth service"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/users/{user_id}",
                    headers={"Content-Type": "application/json"},
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    self.logger.error(
                        f"Failed to get user {user_id}: {response.status_code}"
                    )
                    return None

        except Exception as e:
            self.logger.error(f"Error getting user {user_id}: {e}")
            return None

    async def validate_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """Validate API key"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/auth/validate-key",
                    json={"api_key": api_key},
                    headers={"Content-Type": "application/json"},
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    return None

        except Exception as e:
            self.logger.error(f"Error validating API key: {e}")
            return None

    async def create_api_key(self, user_id: str, name: str) -> Optional[str]:
        """Create a new API key for a user"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/users/{user_id}/api-keys",
                    json={"name": name},
                    headers={"Content-Type": "application/json"},
                )

                if response.status_code == 201:
                    data = response.json()
                    return data.get("api_key")
                else:
                    self.logger.error(
                        f"Failed to create API key: {response.status_code}"
                    )
                    return None

        except Exception as e:
            self.logger.error(f"Error creating API key: {e}")
            return None

    async def revoke_api_key(self, user_id: str, api_key_id: str) -> bool:
        """Revoke an API key"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.delete(
                    f"{self.base_url}/api/users/{user_id}/api-keys/{api_key_id}"
                )

                return response.status_code == 204

        except Exception as e:
            self.logger.error(f"Error revoking API key: {e}")
            return False

    async def authenticate_user(
        self, email: str, password: str
    ) -> Optional[Dict[str, Any]]:
        """Authenticate user with email and password"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/auth/login",
                    json={"email": email, "password": password},
                    headers={"Content-Type": "application/json"},
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    return None

        except Exception as e:
            self.logger.error(f"Error authenticating user: {e}")
            return None

    async def register_user(
        self, email: str, password: str, username: str
    ) -> Optional[Dict[str, Any]]:
        """Register a new user"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/auth/register",
                    json={"email": email, "password": password, "username": username},
                    headers={"Content-Type": "application/json"},
                )

                if response.status_code == 201:
                    return response.json()
                else:
                    return None

        except Exception as e:
            self.logger.error(f"Error registering user: {e}")
            return None

    def generate_token(
        self, user_data: Dict[str, Any], expires_delta: Optional[timedelta] = None
    ) -> str:
        """Generate JWT token"""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(hours=24)  # Default 24 hours

        to_encode = user_data.copy()
        to_encode.update({"exp": expire.timestamp()})

        encoded_jwt = jwt.encode(to_encode, self.jwt_secret, algorithm="HS256")
        return encoded_jwt

    def health_check(self) -> bool:
        """Check auth service health"""
        try:
            # Simple synchronous check for health
            import requests

            response = requests.get(f"{self.base_url}/health", timeout=5)
            return response.status_code == 200
        except Exception:
            return False
