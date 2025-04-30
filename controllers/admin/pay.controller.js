const User = require("../../models/user.model");
const Course = require("../../models/course.model");
const Pay = require("../../models/pay.model");
const Admin = require("../../models/admin.model");
const Category = require("../../models/category.model");

const axios = require('axios');
const crypto = require('crypto');
const momoConfig = require("../../config/momo.config");

// [POST] /pay/:CourseSlug/momo
module.exports.payMoMo = async (req, res) => {
  if (!req.cookies.user_token) {
    return res.json({
      code: 401,
      message: "Bạn chưa đăng nhập!"
    });
  }

  const course = await Course.findOne({
    CourseSlug: req.params.CourseSlug
  });
  if (!course) {
    return res.json({
      code: 404,
      message: "Không tìm thấy khóa học!"
    });
  }

  if (course.CoursePrice === 0) {
    const existing = await User.findOne({
      _id: res.locals.user.id,
      "UserCourse.CourseId": course._id
    });

    if (existing) {
      return res.json({
        code: 400,
        message: "Bạn đã đăng ký khóa học này."
      });
    }

    const newCourse = {
      CourseId: course._id,
      CourseStatus: 1, 
      CourseProcess: []
    };

    await User.updateOne(
      { _id: res.locals.user.id },
      { $push: { UserCourse: newCourse } }
    );

    await Course.updateOne(
      { _id: course._id },
      { $inc: { CourseBought: 1 } }
    );

    return res.json({
      code: 200,
      message: "Đăng ký khóa học miễn phí thành công!",
      redirectUrl: `/courses/detail/${course.CourseSlug}`
    });
  }

  const amount = course.CoursePrice * (100 - course.CourseDiscount) / 100;
  const orderId = momoConfig.partnerCode + new Date().getTime();
  const requestId = orderId;

  const rawSignature =
    `accessKey=${momoConfig.accessKey}&amount=${amount}&extraData=${momoConfig.extraData}&ipnUrl=${momoConfig.ipnUrl}&orderId=${orderId}&orderInfo=Thanh toán khoá học ${course.CourseName}&partnerCode=${momoConfig.partnerCode}&redirectUrl=${momoConfig.redirectUrl}&requestId=${requestId}&requestType=${momoConfig.requestType}`;

  const signature = crypto.createHmac('sha256', momoConfig.secretKey).update(rawSignature).digest('hex');

  const requestBody = {
    partnerCode: momoConfig.partnerCode,
    partnerName: 'Distenda',
    storeId: 'DistendaStore',
    requestId,
    amount: `${amount}`,
    orderId,
    orderInfo: `Thanh toán khoá học ${course.CourseName}`,
    redirectUrl: momoConfig.redirectUrl,
    ipnUrl: momoConfig.ipnUrl,
    lang: momoConfig.lang,
    requestType: momoConfig.requestType,
    autoCapture: momoConfig.autoCapture,
    extraData: momoConfig.extraData,
    signature
  };

  try {
    const response = await axios.post('https://payment.momo.vn/v2/gateway/api/create', requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Lưu đơn hàng vào DB kèm response MoMo
    const pay = new Pay({
      UserId: res.locals.user.id,
      CourseId: course._id,
      PayTotal: amount,
      orderId: orderId,
      PayStatus: 0, // Đơn hàng khởi tạo, chờ thanh toán
      PayResponse: response.data,
      createdBy: {
        UserId: res.locals.user.id
      }
    });
    await pay.save();

    return res.json({
      code: 200,
      payUrl: response.data.payUrl
    });
  } catch (err) {
    return res.json({
      code: 500,
      message: "Lỗi khi kết nối MoMo",
      error: err.message
    });
  }
};

module.exports.payMoMoPOS = async (req, res) => {
  const { amount, orderInfo } = req.body;

  const orderId = "POS" + Date.now();
  const requestId = orderId;

  const rawSignature = `partnerCode=${partnerCode}&accessKey=${accessKey}&requestId=${requestId}&amount=${amount}&orderId=${orderId}&orderInfo=${orderInfo}&requestType=captureMoMoWallet`;

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');

  const body = {
    partnerCode,
    accessKey,
    requestId,
    amount,
    orderId,
    orderInfo,
    requestType: "captureMoMoWallet",
    signature
  };

  try {
    const response = await axios.post("https://payment.momo.vn/v2/gateway/api/pos", body, {
      headers: { "Content-Type": "application/json" }
    });

    return res.json(response.data);
  } catch (error) {
    return res.status(500).json({
      message: "POS thanh toán thất bại",
      error: error.message
    });
  }
};

// Dummy Callback để MoMo gọi 
module.exports.handleCallback = async (req, res) => {
  res.status(200).send('OK');
};

// // [GET] /admin/pay/
module.exports.pay = async (req, res) => {
  const pays = await Pay.find().lean().sort({
    "createdBy.createdAt": -1
  }).select("UserId CourseId PayProfit PayStatus PayTotal createdBy orderId");
  for (const pay of pays) {
    const user = await User.findOne({
      _id: pay.UserId,
    }).select("UserFullName");
    if (user) {
      pay.userName = user.UserFullName;
    }

    const course = await Course.findOne({
      _id: pay.CourseId,
    }).select("CourseName");
    if (course) {
      pay.courseName = course.CourseName;
    }
  }
  res.json(pays)
};

// // [POST] /admin/pay/detail/:PayID
module.exports.payDetail = async (req, res) => {
  const pay = await Pay.findOne({
    _id: req.params.PayID
  }).lean()
  const user = await User.findOne({
    _id: pay.UserId,
  });
  if (user) {
    pay.user = user.UserFullName;
  }

  const course = await Course.findOne({
    _id: pay.CourseId,
  }).lean();
  console.log(course)
  if (course) {
    pay.course = course;
  }
  const category = await Category.findOne({
    _id: course.CourseCatogory,
  });

  if (category) {
    pay.course.CategoryName = category.CategoryName;
  }
  res.json(pay)
};
