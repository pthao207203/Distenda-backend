const Livestream = require("../../models/livestream.model");
const paginationHelper = require("../../helpers/pagination");
const crypto = require("crypto");

// [GET] /admin/livestreams
module.exports.index = async (req, res) => {
  let find = {
    LivestreamDeleted: 1,
  };

  // Bộ lọc theo trạng thái
  if (req.query.status) {
    find.LivestreamStatus = req.query.status;
  }

  // Tìm kiếm
  let keyword = "";
  if (req.query.keyword) {
    keyword = req.query.keyword;
    const regex = new RegExp(keyword, "i");
    find.LivestreamTitle = regex;
  }

  // Phân trang
  const countLivestreams = await Livestream.countDocuments(find);
  let objectPagination = paginationHelper(
    {
      currentPage: 1,
    },
    req.query,
    countLivestreams
  );

  const livestreams = await Livestream.find(find)
    .limit(objectPagination.limitItems)
    .skip(objectPagination.skip)
    .populate({
      path: "createdBy.UserId",
      select: "AdminFullName",
      model: "Admin",
    })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    code: 200,
    data: livestreams,
    pagination: objectPagination,
  });
};

// [POST] /admin/livestreams/create
module.exports.createPost = async (req, res) => {
  try {
    // Tạo stream key ngẫu nhiên
    const streamKey = crypto.randomBytes(16).toString("hex");

    const livestreamData = {
      LivestreamTitle: req.body.LivestreamTitle,
      LivestreamDescription: req.body.LivestreamDescription,
      LivestreamThumbnail: req.body.LivestreamThumbnail,
      LivestreamStatus: "not_started",
      LivestreamStreamKey: streamKey,
      LivestreamStreamUrl: `rtmp://localhost:1935/${streamKey}`,
      createdBy: {
        UserId: res.locals.user.id,
      },
    };

    const livestream = new Livestream(livestreamData);
    await livestream.save();

    res.json({
      code: 200,
      message: "Tạo livestream thành công!",
      data: livestream,
    });
  } catch (error) {
    res.json({
      code: 400,
      message: "Tạo livestream không thành công!",
      error: error.message,
    });
  }
};

// [GET] /admin/livestreams/detail/:LivestreamID
module.exports.detailItem = async (req, res) => {
  try {
    const livestreamID = req.params.LivestreamID;
    const livestream = await Livestream.findOne({
      _id: livestreamID,
      LivestreamDeleted: 1,
    })
      .populate({
        path: "createdBy.UserId",
        select: "AdminFullName AdminEmail",
        model: "Admin",
      })
      .lean();

    if (!livestream) {
      return res.json({
        code: 404,
        message: "Không tìm thấy livestream!",
      });
    }

    res.json({
      code: 200,
      data: livestream,
    });
  } catch (error) {
    res.json({
      code: 400,
      message: "Lỗi khi lấy thông tin livestream!",
      error: error.message,
    });
  }
};

// [PATCH] /admin/livestreams/edit/:LivestreamID
module.exports.editPost = async (req, res) => {
  try {
    const livestreamID = req.params.LivestreamID;

    const editedBy = {
      UserId: res.locals.user.id,
      editedAt: new Date(),
    };

    const updateData = {
      LivestreamTitle: req.body.LivestreamTitle,
      LivestreamDescription: req.body.LivestreamDescription,
      LivestreamThumbnail: req.body.LivestreamThumbnail,
      $push: { editedBy: editedBy },
    };

    await Livestream.updateOne(
      { _id: livestreamID },
      updateData
    );

    res.json({
      code: 200,
      message: "Cập nhật livestream thành công!",
    });
  } catch (error) {
    res.json({
      code: 400,
      message: "Cập nhật livestream không thành công!",
      error: error.message,
    });
  }
};

// [POST] /admin/livestreams/change-status/:status/:LivestreamID
module.exports.changeStatus = async (req, res) => {
  try {
    const status = req.params.status;
    const livestreamID = req.params.LivestreamID;

    const editedBy = {
      UserId: res.locals.user.id,
      editedAt: new Date(),
    };

    const updateData = {
      LivestreamStatus: status,
      $push: { editedBy: editedBy },
    };

    // Cập nhật thời gian bắt đầu/kết thúc
    if (status === "live" && !req.body.LivestreamStartedAt) {
      updateData.LivestreamStartedAt = new Date();
    }
    if (status === "ended" && !req.body.LivestreamEndedAt) {
      updateData.LivestreamEndedAt = new Date();
    }

    await Livestream.updateOne(
      { _id: livestreamID },
      updateData
    );

    res.json({
      code: 200,
      message: "Cập nhật trạng thái thành công!",
    });
  } catch (error) {
    res.json({
      code: 400,
      message: "Cập nhật trạng thái không thành công!",
      error: error.message,
    });
  }
};

// [DELETE] /admin/livestreams/delete/:LivestreamID
module.exports.deleteItem = async (req, res) => {
  try {
    const livestreamID = req.params.LivestreamID;

    await Livestream.updateOne(
      { _id: livestreamID },
      {
        LivestreamDeleted: 0,
        deletedBy: {
          UserId: res.locals.user.id,
          deletedAt: new Date(),
        },
      }
    );

    res.json({
      code: 200,
      message: "Xoá livestream thành công!",
    });
  } catch (error) {
    res.json({
      code: 400,
      message: "Xoá livestream không thành công!",
      error: error.message,
    });
  }
};
