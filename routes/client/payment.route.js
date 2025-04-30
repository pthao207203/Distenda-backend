const express = require("express");
const router = express.Router();
const Pay = require("../../models/pay.model");
const User = require("../../models/user.model");
const Course = require("../../models/course.model");

router.post('/zalopay-callback', async (req, res) => {
   console.log("📥 Nhận callback từ ZaloPay:", req.body);
 
   const { app_trans_id, amount } = req.body;
   if (!app_trans_id) return res.status(400).send('Thiếu app_trans_id');
 
   try {
     const pay = await Pay.findOne({ orderId: app_trans_id });
     if (!pay) return res.status(400).send('Không tìm thấy đơn hàng');
 
     if (pay.PayStatus === 1) return res.status(200).send('Đơn hàng đã xử lý');
 
     const { UserId, CourseId } = pay;
     const course = await Course.findById(CourseId);
     const user = await User.findById(UserId);
 
     if (!course || !user) return res.status(404).send("Thiếu thông tin");
 
     // Cập nhật
     await User.updateOne({ _id: UserId }, {
       $push: {
         UserCourse: {
           CourseId,
           CourseStatus: 0,
           CourseProcess: [],
         }
       },
       UserMoney: (user.UserMoney || 0) + amount,
     });
 
     const payTeacher = Math.round(amount * course.CourseSalary / 100);
     const payProfit = amount - payTeacher;
 
     await Pay.updateOne({ orderId: app_trans_id }, {
       PayStatus: 1,
       PayTeacher: payTeacher,
       PayProfit: payProfit,
     });
 
     await Admin.updateOne({ _id: course.CourseIntructor }, {
       AdminSalary: payTeacher,
     });
 
     await Course.updateOne({ _id: CourseId }, {
       $inc: { CourseBought: 1 },
       CourseProfit: payProfit,
     });
 
     return res.status(200).send("OK");
   } catch (error) {
     console.error("❌ Callback ZaloPay lỗi:", error);
     return res.status(500).send("Lỗi server");
   }
 }); 

router.post('/confirm', async (req, res) => {
   console.log("Xác nhận thanh toán với:", req.body);
   const {
      orderId,
      amount
   } = req.body;

   try {
      const pay = await Pay.findOne({
         orderId
      });
      if (!pay) {
         return res.status(400).json({
            message: "Đơn hàng không tồn tại!"
         });
      }

      if (pay.PayStatus === 1) {
         return res.status(400).json({
            message: "Đơn hàng đã được xử lý trước đó."
         });
      }

      const {
         UserId,
         CourseId
      } = pay;
      const course = await Course.findById(CourseId);
      const user = await User.findById(UserId);

      if (!course || !user) {
         return res.status(404).json({
            message: "Không tìm thấy thông tin người dùng hoặc khóa học."
         });
      }

      // Cập nhật UserCourse
      await User.updateOne({
         _id: UserId
      }, {
         $push: {
            UserCourse: {
               CourseId,
               CourseStatus: 0,
               CourseProcess: []
            }
         }
      });

      // Tính toán lương giáo viên và lợi nhuận
      const payTeacher = Math.round(amount * course.CourseSalary / 100);
      const payProfit = amount - payTeacher;

      // Cập nhật Pay
      await Pay.updateOne({
         orderId
      }, {
         PayStatus: 1,
         PayTeacher: payTeacher,
         PayProfit: payProfit,
         $push: {
            editedBy: {
               UserId: UserId,
               editedAt: new Date()
            }
         }
      });

      // Lấy lại thông tin Pay sau khi cập nhật
      const updatedPay = await Pay.findOne({
         orderId
      }).lean();

      res.json({
         message: "Xác nhận thanh toán thành công!",
         data: updatedPay
      });
   } catch (err) {
      console.error("Lỗi server:", err);
      res.status(500).json({
         message: "Lỗi server khi xác nhận thanh toán."
      });
   }
});

module.exports = router;
