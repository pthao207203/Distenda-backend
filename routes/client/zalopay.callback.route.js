const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const Pay = require("../../models/pay.model");
const User = require("../../models/user.model");
const Course = require("../../models/course.model");

const { key2 } = require("../../config/zalopay.config");

/**
 * ZaloPay CALLBACK
 * ZaloPay server -> backend server
 */
router.post("/payment/zalopay-callback", async (req, res) => {
  try {
    const { data, mac } = req.body;

    /** 1️ Verify MAC */
    const macCheck = crypto
      .createHmac("sha256", key2)
      .update(data)
      .digest("hex");

    if (mac !== macCheck) {
      console.error("❌ ZaloPay MAC invalid");
      return res.json({
        return_code: -1,
        return_message: "invalid mac"
      });
    }

    /** 2️ Parse data */
    const parsedData = JSON.parse(data);
    const {
      apptransid,
      amount,
      item,
      embeddata,
      zptransid,
      status
    } = parsedData;

    if (status !== 1) {
      return res.json({
        return_code: 0,
        return_message: "payment failed"
      });
    }

    /** 3️ Find payment */
    const pay = await Pay.findOne({ orderId: apptransid });
    if (!pay) {
      console.error("❌ Order not found:", apptransid);
      return res.json({ return_code: 0 });
    }

    if (pay.PayStatus === 1) {
      return res.json({ return_code: 1 });
    }

    /** 4 Unlock course */
    const user = await User.findById(pay.UserId);
    if (!user) {
      return res.json({ return_code: 0 });
    }

    const course = await Course.findById(pay.CourseId);
    if (!course) {
      return res.json({ return_code: 0 });
    }

    const alreadyOwned = user.UserCourse.some(
      (c) => c.CourseId.toString() === pay.CourseId.toString()
    );

    if (!alreadyOwned) {
      user.UserCourse.push({
        CourseId: pay.CourseId,
        CourseStatus: 0,
        CourseProcess: []
      });
    }

    user.UserMoney = (user.UserMoney || 0) + Number(amount);

    await user.save();

    /** 5 Update payment */
    pay.PayStatus = 1;
    pay.ZaloPayTransId = zptransid;
    await pay.save();

    console.log(" ZaloPay payment confirmed:", apptransid);

    return res.json({
      return_code: 1,
      return_message: "success"
    });
  } catch (error) {
    console.error("ZaloPay callback error:", error);
    return res.json({
      return_code: 0,
      return_message: "server error"
    });
  }
});

module.exports = router;
