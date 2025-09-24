const express = require("express");
const router = express.Router();

const {
  getOrdersHistory,
  getOrderHistoryById,
  getOrdersHistoryByUser,
  createOrderHistory,
  updateOrderHistory,
  deleteOrderHistory,
  bulkDelete,
} = require("../controllers/orderHistory.controller");

/* -------------------------------- GET ----------------------------- */
router.get("/lists", getOrdersHistory);
router.get("/lists/:id", getOrderHistoryById);
router.get("/lists/user/:userId", getOrdersHistoryByUser);

/* -------------------------------- POST ----------------------------- */
router.post("/", createOrderHistory);

/* -------------------------------- PUT ----------------------------- */
router.put("/update/:id", updateOrderHistory);

/* -------------------------------- DELETE ----------------------------- */
router.delete("/delete/:id", deleteOrderHistory);
router.delete("/bulkDelete", bulkDelete);

module.exports = router;
