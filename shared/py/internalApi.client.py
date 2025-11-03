"""
Internal API Client for FastAPI applications
Provides communication with other internal services
"""

import httpx
import logging
from typing import Optional, Dict, Any, List
import os
import json


class InternalApiClient:
    """Client for communicating with internal services"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.timeout = httpx.Timeout(30.0)  # Longer timeout for internal calls

        # Service URLs
        self.services = {
            "auth": os.getenv("AUTH_SERVICE_URL", "http://localhost:4000"),
            "market": os.getenv("MARKET_SERVICE_URL", "http://localhost:5000"),
            "calc": os.getenv("CALC_SERVICE_URL", "http://localhost:8000"),
            "api": os.getenv("API_SERVICE_URL", "http://localhost:3004"),
            "code": os.getenv("CODE_SERVICE_URL", "http://localhost:2000"),
        }

    async def call_service(
        self,
        service_name: str,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Make a call to an internal service"""
        if service_name not in self.services:
            self.logger.error(f"Unknown service: {service_name}")
            return None

        base_url = self.services[service_name]
        url = f"{base_url}{endpoint}"

        default_headers = {"Content-Type": "application/json"}
        if headers:
            default_headers.update(headers)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                if method.upper() == "GET":
                    response = await client.get(url, headers=default_headers)
                elif method.upper() == "POST":
                    response = await client.post(
                        url, json=data, headers=default_headers
                    )
                elif method.upper() == "PUT":
                    response = await client.put(url, json=data, headers=default_headers)
                elif method.upper() == "DELETE":
                    response = await client.delete(url, headers=default_headers)
                else:
                    self.logger.error(f"Unsupported HTTP method: {method}")
                    return None

                if response.status_code >= 200 and response.status_code < 300:
                    try:
                        return response.json()
                    except json.JSONDecodeError:
                        return {"message": response.text}
                else:
                    self.logger.error(
                        f"Service call failed: {response.status_code} - {response.text}"
                    )
                    return None

        except httpx.TimeoutException:
            self.logger.error(f"Timeout calling {service_name}{endpoint}")
            return None
        except Exception as e:
            self.logger.error(f"Error calling {service_name}{endpoint}: {e}")
            return None

    # Auth service methods
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user from auth service"""
        return await self.call_service("auth", "GET", f"/api/users/{user_id}")

    async def validate_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """Validate API key with auth service"""
        return await self.call_service(
            "auth", "POST", "/api/auth/validate-key", {"api_key": api_key}
        )

    # Market service methods
    async def get_market_data(self, symbols: List[str]) -> Optional[Dict[str, Any]]:
        """Get market data from market service"""
        return await self.call_service(
            "market", "POST", "/api/market/quotes", {"symbols": symbols}
        )

    async def search_symbols(self, query: str) -> Optional[Dict[str, Any]]:
        """Search for symbols in market service"""
        return await self.call_service("market", "GET", f"/api/market/search?q={query}")

    # Calc service methods
    async def calculate_portfolio(
        self, portfolio_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Calculate portfolio metrics"""
        return await self.call_service(
            "calc", "POST", "/api/calc/portfolio", portfolio_data
        )

    async def run_backtest(
        self, strategy_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Run backtesting"""
        return await self.call_service(
            "calc", "POST", "/api/calc/backtest", strategy_data
        )

    # API service methods
    async def get_api_keys(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get API keys for user"""
        return await self.call_service("api", "GET", f"/api/users/{user_id}/api-keys")

    async def create_api_key(self, user_id: str, name: str) -> Optional[Dict[str, Any]]:
        """Create API key for user"""
        return await self.call_service(
            "api", "POST", f"/api/users/{user_id}/api-keys", {"name": name}
        )

    # Code service methods
    async def execute_code(self, language: str, code: str) -> Optional[Dict[str, Any]]:
        """Execute code in code service"""
        return await self.call_service(
            "code", "POST", "/api/code/execute", {"language": language, "code": code}
        )

    async def get_execution_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get code execution status"""
        return await self.call_service("code", "GET", f"/api/code/status/{job_id}")

    async def health_check_service(self, service_name: str) -> bool:
        """Check if a service is healthy"""
        try:
            result = await self.call_service(service_name, "GET", "/health")
            return result is not None and result.get("status") == "healthy"
        except Exception:
            return False

    async def get_service_health(self) -> Dict[str, bool]:
        """Get health status of all services"""
        health = {}
        for service_name in self.services.keys():
            health[service_name] = await self.health_check_service(service_name)
        return health
