const express = require("express");
const { registerUser, registerAdmin, loginUser } = require("../controllers/auth.controller");
const router = express.Router();

router.post("/register", registerUser);
router.post("/register/admin", registerAdmin);
router.post("/login", loginUser);

module.exports = router;
