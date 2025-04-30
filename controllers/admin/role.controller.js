const Role = require("../../models/role.model");
const systemConfig = require("../../config/system");

// [POST] /admin/role/create
module.exports.createPost = async (req, res) => {
  console.log(req.body);

  const roles = new Role(req.body);
  await roles.save();

  res.redirect(`${systemConfig.prefixAdmin}/role`);
};

// [DELETE] /admin/role/delete/:RoleID
module.exports.deleteItem = async (req, res) => {
  const RoleID = req.params.RoleID;

  await Role.updateOne(
    { _id: RoleID },
    {
      RoleDeleted: 0,
      deletedAt: new Date(),
    }
  );
  console.log("Xoá thành công!!")
  res.json({
    code: 200,
    message: "Xoá thành công!!"
  })
};

// [POST] /admin/role/edit/:RoleID
module.exports.editPatch = async (req, res) => {
  try {
    await Role.updateOne(
      {
        _id: req.params.RoleID,
      }, {
      $set: { RolePermissions: req.body.role.permissions }
    });

    res.json({
      code: 200,
      message: "Cập nhật thành công!"
    })
  } catch (error) {
    console.log(error)
    res.json({
      code: 200,
      message: "Cập nhật thất bại!"
    })
  }
};

// [GET] /admin/role/permission
module.exports.permission = async (req, res) => {
  let find = {
    RoleDeleted: 1,
  };
  const roles = await Role.find(find);
  res.json(roles)
};
