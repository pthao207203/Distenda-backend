const express = require("express");
const router = express.Router();
const notificationController = require("../../controllers/client/notification.controller");
const { checkCourseExpiry } = require("../../controllers/client/notification.controller");

// Các route đã có:
router.post("/add", notificationController.add);
router.get("/user/:userToken", notificationController.getUserNotifications);
router.delete("/:id", notificationController.deleteNotification);

// Thêm route kiểm tra khóa học sắp hết hạn
router.post("/check-expiry", checkCourseExpiry); //

module.exports = router;
