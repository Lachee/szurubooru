"""
Add post stacks

Revision ID: f17a8e3c90b2
Created at: 2026-06-26 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "f17a8e3c90b2"
down_revision = "5b5c940b4e78"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "post_stack",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("creation_time", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.add_column(
        "post",
        sa.Column(
            "stack_id",
            sa.Integer(),
            sa.ForeignKey("post_stack.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "post",
        sa.Column(
            "stack_order",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.create_index("ix_post_stack_id", "post", ["stack_id"])


def downgrade():
    op.drop_index("ix_post_stack_id", table_name="post")
    op.drop_column("post", "stack_order")
    op.drop_column("post", "stack_id")
    op.drop_table("post_stack")
