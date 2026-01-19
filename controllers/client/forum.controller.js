const ForumPost = require("../../models/forumpost.model");
const Admin = require("../../models/admin.model");
const User = require("../../models/user.model");
const Role = require("../../models/role.model");

// [GET] /forum/newest
exports.getNewestPosts = async (req, res) => {
  try {
    let posts = await ForumPost.find({
      PostDeleted: 1,
      PostStatus: 1,
    })
      .sort({ createdAt: -1 })
      .populate("Author");

    // Chuẩn hóa dữ liệu trả về
    const result = [];

    for (let post of posts) {
      let postObj = post.toObject();
      const userId = req.user?._id?.toString();

      postObj.myReaction = null;

      if (userId && Array.isArray(postObj.Reactions)) {
        const myReaction = postObj.Reactions.find(
          (r) => r.User?.toString() === userId
        );

        if (myReaction) {
          postObj.myReaction = myReaction.Type;
        }
      }

      // Trường hợp AUTHOR LÀ USER
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

      // Trường hợp AUTHOR LÀ ADMIN
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

    let posts = await ForumPost.find({
      Author: userId,
      PostDeleted: 1,
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
          (r) => r.User?.toString() === userId
        );

        if (myReaction) {
          postObj.myReaction = myReaction.Type;
        }
      }
      // Trường hợp AUTHOR LÀ USER
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

      // Trường hợp AUTHOR LÀ ADMIN
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
      PostStatus: 1,
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

    // XỬ LÝ AUTHOR
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
          default:
            member = "Thành viên đồng";
        }
      }

      post.Author = {
        _id: user._id,
        name: user.UserFullName,
        avatar:
          user.UserAvatar ||
          "https://cdn.builder.io/api/v1/image/assets/TEMP/bbae0514e8058efa2ff3c88f32951fbd7beba3099187677c6ba1c2f96547ea3f?placeholderIfAbsent=true&apiKey=e677dfd035d54dfb9bce1976069f6b0e",
        member: member,
        type: "User",
      };
    }

    if (post.AuthorModel === "Admin" && post.Author) {
      const admin = await Admin.findById(post.Author._id).lean();

      let roleName = "Admin";

      if (admin?.AdminRole_id) {
        const role = await Role.findById(admin.AdminRole_id).lean();
        if (role) {
          roleName = role.RoleName;
        }
      }

      post.Author = {
        _id: admin._id,
        name: admin.AdminFullName,
        avatar:
          admin.AdminAvatar ||
          "https://cdn.builder.io/api/v1/image/assets/TEMP/bbae0514e8058efa2ff3c88f32951fbd7beba3099187677c6ba1c2f96547ea3f?placeholderIfAbsent=true&apiKey=e677dfd035d54dfb9bce1976069f6b0e",
        role: roleName,
        type: "Admin",
      };
    }

    // CHUẨN HÓA COMMENT AUTHOR
    if (post.Comments && post.Comments.length > 0) {
      post.Comments = post.Comments.map((comment) => {
        return {
          ...comment,
          Author: comment.Author
            ? {
                _id: comment.Author._id,
                name: comment.Author.UserFullName,
                avatar: comment.Author.UserAvatar,
              }
            : null,
          replies: comment.replies
            ? comment.replies.map((reply) => ({
                ...reply,
                Author: reply.Author
                  ? {
                      _id: reply.Author._id,
                      name: reply.Author.UserFullName,
                      avatar:
                        reply.Author.UserAvatar ||
                        "https://cdn.builder.io/api/v1/image/assets/TEMP/bbae0514e8058efa2ff3c88f32951fbd7beba3099187677c6ba1c2f96547ea3f?placeholderIfAbsent=true&apiKey=e677dfd035d54dfb9bce1976069f6b0e",
                    }
                  : null,
              }))
            : [],
        };
      });
    }

    // TÍNH COUNT
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
    if (!Title?.trim() || !Content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title và Content là bắt buộc",
      });
    }
    const newPost = await ForumPost.create({
      Title: Title.trim(),
      Content: Content.trim(),
      Author: req.user._id,
      AuthorModel: "User",
      createdBy: {
        UserId: req.user._id,
        model: "User",
      },
      Images: req.body.Images || [],
      Files: req.body.Files || [],
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
    const { Title, Content, Image, Images, PostStatus } = req.body;

    const post = await ForumPost.findById(PostID);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.Author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updated = await ForumPost.findByIdAndUpdate(
      PostID,
      {
        Title,
        Content,
        Image,
        Images,
        PostStatus,
        $push: {
          editedBy: {
            UserId: req.user._id,
            model: "User",
            editedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// [DELETE] /forum/:PostID/delete
exports.deletePost = async (req, res) => {
  try {
    const { PostID } = req.params;

    const post = await ForumPost.findById(PostID);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.Author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await ForumPost.findByIdAndUpdate(PostID, {
      PostDeleted: 1,
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
    res.status(500).json({ success: false, message: error.message });
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
        { new: true }
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
      { new: true }
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
      { new: true }
    );

    res.status(201).json({
      success: true,
      data: post,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
