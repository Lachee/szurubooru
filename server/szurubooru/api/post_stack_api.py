"Post stack API endpoints."

from typing import Dict

from szurubooru import db, model, rest
from szurubooru.func import auth, posts


def _serialize_stack(stack: model.PostStack) -> rest.Response:
    stack_posts = (
        db.session.query(model.Post)
        .filter(model.Post.stack_id == stack.stack_id)
        .order_by(model.Post.stack_order)
        .all()
    )
    return {
        "id": stack.stack_id,
        "creationTime": stack.creation_time,
        "posts": [
            {
                "id": p.post_id,
                "thumbnailUrl": posts.get_post_thumbnail_url(p),
                "stackOrder": p.stack_order,
            }
            for p in stack_posts
        ],
    }


@rest.routes.post("/post-stacks/?")
def create_post_stack(
    ctx: rest.Context, _params: Dict[str, str] = {}
) -> rest.Response:
    auth.verify_privilege(ctx.user, "post-stacks:create")
    post_ids = ctx.get_param_as_int_list("posts")
    stack = posts.create_stack(post_ids)
    ctx.session.flush()
    ctx.session.commit()
    return _serialize_stack(stack)


@rest.routes.get("/post-stack/(?P<stack_id>[^/]+)/?")
def get_post_stack(
    ctx: rest.Context, params: Dict[str, str]
) -> rest.Response:
    auth.verify_privilege(ctx.user, "post-stacks:view")
    stack = posts.get_stack_by_id(int(params["stack_id"]))
    return _serialize_stack(stack)


@rest.routes.put("/post-stack/(?P<stack_id>[^/]+)/?")
def update_post_stack(
    ctx: rest.Context, params: Dict[str, str]
) -> rest.Response:
    auth.verify_privilege(ctx.user, "post-stacks:edit:posts")
    stack = posts.get_stack_by_id(int(params["stack_id"]))
    if ctx.has_param("posts"):
        post_ids = ctx.get_param_as_int_list("posts")
        posts.update_stack_posts(stack, post_ids)
    ctx.session.flush()
    ctx.session.commit()
    return _serialize_stack(stack)


@rest.routes.delete("/post-stack/(?P<stack_id>[^/]+)/?")
def delete_post_stack(
    ctx: rest.Context, params: Dict[str, str]
) -> rest.Response:
    auth.verify_privilege(ctx.user, "post-stacks:delete")
    stack = posts.get_stack_by_id(int(params["stack_id"]))
    posts.delete_stack(stack)
    ctx.session.commit()
    return {}
