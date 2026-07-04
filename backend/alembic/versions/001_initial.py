"""Initial migration - create all tables

Revision ID: 001
Revises:
Create Date: 2026-07-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "baby_profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("dob", sa.Date(), nullable=False),
        sa.Column("sex", sa.Enum("male", "female", "unspecified", name="sex_enum"), nullable=False, server_default="unspecified"),
        sa.Column("photo_url", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "growth_measurements",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("baby_id", UUID(as_uuid=True), sa.ForeignKey("baby_profiles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("height_cm", sa.Float(), nullable=True),
        sa.Column("head_cm", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "feeding_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("baby_id", UUID(as_uuid=True), sa.ForeignKey("baby_profiles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("feed_type", sa.Enum("breast", "bottle", "solids", name="feed_type_enum"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("left_duration_sec", sa.Integer(), nullable=True),
        sa.Column("right_duration_sec", sa.Integer(), nullable=True),
        sa.Column("amount_ml", sa.Float(), nullable=True),
        sa.Column("milk_type", sa.Enum("breast_milk", "formula", "water", name="milk_type_enum"), nullable=True),
        sa.Column("food_name", sa.String(255), nullable=True),
        sa.Column("reaction", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "sleep_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("baby_id", UUID(as_uuid=True), sa.ForeignKey("baby_profiles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("quality", sa.Enum("good", "fair", "poor", name="sleep_quality_enum"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "milestones",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("baby_id", UUID(as_uuid=True), sa.ForeignKey("baby_profiles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("achieved_at", sa.Date(), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("photo_url", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("milestones")
    op.drop_table("sleep_sessions")
    op.drop_table("feeding_sessions")
    op.drop_table("growth_measurements")
    op.drop_table("baby_profiles")

    op.execute("DROP TYPE IF EXISTS sex_enum")
    op.execute("DROP TYPE IF EXISTS feed_type_enum")
    op.execute("DROP TYPE IF EXISTS milk_type_enum")
    op.execute("DROP TYPE IF EXISTS sleep_quality_enum")
