const express = require("express");
const router = express.Router();

const {
  getCarts,
  getCartById,
  getCartByUser,
  createCart,
  updateCart,
  deleteCart,
  bulkDelete,
} = require("../controllers/cart.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getCarts);
router.get("/lists/:id", getCartById);
router.get("/lists/user/:userId", getCartByUser);

/* -------------------------------- POST ----------------------------- */
router.post("/", createCart);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updateCart);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteCart);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
