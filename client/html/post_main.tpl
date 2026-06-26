<div class='content-wrapper transparent post-view'>
    <aside class='sidebar'>
        <nav class='buttons'>
            <article class='previous-post'>
                <% if (ctx.prevPostId) { %>
                    <% if (ctx.editMode) { %>
                        <a rel='prev' href='<%= ctx.getPostEditUrl(ctx.prevPostId, ctx.parameters) %>'>
                    <% } else { %>
                        <a rel='prev' href='<%= ctx.getPostUrl(ctx.prevPostId, ctx.parameters) %>'>
                    <% } %>
                <% } else { %>
                    <a rel='prev' class='inactive'>
                <% } %>
                    <i class='fa fa-chevron-left'></i>
                    <span class='vim-nav-hint'>&lt; Previous post</span>
                </a>
            </article>
            <article class='next-post'>
                <% if (ctx.nextPostId) { %>
                    <% if (ctx.editMode) { %>
                        <a rel='next' href='<%= ctx.getPostEditUrl(ctx.nextPostId, ctx.parameters) %>'>
                    <% } else { %>
                        <a rel='next' href='<%= ctx.getPostUrl(ctx.nextPostId, ctx.parameters) %>'>
                    <% } %>
                <% } else { %>
                    <a rel='next' class='inactive'>
                <% } %>
                    <i class='fa fa-chevron-right'></i>
                    <span class='vim-nav-hint'>Next post &gt;</span>
                </a>
            </article>
            <% if (ctx.canEditPosts || ctx.canDeletePosts || ctx.canFeaturePosts) { %>
            <article class='edit-post'>
                <% if (ctx.editMode) { %>
                    <a href='<%= ctx.getPostUrl(ctx.post.id, ctx.parameters) %>'>
                        <i class='fa fa-reply'></i>
                        <span class='vim-nav-hint'>Back to view mode</span>
                    </a>
                <% } else { %>
                    <a href='<%= ctx.getPostEditUrl(ctx.post.id, ctx.parameters) %>'>
                    <i class='fa fa-pencil'></i>
                    <span class='vim-nav-hint'>Edit post</span>
                    </a>
                <% } %>
            </article>
            <% } %>
        </nav>

        <div class='sidebar-container'></div>
    </aside>

    <div class='content'>
        <%
            const stackedItems = (!ctx.editMode && ctx.post.stacked && ctx.post.stacked.length > 1)
                ? ctx.post.stacked : [];
            const currentStackIdx = stackedItems.findIndex(s => s.id === ctx.post.id);
            const prevStackItem = currentStackIdx > 0 ? stackedItems[currentStackIdx - 1] : null;
            const nextStackItem = (currentStackIdx >= 0 && currentStackIdx < stackedItems.length - 1)
                ? stackedItems[currentStackIdx + 1] : null;
        %>
        <div class='post-container-wrap<%= stackedItems.length > 1 ? " has-stack" : "" %>'>
            <% if (prevStackItem) { %>
                <a class='stack-side-panel stack-side-prev'
                   href='<%= ctx.getPostUrl(prevStackItem.id, ctx.parameters) %>'
                   data-stack-post-id='<%- prevStackItem.id %>'
                   style='background-image: url(<%- prevStackItem.thumbnailUrl %>)'>
                    <i class='fa fa-chevron-left'></i>
                </a>
            <% } else if (stackedItems.length > 1) { %>
                <div class='stack-side-panel stack-side-prev disabled'></div>
            <% } %>

            <div class='post-container'></div>

            <% if (nextStackItem) { %>
                <a class='stack-side-panel stack-side-next'
                   href='<%= ctx.getPostUrl(nextStackItem.id, ctx.parameters) %>'
                   data-stack-post-id='<%- nextStackItem.id %>'
                   style='background-image: url(<%- nextStackItem.thumbnailUrl %>)'>
                    <i class='fa fa-chevron-right'></i>
                </a>
            <% } else if (stackedItems.length > 1) { %>
                <div class='stack-side-panel stack-side-next disabled'></div>
            <% } %>
        </div>

        <div class='after-mobile-controls'>
            <% if (ctx.canCreateComments) { %>
                <h2>Add comment</h2>
                <div class='comment-form-container'></div>
            <% } %>

            <% if (ctx.canListComments) { %>
                <div class='comments-container'></div>
            <% } %>
        </div>
    </div>
</div>
