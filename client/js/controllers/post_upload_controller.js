"use strict";

const api = require("../api.js");
const router = require("../router.js");
const uri = require("../util/uri.js");
const misc = require("../util/misc.js");
const progress = require("../util/progress.js");
const topNavigation = require("../models/top_navigation.js");
const Post = require("../models/post.js");
const Pool = require("../models/pool.js");
const Tag = require("../models/tag.js");
const PostUploadView = require("../views/post_upload_view.js");
const EmptyView = require("../views/empty_view.js");

const genericErrorMessage =
    "One or more posts needs your attention; " +
    'click "resume upload" when you\'re ready.';

class PostUploadController {
    constructor(ctx) {
        this._lastCancellablePromise = null;
        this._targetPool = null;

        if (!api.hasPrivilege("posts:create")) {
            this._view = new EmptyView();
            this._view.showError("You don't have privileges to upload posts.");
            return;
        }

        const poolId = ctx && ctx.parameters && ctx.parameters.pool
            ? parseInt(ctx.parameters.pool)
            : null;

        const viewCtx = {
            canUploadAnonymously: api.hasPrivilege("posts:create:anonymous"),
            canViewPosts: api.hasPrivilege("posts:view"),
            enableSafety: api.safetyEnabled(),
        };

        if (poolId) {
            topNavigation.activate("pools");
            topNavigation.setTitle("Upload to pool");
            Pool.get(poolId).then(
                (pool) => {
                    this._targetPool = pool;
                    viewCtx.targetPool = pool;
                    this._view = new PostUploadView(viewCtx);
                    this._view.addEventListener("change", (e) => this._evtChange(e));
                    this._view.addEventListener("submit", (e) => this._evtSubmit(e));
                    this._view.addEventListener("cancel", (e) => this._evtCancel(e));
                },
                (error) => {
                    this._view = new EmptyView();
                    this._view.showError(error.message);
                }
            );
        } else {
            topNavigation.activate("upload");
            topNavigation.setTitle("Upload");
            this._view = new PostUploadView(viewCtx);
            this._view.addEventListener("change", (e) => this._evtChange(e));
            this._view.addEventListener("submit", (e) => this._evtSubmit(e));
            this._view.addEventListener("cancel", (e) => this._evtCancel(e));
        }
    }

    _evtChange(e) {
        if (e.detail.uploadables.length) {
            misc.enableExitConfirmation();
        } else {
            misc.disableExitConfirmation();
            this._view.clearMessages();
        }
    }

    _evtCancel(e) {
        if (this._lastCancellablePromise) {
            this._lastCancellablePromise.abort();
        }
    }

    _evtSubmit(e) {
        this._view.disableForm();
        this._view.clearMessages();
        let anyFailures = false;

        e.detail.uploadables
            .reduce(
                (promise, uploadable) =>
                    promise.then(() =>
                        this._uploadSinglePost(
                            uploadable,
                            e.detail.skipDuplicates,
                            e.detail.alwaysUploadSimilar
                        ).catch((error) => {
                            anyFailures = true;
                            if (error.uploadable) {
                                if (error.similarPosts) {
                                    error.uploadable.lookalikes =
                                        error.similarPosts;
                                    this._view.updateUploadable(
                                        error.uploadable
                                    );
                                    this._view.showInfo(
                                        error.message,
                                        error.uploadable
                                    );
                                } else {
                                    this._view.showError(
                                        error.message,
                                        error.uploadable
                                    );
                                }
                            } else {
                                this._view.showError(
                                    error.message,
                                    uploadable
                                );
                            }
                            if (e.detail.pauseRemainOnError) {
                                return Promise.reject();
                            }
                        })
                    ),
                Promise.resolve()
            )
            .then(() => {
                if (anyFailures) {
                    return Promise.reject();
                }
            })
            .then(
                () => {
                    this._view.clearMessages();
                    misc.disableExitConfirmation();
                    if (this._targetPool) {
                        router.show(
                            uri.formatClientLink("pool", this._targetPool.id)
                        );
                    } else {
                        const ctx = router.show(uri.formatClientLink("posts"));
                        ctx.controller.showSuccess("Posts uploaded.");
                    }
                },
                (error) => {
                    this._view.showError(genericErrorMessage);
                    this._view.enableForm();
                }
            );
    }

    _uploadSinglePost(uploadable, skipDuplicates, alwaysUploadSimilar) {
        progress.start();
        let reverseSearchPromise = Promise.resolve();
        if (!uploadable.lookalikesConfirmed) {
            reverseSearchPromise = Post.reverseSearch(
                uploadable.url || uploadable.file
            );
        }
        this._lastCancellablePromise = reverseSearchPromise;

        return reverseSearchPromise
            .then((searchResult) => {
                if (searchResult) {
                    // notify about exact duplicate
                    if (searchResult.exactPost) {
                        if (skipDuplicates) {
                            this._view.removeUploadable(uploadable);
                            return Promise.resolve();
                        } else {
                            let error = new Error(
                                "Post already uploaded " +
                                    `(@${searchResult.exactPost.id})`
                            );
                            error.uploadable = uploadable;
                            return Promise.reject(error);
                        }
                    }

                    // notify about similar posts
                    if (
                        searchResult.similarPosts.length &&
                        !alwaysUploadSimilar
                    ) {
                        let error = new Error(
                            `Found ${searchResult.similarPosts.length} similar ` +
                                "posts.\nYou can resume or discard this upload."
                        );
                        error.uploadable = uploadable;
                        error.similarPosts = searchResult.similarPosts;
                        return Promise.reject(error);
                    }
                }

                // no duplicates, proceed with saving
                let post = this._uploadableToPost(uploadable);
                let savePromise = post.save(uploadable.anonymous)
                    .then(() => this._targetPool
                        ? this._addPostToPool(post.id)
                        : Promise.resolve()
                    )
                    .then(() => {
                        this._view.removeUploadable(uploadable);
                    });
                this._lastCancellablePromise = savePromise;
                return savePromise;
            })
            .then(
                (result) => {
                    progress.done();
                    return Promise.resolve(result);
                },
                (error) => {
                    error.uploadable = uploadable;
                    progress.done();
                    return Promise.reject(error);
                }
            );
    }

    _addPostToPool(postId) {
        return Pool.get(this._targetPool.id).then((pool) => {
            if (!pool.posts.hasPostId(postId)) {
                pool.posts.addById(postId);
                return pool.save();
            }
        });
    }

    _uploadableToPost(uploadable) {
        let post = new Post();
        post.safety = uploadable.safety;
        post.flags = uploadable.flags;
        for (let tagName of uploadable.tags) {
            const tag = new Tag();
            tag.names = [tagName];
            post.tags.add(tag);
        }
        post.relations = uploadable.relations;
        post.newContent = uploadable.url || uploadable.file;
        // if uploadable.source is ever going to be a valid field (e.g when setting source directly in the upload window)
        // you'll need to change the line below to `post.source = uploadable.source || uploadable.url;`
        if (uploadable.url) {
            post.source = uploadable.url;
        }
        return post;
    }
}

module.exports = (router) => {
    router.enter(["upload"], (ctx, next) => {
        ctx.controller = new PostUploadController(ctx);
    });
};
