from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db import get_db
from models.list import List, ListStock
from models.user import User
from services.auth_service import get_current_user

router = APIRouter()


class CreateListRequest(BaseModel):
    name: str


class AddStockRequest(BaseModel):
    symbol: str


def _serialize_list(lst: List) -> dict:
    return {
        'id': lst.id,
        'name': lst.name,
        'created_at': lst.created_at.isoformat(),
        'stocks': [{'symbol': s.symbol, 'position': s.position} for s in lst.stocks],
    }


@router.get('/lists')
async def get_lists(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(List)
        .where(List.user_id == user.id)
        .options(selectinload(List.stocks))
        .order_by(List.created_at)
    )
    return [_serialize_list(lst) for lst in result.scalars().all()]


@router.post('/lists', status_code=201)
async def create_list(
    body: CreateListRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lst = List(user_id=user.id, name=body.name)
    db.add(lst)
    await db.commit()
    result = await db.execute(
        select(List).where(List.id == lst.id).options(selectinload(List.stocks))
    )
    lst = result.scalar_one()
    return _serialize_list(lst)


@router.delete('/lists/{list_id}', status_code=204)
async def delete_list(
    list_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(List).where(List.id == list_id, List.user_id == user.id)
    )
    lst = result.scalar_one_or_none()
    if not lst:
        raise HTTPException(status_code=404)
    await db.delete(lst)
    await db.commit()


@router.post('/lists/{list_id}/stocks', status_code=201)
async def add_stock(
    list_id: str,
    body: AddStockRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(List).where(List.id == list_id, List.user_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404)

    symbol = body.symbol.upper().strip()
    dup = await db.execute(
        select(ListStock).where(
            ListStock.list_id == list_id, ListStock.symbol == symbol
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=409, detail='Already in this list')

    stock = ListStock(list_id=list_id, symbol=symbol)
    db.add(stock)
    await db.commit()
    await db.refresh(stock)
    return {'symbol': stock.symbol, 'position': stock.position}


@router.delete('/lists/{list_id}/stocks/{symbol}', status_code=204)
async def remove_stock(
    list_id: str,
    symbol: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ListStock)
        .join(List)
        .where(
            ListStock.list_id == list_id,
            ListStock.symbol == symbol.upper(),
            List.user_id == user.id,
        )
    )
    stock = result.scalar_one_or_none()
    if not stock:
        raise HTTPException(status_code=404)
    await db.delete(stock)
    await db.commit()
