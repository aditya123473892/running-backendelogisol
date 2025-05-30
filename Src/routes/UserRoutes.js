const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const adminAuth = require("../middlewares/adminmiddleware");
const UserController = require("../controller/userController");

router.get("/allusers", UserController.getAllusers);

module.exports = router;
