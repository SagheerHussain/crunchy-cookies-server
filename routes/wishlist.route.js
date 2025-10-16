const express = require("express");
const router = express.Router();
const {
  getWishlists,
  getWishlistById,
  getWishlistByUser,
  createWishlist,
  deleteWishlistByUserProduct,
  deleteWishlistById,
  updateWishlist,
  bulkDelete,
} = require("../controllers/wishlist.controller");

// GET
router.get("/lists", getWishlists);
router.get("/lists/:id", getWishlistById);
router.get("/lists/user/:userId", getWishlistByUser);

// POST (add)
router.post("/", createWishlist);

// DELETE (remove specific user+product)
router.delete("/", deleteWishlistByUserProduct);

// (optional) DELETE by id
router.delete("/delete/:id", deleteWishlistById);

// PUT (optional)
router.put("/update/:id", updateWishlist);

// bulk delete (comma-separated ids)
router.delete("/bulk/:ids", bulkDelete);

module.exports = router;
