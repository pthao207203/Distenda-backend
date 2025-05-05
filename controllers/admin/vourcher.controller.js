const mongoose = require("mongoose");
const Voucher = require("../../models/voucher.model");
const Course = require("../../models/course.model");

// [GET] /admin/voucher
module.exports.index = async (req, res) => {
  try {
    const vouchers = await Voucher.find()
      .populate("courseIds", "CourseName")
      .lean();
    res.json(vouchers);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách voucher:", err);
    res.status(500).json({
      message: "Lỗi khi lấy danh sách voucher",
      error: err.message,
    });
  }
};

// [GET] /admin/voucher/detail/:VoucherID
module.exports.detail = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.VoucherID)
      .populate("courseIds", "CourseName")
      .lean();

    if (!voucher) {
      return res.status(404).json({ message: "Voucher không tồn tại" });
    }

    res.json(voucher);
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết voucher:", err);
    res.status(500).json({
      message: "Lỗi khi lấy chi tiết voucher",
      error: err.message,
    });
  }
};

// [GET] /admin/voucher/create
module.exports.createItem = async (req, res) => {
  const course = await Course.find({ CourseDeleted: 1 }).lean();
  res.json(course);
};

// [POST] /admin/voucher/create
module.exports.createPost = async (req, res) => {
  try {
    // Ép kiểu ObjectId chính xác và an toàn
    if (Array.isArray(req.body.courseIds)) {
      req.body.courseIds = req.body.courseIds.map(id => {
        if (mongoose.Types.ObjectId.isValid(id)) {
          return new mongoose.Types.ObjectId(id);
        }
        throw new Error("Invalid courseId");
      });
    }    

    req.body.createdBy = {
      userId: res.locals?.user?.id || "admin123",
      createdAt: new Date(),
    };

    req.body.discountPercentage = parseInt(req.body.discountPercentage);
    req.body.discountAmount = parseInt(req.body.discountAmount);
    req.body.minAmount = parseInt(req.body.minAmount);
    req.body.validityPeriod = parseInt(req.body.validityPeriod);

    const voucher = new Voucher(req.body);
    await voucher.save();

    res.json({
      code: 200,
      message: "Tạo voucher thành công!",
      voucher,
    });
  } catch (err) {
    console.error("Error creating voucher:", err);
    res.status(500).json({
      message: "Lỗi khi tạo voucher",
      error: err.message,
    });
  }
};


// [DELETE] /admin/voucher/delete/:VoucherID
module.exports.deleteItem = async (req, res) => {
  try {
    const result = await Voucher.updateOne(
      { _id: req.params.VoucherID },
      {
        VoucherDeleted: 0,
        deletedBy: {
          userId: res.locals.user.id,
          deletedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Voucher không tồn tại" });
    }

    res.json({ code: 200, message: "Xoá voucher thành công!" });
  } catch (err) {
    console.error("Error deleting voucher:", err);
    res.status(500).json({
      message: "Lỗi khi xóa voucher",
      error: err.message,
    });
  }
};

// [GET] /admin/voucher/edit/:VoucherID
module.exports.editItem = async (req, res) => {
  try {
    const voucher = await Voucher.findOne({
      VoucherDeleted: 1,
      _id: req.params.VoucherID,
    })
      .populate("courseIds", "CourseName")
      .lean();

    if (!voucher) {
      return res.status(404).json({ message: "Voucher không tồn tại" });
    }

    const courses = await Course.find({ CourseDeleted: 1 }).lean();
    voucher.courseList = courses;

    res.json(voucher);
  } catch (err) {
    console.error("Lỗi khi lấy voucher để chỉnh sửa:", err);
    res.status(500).json({
      message: "Lỗi khi lấy voucher để chỉnh sửa",
      error: err.message,
    });
  }
};

// [POST] /admin/voucher/edit/:VoucherID
module.exports.editPost = async (req, res) => {
  try {
    if (Array.isArray(req.body.courseIds)) {
      req.body.courseIds = req.body.courseIds.map(id => {
        if (mongoose.Types.ObjectId.isValid(id)) {
          return new mongoose.Types.ObjectId(id);
        } else {
          throw new Error(`ID không hợp lệ: ${id}`);
        }
      });
    } else {
      req.body.courseIds = [];
    }

    const { editedBy, ...updateFields } = req.body;
    const newEditedBy = {
      userId: res.locals.user?.id || "admin123",
      updatedAt: new Date(),
    };

    const result = await Voucher.updateOne(
      { _id: req.params.VoucherID },
      {
        ...updateFields,
        $push: { updatedBy: newEditedBy },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Voucher không tồn tại" });
    }

    res.json({ code: 200, message: "Cập nhật voucher thành công!" });
  } catch (err) {
    console.error("Lỗi khi cập nhật voucher:", err);
    res.status(500).json({
      message: "Lỗi khi cập nhật voucher",
      error: err.message,
    });
  }
};

