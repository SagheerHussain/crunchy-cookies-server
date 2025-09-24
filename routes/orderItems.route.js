const express = require("express");
const router = express.Router();

const {
  getOrderItems,
  getOrderItemsById,
  createOrderItems,
  updateOrderItems,
  deleteOrderItems,
  bulkDelete,
} = require("../controllers/orderItems.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getOrderItems);
router.get("/lists/:id", getOrderItemsById);

/* -------------------------------- POST ----------------------------- */
router.post("/", createOrderItems);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updateOrderItems);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteOrderItems);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
