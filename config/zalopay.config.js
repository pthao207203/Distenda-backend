module.exports = {
  app_id: `${process.env.ZALOPAY_APP_ID}`,
  key1: `${process.env.ZALOPAY_KEY1}`,
  key2: `${process.env.ZALOPAY_KEY2}`,
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
  callback_url: `${process.env.PORT}/payment/zalopay-callback`,  // Backend xử lý kết quả
  redirect_url: `${process.env.FRONTEND_PORT}/courses/handle-payment`     // Trang chuyển về sau thanh toán
};
