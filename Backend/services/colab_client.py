import httpx
from core.config import settings


class ColabAPIClient:
    def __init__(self):
        self.base_url = settings.colab_api_base_url.rstrip("/")

    async def get(self, path: str, params: dict | None = None):
        url = f"{self.base_url}{path}"

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()

    async def post(self, path: str, json: dict | None = None):
        url = f"{self.base_url}{path}"

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=json)
            response.raise_for_status()
            return response.json()


colab_client = ColabAPIClient()