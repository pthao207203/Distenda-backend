const express = require("express");
const router = express.Router();

const controller = require("../../controllers/admin/livestream.controller");

router.get("/", controller.index);

router.post("/", controller.createPost);

router.get("/detail/:LivestreamID", controller.detailItem);

router.patch("/edit/:LivestreamID", controller.editPost);

router.post("/change-status/:status/:LivestreamID", controller.changeStatus);

router.delete("/delete/:LivestreamID", controller.deleteItem);

module.exports = router;
