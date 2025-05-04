const express = require("express");
const multer = require("multer");
const router = express.Router();

const upload = multer();

const controller = require("../../controllers/admin/video.controller");
const validate = require("../../validates/admin/course.validate");
const uploadCloud = require("../../middlewares/admin/uploadCloud.middleware");
const historyController = require("../../controllers/admin/history.controller");

router.delete("/delete/:VideoID", controller.deleteItem);

router.post("/create/:LessonID", controller.createPost);

router.post("/edit/:VideoID", controller.editPost);

router.get("/detail/:VideoID", controller.detailItem);

router.get("/detail/:VideoID/history", historyController.getVideoHistoryByVideoID);

module.exports = router;