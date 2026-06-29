"use strict";

const events = require("../events.js");
const views = require("../util/views.js");

const template = views.getTemplate("posts-page");

class PostsPageView extends events.EventTarget {
    constructor(ctx) {
        super();
        this._ctx = ctx;
        this._hostNode = ctx.hostNode;
        this._draggedPost = null;

        // Deduplicate stacked posts: among posts sharing a stackId, show only
        // the one with the lowest stackOrder in this page's results.
        const seenStacks = new Map();
        const displayResults = [];
        for (const post of ctx.response.results) {
            if (post.stackId != null) {
                const existing = seenStacks.get(post.stackId);
                if (!existing) {
                    seenStacks.set(post.stackId, post);
                    displayResults.push(post);
                } else if (post.stackOrder < existing.stackOrder) {
                    const idx = displayResults.indexOf(existing);
                    displayResults[idx] = post;
                    seenStacks.set(post.stackId, post);
                }
                // else skip secondary
            } else {
                displayResults.push(post);
            }
        }
        ctx.displayResults = displayResults;

        views.replaceContent(this._hostNode, template(ctx));

        // Index ALL results so secondary stack members are available for
        // mixed-state detection and bulk-tag application.
        this._postIdToPost = {};
        for (let post of ctx.response.results) {
            this._postIdToPost[post.id] = post;
            post.addEventListener("change", (e) => this._evtPostChange(e));
        }

        this._postIdToListItemNode = {};
        for (let listItemNode of this._listItemNodes) {
            const postId = listItemNode.getAttribute("data-post-id");
            const post = this._postIdToPost[postId];
            this._postIdToListItemNode[postId] = listItemNode;

            const tagFlipperNode = this._getTagFlipperNode(listItemNode);
            if (tagFlipperNode) {
                tagFlipperNode.addEventListener("click", (e) =>
                    this._evtBulkEditTagsClick(e, post)
                );
            }

            const safetyFlipperNode = this._getSafetyFlipperNode(listItemNode);
            if (safetyFlipperNode) {
                for (let linkNode of safetyFlipperNode.querySelectorAll("a")) {
                    linkNode.addEventListener("click", (e) =>
                        this._evtBulkEditSafetyClick(e, post)
                    );
                }
            }

            const deleteFlipperNode = this._getDeleteFlipperNode(listItemNode);
            if (deleteFlipperNode) {
                deleteFlipperNode.addEventListener("click", (e) =>
                    this._evtBulkToggleDeleteClick(e, post)
                );
            }

            if (ctx.canBulkStack && ctx.parameters && ctx.parameters.stack) {
                this._setupDragAndDrop(listItemNode, post);
            }
        }

        this._syncBulkEditorsHighlights();
    }

    get _listItemNodes() {
        return this._hostNode.querySelectorAll("li");
    }

    _getTagFlipperNode(listItemNode) {
        return listItemNode.querySelector(".tag-flipper");
    }

    _getSafetyFlipperNode(listItemNode) {
        return listItemNode.querySelector(".safety-flipper");
    }

    _getDeleteFlipperNode(listItemNode) {
        return listItemNode.querySelector(".delete-flipper");
    }

    _evtPostChange(e) {
        const listItemNode = this._postIdToListItemNode[e.detail.post.id];
        if (listItemNode) {
            for (let node of listItemNode.querySelectorAll("[data-disabled]")) {
                node.removeAttribute("data-disabled");
            }
        }
        this._syncBulkEditorsHighlights();
    }

    _getStackPosts(post) {
        if (!post.stacked || post.stacked.length <= 1) return [post];
        return post.stacked
            .map((s) => this._postIdToPost[s.id])
            .filter(Boolean);
    }

    _evtBulkEditTagsClick(e, post) {
        e.preventDefault();
        const linkNode = e.target;
        if (linkNode.getAttribute("data-disabled")) {
            return;
        }
        linkNode.setAttribute("data-disabled", true);
        const isTagged = linkNode.classList.contains("tagged");
        const stackPosts = this._getStackPosts(post);
        const cachedIds = new Set(stackPosts.map((p) => p.id));
        const missingIds = post.stacked
            ? post.stacked.map((s) => s.id).filter((id) => !cachedIds.has(id))
            : [];
        this.dispatchEvent(
            new CustomEvent(isTagged ? "untag" : "tag", {
                detail: { post, stackPosts, missingIds },
            })
        );
    }

    _evtBulkEditSafetyClick(e, post) {
        e.preventDefault();
        const linkNode = e.target;
        if (linkNode.getAttribute("data-disabled")) {
            return;
        }
        const newSafety = linkNode.getAttribute("data-safety");
        if (post.safety === newSafety) {
            return;
        }
        linkNode.setAttribute("data-disabled", true);
        this.dispatchEvent(
            new CustomEvent("changeSafety", {
                detail: { post: post, safety: newSafety },
            })
        );
    }

    _evtBulkToggleDeleteClick(e, post) {
        e.preventDefault();
        const linkNode = e.target;
        linkNode.classList.toggle("delete");
        this.dispatchEvent(
            new CustomEvent("markForDeletion", {
                detail: {
                    post,
                    delete: linkNode.classList.contains("delete"),
                },
            })
        );
    }

    _setupDragAndDrop(listItemNode, post) {
        listItemNode.addEventListener("dragstart", (e) => {
            this._draggedPost = post;
            listItemNode.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", String(post.id));
        });

        listItemNode.addEventListener("dragend", () => {
            this._draggedPost = null;
            listItemNode.classList.remove("dragging");
            for (const li of this._listItemNodes) {
                li.classList.remove("drop-target");
            }
        });

        listItemNode.addEventListener("dragover", (e) => {
            if (!this._draggedPost || this._draggedPost.id === post.id) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            listItemNode.classList.add("drop-target");
        });

        listItemNode.addEventListener("dragleave", (e) => {
            if (!listItemNode.contains(e.relatedTarget)) {
                listItemNode.classList.remove("drop-target");
            }
        });

        listItemNode.addEventListener("drop", (e) => {
            e.preventDefault();
            listItemNode.classList.remove("drop-target");
            if (!this._draggedPost || this._draggedPost.id === post.id) return;
            this.dispatchEvent(
                new CustomEvent("stack", {
                    detail: {
                        draggedPost: this._draggedPost,
                        targetPost: post,
                    },
                })
            );
        });
    }

    _syncBulkEditorsHighlights() {
        for (let listItemNode of this._listItemNodes) {
            const postId = listItemNode.getAttribute("data-post-id");
            const post = this._postIdToPost[postId];

            const tagFlipperNode = this._getTagFlipperNode(listItemNode);
            if (tagFlipperNode) {
                const stackPosts = this._getStackPosts(post);
                const tagStates = stackPosts.map((p) =>
                    this._ctx.bulkEdit.tags.every((t) => p.tags.isTaggedWith(t))
                );
                const allTagged = tagStates.every(Boolean);
                const anyTagged = tagStates.some(Boolean);
                tagFlipperNode.classList.toggle("tagged", allTagged);
                tagFlipperNode.classList.toggle(
                    "mixed",
                    anyTagged && !allTagged
                );
            }

            const safetyFlipperNode = this._getSafetyFlipperNode(listItemNode);
            if (safetyFlipperNode) {
                for (let linkNode of safetyFlipperNode.querySelectorAll("a")) {
                    const safety = linkNode.getAttribute("data-safety");
                    linkNode.classList.toggle(
                        "active",
                        post.safety === safety
                    );
                }
            }

            const deleteFlipperNode = this._getDeleteFlipperNode(listItemNode);
            if (deleteFlipperNode) {
                deleteFlipperNode.classList.toggle(
                    "delete",
                    this._ctx.bulkEdit.markedForDeletion.some(
                        (x) => x.id == postId
                    )
                );
            }
        }
    }
}

module.exports = PostsPageView;
