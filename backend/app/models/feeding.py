import uuid
from datetime import datetime
from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDMixin
import enum


class FeedTypeEnum(str, enum.Enum):
    breast = "breast"
    bottle = "bottle"
    solids = "solids"


class MilkTypeEnum(str, enum.Enum):
    breast_milk = "breast_milk"
    formula = "formula"
    water = "water"


class FeedingSession(Base, UUIDMixin):
    __tablename__ = "feeding_sessions"

    baby_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("baby_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    feed_type: Mapped[FeedTypeEnum] = mapped_column(
        Enum(FeedTypeEnum, name="feed_type_enum", create_type=True),
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    left_duration_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)
    right_duration_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)
    amount_ml: Mapped[float | None] = mapped_column(Float, nullable=True)
    milk_type: Mapped[MilkTypeEnum | None] = mapped_column(
        Enum(MilkTypeEnum, name="milk_type_enum", create_type=True),
        nullable=True,
    )
    food_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reaction: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
