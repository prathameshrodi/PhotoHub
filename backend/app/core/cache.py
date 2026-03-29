import redis
from app.core.config import settings

# Global Redis Connection Pool
redis_pool = redis.ConnectionPool.from_url(
    settings.REDIS_URL, decode_responses=False
)

def get_redis_client() -> redis.Redis:
    """Dependency to get a Redis client instance attached to the global pool."""
    return redis.Redis(connection_pool=redis_pool)
