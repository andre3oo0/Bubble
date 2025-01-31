"""Manual schema

Revision ID: 943702cff2cd
Revises: 
Create Date: 2025-01-28 12:37:48.584311

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = '943702cff2cd'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass

def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('email', sa.String(120), nullable=False, unique=True),
        sa.Column('password', sa.String(255), nullable=False),
        sa.Column('preferences', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime, default=datetime.utcnow),
    )
    op.create_table(
        'journals',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('entry', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime, default=datetime.utcnow),
    )
    op.create_table(
        'interactions',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('user_input', sa.Text, nullable=False),
        sa.Column('ai_response', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime, default=datetime.utcnow),
    )
