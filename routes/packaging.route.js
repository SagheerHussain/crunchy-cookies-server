const express = require("express");
const router = express.Router();

const {
  getPackaging,
  getPackagingById,
  createPackaging,
  updatePackaging,
  deletePackaging,
  bulkDelete,
} = require("../controllers/packaging.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getPackaging);
router.get("/lists/:id", getPackagingById);

/* -------------------------------- POST ----------------------------- */
router.post("/", createPackaging);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updatePackaging);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deletePackaging);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
