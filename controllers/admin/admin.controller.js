const mongoose = require("mongoose");
const Admin = require("../../models/admin.model");
const Role = require("../../models/role.model");
const Course = require("../../models/course.model");
const systemConfig = require("../../config/system");
const generateHelper = require("../../helpers/generate");

// [GET] /admin/admin
module.exports.index = async (req, res) => {
  let find = {
    AdminDeleted: 1,
  };

  const admin = await Admin.find(find).select("-AdminPassword -AdminToken").lean();

  for (const item of admin) {
    if (mongoose.Types.ObjectId.isValid(item.AdminRole_id)) {
      const role = await Role.findOne({
        _id: item.AdminRole_id,
        RoleDeleted: 1,
      });
      item.role = role;
    } else {
      item.role = null; // Hoặc xử lý lỗi phù hợp
    }
  }
  res.json(admin)
};

// [GET] /admin/admin/detail/:AdminID
module.exports.detail = async (req, res) => {
  const find = {
    AdminDeleted: 1,
    AdminStatus: 1,
    _id: req.params.AdminID,
  };

  const admin = await Admin.findOne(find).lean();
  if (!admin) {
    res.json({
      code: 400,
      message: "Không tìm thấy người dùng!"
    })
    return;
  }
  const course = await Course.find({
    CourseIntructor: admin._id
  })
  admin.course = course

  const role = await Role.findOne({
    _id: admin.AdminRole_id,
    RoleDeleted: 1,
  });
  admin.role = role ? role : null;
  const roles = await Role.find({
    RoleDeleted: 1,
  })
  admin.roles = roles ? roles : null;
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

// // [PATCH] /admin/admin/change-status/:status/:AdminID
// module.exports.changeStatus = async (req, res) => {
//   const status = req.params.status;
//   const CategoryID = req.params.CategoryID;

//   await Category.updateOne({ _id: CategoryID}, {CategoryStatus: status == "active"?1:0})

//   req.flash('success', 'Cập nhật trạng thái thành công');

//   res.redirect('back')
// }

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

// [GET] /admin/admin/edit/:AdminID
module.exports.editItem = async (req, res) => {
  try {
    const find = {
      AdminDeleted: 1,
      _id: req.params.AdminID,
    };

    const listRole = await Role.find({
      RoleDeleted: 1,
    });

    const admin = await Admin.findOne(find);

    res.render("admin/pages/admin/edit", {
      pageTitle: "Chỉnh sửa khoá học",
      admin: admin,
      listRole: listRole,
    });
  } catch (error) {
    req.flash("error", "Không tìm thấy tài khoản!");
    res.redirect(`${systemConfig.prefixAdmin}/admin`);
  }
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
