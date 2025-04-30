const User = require("../../models/user.model");
const Course = require("../../models/course.model");
const Lesson = require("../../models/lesson.model");
const Video = require("../../models/video.model");
const md5 = require("md5");
const mongoose = require("mongoose");

module.exports.getCurrentUser = async (req, res) => {
  const token = req.cookies.user_token;
  if (!token) {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }

  const user = await User.findOne({ UserToken: token }).lean();
  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }

  res.json(user);
};

// // [GET] /user/like/add/:CourseID
module.exports.addLike = async (req, res) => {
  if (req.cookies.user_token) {
    await User.updateOne(
      {
        _id: res.locals.user.id,
      },
      {
        $push: { UserLikes: req.params.CourseID },
      }
    );
    req.flash("success", "Thêm khoá học yêu thích thành công!");
    res.redirect("back");
  } else {
    res.render("client/pages/auth/login", {
      pageTitle: "Đăng nhập",
    });
  }
};

// // [GET] /user/like/cancel/:CourseID
module.exports.cancelLike = async (req, res) => {
  if (req.cookies.user_token) {
    await User.updateOne(
      {
        _id: res.locals.user.id,
      },
      {
        $pull: { UserLikes: req.params.CourseID },
      }
    );
    req.flash("success", "Xoá khoá học yêu thích thành công!");
    res.redirect("back");
  } else {
    res.render("client/pages/auth/login", {
      pageTitle: "Đăng nhập",
    });
  }
};

// // [GET] /user/pay/:CourseID
module.exports.pay = async (req, res) => {
  if (req.cookies.user_token) {
    const test = await User.findOne({
      _id: res.locals.user.id,
      "UserCourse.CourseId": req.params.CourseID,
    });
    console.log("test ", test);
    if (test) {
      const course = await Course.findOne({ _id: req.params.CourseID });
      req.flash("error", "Bạn đã mua khoá học!");
      res.redirect(`/courses/${course.CourseSlug}`);
      return;
    }
    const course = await Course.findOne({
      _id: req.params.CourseID,
    });
    console.log(course);
    res.render("client/pages/courses/pay", {
      pageTitle: "Thanh toán",
      course: course,
    });
  } else {
    res.render("client/pages/auth/login", {
      pageTitle: "Đăng nhập",
    });
  }
};

// // [POST] /user/pay/:CourseID
module.exports.payPost = async (req, res) => {
  if (req.cookies.user_token) {
    const test = await User.findOne({
      _id: res.locals.user.id,
      "UserCourse.CourseId": req.params.CourseID,
    });
    if (test) {
      const course = await Course.findOne({ _id: req.params.CourseID });
      req.flash("error", "Bạn đã mua khoá học!");
      res.redirect(`/courses/${course.CourseSlug}`);
      return;
    }
    const newCourse = {
      CourseId: req.params.CourseID,
      CourseStatus: 0, // Mặc định là 0
      CourseProcess: [], // Mặc định là một mảng rỗng
    };

    // Cập nhật thông tin người dùng
    await User.updateOne(
      {
        _id: res.locals.user.id,
      },
      {
        $push: { UserCourse: newCourse },
      }
    );
    console.log(res.locals.user);

    const course = await Course.findOne({ _id: req.params.CourseID });
    req.flash("success", "Thanh toán thành công");
    res.redirect(`/courses/detail/${course.CourseSlug}`);
  } else {
    res.render("client/pages/auth/login", {
      pageTitle: "Đăng nhập",
    });
  }
};

// // [GET] /user/profile
module.exports.profile = async (req, res) => {
  // res.render("client/pages/user/profile", {
  //   pageTitle: "Trang cá nhân",
  //   user: res.locals.user
  // });
  res.json(res.locals.user);
};

// // [GET] /user/profile/edit
module.exports.profileEdit = async (req, res) => {
  res.render("client/pages/user/edit", {
    pageTitle: "Trang cá nhân",
    user: res.locals.user,
  });
};

// [POST] /user/profile
module.exports.profilePost = async (req, res) => {
  try {
    // console.log(req.body)
    // const oldPassword = req.body
    if (req.body.currentPassword) {
      const user = await User.findOne({
        _id: req.body._id,
        UserPassword: req.body.currentPassword,
      });
      if (user) {
        res.json({
          code: 400,
          message: "Sai mật khẩu!!!",
        });
        return;
      }
      req.body.UserPassword = md5(req.body.newPassword);
    }
    const editedBy = {
      UserId: res.locals.user.id,
      editedAt: new Date(),
    };
    await User.updateOne(
      {
        _id: res.locals.user.id,
      },
      {
        $set: { ...req.body, editedBy: undefined },
        $push: { editedBy: editedBy },
      }
    );

    // req.flash("success", "Cập nhật thành công!");
    res.json({
      code: 200,
      message: "Cập nhật thành công",
    });
  } catch (error) {
    // req.flash("error", "Cập nhật thất bại!");
    console.log(error);
    res.json({
      code: 400,
      message: "Cập nhật thất bại!",
    });
  }
  // res.redirect(`${systemConfig.prefixAdmin}/user`);
};

// [POST] /user/comment/add/:CourseID
module.exports.addComment = async (req, res) => {
  if (req.cookies.user_token) {
    console.log(req.body);
    req.body.Rate = parseInt(req.body.Rate);
    const test = await User.findOne({
      "UserCourse.CourseId": req.params.CourseID,
      _id: res.locals.user._id,
    });
    if (!test) {
      res.json({
        code: 400,
        message: "Bạn chưa mua khoá học!",
      });
      return;
    }

    await User.updateOne(
      {
        "UserCourse.CourseId": req.params.CourseID,
        _id: res.locals.user._id,
      },
      {
        "UserCourse.$.CourseReview": 1,
      }
    );
    console.log(res.locals.user);

    await Course.updateOne(
      { _id: req.params.CourseID },
      {
        $push: {
          CourseReview: {
            UserId: res.locals.user._id,
            Rate: req.body.Rate,
            Comment: req.body.Comment,
          },
        },
      }
    );

    const course = await Course.findOne({ _id: req.params.CourseID });
    req.flash("success", "Thanh toán thành công");
    res.redirect(`/courses/detail/${course.CourseSlug}`);
  } else {
    res.render("client/pages/auth/login", {
      pageTitle: "Đăng nhập",
    });
  }
};

// [POST] /user/video-status/mark-video-completed
module.exports.markVideoAsCompleted = async (req, res) => {
  const { courseId, videoId } = req.body;
  const userId = res.locals.user._id;

  try {
    // Đảm bảo user + khóa học tồn tại
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const userCourse = user.UserCourse.find((c) => c.CourseId === courseId);
    if (!userCourse)
      return res.status(404).json({ message: "Course not found for user" });

    // Lấy lessonId từ video
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ message: "Video not found" });
    const lessonId = video.LessonId;

    // Nếu chưa có CourseProcess thì push mảng mới
    if (!Array.isArray(userCourse.CourseProcess)) {
      await User.updateOne(
        { _id: userId, "UserCourse.CourseId": courseId },
        { $set: { "UserCourse.$.CourseProcess": [] } }
      );
    }

    // Nếu chưa có lesson dựa theo lessonId này, tạo mới kèm video đầu
    const hasLesson = userCourse.CourseProcess.some(
      (l) => l.LessonId === lessonId
    );
    if (!hasLesson) {
      await User.updateOne(
        { _id: userId, "UserCourse.CourseId": courseId, "UserCourse.CourseStatus": { $ne: 1 } },
        {
          $push: {
            "UserCourse.$.CourseProcess": {
              LessonId: lessonId,
              LessonStatus: 0,
              LessonProcess: [videoId],
            },
          },
        }
      );
    } else {
      // Ngược lại, nếu có, addToSet videoId
      await User.updateOne(
        {
          _id: userId,
          "UserCourse.CourseId": courseId,
          "UserCourse.CourseStatus": { $ne: 1 },
          "UserCourse.CourseProcess": {
            $elemMatch: {
              LessonId: lessonId,
              LessonStatus: 0,
            },
          },
        },
        {
          $addToSet: {
            "UserCourse.$.CourseProcess.$[lesson].LessonProcess": videoId,
          },
        },
        { arrayFilters: [{ "lesson.LessonId": lessonId }] }
      );
    }

    // Đếm completedCount bằng aggregation
    const [lessonStats] = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      { $unwind: "$UserCourse" },
      { $match: { "UserCourse.CourseId": courseId } },
      { $unwind: "$UserCourse.CourseProcess" },
      { $match: { "UserCourse.CourseProcess.LessonId": lessonId } },
      {
        $project: {
          completedCount: { $size: "$UserCourse.CourseProcess.LessonProcess" },
        },
      },
    ]);
    const completedCount = lessonStats?.completedCount || 0;

    // Đếm tổng video của lesson
    const totalVideos = await Video.countDocuments({ LessonId: lessonId });

    // Nếu đã xong tất cả video trong lesson, update LessonStatus=1 đồng thời clear LessonProcess
    if (completedCount === totalVideos) {
      await User.updateOne(
        {
          _id: userId,
          "UserCourse.CourseId": courseId,
          "UserCourse.CourseProcess.LessonId": lessonId,
        },
        {
          $set: {
            "UserCourse.$.CourseProcess.$[lesson].LessonStatus": 1,
            "UserCourse.$.CourseProcess.$[lesson].LessonProcess": [],
          },
        },
        { arrayFilters: [{ "lesson.LessonId": lessonId }] }
      );
    }

    // Đếm số lesson thực có trong course
    const totalLessons = await Lesson.countDocuments({ CourseId: courseId });

    // Đếm số lesson đã hoàn thành của user để quyết định CourseStatus
    const [courseStats] = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      { $unwind: "$UserCourse" },
      { $match: { "UserCourse.CourseId": courseId } },
      {
        $project: {
          doneLessons: {
            $size: {
              $filter: {
                input: "$UserCourse.CourseProcess",
                as: "l",
                cond: { $eq: ["$$l.LessonStatus", 1] },
              },
            },
          },
        },
      },
    ]);

    const doneLessons = courseStats?.doneLessons || 0;
    // Khi tất cả lesson done: mark CourseStatus = 1 và clear LessonProcess
    if (doneLessons > 0 && doneLessons === totalLessons) {
      await User.updateOne(
        { _id: userId, "UserCourse.CourseId": courseId },
        {
          $set: {
            "UserCourse.$.CourseStatus": 1,
            "UserCourse.$.CourseProcess": [],
          },
        }
      );
    }

    // Trả về user mới nhất
    const updatedUser = await User.findById(userId);
    return res.status(200).json({
      message: "Đã cập nhật tiến trình video thành công",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating video progress:", error);
    return res.status(500).json({
      message: "Error updating video progress",
      error: error.message,
    });
  }
};

module.exports.getVideoStatus = async (req, res) => {
  const userId   = res.locals.user._id;
  const { courseId } = req.params;
  try {
    // Load user + tìm subdoc course
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }
    const userCourse = user.UserCourse.find(
      c => c.CourseId.toString() === courseId
    );
    if (!userCourse) {
      return res.status(404).json({ message: "User chưa đăng ký khóa này" });
    }

    // Lấy tất cả lessons của khóa
    const lessons = await Lesson.find({
      CourseId: new mongoose.Types.ObjectId(courseId)
    }).lean();

    // CourseStatus
    const courseStatus = userCourse.CourseStatus === 1 ? 1 : 0;

    // Với mỗi lesson, load videos và đánh dấu theo rule
    const result = await Promise.all(lessons.map(async lesson => {
      // chuyển id lesson về string
      const thisLessonId = lesson._id.toString();

      // progress cụ thể của user cho lesson này
      const prog = userCourse.CourseProcess
        .find(p => p.LessonId.toString() === thisLessonId)
        || { LessonStatus: 0, LessonProcess: [] };

      // load tất cả video của lesson
      const videos = await Video.find({ LessonId: lesson._id })
                                .select("_id title url")
                                .lean();

      // xác định seenIDs khi LessonStatus=0
      const seenIDs = prog.LessonStatus === 0 && Array.isArray(prog.LessonProcess)
        ? prog.LessonProcess.map(id => id.toString())
        : [];

      // build videoStatuses theo rule
      const videoStatuses = videos.map(v => {
        const vid = v._id.toString();
        let completed = false;
        if (courseStatus === 1 || prog.LessonStatus === 1) {
          completed = true;
        } else {
          completed = seenIDs.includes(vid);
        }
        return {
          videoId:   vid,
          title:     v.title,
          url:       v.url,
          completed
        };
      });

      const totalVideos    = videos.length;
      const completedCount = videoStatuses.filter(v => v.completed).length;
      const lessonStatus   = courseStatus === 1 ? 1 : prog.LessonStatus;
      const completionRate = totalVideos > 0
        ? completedCount / totalVideos
        : 0;

      return {
        lessonId:       thisLessonId,
        lessonStatus,
        totalVideos,
        completedCount,
        completionRate,
        videos: videoStatuses
      };
    }));

    // 5) Trả về kết quả
    return res.json({
      courseId,
      courseStatus,
      lessons: result
    });

  } catch (error) {
    console.error("getVideoStatus error:", error);
    return res.status(500).json({
      message: "Lỗi khi lấy trạng thái video",
      error:   error.message
    });
  }
};

