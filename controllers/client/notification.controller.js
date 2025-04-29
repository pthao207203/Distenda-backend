const Notification = require("../../models/notification.model");
const User = require("../../models/user.model");
const Course = require("../../models/course.model");

// [POST] /notification/add
module.exports.add = async (req, res) => {
  const { message, type = "info", userToken } = req.body;

  try {
    const user = await User.findOne({ UserToken: userToken });
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy user" });

    const exists = await Notification.findOne({
      UserId: user._id,
      NotificationMessage: message,
      NotificationStatus: 1,
      NotificationDeleted: 1
    });

    if (exists) {
      return res.json({ success: false, message: "Thông báo này đã được gửi trước đó." });
    }

    await Notification.create({
      NotificationMessage: message,
      NotificationType: type,
      NotificationStatus: 1,
      NotificationDeleted: 1,
      UserId: user._id,
      createdBy: {
        UserId: user._id,
        createdAt: new Date(),
      },
    });

    res.json({ success: true, message: "Thông báo đã được tạo" });
  } catch (error) {
    console.error("Lỗi tạo thông báo:", error);
    res.status(500).json({ success: false, message: "Tạo thông báo thất bại", error });
  }
};

// [GET] /notification/user/:userToken
module.exports.getUserNotifications = async (req, res) => {
  try {
    const { userToken } = req.params;
    const user = await User.findOne({ UserToken: userToken });
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy user" });

    const notifications = await Notification.find({
      UserId: user._id,
      NotificationDeleted: 1,
      NotificationStatus: 1,
    }).sort({ "createdBy.createdAt": -1 });

    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error("Lỗi khi lấy thông báo:", error);
    res.status(500).json({ success: false, message: "Không thể lấy thông báo", error: error.message });
  }
};

// [DELETE] /notification/:id
module.exports.deleteNotification = async (req, res) => {
  try {
    const result = await Notification.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thông báo để xóa" });
    }

    res.json({ success: true, message: "Xoá thông báo thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Xoá thất bại", error: error.message });
  }
};

// [POST] /notification/check-expiry
module.exports.checkCourseExpiry = async (req, res) => {
  try {
    const { userToken } = req.body;
    const user = await User.findOne({ UserToken: userToken });
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy user" });

    const today = new Date();

    for (const userCourse of user.UserCourse) {
      const course = await Course.findById(userCourse.CourseId);
      if (!course) continue;

      const startDate = new Date(userCourse.CourseDayAt);
      const expireDate = new Date(startDate);
      expireDate.setMonth(expireDate.getMonth() + course.CourseDuration);
      const diffDays = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24));

      console.log(`📚 Kiểm tra khóa "${course.CourseName}": Duration=${course.CourseDuration}, Status=${userCourse.CourseStatus}, còn ${diffDays} ngày`);

      // Nếu đã hoàn thành, chỉ gửi thông báo hoàn thành nếu chưa gửi
      if (userCourse.CourseStatus === 1) {
        const completeMsg = `Chúc mừng bạn đã hoàn thành khóa học "${course.CourseName}"!`;

        const existedComplete = await Notification.findOne({
          UserId: user._id,
          NotificationMessage: completeMsg,
          NotificationStatus: 1,
          NotificationDeleted: 1,
        });

        if (!existedComplete) {
          await Notification.create({
            NotificationMessage: completeMsg,
            NotificationType: "course_completed",
            NotificationStatus: 1,
            NotificationDeleted: 1,
            UserId: user._id,
            createdBy: { UserId: user._id, createdAt: today },
          });
          console.log(`🏁 Đã gửi thông báo hoàn thành cho "${course.CourseName}"`);
        }

        // Đã hoàn thành thì bỏ qua kiểm tra hạn
        continue;
      }

      // Nếu chưa hoàn thành và khóa học không giới hạn thời gian => KHÔNG thông báo hết hạn
      if (course.CourseDuration === 0) {
        continue;
      }

      // Nếu chưa hoàn thành và khóa có giới hạn thời gian
      if ([15, 10, 3, 1].includes(diffDays)) {
        const expiringMsg = `Khóa học "${course.CourseName}" của bạn sẽ hết hạn sau ${diffDays} ngày!`;

        const existedExpiring = await Notification.findOne({
          UserId: user._id,
          NotificationMessage: expiringMsg,
          NotificationStatus: 1,
          NotificationDeleted: 1,
        });

        if (!existedExpiring) {
          await Notification.create({
            NotificationMessage: expiringMsg,
            NotificationType: "course_expiring",
            NotificationStatus: 1,
            NotificationDeleted: 1,
            UserId: user._id,
            createdBy: { UserId: user._id, createdAt: today },
          });
          console.log(`⏰ Đã gửi thông báo sắp hết hạn cho "${course.CourseName}"`);
        }
      }

      // Nếu khóa học đã hết hạn (hạn < 0 ngày) mà vẫn chưa hoàn thành
      if (diffDays < 0) {
        const expiredMsg = `Khóa học "${course.CourseName}" của bạn đã hết hạn. Vui lòng đăng ký lại nếu muốn tiếp tục học!`;

        const existedExpired = await Notification.findOne({
          UserId: user._id,
          NotificationMessage: expiredMsg,
          NotificationStatus: 1,
          NotificationDeleted: 1,
        });

        if (!existedExpired) {
          await Notification.create({
            NotificationMessage: expiredMsg,
            NotificationType: "course_expired",
            NotificationStatus: 1,
            NotificationDeleted: 1,
            UserId: user._id,
            createdBy: { UserId: user._id, createdAt: today },
          });
          console.log(`❌ Đã gửi thông báo hết hạn cho "${course.CourseName}"`);
        }
      }
    }

    res.json({ success: true, message: "Đã kiểm tra và gửi thông báo nếu cần." });
  } catch (error) {
    console.error("💥 Lỗi kiểm tra khóa học:", error);
    res.status(500).json({ success: false, message: "Lỗi server", error });
  }
};
