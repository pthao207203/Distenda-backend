const Video = require("../../models/video.model");
const Lesson = require("../../models/lesson.model");
const paginationHelper = require("../../helpers/pagination");
const systemConfig = require("../../config/system");
const createTreeHelper = require("../../helpers/createTree");

// [DELETE] /admin/video/delete/:VideoID
module.exports.deleteItem = async (req, res) => {
  const videoID = req.params.VideoID;

  await Video.updateOne(
    { _id: videoID },
    {
      VideoDeleted: 0,
      deletedBy: {
        UserId: res.locals.user.id,
        deletedAt: new Date(),
      },
    }
  );
  res.json({
    code: 200,
    message: "Xóa thành công!"
  })
};

// [POST] /admin/video/create/:LessonID
module.exports.createPost = async (req, res) => {
  req.body.createdBy = {
    UserId: res.locals.user.id,
  };
  req.body.LessonId = req.params.LessonID;
  const count = await Video.countDocuments({
    LessonId: req.params.LessonID,
  });
  req.body.VideoPosition = count + 1;

  const video = new Video(req.body);

  await video.save();
  res.json({
    code: 200,
    message: "Thêm chương học thành công!"
  })
};

// [POST] /admin/video/edit/:VideoID
module.exports.editPost = async (req, res) => {
  try {
    const { editedBy, ...updateFields } = req.body;
    const newEditedBy = {
      UserId: res.locals.user.id,
      editedAt: new Date(),
    };
    await Video.updateOne(
      { _id: req.params.VideoID },
      {
        ...updateFields,
        $push: { editedBy: newEditedBy },
      }
    );
    res.json({
      code: 200,
      message: "Cập nhật bài học thành công!"
    })
  } catch (error) {
    res.json({
      code: 400,
      message: "Cập nhật bài học thất bại!"
    })
    console.log(error)
  }
};

// [GET] /admin/video/detail/:VideoID
module.exports.detailItem = async (req, res) => {
  try {
    const find = {
      VideoDeleted: 1,
      _id: req.params.VideoID,
    };

    const video = await Video.findOne(find)
      .populate({
        path: "LessonId",
        match: { LessonDeleted: 1 }, // chỉ populate nếu LessonDeleted = 1
        model: "Lesson",
      })
      .lean();

    if (!video) {
      return res.status(404).json({ message: "Không tìm thấy video" });
    }

    // Gắn lại lesson cho dễ dùng nếu muốn
    video.lesson = video.LessonId;
    res.json(video);
  } catch (error) {
    console.log(error)
    res.json({
      code: 400,
      message: error
    })
  }
};
