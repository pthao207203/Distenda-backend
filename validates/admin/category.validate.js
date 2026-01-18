module.exports.createPost = (req, res, next) => {
  if (!req.body.CategoryName){
    req.flash("error", "Vui lòng nhập tên danh mục");
    res.redirect("back");
    return;
  }
  
  next();
}

// chặn việc người dùng nhập thiếu trường categoryName khi tạo mới danh mục (gian lận bằng cách F12)