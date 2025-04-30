const express = require("express");
const router = express.Router();

const controller = require("../../controllers/client/pay.controller");
const payController = require("../../controllers/admin/pay.controller");

router.get("/:CourseSlug", controller.pay);

router.post("/:CourseSlug", controller.payPost);

router.post("/:CourseSlug/momo", controller.payMoMo);

// [POST] /pay/pos
router.post('/pos', payController.payMoMoPOS);

router.post('/dummy-callback', (req, res) => {
    console.log("📥 MoMo gọi dummy callback, bỏ qua.");
    res.status(200).send("OK");
});

module.exports = router;