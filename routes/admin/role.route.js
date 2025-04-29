const express = require("express")
const multer = require('multer')
const router = express.Router()

const upload = multer()

const controller = require("../../controllers/admin/role.controller")
const validate = require("../../validates/admin/role.validate")

router.post('/create', validate.createPost, controller.createPost)

router.delete('/delete/:RoleID', controller.deleteItem)

router.post(
  '/edit/:RoleID',
  controller.editPatch
)

router.get('/permission', controller.permission)

module.exports = router;