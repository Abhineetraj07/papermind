import json
import logging
from redis.asyncio import Redis, from_url
from config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    def __init__(self):
        self._client: Redis | None = None

    async def connect(self):
        self._client = from_url(settings.redis_url, decode_responses=True)
        await self._client.ping()
        logger.info("Redis connected.")

    async def disconnect(self):
        if self._client:
            await self._client.aclose()

    @property
    def client(self) -> Redis:
        if not self._client:
            raise RuntimeError("Redis not connected")
        return self._client

    async def get_json(self, key: str) -> dict | None:
        value = await self._client.get(key)
        return json.loads(value) if value else None

    async def set_json(self, key: str, value: dict, ttl: int | None = None):
        serialized = json.dumps(value)
        if ttl:
            await self._client.setex(key, ttl, serialized)
        else:
            await self._client.set(key, serialized)

    async def append_to_list(self, key: str, value: dict, max_length: int = 100):
        await self._client.rpush(key, json.dumps(value))
        await self._client.ltrim(key, -max_length, -1)

    async def get_list(self, key: str) -> list[dict]:
        items = await self._client.lrange(key, 0, -1)
        return [json.loads(item) for item in items]

    async def delete(self, key: str):
        await self._client.delete(key)


redis_client = RedisClient()
