import uuid
import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from .base import Base


class List(Base):
    __tablename__ = 'lists'

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, nullable=False
    )

    user: Mapped['User'] = relationship('User', back_populates='lists')  # noqa: F821
    stocks: Mapped[list['ListStock']] = relationship(
        'ListStock',
        back_populates='list',
        cascade='all, delete-orphan',
        order_by='ListStock.position',
    )


class ListStock(Base):
    __tablename__ = 'list_stocks'
    __table_args__ = (UniqueConstraint('list_id', 'symbol'),)

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    list_id: Mapped[str] = mapped_column(
        String(36), ForeignKey('lists.id', ondelete='CASCADE'), nullable=False
    )
    symbol: Mapped[str] = mapped_column(Text, nullable=False)
    added_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    list: Mapped['List'] = relationship('List', back_populates='stocks')
