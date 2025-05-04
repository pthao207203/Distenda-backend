const mongoose = require("mongoose");
const Admin = require("../../models/admin.model");
const Role = require("../../models/role.model");
const Course = require("../../models/course.model");
const systemConfig = require("../../config/system");
const generateHelper = require("../../helpers/generate");

module.exports.getCurrentAdmin = async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }

  const admin = await Admin.findOne({ AdminToken: token }).lean();
  if (!admin) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }

  res.json(admin);
};
// [GET] /admin/admin
module.exports.index = async (req, res) => {
  let find = {
    AdminDeleted: 1,
  };

  const admin = await Admin.find(find)
    .select("-AdminPassword -AdminToken")
    .populate({
      path: "AdminRole_id",
      match: { RoleDeleted: 1 },
      model: "Role"
    })
    .lean();

  for (const item of admin) {
    item.role = item.AdminRole_id || null;
    delete item.AdminRole_id;
  }
  res.json(admin)
};

// [GET] /admin/admin/detail/:AdminID
module.exports.detail = async (req, res) => {
  let find = {
    AdminDeleted: 1,
  };
  const admin = await Admin.findOne(find)
    .select("-AdminPassword -AdminToken")
    .populate({
      path: "AdminRole_id",
      match: { RoleDeleted: 1 },
      model: "Role"
    })
    .lean();

  if (!admin) {
    return res.json({
      code: 400,
      message: "Không tìm thấy người dùng!"
    });
  }

  // Gán role 
  admin.role = admin.AdminRole_id || null;
  delete admin.AdminRole_id;

  // Tìm course dạy bởi admin
  const course = await Course.find({
    CourseIntructor: admin._id
  }).lean();
  admin.course = course;

  // Lấy danh sách roles còn hoạt động
  const roles = await Role.find({ RoleDeleted: 1 }).lean();
  admin.roles = roles;
  res.json(admin)
};

// [GET] /admin/admin/create
module.exports.createItem = async (req, res) => {
  const role = await Role.find({ RoleDeleted: 1 });
  res.json(role)
};

// [POST] /admin/admin/create
module.exports.createPost = async (req, res) => {
  const test = await Admin.findOne({
    AdminEmail: req.body.AdminEmail
  })
  if (test) {
    res.json({
      code: 400,
      message: "Email đã tồn tại!"
    })
    return;
  }
  req.body.AdminStatus = 1;
  req.body.AdminDeleted = 1;
  req.body.AdminToken = generateHelper.generateRandomString(30);
  req.body.createdBy = {
    UserId: res.locals.user.id,
  };

  const admin = new Admin(req.body);
  await admin.save();
  res.json({
    code: 200,
    message: "Tạo tài khoản thành công!"
  })
};

// [DELETE] /admin/admin/delete/:AdminID
module.exports.deleteItem = async (req, res) => {
  const AdminID = req.params.AdminID;

  await Admin.updateOne(
    { _id: AdminID },
    {
      AdminDeleted: 0,
      deletedBy: {
        UserId: res.locals.user.id,
        deletedAt: new Date(),
      },
    }
  );
  res.json({
    code: 200,
    message: "Xoá thành công!"
  })
};

// [POST] /admin/admin/edit/:AdminID
module.exports.editPost = async (req, res) => {
  const { editedBy, ...updateFields } = req.body;

  try {
    const newEditedBy = {
      UserId: res.locals.user.id,
      editedAt: new Date(),
    };

    await Admin.updateOne(
      {
        _id: req.params.AdminID,
      },
      {
        ...updateFields, // Cập nhật các trường khác
        $push: { editedBy: newEditedBy },
      }
    );

    res.json({
      code: 200,
      message: "Cập nhật thành công!"
    })
  } catch (error) {
    console.log(error)
    res.json({
      code: 400,
      message: "Cập nhật thất bại!"
    })
  }
};
