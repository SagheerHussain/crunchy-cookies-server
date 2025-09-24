const express = require("express");
const router = express.Router();
const { getColors, getColorById, createColor, updateColor, deleteColor, bulkDelete } = require("../controllers/color.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getColors);
router.get("/lists/:id", getColorById);

/* -------------------------------- POST ----------------------------- */
router.post("/", createColor);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updateColor);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteColor);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
