const mongoose = require("mongoose");
const slug = require("mongoose-slug-updater");
mongoose.plugin(slug);

const replySchema = new mongoose.Schema(
  {
    Author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    Content: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const commentSchema = new mongoose.Schema(
  {
    Author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    Content: {
      type: String,
      required: true,
      trim: true,
    },
    Replies: [replySchema],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const reactionSchema = new mongoose.Schema({
  User: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  Type: {
    type: String,
    enum: ["like", "love", "haha", "wow", "sad", "angry"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const forumPostSchema = new mongoose.Schema(
  {
    // Người đăng bài (có thể là User hoặc Admin)
    Author: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "AuthorModel",
      required: true,
    },
    AuthorModel: {
      type: String,
      required: true,
      enum: ["User", "Admin"],
    },

    Title: {
      type: String,
      trim: true,
      maxlength: 200,
      required: true,
    },

    Content: {
      type: String,
      required: true,
      trim: true,
    },

    // Hỗ trợ slug nếu muốn chia sẻ link đẹp (ví dụ: /forum/bai-viet-tieu-de-abc)
    PostSlug: {
      type: String,
      slug: ["Title"], 
      unique: true,
      sparse: true, // cho phép nhiều bài không có slug
    },

    Image: String, // ảnh chính
    Images: [String], // nhiều ảnh
    Reactions: [reactionSchema],
    Comments: [commentSchema],
    PostStatus: {
      type: Number,
      default: 1, // 1 = active, 0 = hidden/inactive
    },
    PostDeleted: {
      type: Number,
      default: 1, // 1 = còn, 0 = đã xóa mềm
    },
    createdBy: {
      UserId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "createdBy.model",
      },
      model: {
        type: String,
        enum: ["User", "Admin"],
        default: "User",
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
    editedBy: [
      {
        UserId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "editedBy.model",
        },
        model: {
          type: String,
          enum: ["User", "Admin"],
        },
        editedAt: Date,
      },
    ],
    deletedBy: {
      UserId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "deletedBy.model",
      },
      model: {
        type: String,
        enum: ["User", "Admin"],
      },
      deletedAt: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//1 user chỉ được react 1 lần trên 1 bài viết
forumPostSchema.index({ _id: 1, "Reactions.User": 1 }, { unique: true });

const ForumPost = mongoose.model("ForumPost", forumPostSchema, "ForumPost");

module.exports = ForumPost;
