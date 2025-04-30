const Course = require("../../models/course.model");
const Category = require("../../models/category.model");
const Admin = require("../../models/admin.model");
const Lesson = require("../../models/lesson.model");
const paginationHelper = require("../../helpers/pagination");
const createTreeHelper = require("../../helpers/createTree");

// [GET] /admin/courses
module.exports.index = async (req, res) => {
  let find
  if (!res.locals.role?.RolePermissions?.includes("course_view")) {
    find = {
      CourseDeleted: 1,
      CourseIntructor: res.locals.user._id
    };
  } else {
    find = {
      CourseDeleted: 1,
    };
  }

  // Bộ lọc
  if (req.query.status == "active") {
    find.CourseStatus = 1;
  } else if (req.query.status == "inactive") {
    find.CourseStatus = 0;
  }

  // Tìm kiếm
  let keyword = "";
  if (req.query.keyword) {
    keyword = req.query.keyword;
    const regex = new RegExp(keyword, "i");
    find.CourseName = regex;
  }

  // Phân trang
  const countCourses = await Course.countDocuments(find);
  let objectPagination = paginationHelper(
    {
      currentPage: 1,
      // limitItems: 10,
    },
    req.query,
    countCourses
  );

  const courses = await Course.find(find)
    .limit(objectPagination.limitItems)
    .skip(objectPagination.skip)
    .populate({
      path: "CourseIntructor",
      select: "AdminFullName",
      model: "Admin"
    })
    .lean();

  for (const course of courses) {
    course.intructorFullName = course.CourseIntructor ? course.CourseIntructor.AdminFullName : null;
    delete course.CourseIntructor;
  }

  res.json(courses);
};

// [POST] /admin/courses/change-status/:status/:CourseID
module.exports.changeStatus = async (req, res) => {
  const status = req.params.status;
  const courseID = req.params.CourseID;
  const oldCourse = await Course.findOne({ _id: courseID }).lean();
  const admin = await Admin.findById(res.locals.user.id);
  const editedBy = {
    UserId: res.locals.user.id,
    editedAt: new Date(),
  };
  try {
    await Course.updateOne(
      { _id: courseID },
      {
        CourseStatus: status == "active" ? 1 : 0,
        $push: { editedBy: editedBy },
      }
    );

    res.json({
      code: 200,
      message: "Cập nhật trạng thái thành công",
    });
  } catch {
    res.json({
      code: 400,
      message: "Cập nhật trạng thái không thành công",
    });
  }
};

// [DELETE] /admin/courses/delete/:CourseID
module.exports.deleteItem = async (req, res) => {
  const courseID = req.params.CourseID;
  await Course.updateOne(
    { _id: courseID },
    {
      CourseDeleted: 0,
      deletedBy: {
        UserId: res.locals.user.id,
        deletedAt: new Date(),
      },
    }
  );
  res.json({
    code: 200,
    message: "Xoá khoá học thành công!"
  })
};

// [GET] /admin/courses/create
module.exports.createItem = async (req, res) => {
  const listCategory = await Category.find({
    CategoryDeleted: 1,
  });
  const newList = createTreeHelper.tree(listCategory);

  const intructor = await Admin.find({
    AdminDeleted: 1,
  });
  res.json({
    categories: listCategory,
    intructors: intructor,
  });
};

// [POST] /admin/courses/create
module.exports.createPost = async (req, res) => {
  req.body.CoursePrice = parseInt(req.body.CoursePrice);
  req.body.CourseDuration = parseInt(req.body.CourseDuration);
  req.body.CourseDiscount = req.body.CourseDiscount ? parseInt(req.body.CourseDiscount) : 0;

  req.body.createdBy = {
    UserId: res.locals.user.id,
  };

  const course = new Course(req.body);

  await course.save();

  res.json({
    code: 200,
    message: "Tạo khoá học thành công!",
  });
};


// [GET] /admin/courses/detail/:CourseID
module.exports.detailItem = async (req, res) => {
  try {
    const find = {
      CourseDeleted: 1,
      _id: req.params.CourseID,
    };

    const course = await Course.findOne(find)
      .populate({
        path: "CourseCatogory",
        match: { CategoryDeleted: 1 },
        model: "Category"
      })
      .populate({
        path: "CourseIntructor",
        match: { AdminDeleted: 1 },
        model: "Admin"
      })
      .lean();

    if (!course) {
      return res.status(404).json({ message: "Course không tồn tại hoặc đã bị xoá" });
    }

    const [categories, intructors, lessons] = await Promise.all([
      Category.find().lean(),
      Admin.find().lean(),
      Lesson.find({ CourseId: req.params.CourseID, LessonDeleted: 1 }).lean()
    ]);

    course.categories = categories;
    course.intructors = intructors;
    course.lesson = lessons.length > 0 ? lessons : [];

    course.category = course.CourseCatogory || null;
    course.intructor = course.CourseIntructor || null;
    delete course.CourseCatogory;
    delete course.CourseIntructor;
    res.json({ course: course, user: res.locals.user._id });
  } catch (error) {
    console.log(error);
  }
};

// [GET] /admin/courses/edit/:CourseID
module.exports.editItem = async (req, res) => {
  try {
    const find = {
      CourseDeleted: 1,
      _id: req.params.CourseID,
    };
    const course = await Course.findOne(find);

    res.json(course);
  } catch (error) {
    res.json({
      code: 200,
      message: error,
    });
  }
};

// [POST] /admin/courses/edit/:CourseID
module.exports.editPost = async (req, res) => {
  const { editedBy, ...updateFields } = req.body;
  updateFields.CoursePrice = parseInt(updateFields.CoursePrice);
  updateFields.CourseDuration = parseInt(updateFields.CourseDuration);
  updateFields.CourseDiscount = updateFields.CourseDiscount ? parseInt(updateFields.CourseDiscount) : 0;


  if (req.file) {
    updateFields.CoursePicture = `/uploads/${req.file.filename}`;
  }

  const oldCourse = await Course.findOne({ _id: req.params.CourseID }).lean();

  try {
    const newEditedBy = {
      UserId: res.locals.user.id,
      editedAt: new Date(),
    };

    await Course.updateOne(
      { _id: req.params.CourseID },
      {
        ...updateFields,
        $push: { editedBy: newEditedBy },
      }
    );

    if (updateFields.lesson) {
      const updates = updateFields.lesson
        .filter(item => item.change == 1)
        .map(item => {
          const { editedBy, ...fieldsToUpdate } = item;
          return Lesson.updateOne(
            { _id: item._id },
            {
              ...fieldsToUpdate,
              $push: { editedBy: newEditedBy },
            }
          );
        });

      await Promise.all(updates);
    }

    res.json({
      code: 200,
      message: "Cập nhật thành công!",
    });
  } catch (error) {
    console.log(error);
    res.json({
      code: 400,
      message: "Cập nhật thất bại!",
    });
  }
};
