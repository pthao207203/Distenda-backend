const md5 = require("md5");
const Admin = require("../../models/admin.model");
const Banner = require("../../models/banner.model");
const Role = require("../../models/role.model");
const Course = require("../../models/course.model");
const systemConfig = require("../../config/system");
const generateHelper = require("../../helpers/generate");

// [GET] /admin/banner
module.exports.index = async (req, res) => {
  let find = {
    BannerDeleted: 1,
  };

  const banner = await Banner.find(find)
    .populate({
      path: "BannerCourse",
      match: { CourseDeleted: 1 },
      model: "Course"
    })
    .lean();

  for (const item of banner) {
    item.course = item.BannerCourse || null;
    delete item.BannerCourse;
  }
  res.json(banner)
};

// [GET] /admin/banner/detail/:BannerID
module.exports.detail = async (req, res) => {
  const find = {
    BannerDeleted: 1,
    _id: req.params.BannerID,
  };

  const banner = await Banner.findOne(find).lean();
  const course = await Course.findOne({
    _id: banner.BannerCourse
  })
  banner.course = course
  res.json(banner)
};

// [GET] /admin/banner/create
module.exports.createItem = async (req, res) => {
  const course = await Course.find({ CourseDeleted: 1 });
  res.json(course)
};

// [POST] /admin/banner/create
module.exports.createPost = async (req, res) => {
  req.body.createdBy = {
    UserId: res.locals.user.id,
  };

  const banner = new Banner(req.body);
  await banner.save();
  res.json({
    code: 200,
    message: "Tạo tài khoản thành công!"
  })
};

// [DELETE] /admin/banner/delete/:BannerID
module.exports.deleteItem = async (req, res) => {
  const BannerID = req.params.BannerID;

  await Banner.updateOne(
    { _id: BannerID },
    {
      BannerDeleted: 0,
      deletedBy: {
        UserId: res.locals.user.id,
        deletedAt: new Date(),
      },
    }
  );
  res.json({
    code: 200,
    message: "Xoá banner thành công!!!",
  })
};

// [GET] /admin/banner/edit/:BannerID
module.exports.editItem = async (req, res) => {
  try {
    const find = {
      BannerDeleted: 1,
      _id: req.params.BannerID,
    };

    const banner = await Banner.findOne(find).lean();

    const course = await Course.find({ CourseDeleted: 1 });
    banner.course = course
    res.json(banner)
  } catch (error) {
    console.log(error)
    res.json({
      code: 400,
      message: "Không tìm banner!"
    })
  }
};

// [POST] /admin/banner/edit/:BannerID
module.exports.editPost = async (req, res) => {
  try {
    const { editedBy, ...updateFields } = req.body;
    const newEditedBy = {
      UserId: res.locals.user.id,
      editedAt: new Date(),
    };

    await Banner.updateOne(
      { _id: req.params.BannerID },
      {
        ...updateFields, // Cập nhật các trường khác
        $push: { editedBy: newEditedBy }, // Thêm đối tượng vào mảng editedBy
      }
    );

    res.json({
      code: 200,
      message: "Cập nhật thành công!",
    })
  } catch (error) {
    console.log(error)
    res.json({
      code: 200,
      message: "Cập nhật thất bại!",
    })
  }
};
