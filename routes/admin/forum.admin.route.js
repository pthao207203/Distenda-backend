const express = require("express");
const router = express.Router();
const controller = require("../../controllers/admin/forum.admin.controller");

router.get("/", controller.getAllForumPosts);
router.get("/:id", controller.getForumPostDetail);
router.patch("/:id/approve", controller.approvePost);
router.patch("/:id/reject", controller.rejectPost);

module.exports = router;
