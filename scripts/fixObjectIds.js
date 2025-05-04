const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/user.model");

const MONGO_URI = process.env.MONGO_URL;

async function fixUserCourseObjectIds() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("🔗 Đã kết nối MongoDB");

    const users = await User.find({});

    let fixedCount = 0;

    for (const user of users) {
      let changed = false;

      for (let i = 0; i < user.UserCourse.length; i++) {
        const course = user.UserCourse[i];
        const rawId = course.CourseId;

        // Kiểm tra nếu CourseId là Document (kiểu object), không phải ObjectId
        if (
          rawId &&
          typeof rawId === "object" &&
          rawId.toString &&
          /new ObjectId\('([a-f\d]{24})'\)/i.test(rawId.toString())
        ) {
          const matchedId = rawId.toString().match(/[a-f\d]{24}/i)?.[0];
          if (matchedId) {
            user.UserCourse[i].CourseId = new mongoose.Types.ObjectId(matchedId);
            changed = true;
            console.log(`🛠 Sửa CourseId của user _id=${user._id}`);
          }
        }
      }

      if (changed) {
        await user.save();
        fixedCount++;
      }
    }

    console.log(`✅ Đã cập nhật ${fixedCount} người dùng.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi:", err);
    process.exit(1);
  }
}

fixUserCourseObjectIds();
