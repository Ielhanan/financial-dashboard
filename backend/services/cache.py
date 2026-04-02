import hashlib
import json
from functools import wraps

from cachetools import TTLCache

# 200 entries, 15-minute TTL — avoids hammering Yahoo Finance on repeated requests
_cache: TTLCache = TTLCache(maxsize=200, ttl=900)


def cached(func):
    """Cache results by function name + args for TTL seconds."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        key = hashlib.md5(
            json.dumps(
                {"fn": func.__name__, "args": args, "kwargs": kwargs},
                default=str,
            ).encode()
        ).hexdigest()
        if key not in _cache:
            _cache[key] = func(*args, **kwargs)
        return _cache[key]
    return wrapper
