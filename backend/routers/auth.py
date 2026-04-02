import os

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from db import get_db
from models.user import User
from services.auth_service import create_access_token, get_current_user, upsert_user

router = APIRouter()

FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
_IS_PROD = os.getenv('ENV') == 'production'
_EXPIRE_DAYS = 7

_oauth = OAuth()
_oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)


@router.get('/auth/google')
async def login(request: Request):
    redirect_uri = request.url_for('auth_callback')
    return await _oauth.google.authorize_redirect(request, redirect_uri)


@router.get('/auth/google/callback', name='auth_callback')
async def auth_callback(request: Request, db: AsyncSession = Depends(get_db)):
    token = await _oauth.google.authorize_access_token(request)
    info = token.get('userinfo')
    user = await upsert_user(
        db,
        google_id=info['sub'],
        email=info['email'],
        name=info['name'],
        avatar_url=info.get('picture'),
    )
    access_token = create_access_token(user.id)
    response = RedirectResponse(url=FRONTEND_URL)
    response.set_cookie(
        key='access_token',
        value=f'Bearer {access_token}',
        httponly=True,
        samesite='lax',
        max_age=_EXPIRE_DAYS * 24 * 3600,
        secure=_IS_PROD,
    )
    return response


@router.get('/auth/me')
async def me(user: User = Depends(get_current_user)):
    return {
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'avatar_url': user.avatar_url,
    }


@router.get('/auth/logout')
async def logout(response: Response):
    response.delete_cookie('access_token')
    return {'ok': True}
