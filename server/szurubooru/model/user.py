import sqlalchemy as sa

from szurubooru.model.base import Base
from szurubooru.model.comment import Comment
from szurubooru.model.post import Post, PostFavorite, PostScore


class User(Base):
    __tablename__ = "user"

    AVATAR_GRAVATAR = "gravatar"
    AVATAR_MANUAL = "manual"

    RANK_ANONYMOUS = "anonymous"
    RANK_RESTRICTED = "restricted"
    RANK_REGULAR = "regular"
    RANK_POWER = "power"
    RANK_MODERATOR = "moderator"
    RANK_ADMINISTRATOR = "administrator"
    RANK_NOBODY = "nobody"  # unattainable, used for privileges

    user_id = sa.Column("id", sa.Integer, primary_key=True)
    creation_time = sa.Column("creation_time", sa.DateTime, nullable=False)
    last_login_time = sa.Column("last_login_time", sa.DateTime)
    version = sa.Column("version", sa.Integer, default=1, nullable=False)
    name = sa.Column("name", sa.Unicode(50), nullable=False, unique=True)
    password_hash = sa.Column("password_hash", sa.Unicode(128), nullable=False)
    password_salt = sa.Column("password_salt", sa.Unicode(32))
    password_revision = sa.Column(
        "password_revision", sa.SmallInteger, default=0, nullable=False
    )
    email = sa.Column("email", sa.Unicode(64), nullable=True)
    rank = sa.Column("rank", sa.Unicode(32), nullable=False)
    avatar_style = sa.Column(
        "avatar_style", sa.Unicode(32), nullable=False, default=AVATAR_GRAVATAR
    )
    oidc_subject = sa.Column("oidc_subject", sa.Unicode(256), nullable=True, unique=True)

    comments = sa.orm.relationship("Comment")

    # deferred column properties instead of python properties issuing one
    # query per access - list queries can undefer these to compute every
    # user's counts inline in a single statement
    post_count = sa.orm.column_property(
        sa.sql.expression.select([sa.sql.expression.func.count(1)])
        .where(Post.user_id == user_id)
        .as_scalar(),
        deferred=True,
    )
    comment_count = sa.orm.column_property(
        sa.sql.expression.select([sa.sql.expression.func.count(1)])
        .where(Comment.user_id == user_id)
        .as_scalar(),
        deferred=True,
    )
    favorite_post_count = sa.orm.column_property(
        sa.sql.expression.select([sa.sql.expression.func.count(1)])
        .where(PostFavorite.user_id == user_id)
        .as_scalar(),
        deferred=True,
    )
    liked_post_count = sa.orm.column_property(
        sa.sql.expression.select([sa.sql.expression.func.count(1)])
        .where(PostScore.user_id == user_id)
        .where(PostScore.score == 1)
        .as_scalar(),
        deferred=True,
    )
    disliked_post_count = sa.orm.column_property(
        sa.sql.expression.select([sa.sql.expression.func.count(1)])
        .where(PostScore.user_id == user_id)
        .where(PostScore.score == -1)
        .as_scalar(),
        deferred=True,
    )

    __mapper_args__ = {
        "version_id_col": version,
        "version_id_generator": False,
    }


class UserToken(Base):
    __tablename__ = "user_token"

    user_token_id = sa.Column("id", sa.Integer, primary_key=True)
    user_id = sa.Column(
        "user_id",
        sa.Integer,
        sa.ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token = sa.Column("token", sa.Unicode(36), nullable=False)
    note = sa.Column("note", sa.Unicode(128), nullable=True)
    enabled = sa.Column("enabled", sa.Boolean, nullable=False, default=True)
    expiration_time = sa.Column("expiration_time", sa.DateTime, nullable=True)
    creation_time = sa.Column("creation_time", sa.DateTime, nullable=False)
    last_edit_time = sa.Column("last_edit_time", sa.DateTime)
    last_usage_time = sa.Column("last_usage_time", sa.DateTime)
    version = sa.Column("version", sa.Integer, default=1, nullable=False)

    user = sa.orm.relationship("User")
