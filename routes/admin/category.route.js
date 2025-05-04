const express = require("express")
const multer = require('multer')
const router = express.Router()

const upload = multer()

const controller = require("../../controllers/admin/category.controller")
const validate = require("../../validates/admin/category.validate")
const uploadCloud = require("../../middlewares/admin/uploadCloud.middleware")

router.get('/', controller.index)

router.post('/create', controller.createPost)

router.delete('/delete/:CategoryID', controller.deleteItem)

router.patch('/edit/:CategoryID', controller.editPatch)

module.exports = router;