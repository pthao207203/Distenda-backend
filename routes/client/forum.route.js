const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const forumController = require("../../controllers/client/forum.controller");
const authMiddleware = require("../../middlewares/client/auth.middleware");
const uploadCloud = require("../../middlewares/admin/uploadCloud.middleware");

router.get("/newest", forumController.getNewestPosts);

router.get("/my-posts", authMiddleware.requireAuth, forumController.getMyPosts);

router.post(
  "/create",
  authMiddleware.requireAuth,
  upload.fields([
    { name: "Images", maxCount: 10 },
    { name: "Files", maxCount: 5 },
  ]),
  uploadCloud.uploadMultipleFields,
  forumController.createPost
);

router.put(
  "/:PostID/edit",
  authMiddleware.requireAuth,
  upload.fields([
    { name: "Images", maxCount: 10 },
    { name: "Files", maxCount: 5 },
  ]),
  uploadCloud.uploadMultipleFields,
  forumController.updatePost
);

router.delete(
  "/:PostID/delete",
  authMiddleware.requireAuth,
  forumController.deletePost
);

router.post(
  "/:PostID/react",
  authMiddleware.requireAuth,
  forumController.reactToPost
);

router.post(
  "/:PostID/comments",
  authMiddleware.requireAuth,
  forumController.addComment
);

router.post(
  "/:PostID/comments/:CommentID/replies",
  authMiddleware.requireAuth,
  forumController.addReply
);

router.get("/detail/:PostID", forumController.getDetailPost);

module.exports = router;
