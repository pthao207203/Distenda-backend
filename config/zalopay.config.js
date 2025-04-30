module.exports = {
  app_id: "2553",
  key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
  key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
  callback_url: "http://localhost:3001/payment/zalopay-callback",  // Backend xử lý kết quả
  redirect_url: "http://localhost:3000/courses/handle-payment"     // Trang chuyển về sau thanh toán
};
