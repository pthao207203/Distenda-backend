const Course = require("../../models/course.model");
const Category = require("../../models/category.model")
const Admin = require("../../models/admin.model")
const createTreeHelper = require("../../helpers/createTree");

// [GET] /category/:CategorySlug
module.exports.detail = async (req, res) => {
  try {
    const find = {
      CategoryDeleted: 1,
      CategorySlug: req.params.CategorySlug,
      CategoryStatus: 1
    }
    const category = await Category.findOne(find);

    const getSubCategory = async (parentId) => {
      const subs = await Category.find({
        CategoryParent_id: parentId,
        CategoryStatus: 1,
        CategoryDeleted: 1,
      })
      let allSub = [...subs];
      for (const sub of subs) {
        const childs = await getSubCategory(sub.id);
        allSub = allSub.concat(childs);
      }
      return allSub;
    }
    const listSub = await getSubCategory(category.id)
    const listSubId = listSub.map(item => item.id)

    const courses = await Course.find({
      CourseCatogory: { $in: [category.id, ...listSubId] },
      CourseStatus: 1,
      CourseDeleted: 1
    })
      .populate({
        path: "CourseIntructor",
        select: "AdminFullName", // chỉ lấy tên giảng viên
        model: "Admin"
      })
      .lean();

    const result = courses.map(course => ({
      ...course,
      intructor: course.CourseIntructor?.AdminFullName || "Không rõ"
    }));

    res.json({
      courses: result,
      category: category.CategoryName
    })
  } catch (error) {
    res.json({
      code: 404,
      message: error
    })
  }
}