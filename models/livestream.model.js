const mongoose = require("mongoose");

const livestreamSchema = new mongoose.Schema({
  LivestreamTitle: {
    type: String,
    required: true,
  },
  LivestreamDescription: String,
  LivestreamStatus: {
    type: String,
    enum: ["not_started", "live", "ended"],
    default: "not_started",
  },
  LivestreamStreamKey: String,
  LivestreamStreamUrl: String,
  LivestreamThumbnail: String,
  LivestreamViewCount: {
    type: Number,
    default: 0,
  },
  LivestreamVideoUrl: {
    type: String,
    default: null,
  },
  LivestreamVideoSignedUrl: {
    type: String,
    default: null,
  },
  LivestreamDeleted: {
    type: Number,
    default: 1,
  },
  LivestreamStartedAt: Date,
  LivestreamEndedAt: Date,
  createdBy: {
    UserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
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
        ref: "Admin",
      },
      editedAt: Date,
    },
  ],
  deletedBy: {
    UserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    deletedAt: Date,
  },
});

const Livestream = mongoose.model("Livestream", livestreamSchema, "Livestream");

module.exports = Livestream;
