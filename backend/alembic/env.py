import asyncio
import os
import sys
from logging.config import fileConfig

from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

# Make sure backend/ is on the path so model imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models.base import Base
from models.user import User   # noqa: F401 — registers table with metadata
from models.list import List, ListStock  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _get_url() -> str:
    raw = os.getenv('DATABASE_URL', 'sqlite+aiosqlite:///./dev.db')
    if raw.startswith('postgres://'):
        url = raw.replace('postgres://', 'postgresql+asyncpg://', 1)
    elif raw.startswith('postgresql://'):
        url = raw.replace('postgresql://', 'postgresql+asyncpg://', 1)
    else:
        return raw
    # asyncpg uses ssl=require, not sslmode=require
    url = url.replace('?sslmode=require', '?ssl=require')
    url = url.replace('&sslmode=require', '&ssl=require')
    return url


def run_migrations_offline() -> None:
    context.configure(
        url=_get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={'paramstyle': 'named'},
    )
    with context.begin_transaction():
        context.run_migrations()


def _do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(_get_url())
    async with engine.begin() as conn:
        await conn.run_sync(_do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
