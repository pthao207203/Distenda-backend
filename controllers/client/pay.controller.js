const User = require("../../models/user.model");
const Course = require("../../models/course.model");
const Pay = require("../../models/pay.model");
const Admin = require("../../models/admin.model");

const axios = require("axios");
const crypto = require("crypto");
const momoConfig = require("../../config/momo.config");
const zaloConfig = require("../../config/zalopay.config");
const moment = require("moment");
const qs = require("qs");

module.exports.payZaloPay = async (req, res) => {
  if (!req.cookies.user_token) {
    return res.json({ code: 401, message: "Bạn chưa đăng nhập!" });
  }

  const course = await Course.findOne({ CourseSlug: req.params.CourseSlug });
  if (!course) {
    return res.json({ code: 404, message: "Không tìm thấy khoá học!" });
  }

  try {
    const amount = Math.round(
      (course.CoursePrice * (100 - course.CourseDiscount)) / 100
    );

    const embed_data = JSON.stringify({ redirecturl: zaloConfig.redirect_url });
    const item = JSON.stringify([
      { id: course._id, name: course.CourseName, price: amount, quantity: 1 }
    ]);

    const transID = `${moment().format("YYMMDD")}_${Math.floor(Math.random() * 1000000)}`;

    const data = {
      app_id: zaloConfig.app_id,
      app_trans_id: transID,
      app_user: `${res.locals.user.id}`,
      app_time: Date.now(),
      item: item,
      embed_data: embed_data,
      amount: amount,
      description: `Thanh toán khoá học ${course.CourseName}`,
      callback_url: zaloConfig.callback_url,
    };

    const dataString = `${data.app_id}|${data.app_trans_id}|${data.app_user}|${data.amount}|${data.app_time}|${data.embed_data}|${data.item}`;
    const mac = crypto.createHmac("sha256", zaloConfig.key1)
      .update(dataString)
      .digest("hex");

    const requestBody = { ...data, mac };

    const zaloResponse = await axios.post(zaloConfig.endpoint, qs.stringify(requestBody), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    console.log("ZaloPay response:", zaloResponse.data);

    if (zaloResponse.data.return_code === 1) {
      // Lưu đơn vào DB
      const pay = new Pay({
        UserId: res.locals.user.id,
        CourseId: course._id,
        PayTotal: amount,
        orderId: transID,
        PayStatus: 0,
        PayResponse: zaloResponse.data,
        createdBy: {
          UserId: res.locals.user.id,
        },
      });
      await pay.save();

      return res.json({ code: 200, payUrl: zaloResponse.data.order_url });
    } else {
      return res.json({
        code: zaloResponse.data.return_code,
        message: zaloResponse.data.return_message || "Tạo đơn ZaloPay thất bại",
      });
    }
  } catch (error) {
    console.error("Lỗi ZaloPay:", error);
    return res.status(500).json({
      code: 500,
      message: "Có lỗi xảy ra khi tạo đơn ZaloPay",
      error: error.message,
    });
  }
};


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

  const amount = course.CoursePrice * (100 - course.CourseDiscount) / 100;
  const orderId = momoConfig.partnerCode + new Date().getTime();
  const requestId = orderId;
  // console.log("user ", res.locals)
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
    const response = await axios.post('https://test-payment.momo.vn/v2/gateway/api/create', requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Lưu đơn hàng vào DB kèm response MoMo
    const pay = new Pay({
      UserId: res.locals.user._id,
      CourseId: course._id,
      PayTotal: amount,
      orderId: orderId,
      PayStatus: 0, // Đơn hàng khởi tạo, chờ thanh toán
      PayResponse: response.data, // Lưu toàn bộ JSON response từ MoMo
      createdBy: {
        UserId: res.locals.user._id
      }
    });
    await pay.save();

    return res.json({
      code: 200,
      payUrl: response.data.payUrl
    });
  } catch (err) {
    console.log(err)
    return res.json({
      code: 500,
      message: "Lỗi khi kết nối MoMo",
      error: err.message
    });
  }
};


module.exports.handleCallback = async (req, res) => {
  console.log("📥 Nhận IPN từ MoMo:", req.body);

  const { orderId, resultCode, amount } = req.body;

  if (resultCode === 0) {
    console.log(`Giao dịch ${orderId} thành công với số tiền ${amount} VND`);

    // TODO: Lấy thông tin thanh toán từ OrderId
    const pay = await Pay.findOne({
      orderId,
    });
    if (!pay) {
      return res.status(400).json({
        message: "Thanh toán không hợp lệ",
      });
    }

    const { UserId, CourseId } = pay;
    const course = await Course.findOne({
      _id: CourseId,
    });
    const user = await User.findOne({
      _id: UserId,
    });

    if (!course || !user) {
      return res.status(404).json({
        message: "Không tìm thấy thông tin người dùng hoặc khóa học",
      });
    }

    // Thực hiện cập nhật người dùng và khóa học sau thanh toán thành công
    const newCourse = {
      CourseId: CourseId,
      CourseStatus: 0,
      CourseProcess: [],
    };

    const money = (user.UserMoney ? user.UserMoney : 0) + amount;

    // Cập nhật thông tin người dùng (thêm khóa học, cập nhật số dư tiền)
    await User.updateOne(
      {
        _id: UserId,
      },
      {
        $push: {
          UserCourse: newCourse,
        },
        UserMoney: money,
      }
    );

    // Cập nhật thông tin thanh toán
    await Pay.updateOne(
      {
        UserId: UserId,
        CourseId: CourseId,
      },
      {
        PayStatus: 1, // Đánh dấu thanh toán thành công
        PayTeacher: (amount * course.CourseSalary) / 100, // Thanh toán cho giáo viên
        PayProfit: (amount * (100 - course.CourseSalary)) / 100, // Lợi nhuận
      }
    );

    // Cập nhật thông tin giáo viên (lương giáo viên)
    await Admin.updateOne(
      {
        _id: course.CourseIntructor,
      },
      {
        AdminSalary: (amount * course.CourseSalary) / 100,
      }
    );

    // Cập nhật số lượng người mua và lợi nhuận khóa học
    const bought = course.CourseBought + 1;
    await Course.updateOne(
      {
        _id: CourseId,
      },
      {
        CourseBought: bought,
        CourseProfit: (amount * (100 - course.CourseSalary)) / 100,
      }
    );

    console.log("Thanh toán thành công và dữ liệu đã được cập nhật");

    res.status(200).send("IPN Received and processed successfully");
  } else {
    console.log(`❌ Giao dịch ${orderId} thất bại. Mã lỗi: ${resultCode}`);
    res.status(400).send("Giao dịch thất bại");
  }
};

// // [GET] /pay/:CourseID
module.exports.pay = async (req, res) => {
  if (req.cookies.user_token) {
    const test = await User.findOne({
      _id: res.locals.user.id,
      "UserCourse.CourseId": req.params.CourseID,
    });
    console.log("test ", test);
    if (test) {
      const course = await Course.findOne({
        _id: req.params.CourseID,
      });
      req.flash("error", "Bạn đã mua khoá học!");
      res.redirect(`/courses/${course.CourseSlug}`);
      return;
    }
    const course = await Course.findOne({
      _id: req.params.CourseID,
    });
    console.log(course);
    res.render("client/pages/courses/pay", {
      pageTitle: "Thanh toán",
      course: course,
    });
  } else {
    res.render("client/pages/auth/login", {
      pageTitle: "Đăng nhập",
    });
  }
};

// // [POST] /pay/:CourseSlug
module.exports.payPost = async (req, res) => {
  if (req.cookies.user_token) {
    const courseTest = await Course.findOne({
      CourseSlug: req.params.CourseSlug,
    });
    const CourseID = courseTest._id;
    console.log(CourseID);

    const test = await User.findOne({
      _id: res.locals.user.id,
      "UserCourse.CourseId": CourseID,
    });

    if (test) {
      res.json({
        code: 400,
        message: "Bạn đã mua khóa học!",
      });
      return;
    }

    const course = await Course.findOne({
      _id: CourseID,
    });

    req.body.UserId = res.locals.user.id;
    req.body.CourseId = CourseID;
    req.body.PayTotal =
      (course.CoursePrice * (100 - course.CourseDiscount)) / 100;
    req.body.createdBy = {
      UserId: res.locals.user.id,
    };

    const pay = new Pay(req.body);
    await pay.save();

    // Thực hiện cập nhật người dùng và khóa học sau thanh toán thành công
    setTimeout(() => {
      async function addCourseUser(UserID, CourseID) {
        const newCourse = {
          CourseId: CourseID,
          CourseStatus: 0, // Đánh dấu khóa học là "active"
          CourseProcess: [],
        };

        const money =
          (res.locals.user.UserMoney ? res.locals.user.UserMoney : 0) +
          req.body.PayTotal;

        // Cập nhật thông tin người dùng
        await User.updateOne(
          {
            _id: UserID,
          },
          {
            $push: {
              UserCourse: newCourse,
            },
            UserMoney: money,
          }
        );

        // Cập nhật thông tin thanh toán
        await Pay.updateOne(
          {
            UserId: UserID,
            CourseId: CourseID,
          },
          {
            PayStatus: 1,
            PayTeacher: (req.body.PayTotal * courseTest.CourseSalary) / 100,
            PayProfit:
              (req.body.PayTotal * (100 - courseTest.CourseSalary)) / 100,
          }
        );

        // Cập nhật thông tin giáo viên
        await Admin.updateOne(
          {
            _id: courseTest.CourseIntructor,
          },
          {
            AdminSalary:
              (courseTest.CoursePrice * courseTest.CourseSalary) / 100,
          }
        );

        // Cập nhật số lượng người mua khóa học và lợi nhuận
        const bought = courseTest.CourseBought + 1;
        await Course.updateOne(
          {
            _id: CourseID,
          },
          {
            CourseBought: bought,
            CourseProfit:
              (courseTest.CoursePrice * (100 - courseTest.CourseSalary)) / 100,
          }
        );

        console.log("Thanh toán thành công");
      }

      addCourseUser(res.locals.user.id, CourseID);
    }, 10000); // Đợi sau 10 giây để các tác vụ hoàn thành

    // Trả về thông báo thành công và redirect URL
    res.json({
      code: 200,
      message: "Mua khóa học thành công!",
      redirectUrl: `/courses/detail/${course.CourseSlug}`, // Chuyển hướng đến trang khóa học
    });
  } else {
    res.json({
      code: 200,
      message: "Bạn chưa đăng nhập!",
    });
  }
};
