const express = require("express");
const router = express.Router();

const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  bulkDelete,
} = require("../controllers/user.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getUsers);
router.get("/lists/:id", getUserById);

/* -------------------------------- POST ----------------------------- */
router.post("/", createUser);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updateUser);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteUser);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
