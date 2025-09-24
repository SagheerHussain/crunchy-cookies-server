const express = require("express");
const router = express.Router();

const { getPermissions, getPermissionsById, createPermissions, updatePermissions, deletePermissions, bulkDelete } = require("../controllers/permission.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getPermissions);
router.get("/lists/:id", getPermissionsById);

/* -------------------------------- POST ----------------------------- */
router.post("/", createPermissions);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updatePermissions);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deletePermissions);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
