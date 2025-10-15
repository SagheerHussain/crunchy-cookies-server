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
  getProductsInFlowerInVases,
  getTopSoldProducts,
  getProductsInChocolatesOrHandBouquets,
  getProductsForFriendsOccasion,
  getFeaturedProducts,
  getProductsInPerfumes,
  getProductsInPreservedFlowers,
} = require("../controllers/products.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getProducts);
router.get("/lists/inFlowerInVases", getProductsInFlowerInVases);
router.get("/lists/inChocolatesOrHandBouquets", getProductsInChocolatesOrHandBouquets);
router.get("/lists/inPerfumes", getProductsInPerfumes);
router.get("/lists/inPreservedFlowers", getProductsInPreservedFlowers);
router.get("/lists/inFriendsOccasion", getProductsForFriendsOccasion);
router.get("/lists/inFeatured", getFeaturedProducts);
router.get("/lists/inTopSold", getTopSoldProducts);
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
