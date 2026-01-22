const ForumPost = require("../../models/forumpost.model");
const Admin = require("../../models/admin.model");
const User = require("../../models/user.model");
const Role = require("../../models/role.model");

const { moderateContent } = require("../../services/moderation.service");

// [GET] /forum/newest
exports.getNewestPosts = async (req, res) => {
  try {
    let posts = await ForumPost.find({
      PostDeleted: 1,
      PostStatus: 1,
    })
      .sort({ createdAt: -1 })
      .populate("Author");

    const result = [];

    for (let post of posts) {
      let postObj = post.toObject();
      const userId = req.user?._id?.toString();

      postObj.myReaction = null;

      if (userId && Array.isArray(postObj.Reactions)) {
        const myReaction = postObj.Reactions.find(
          (r) => r.User?.toString() === userId,
        );

        if (myReaction) {
          postObj.myReaction = myReaction.Type;
        }
      }

      // AUTHOR LÀ USER
      if (postObj.AuthorModel === "User" && postObj.Author) {
        const user = await User.findById(postObj.Author._id).lean();

        let member = "Thành viên đồng";

        if (user?.UserMoney) {
          const money = user.UserMoney;
          switch (true) {
            case money > 10000000:
              member = "Thành viên Vip";
              break;
            case money >= 5000000:
              member = "Thành viên vàng";
              break;
            case money >= 1000000:
              member = "Thành viên bạc";
              break;
            default:
              member = "Thành viên đồng";
          }
        }

        postObj.Author = {
          _id: postObj.Author._id,
          name: postObj.Author.UserFullName,
          avatar:
            postObj.Author.UserAvatar ||
            "https://cdn.builder.io/api/v1/image/assets/TEMP/bbae0514e8058efa2ff3c88f32951fbd7beba3099187677c6ba1c2f96547ea3f",
          member,
          type: "User",
        };
      }

      // AUTHOR LÀ ADMIN
      if (postObj.AuthorModel === "Admin" && postObj.Author) {
        const admin = await Admin.findById(postObj.Author._id).lean();

        let roleName = "Admin";

        if (admin?.AdminRole_id) {
          const role = await Role.findById(admin.AdminRole_id).lean();
          if (role) roleName = role.RoleName;
        }

        postObj.Author = {
          _id: postObj.Author._id,
          name: postObj.Author.AdminFullName,
          avatar:
            postObj.Author.AdminAvatar ||
            "https://cdn.builder.io/api/v1/image/assets/TEMP/bbae0514e8058efa2ff3c88f32951fbd7beba3099187677c6ba1c2f96547ea3f",
          role: roleName,
          type: "Admin",
        };
      }

      result.push(postObj);
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// [GET] /forum/my-posts
exports.getMyPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query; // Lấy status từ query parameter

    let filter = {
      Author: userId,
    };

    switch (status) {
      case "approved":
        filter.PostStatus = 1;
        filter.PostDeleted = 1;
        break;

      case "pending":
        filter.PostStatus = 2;
        filter.PostDeleted = 1;
        break;

      case "rejected":
        filter.PostStatus = 0;
        filter.PostDeleted = 0;
        break;

      case "deleted":
        filter.PostDeleted = 0;
        break;

      default:
        // all
        filter.PostDeleted = 1;
    }

    let posts = await ForumPost.find(filter)
      .sort({ createdAt: -1 })
      .populate("Author");

    const result = [];

    for (let post of posts) {
      let postObj = post.toObject();
      const userId = req.user?._id?.toString();

      postObj.myReaction = null;

      if (userId && Array.isArray(postObj.Reactions)) {
        const myReaction = postObj.Reactions.find(
          (r) => r.User?.toString() === userId,
        );

        if (myReaction) {
          postObj.myReaction = myReaction.Type;
        }
      }

      if (postObj.AuthorModel === "User" && postObj.Author) {
        const user = await User.findById(postObj.Author._id).lean();
        let member = "Thành viên đồng";

        if (user?.UserMoney) {
          const money = user.UserMoney;
          switch (true) {
            case money > 10000000:
              member = "Thành viên Vip";
              break;
            case money >= 5000000:
              member = "Thành viên vàng";
              break;
            case money >= 1000000:
              member = "Thành viên bạc";
              break;
            default:
              member = "Thành viên đồng";
          }
        }

        postObj.Author = {
          _id: postObj.Author._id,
          name: postObj.Author.UserFullName,
          avatar:
            postObj.Author.UserAvatar ||
            "https://cdn.builder.io/api/v1/image/assets/TEMP/bbae0514e8058efa2ff3c88f32951fbd7beba3099187677c6ba1c2f96547ea3f?placeholderIfAbsent=true&apiKey=e677dfd035d54dfb9bce1976069f6b0e",
          member: member,
          type: "User",
        };
      }

      if (postObj.AuthorModel === "Admin" && postObj.Author) {
        const admin = await Admin.findById(postObj.Author._id).lean();
        let roleName = "Admin";

        if (admin?.AdminRole_id) {
          const role = await Role.findById(admin.AdminRole_id).lean();
          if (role) {
            roleName = role.RoleName;
          }
        }

        postObj.Author = {
          _id: postObj.Author._id,
          name: postObj.Author.AdminFullName,
          avatar:
            postObj.Author.AdminAvatar ||
            "https://cdn.builder.io/api/v1/image/assets/TEMP/bbae0514e8058efa2ff3c88f32951fbd7beba3099187677c6ba1c2f96547ea3f?placeholderIfAbsent=true&apiKey=e677dfd035d54dfb9bce1976069f6b0e",
          role: roleName,
          type: "Admin",
        };
      }

      result.push(postObj);
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in getMyPosts:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// [GET] /forum/detail/:PostID
module.exports.getDetailPost = async (req, res) => {
  try {
    const postId = req.params.PostID;

    let post = await ForumPost.findOne({
      _id: postId,
      PostDeleted: 1,
      PostStatus: { $in: [1, 2] },
    })
      .populate("Author")
      .populate("Comments.Author", "UserFullName UserAvatar")
      .populate("Comments.Replies.Author", "UserFullName UserAvatar")
      .lean();

    if (!post) {
      return res.json({
        success: false,
        message: "Post not found",
      });
    }
    const userId = req.user?._id?.toString();

    post.myReaction = null;

    if (userId && Array.isArray(post.Reactions)) {
      const myReaction = post.Reactions.find(
        (r) => r.User?.toString() === userId,
      );

      if (myReaction) {
        post.myReaction = myReaction.Type;
      }
    }

    if (post.AuthorModel === "User" && post.Author) {
      const user = await User.findById(post.Author._id).lean();
      let member = "Thành viên đồng";

      if (user?.UserMoney) {
        const money = user.UserMoney;
        switch (true) {
          case money > 10000000:
            member = "Thành viên Vip";
            break;
          case money >= 5000000:
            member = "Thành viên vàng";
            break;
          case money >= 1000000:
            member = "Thành viên bạc";
            break;
        }
      }

      post.Author = {
        _id: user._id,
        name: user.UserFullName,
        avatar: user.UserAvatar,
        member,
        type: "User",
      };
    }

    if (post.AuthorModel === "Admin" && post.Author) {
      const admin = await Admin.findById(post.Author._id).lean();
      let roleName = "Admin";

      if (admin?.AdminRole_id) {
        const role = await Role.findById(admin.AdminRole_id).lean();
        if (role) roleName = role.RoleName;
      }

      post.Author = {
        _id: admin._id,
        name: admin.AdminFullName,
        avatar: admin.AdminAvatar,
        role: roleName,
        type: "Admin",
      };
    }

    if (post.Comments && post.Comments.length > 0) {
      post.Comments = post.Comments.map((comment) => ({
        ...comment,
        Author: comment.Author
          ? {
              _id: comment.Author._id,
              name: comment.Author.UserFullName,
              avatar: comment.Author.UserAvatar,
            }
          : null,
        Replies: comment.Replies
          ? comment.Replies.map((reply) => ({
              ...reply,
              Author: reply.Author
                ? {
                    _id: reply.Author._id,
                    name: reply.Author.UserFullName,
                    avatar: reply.Author.UserAvatar,
                  }
                : null,
            }))
          : [],
      }));
    }

    post.totalReactions = post.Reactions ? post.Reactions.length : 0;
    post.commentsCount = post.Comments ? post.Comments.length : 0;

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

// [POST] /forum/create
exports.createPost = async (req, res) => {
  try {
    const { Title, Content } = req.body;

    const moderation = await moderateContent(`${Title}\n${Content}`);

    // Xử lý Images từ upload
    let images = [];
    if (req.files && req.files.Images) {
      const uploadedImages = Array.isArray(req.files.Images)
        ? req.files.Images
        : [req.files.Images];
      images = uploadedImages.map((file) => ({
        url: file.path || file.filename,
        name: file.originalname,
      }));
    }

    // Xử lý Files từ upload
    let files = [];
    if (req.files && req.files.Files) {
      const uploadedFiles = Array.isArray(req.files.Files)
        ? req.files.Files
        : [req.files.Files];
      files = uploadedFiles.map((file) => ({
        url: file.path || file.filename,
        name: file.originalname,
      }));
    }

    const newPost = await ForumPost.create({
      Title: Title.trim(),
      Content: Content.trim(),
      Author: req.user._id,
      AuthorModel: "User",
      PostStatus: moderation.safe ? 2 : 0,
      PostDeleted: moderation.safe ? 1 : 0,
      createdBy: {
        UserId: req.user._id,
        model: "User",
      },
      Images: images,
      Files: files,
    });

    res.status(201).json({
      success: true,
      data: newPost,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// [PUT] /forum/:PostID/edit
exports.updatePost = async (req, res) => {
  try {
    const { PostID } = req.params;
    const { Title, Content } = req.body;

    const post = await ForumPost.findById(PostID);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check authorization
    if (post.Author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Check if post is deleted
    if (post.PostDeleted === 0) {
      return res.status(400).json({ message: "Cannot edit deleted post" });
    }

    // LUÔN dùng title/content mới
    const finalTitle = (Title || "").trim() || post.Title;
    const finalContent = (Content || "").trim() || post.Content;

    // Re-moderate
    const moderation = await moderateContent(
      `${finalTitle}\n${finalContent}`
    );

    // Xử lý Images
    let images = [];
    if (req.body.ExistingImages) {
      const olds = Array.isArray(req.body.ExistingImages)
        ? req.body.ExistingImages
        : [req.body.ExistingImages];
      images.push(...olds.filter(Boolean));
    }
    if (req.files?.Images) {
      const news = Array.isArray(req.files.Images)
        ? req.files.Images
        : [req.files.Images];
      images.push(
        ...news.map((f) => ({
          url: f.path,
          name: f.originalname,
        }))
      );
    }

    // Xử lý Files
    let files = [];
    if (req.body.ExistingFiles) {
      const olds = Array.isArray(req.body.ExistingFiles)
        ? req.body.ExistingFiles
        : [req.body.ExistingFiles];
      files.push(...olds.filter(Boolean));
    }
    if (req.files?.Files) {
      const news = Array.isArray(req.files.Files)
        ? req.files.Files
        : [req.files.Files];
      files.push(
        ...news.map((f) => ({
          url: f.path,
          name: f.originalname,
        }))
      );
    }

    // Build update data
    const updateData = {
      Title: finalTitle,
      Content: finalContent,
      PostStatus: moderation.safe ? 2 : 0,
      PostDeleted: moderation.safe ? 1 : 0,
    };

    if (images.length > 0) {
      updateData.Images = images;
    }

    if (files.length > 0) {
      updateData.Files = files;
    }

    // Update post - IMPORTANT: LUÔN cập nhật Images/Files
    const updated = await ForumPost.findByIdAndUpdate(
      PostID,
      {
        ...updateData,
        $push: {
          editedBy: {
            UserId: req.user._id,
            model: "User",
            editedAt: new Date(),
          },
        },
      },
      { new: true }
    ).populate("Author");

    // ===== FORMAT lại Author giống getDetailPost =====
    let formattedPost = updated.toObject();

    if (formattedPost.AuthorModel === "User" && formattedPost.Author) {
      const user = await User.findById(formattedPost.Author._id).lean();
      let member = "Thành viên đồng";

      if (user?.UserMoney) {
        const money = user.UserMoney;
        switch (true) {
          case money > 10000000:
            member = "Thành viên Vip";
            break;
          case money >= 5000000:
            member = "Thành viên vàng";
            break;
          case money >= 1000000:
            member = "Thành viên bạc";
            break;
        }
      }

      formattedPost.Author = {
        _id: user._id,
        name: user.UserFullName,
        avatar: user.UserAvatar,
        member,
        type: "User",
      };
    }

    console.log("=== Updated post ===", formattedPost);

    res.status(200).json({
      success: true,
      data: formattedPost,
    });
  } catch (error) {
    console.error("=== Update error ===", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// [DELETE] /forum/:PostID/delete
exports.deletePost = async (req, res) => {
  try {
    const { PostID } = req.params;

    const post = await ForumPost.findById(PostID);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check authorization
    if (post.Author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Soft delete - set PostDeleted = 0
    await ForumPost.findByIdAndUpdate(PostID, {
      PostDeleted: 0,
      deletedBy: {
        UserId: req.user._id,
        model: "User",
        deletedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// [POST] /forum/:PostID/react
exports.reactToPost = async (req, res) => {
  try {
    const { PostID } = req.params;
    const { type } = req.body;

    const userId = req.user._id;

    await ForumPost.findByIdAndUpdate(PostID, {
      $pull: { Reactions: { User: userId } },
    });

    let updated;
    if (type) {
      updated = await ForumPost.findByIdAndUpdate(
        PostID,
        {
          $push: {
            Reactions: {
              User: userId,
              Type: type,
            },
          },
        },
        { new: true },
      );
    } else {
      // Nếu hủy: chỉ lấy post hiện tại sau khi pull
      updated = await ForumPost.findById(PostID);
    }

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// [POST] /forum/:PostID/comments
exports.addComment = async (req, res) => {
  try {
    const { PostID } = req.params;
    const { Content } = req.body;

    const newComment = {
      Author: req.user._id,
      Content,
    };

    const post = await ForumPost.findByIdAndUpdate(
      PostID,
      {
        $push: { Comments: newComment },
      },
      { new: true },
    );

    res.status(201).json({
      success: true,
      data: post,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// [POST] /forum/:PostID/comments/:CommentID/replies
exports.addReply = async (req, res) => {
  try {
    const { PostID, CommentID } = req.params;
    const { Content } = req.body;

    const reply = {
      Author: req.user._id,
      Content,
    };

    const post = await ForumPost.findOneAndUpdate(
      {
        _id: PostID,
        "Comments._id": CommentID,
      },
      {
        $push: {
          "Comments.$.Replies": reply,
        },
      },
      { new: true },
    );

    res.status(201).json({
      success: true,
      data: post,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
