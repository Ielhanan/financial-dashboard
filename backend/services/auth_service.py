import os
from datetime import datetime, timedelta

from fastapi import Cookie, Depends, HTTPException
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models.user import User

_SECRET = os.getenv('JWT_SECRET', 'dev-secret-change-in-prod')
_ALGORITHM = 'HS256'
_EXPIRE_DAYS = 7


def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=_EXPIRE_DAYS)
    return jwt.encode({'sub': user_id, 'exp': expire}, _SECRET, algorithm=_ALGORITHM)


async def upsert_user(
    db: AsyncSession,
    *,
    google_id: str,
    email: str,
    name: str,
    avatar_url: str | None,
) -> User:
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()
    if user:
        user.name = name
        user.avatar_url = avatar_url
    else:
        user = User(google_id=google_id, email=email, name=name, avatar_url=avatar_url)
        db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_current_user(
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not access_token:
        raise HTTPException(status_code=401, detail='Not authenticated')
    try:
        token = access_token.removeprefix('Bearer ')
        payload = jwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
        user_id: str | None = payload.get('sub')
        if not user_id:
            raise JWTError
    except JWTError:
        raise HTTPException(status_code=401, detail='Invalid token')
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return user
