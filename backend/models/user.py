import uuid
import datetime
from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import relationship, Mapped, mapped_column
from .base import Base


class User(Base):
    __tablename__ = 'users'

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    google_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, nullable=False
    )

    lists: Mapped[list['List']] = relationship(  # noqa: F821
        'List', back_populates='user', cascade='all, delete-orphan'
    )
