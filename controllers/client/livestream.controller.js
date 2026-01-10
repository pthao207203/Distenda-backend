const Livestream = require("../../models/livestream.model");

// [POST] /api/livestreams/on-publish
module.exports.onPublish = async (req, res) => {
  try {
    const { path } = req.body; // path = streamKey từ MediaMTX

    // Tìm livestream theo stream key
    const livestream = await Livestream.findOne({
      LivestreamStreamKey: path,
      LivestreamDeleted: 1,
    });

    if (!livestream) {
      console.log(`[MediaMTX Hook] Stream key không hợp lệ: ${path}`);
      return res.status(404).json({
        code: 404,
        message: "Stream key không hợp lệ",
      });
    }

    // Cập nhật trạng thái thành "live" và ghi nhận thời gian bắt đầu
    await Livestream.updateOne(
      { LivestreamStreamKey: path },
      {
        LivestreamStatus: "live",
        LivestreamStartedAt: new Date(),
        $inc: { LivestreamViewCount: 1 }, // Tăng view count (tùy chọn)
      }
    );

    console.log(`[MediaMTX Hook] Livestream bắt đầu: ${livestream.LivestreamTitle} (${path})`);

    res.status(200).json({
      code: 200,
      message: "Livestream đã bắt đầu",
    });
  } catch (error) {
    console.error("[MediaMTX Hook] Lỗi onPublish:", error);
    res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [POST] /api/livestreams/on-unpublish
module.exports.onUnpublish = async (req, res) => {
  try {
    const { path } = req.body; // path = streamKey từ MediaMTX
    const { execSync } = require("child_process");

    // Tìm livestream theo stream key
    const livestream = await Livestream.findOne({
      LivestreamStreamKey: path,
      LivestreamDeleted: 1,
    });

    if (!livestream) {
      console.log(`[MediaMTX Hook] Stream key không tồn tại: ${path}`);
      return res.status(404).json({
        code: 404,
        message: "Stream key không tồn tại",
      });
    }

    // Cập nhật trạng thái thành "ended" và ghi nhận thời gian kết thúc
    await Livestream.updateOne(
      { LivestreamStreamKey: path },
      {
        LivestreamStatus: "ended",
        LivestreamEndedAt: new Date(),
      }
    );

    console.log(`[MediaMTX Hook] Livestream kết thúc: ${livestream.LivestreamTitle} (${path})`);

    // Gọi recorder API để upload video lên S3 (async, không chờ response)
    setImmediate(async () => {
      try {
        console.log(`[S3 Upload] Starting upload for stream: ${path}`);
        const http = require('http');

        const postData = JSON.stringify({ streamKey: path });
        const options = {
          hostname: 'recorder',
          port: 8080,
          path: '/upload',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const req = http.request(options, (res) => {
          console.log(`[S3 Upload] Recorder responded with status: ${res.statusCode}`);
        });

        req.on('error', (error) => {
          console.error(`[S3 Upload] Error calling recorder: ${error.message}`);
        });

        req.write(postData);
        req.end();
      } catch (error) {
        console.error(`[S3 Upload] Error uploading stream ${path}:`, error.message);
      }
    });

    res.status(200).json({
      code: 200,
      message: "Livestream đã kết thúc",
    });
  } catch (error) {
    console.error("[MediaMTX Hook] Lỗi onUnpublish:", error);
    res.status(500).json({
      code: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [GET] /api/livestreams/active - Lấy danh sách livestream đang live
module.exports.getActiveLivestreams = async (req, res) => {
  try {
    const livestreams = await Livestream.find({
      LivestreamStatus: "live",
      LivestreamDeleted: 1,
    })
      .populate({
        path: "createdBy.UserId",
        select: "AdminFullName AdminAvatar",
        model: "Admin",
      })
      .sort({ LivestreamStartedAt: -1 })
      .lean();

    res.json({
      code: 200,
      data: livestreams,
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: "Lỗi khi lấy danh sách livestream",
      error: error.message,
    });
  }
};

// [GET] /api/livestreams/completed - Lấy danh sách livestream đã kết thúc
module.exports.getCompletedLivestreams = async (req, res) => {
  try {
    const livestreams = await Livestream.find({
      LivestreamStatus: "ended",
      LivestreamDeleted: 1,
    })
      .populate({
        path: "createdBy.UserId",
        select: "AdminFullName AdminAvatar",
        model: "Admin",
      })
      .sort({ LivestreamEndedAt: -1 })
      .lean();

    res.json({
      code: 200,
      data: livestreams,
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: "Lỗi khi lấy danh sách livestream đã kết thúc",
      error: error.message,
    });
  }
};

// [POST] /api/livestreams/save-video-url - Lưu URL video vào database sau khi upload xong
module.exports.saveVideoUrl = async (req, res) => {
  try {
    const { streamKey, videoUrl } = req.body;

    if (!streamKey || !videoUrl) {
      return res.status(400).json({
        code: 400,
        message: "Missing streamKey or videoUrl",
      });
    }

    // Tìm livestream theo stream key và cập nhật video URL
    const livestream = await Livestream.findOneAndUpdate(
      { LivestreamStreamKey: streamKey },
      {
        LivestreamVideoUrl: videoUrl,
        LivestreamVideoSignedUrl: convertS3ToHttpUrl(videoUrl)
      },
      { new: true }
    );

    if (!livestream) {
      console.log(`[Save Video URL] Livestream not found for stream key: ${streamKey}`);
      return res.status(404).json({
        code: 404,
        message: "Livestream not found",
      });
    }

    console.log(`[Save Video URL] ✅ Video URL saved for livestream: ${livestream.LivestreamTitle}`);
    console.log(`[Save Video URL] 🎥 Video URL: ${videoUrl}`);
    console.log(`[Save Video URL] 🔐 HTTP URL: ${livestream.LivestreamVideoSignedUrl}`);

    res.json({
      code: 200,
      message: "Video URL saved successfully",
      data: livestream,
    });
  } catch (error) {
    console.error("[Save Video URL] Error:", error);
    res.status(500).json({
      code: 500,
      message: "Error saving video URL",
      error: error.message,
    });
  }
};

// Helper function to convert S3 URL to HTTP URL
const convertS3ToHttpUrl = (s3Url) => {
  try {
    if (!s3Url || !s3Url.startsWith("s3://")) {
      return s3Url;
    }

    // Parse S3 URL: s3://bucket/key
    const s3Parts = s3Url.replace("s3://", "").split("/");
    const bucket = s3Parts[0];
    const key = s3Parts.slice(1).join("/");

    const region = "ap-southeast-2";
    const httpUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    console.log(`[Convert S3 URL] Converting: ${s3Url}`);
    console.log(`[Convert S3 URL] To: ${httpUrl}`);

    return httpUrl;
  } catch (error) {
    console.error("[Convert S3 URL] ❌ Error:", error.message);
    return s3Url; // Fallback to original URL
  }
};

// [GET] /api/livestreams/:LivestreamID - Lấy thông tin chi tiết livestream
module.exports.getDetail = async (req, res) => {
  try {
    const livestreamID = req.params.LivestreamID;

    const livestream = await Livestream.findOne({
      _id: livestreamID,
      LivestreamDeleted: 1,
    })
      .populate({
        path: "createdBy.UserId",
        select: "AdminFullName AdminAvatar",
        model: "Admin",
      })
      .lean();

    if (!livestream) {
      return res.status(404).json({
        code: 404,
        message: "Không tìm thấy livestream",
      });
    }

    // Tăng view count khi có người xem
    if (livestream.LivestreamStatus === "live") {
      await Livestream.updateOne(
        { _id: livestreamID },
        { $inc: { LivestreamViewCount: 1 } }
      );
      livestream.LivestreamViewCount += 1;
    }

    res.json({
      code: 200,
      data: livestream,
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: "Lỗi khi lấy thông tin livestream",
      error: error.message,
    });
  }
};
