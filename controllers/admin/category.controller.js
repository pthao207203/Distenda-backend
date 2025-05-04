const Category = require("../../models/category.model");
const Course = require("../../models/course.model");
const systemConfig = require("../../config/system");
const createTreeHelper = require("../../helpers/createTree");

// [GET] /admin/category
module.exports.index = async (req, res) => {
  let find = {
    CategoryDeleted: 1,
    CategoryStatus: 1,
  };

  const categories = await Category.find(find).lean();
  for (const item of categories) {
    const count = await Course.countDocuments({
      CourseDeleted: 1,
      CourseCatogory: item._id
    });
    item.count = count
  }

  const newList = createTreeHelper.tree(categories);

  res.json(newList)
};

// [POST] /admin/category/create
module.exports.createPost = async (req, res) => {

  if (!req.body.CategoryPosition) {
    const count = await Category.countDocuments();
    req.body.CategoryPosition = count + 1;
  } else {
    req.body.CategoryPosition = parseInt(req.body.CategoryPosition);
  }
  req.body.createdBy = {
    UserId: res.locals.user.id,
  };

  const category = new Category(req.body);
  await category.save();
  res.json({
    code: 200,
    message: "Thêm phân loại thành công!"
  })
};

// [DELETE] /admin/category/delete/:CategoryID
module.exports.deleteItem = async (req, res) => {
  const CategoryID = req.params.CategoryID;

  await Category.updateOne(
    { _id: CategoryID },
    {
      CategoryDeleted: 0,
      deletedAt: new Date(),
    }
  );

  req.flash("success", "Xóa thành công!");
  res.redirect(`${systemConfig.prefixAdmin}/category`);
};

// [PATCH] /admin/category/edit/:CategoryID
module.exports.editPatch = async (req, res) => {
  req.body.CategoryStatus = req.body.CategoryStatus == "active" ? 1 : 0;
  req.body.CategoryPosition = parseInt(req.body.CategoryPosition);

  try {
    const editedBy = {
      UserId: res.locals.user.id,
      editedAt: new Date(),
    };
    await Category.updateOne(
      {
        _id: req.params.CategoryID,
      },
      {
        ...req.body,
        $push: { editedBy: editedBy },
      }
    );

    req.flash("success", "Cập nhật thành công!");
  } catch (error) {
    req.flash("error", "Cập nhật thất bại!");
  }

  res.redirect(`${systemConfig.prefixAdmin}/category`);
};
