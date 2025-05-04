const md5 = require("md5");
const User = require("../../models/user.model");
const Role = require("../../models/role.model");
const Course = require("../../models/course.model");
const systemConfig = require("../../config/system");
const generateHelper = require("../../helpers/generate");

// [GET] /admin/user
module.exports.index = async (req, res) => {
  let find = {
    UserDeleted: 1,
  };

  const users = await User.find(find).select("-UserPassword -UserToken").sort({ createdAt: -1 });;

  res.json(users)
};

// [GET] /admin/user/detail/:UserID
module.exports.detail = async (req, res) => {
  const find = {
    UserDeleted: 1,
    _id: req.params.UserID,
  };

  const user = await User.findOne(find)
    .populate({
      path: "UserCourse.CourseId",
      model: "Course"
    })
    .lean();

  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }

  user.UserCourse = user.UserCourse.map(uc => ({
    ...uc,
    course: uc.CourseId,
    CourseId: uc.CourseId?._id || null
  }));

  res.json(user)
};

// [POST] /admin/user/change-status/:status/:UserID
module.exports.changeStatus = async (req, res) => {
  const status = req.params.status;
  const UserID = req.params.UserID;

  await User.updateOne({ _id: UserID }, { UserStatus: status == "active" ? 1 : 0 })

  res.json({
    code: 200,
    message: "Cập nhật thành công!"
  })
}

