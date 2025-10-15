const express = require("express");
const router = express.Router();

const upload = require("../upload");

const {
  getProducts,
  getProductNames,
  getProductById,
  getFilteredProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDelete,
} = require("../controllers/products.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getProducts);
router.get("/lists/:id", getProductById);
router.get("/lists/filter", getFilteredProducts);
router.get("/names", getProductNames);

/* -------------------------------- POST ----------------------------- */
router.post(
  "/",
  upload.fields([
    { name: "featuredImage", maxCount: 1 },
    { name: "images", maxCount: 12 },
  ]),
  createProduct
);

/* -------------------------------- PUT ----------------------------- */
router.put(
  "/update/:id",
  upload.fields([
    { name: "featuredImage", maxCount: 1 },
    { name: "images", maxCount: 12 },
  ]),
  updateProduct
);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteProduct);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
