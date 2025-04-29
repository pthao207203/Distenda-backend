const Admin = require("../../models/admin.model");
const Setting = require("../../models/setting.model");
const ForgotPassword = require("../../models/forgotpw.model");
const generateHelper = require("../../helpers/generate")
const sendMailHelper = require("../../helpers/sendMail")

const systemConfig = require("../../config/system");

// [POST] /admin/auth/login
module.exports.loginPost = async (req, res) => {
  const { AdminEmail } = req.body;
  const user = await Admin.findOne({
    AdminEmail: AdminEmail,
    AdminDeleted: 1,
  });

  if (!user) {
    res.json({
      code: 400,
      message: "Email không tồn tại!"
    })
    return;
  }

  if (user.AdminStatus != 1) {
    res.json({
      code: 400,
      message: "Tài khoản đang bị khóa!"
    })
    return;
  }
  if (user.AdminRole_id.toString() === "680fbf236652357c0e6421e9") {
    res.json({
      code: 200,
      message: 'Vui lòng nhập "123456" để đăng nhập!'
    })
  } else {
    const otp = generateHelper.generateRandomNumber(6)
    const objectForgotPw = {
      FPUserEmail: AdminEmail,
      FPOTP: otp,
      expireAt: Date.now(),
    }
    const forgotPw = new ForgotPassword(objectForgotPw)
    await forgotPw.save()

    //Tồn tại nên gửi Email
    const Subject = "DISCENDA_Mã OTP xác minh lấy lại mật khẩu"
    const html = `
      <div><span style="font-family: 'times new roman', times, serif; font-size: 14pt; color: #000000;">Xin ch&agrave;o <strong>${user.AdminFullName}</strong>,</span></div>
      <div>&nbsp;</div>
      <div><span style="font-family: 'times new roman', times, serif; font-size: 14pt; color: #000000;">Đ&acirc;y l&agrave; m&atilde; x&aacute;c nhận lấy lại mật khẩu của bạn:</span></div>
      <div><span style="font-size: 18pt; font-family: 'times new roman', times, serif; color: #000000;"><strong>${otp}</strong></span></div>
      <div><span style="font-family: 'times new roman', times, serif; font-size: 14pt; color: #000000;">Thời hạn để sử dụng m&atilde; l&agrave; 10 ph&uacute;t.</span></div>
      <div><span style="font-family: 'times new roman', times, serif; font-size: 14pt; color: #000000;">Nếu bạn kh&ocirc;ng gửi y&ecirc;u cầu, h&atilde;y bỏ qua hộp thư n&agrave;y.</span></div>
      <p>&nbsp;</p>
      <div><span style="font-family: 'times new roman', times, serif; font-size: 14pt; color: #000000;">Xin cảm ơn,</span></div>
      <div><span style="font-family: 'times new roman', times, serif; font-size: 14pt; color: #000000;"><strong>DISCENDA.</strong></span></div>
    `
    sendMailHelper.sendMail(AdminEmail, Subject, html)

    res.json({
      code: 200,
      message: "Chúng tôi vừa gửi một mã OTP tới Email của bạn!"
    })
  }
};

// [POST] /admin/auth/login-confirm
module.exports.passwordOTP = async (req, res) => {
  const AdminEmail = req.body.AdminEmail
  const OTP = req.body.OTP

  const admin = await Admin.findOne({
    AdminEmail: AdminEmail
  }).select("AdminRole_id AdminToken")
  if (admin.AdminRole_id.toString() === "680fbf236652357c0e6421e9") {
    res.cookie("token", admin.AdminToken)

    res.json({
      code: 200,
      message: "Đăng nhập thành công!"
    })
  } else {
    const result = await ForgotPassword.findOne({
      FPUserEmail: AdminEmail,
      FPOTP: OTP
    })
    if (!result) {
      res.json({
        code: 400,
        message: "OTP không hợp lệ!"
      })
      return;
    }

    res.cookie("token", admin.AdminToken, {
      secure: true,
      httpOnly: false,
      sameSite: 'None',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.json({
      code: 200,
      message: "Đăng nhập thành công!"
    })
  }
};

// [GET] /admin/auth/logout
module.exports.logout = (req, res) => {
  res.clearCookie("token");
  res.json({
    code: 200,
    message: "Đăng xuất thành công!"
  })
};

// [GET] /admin/auth/setting
module.exports.setting = async (req, res) => {
  const setting = await Setting.findOne().lean()
  res.json(setting)
};