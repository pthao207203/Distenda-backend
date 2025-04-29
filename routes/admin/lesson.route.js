const express = require("express");
const router = express.Router();

const controller = require("../../controllers/admin/lesson.controller");
const historyController = require("../../controllers/admin/history.controller");

router.delete("/delete/:LessonID", controller.deleteItem);

router.post("/create/:CourseID", controller.createPost);

router.post("/edit/:LessonID", controller.editPost);

router.get("/detail/:LessonID", controller.detailItem);

router.get("/detail/:LessonID/history", historyController.getVideoHistoryByLessonID);

module.exports = router;
