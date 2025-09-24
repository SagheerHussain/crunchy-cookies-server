const express = require("express");
const router = express.Router();
const upload = require("../upload");

const {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  bulkDelete,
} = require("../controllers/brand.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getBrands);
router.get("/lists/:id", getBrandById);

/* -------------------------------- POST ----------------------------- */
router.post("/", upload.single("logo"), createBrand);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", upload.single("logo"), updateBrand);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteBrand);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
