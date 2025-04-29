const express = require("express")
const router = express.Router()

const controller = require("../../controllers/admin/user.controller")

router.get('/', controller.index)

router.get('/detail/:UserID', controller.detail)

router.post('/change-status/:status/:UserID', controller.changeStatus)

module.exports = router;