const ForumPost = require("../../models/forumpost.model");

/**
 * GET /admin/forum
 * Danh sách bài cho admin
 */
exports.getAllForumPosts = async (req, res) => {
  try {
    const posts = await ForumPost.find({
      $or: [{ PostDeleted: 1 }, { PostStatus: 0 }],
    })
      .populate("Author", "UserFullName")
      .sort({ createdAt: -1 });

    const data = posts.map((p) => {
      const lastEdit = p.editedBy?.length
        ? p.editedBy[p.editedBy.length - 1]
        : null;

      return {
        _id: p._id,
        postId: p._id.toString().slice(-6),
        userFullName: p.Author?.UserFullName || "Không xác định",
        postTitle: p.Title,
        PostStatus: p.PostStatus,
        createdBy: { createdAt: p.createdAt },
        reviewedBy: lastEdit ? { reviewedAt: lastEdit.editedAt } : {},
      };
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /admin/forum/:id
 * Chi tiết bài
 */
exports.getForumPostDetail = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id).populate(
      "Author",
      "UserFullName",
    );

    if (!post) return res.status(404).json({ message: "Post not found" });

    const lastEdit = post.editedBy?.length
      ? post.editedBy[post.editedBy.length - 1]
      : null;

    res.json({
      postId: post._id.toString().slice(-6),
      title: post.Title,
      author: post.Author?.UserFullName || "Không xác định",
      createdAt: post.createdAt,
      reviewedAt: lastEdit?.editedAt || post.updatedAt || null,
      status: post.PostStatus,
      content: post.Content,
      images: post.Images ?? [],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PATCH /admin/forum/:id/approve
 */
exports.approvePost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.PostStatus !== 2) {
      return res.status(400).json({ message: "Post is not in pending state" });
    }

    post.PostStatus = 1;
    post.editedBy.push({
      UserId: req.user._id,
      model: "Admin",
      editedAt: new Date(),
    });

    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PATCH /admin/forum/:id/reject
 */
exports.rejectPost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.PostStatus = 0;
    post.PostDeleted = 0;
    post.editedBy.push({
      UserId: req.user._id,
      model: "Admin",
      editedAt: new Date(),
    });

    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
