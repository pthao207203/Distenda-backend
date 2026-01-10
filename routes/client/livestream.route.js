const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/livestream.controller");

// Webhook từ MediaMTX (không cần authentication)
router.post("/on-publish", controller.onPublish);
router.post("/on-unpublish", controller.onUnpublish);
router.post("/save-video-url", controller.saveVideoUrl);

// API cho client xem livestream
router.get("/active", controller.getActiveLivestreams);
router.get("/completed", controller.getCompletedLivestreams);
router.get("/:LivestreamID", controller.getDetail);

module.exports = router;
