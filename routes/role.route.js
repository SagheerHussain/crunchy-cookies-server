const express = require("express");
const router = express.Router();

const {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  bulkDelete,
} = require("../controllers/role.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getRoles);
router.get("/lists/:id", getRoleById);

/* -------------------------------- POST ----------------------------- */
router.post("/", createRole);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updateRole);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteRole);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
