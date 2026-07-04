import uuid
from datetime import date, datetime
from sqlalchemy import Date, DateTime, Enum, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, UUIDMixin
import enum


class SexEnum(str, enum.Enum):
    male = "male"
    female = "female"
    unspecified = "unspecified"


class BabyProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "baby_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    dob: Mapped[date] = mapped_column(Date, nullable=False)
    sex: Mapped[SexEnum] = mapped_column(
        Enum(SexEnum, name="sex_enum", create_type=True),
        nullable=False,
        default=SexEnum.unspecified,
    )
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
