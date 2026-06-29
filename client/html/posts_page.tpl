<%
    const stackMode = ctx.canBulkStack && ctx.parameters && ctx.parameters.stack;
%><div class='post-list<% if (ctx.postFlow) { %> post-flow<% } %><% if (stackMode) { %> stack-mode<% } %>'>
    <% if (ctx.displayResults.length) { %>
        <ul>
            <% for (let post of ctx.displayResults) { %>
                <%
                    const isStacked = post.stacked && post.stacked.length > 1;
                    const stackPeeks = isStacked ? post.stacked.filter(s => s.id !== post.id).slice(0, 2) : [];
                %>
                <li data-post-id='<%= post.id %>'
                    class='<% if (isStacked) { %>stacked<% } %>'
                    <% if (stackMode) { %> draggable='true'<% } %>>
                    <% if (stackMode) { %><span class='stack-drag-handle'><i class='fa fa-clone'></i></span><% } %>
                    <% if (isStacked) { %>
                        <% for (let i = stackPeeks.length - 1; i >= 0; i--) { %>
                            <div class='stack-peek' data-depth='<%- i + 1 %>'
                                style='background-image: url(<%- stackPeeks[i].thumbnailUrl %>)'></div>
                        <% } %>
                    <% } %>
                    <a class='thumbnail-wrapper <%= post.tags.length > 0 ? "tags" : "no-tags" %>'
                            title='@<%- post.id %> (<%- post.type %>)<% if (isStacked) { %> — stack of <%- post.stacked.length %><% } %>&#10;&#10;Tags: <%- post.tags.map(tag => '#' + tag.names[0]).join(' ') || 'none' %>'
                            href='<%= ctx.canViewPosts ? ctx.getPostUrl(post.id, ctx.parameters) : '' %>'
                            <% if (stackMode) { %>draggable='false'<% } %>>
                        <%= ctx.makeThumbnail(post.thumbnailUrl) %>
                        <span class='type' data-type='<%- post.type %>'>
                            <% if (post.type == 'video' || post.type == 'flash' || post.type == 'animation') { %>
                                <span class='icon'><i class='fa fa-film'></i></span>
                            <% } else { %>
                                <%- post.type %>
                            <% } %>
                        </span>
                        <% if (post.score || post.favoriteCount || post.commentCount) { %>
                            <span class='stats'>
                                <% if (post.score) { %>
                                    <span class='icon'>
                                        <i class='fa fa-thumbs-up'></i>
                                        <%- post.score %>
                                    </span>
                                <% } %>
                                <% if (post.favoriteCount) { %>
                                    <span class='icon'>
                                        <i class='fa fa-heart'></i>
                                        <%- post.favoriteCount %>
                                    </span>
                                <% } %>
                                <% if (post.commentCount) { %>
                                    <span class='icon'>
                                        <i class='fa fa-commenting'></i>
                                        <%- post.commentCount %>
                                    </span>
                                <% } %>
                            </span>
                        <% } %>
                        <% if (isStacked) { %>
                            <span class='stack-count'><i class='fa fa-clone'></i> <%- post.stacked.length %></span>
                        <% } %>
                    </a>
                    <span class='edit-overlay'>
                        <% if (ctx.canBulkEditTags && ctx.parameters && ctx.parameters.tag) { %>
                            <a href class='tag-flipper'>
                            </a>
                        <% } %>
                        <% if (ctx.canBulkEditSafety && ctx.parameters && ctx.parameters.safety) { %>
                            <span class='safety-flipper'>
                                <% for (let safety of ['safe', 'sketchy', 'unsafe']) { %>
                                    <a href data-safety='<%- safety %>' class='safety-<%- safety %><%- post.safety === safety ? ' active' : '' %>'>
                                    </a>
                                <% } %>
                            </span>
                        <% } %>
                        <% if (ctx.canBulkDelete && ctx.parameters && ctx.parameters.delete) { %>
                            <a href class='delete-flipper'>
                            </a>
                        <% } %>
                    </span>
                </li>
            <% } %>
            <%= ctx.makeFlexboxAlign() %>
        </ul>
    <% } %>
</div>
