const Banner = require("../../models/banner.model");
const Course = require("../../models/course.model");
// [GET] /banner
module.exports.index = async (req, res) => {
  const banners = await Banner.find({
    BannerDeleted: 1,
    BannerStatus: 1
  })
    .populate({
      path: "BannerCourse",
      model: "Course",
      select: "CourseSlug"
    })
    .lean();

  // Nếu muốn gán thành `banner.course` thay vì `BannerCourse`
  const result = banners.map(banner => ({
    ...banner,
    course: banner.BannerCourse
  }));

  res.json(banners)
  // res.render('client/pages/courses/index', {
  //   pageTitle: "Danh sách khoá học",
  //   courses: courses,
  //   allCategory: newCategory,
  // })
}