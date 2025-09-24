const express = require("express");
const router = express.Router();

const {
  getWishlists,
  getWishlistById,
  getWishlistByUser,
  createWishlist,
  updateWishlist,
  deleteWishlist,
  bulkDelete,
} = require("../controllers/wishlist.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getWishlists);
router.get("/lists/:id", getWishlistById);
router.get("/lists/user/:userId", getWishlistByUser);

/* -------------------------------- POST ----------------------------- */
router.post("/", createWishlist);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updateWishlist);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteWishlist);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
