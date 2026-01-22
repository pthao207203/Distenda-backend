module.exports = {
  app_id: process.env.ZALOPAY_APP_ID,
  key1: process.env.ZALOPAY_KEY1,
  key2: process.env.ZALOPAY_KEY2,

  endpoint: "https://sb-openapi.zalopay.vn/v2/create",

  callback_url: "http://localhost:3001/payment/zalopay-callback",

  redirect_url: "http://localhost:3000/courses/handle-payment"
};
