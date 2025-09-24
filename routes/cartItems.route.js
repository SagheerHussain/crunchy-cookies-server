const express = require("express");
const router = express.Router();

const {
  getCartItems,
  getCartItemById,
  createCartItem,
  updateCartItem,
  deleteCartItem,
  bulkDelete,
} = require("../controllers/cartItems.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getCartItems);
router.get("/lists/:id", getCartItemById);

/* -------------------------------- POST ----------------------------- */
router.post("/", createCartItem);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updateCartItem);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteCartItem);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
