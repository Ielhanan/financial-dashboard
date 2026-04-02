import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

_raw = os.getenv('DATABASE_URL', 'sqlite+aiosqlite:///./dev.db')

# Railway injects postgres:// — rewrite to asyncpg driver
if _raw.startswith('postgres://'):
    DATABASE_URL = _raw.replace('postgres://', 'postgresql+asyncpg://', 1)
elif _raw.startswith('postgresql://'):
    DATABASE_URL = _raw.replace('postgresql://', 'postgresql+asyncpg://', 1)
else:
    DATABASE_URL = _raw

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
